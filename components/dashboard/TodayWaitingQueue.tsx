'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Calendar, Clock, Loader2, Check, XCircle,
  DoorOpen, Hourglass, Banknote, Users, Hash,
  ArrowUpRight, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getInitials, cn, withTimeout } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { isEffectivelyOffline } from '@/hooks/useNetworkStatus';
import offlineDb from '@/lib/db/offline-db';
import Link from 'next/link';

// ─── Helper: Get today's date string (YYYY-MM-DD) ──────────────────────────
function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── Data Fetcher: Today's Waiting Appointments ─────────────────────────────
async function fetchTodayWaitingAppointments(clinicId: string) {
  const supabase = createClient();
  const todayStr = getTodayDateString();
  const todayStart = `${todayStr}T00:00:00`;
  const todayEnd = `${todayStr}T23:59:59`;

  const tryLocal = async () => {
    const local = await offlineDb.appointments
      .where('clinic_id')
      .equals(clinicId)
      .and(a => {
        const aptDate = a.start_time?.split('T')[0];
        return aptDate === todayStr;
      })
      .toArray();
    return local
      .map(a => ({ ...a, _local: true }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  if (await isEffectivelyOffline()) return tryLocal();

  try {
    const result = await withTimeout(
      supabase
        .from('appointments')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
        .order('created_at', { ascending: true }),
      5000
    );
    const { data, error } = result as { data: any[]; error: any };
    if (error) throw error;

    // Cache locally
    if (data && data.length > 0) {
      try {
        const pendingApts = new Set(await offlineDb.appointments.where('_synced').equals(0).primaryKeys());
        const toPut = data.filter((a: any) => !pendingApts.has(a.id)).map((a: any) => ({ ...a, _synced: 1 as const }));
        if (toPut.length > 0) await offlineDb.appointments.bulkPut(toPut);
      } catch (e) {
        console.warn('Failed to cache today appointments locally', e);
      }
    }

    // Merge unsynced local records
    try {
      const unsynced = await offlineDb.appointments
        .where('clinic_id').equals(clinicId)
        .and(a => a._synced === 0 && a.start_time?.split('T')[0] === todayStr)
        .toArray();
      const serverIds = new Set((data ?? []).map((r: any) => r.id));
      const pendingLocal = unsynced
        .filter(a => !serverIds.has(a.id))
        .map(a => ({ ...a, _local: true }));
      return [...pendingLocal, ...(data ?? [])]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } catch {
      return (data ?? []).sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
  } catch {
    return tryLocal();
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export function TodayWaitingQueue() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const supabase = createClient();

  // Track which rows are animating out
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  // Track which rows have been paid
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());

  const { data: allTodayAppointments, isLoading, refetch } = useQuery({
    queryKey: ['today-waiting-queue', clinicId],
    queryFn: () => fetchTodayWaitingAppointments(clinicId!),
    enabled: !!clinicId,
    networkMode: 'always',
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });

  // Filter: Only show waiting patients (hide in_consultation, completed, cancelled)
  const waitingAppointments = useMemo(() => {
    if (!allTodayAppointments) return [];
    return allTodayAppointments.filter(
      (apt: any) =>
        !removingIds.has(apt.id) &&
        apt.status !== 'in_consultation' &&
        apt.status !== 'completed' &&
        apt.status !== 'cancelled'
    );
  }, [allTodayAppointments, removingIds]);

  // Total count for today (all statuses)
  const totalTodayCount = allTodayAppointments?.length ?? 0;
  const waitingCount = waitingAppointments.length;
  const inConsultationCount = useMemo(() => {
    return allTodayAppointments?.filter((a: any) => a.status === 'in_consultation').length ?? 0;
  }, [allTodayAppointments]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (await isEffectivelyOffline()) {
        const now = new Date().toISOString();
        await offlineDb.appointments.update(id, {
          status,
          updated_at: now,
          _synced: 0 as const,
        });
        await offlineDb.offline_queue.add({
          action: 'UPDATE_APPOINTMENT_STATUS',
          table: 'appointments',
          payload: { id, status },
          created_at: now,
          retries: 0,
        });
        return;
      }
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id)
        .select('id')
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      // Force immediate refetch (not just invalidation) to guarantee UI updates
      qc.refetchQueries({ queryKey: ['today-waiting-queue'] });
      qc.refetchQueries({ queryKey: ['dashboard-data'] });
      qc.refetchQueries({ queryKey: ['appointments'] });
      qc.refetchQueries({ queryKey: ['reports-data'] });
    },
    onError: (err: any) => {
      toast({
        title: 'خطأ في التحديث',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const collectPayment = useMutation({
    networkMode: 'always',
    mutationFn: async ({ id }: { id: string }) => {
      if (await isEffectivelyOffline()) {
        const now = new Date().toISOString();
        await offlineDb.appointments.update(id, {
          status: 'confirmed',
          updated_at: now,
          _synced: 0 as const,
        });
        await offlineDb.offline_queue.add({
          action: 'UPDATE_APPOINTMENT_STATUS',
          table: 'appointments',
          payload: { id, status: 'confirmed' },
          created_at: now,
          retries: 0,
        });
        return;
      }
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', id)
        .select('id')
        .single();
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      setPaidIds(prev => new Set(prev).add(variables.id));
      toast({
        title: 'تم التحصيل ✓',
        description: 'تم تسجيل الدفع بنجاح وتحديث السجلات المالية.',
      });
      // Force immediate refetch of ALL related queries across all pages
      qc.refetchQueries({ queryKey: ['today-waiting-queue'] });
      qc.refetchQueries({ queryKey: ['dashboard-data'] });
      qc.refetchQueries({ queryKey: ['appointments'] });
      qc.refetchQueries({ queryKey: ['reports-data'] });
    },
    onError: (err: any) => {
      toast({
        title: 'خطأ في التحصيل',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleEnterToDoctor = useCallback(
    (id: string) => {
      // Animate out first, then update
      setRemovingIds(prev => new Set(prev).add(id));
      setTimeout(() => {
        updateStatus.mutate({ id, status: 'in_consultation' });
        toast({
          title: 'دخل للطبيب ✓',
          description: 'تم تحويل المريض لغرفة الكشف.',
        });
      }, 400);
    },
    [updateStatus, toast]
  );

  const handleCollectPayment = useCallback(
    (id: string) => {
      collectPayment.mutate({ id });
    },
    [collectPayment]
  );

  // ─── Today Label ──────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              قائمة انتظار اليوم
            </h2>
          </div>
        </div>
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                قائمة انتظار اليوم
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{todayLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Stats Pills */}
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-xl">
              <Hourglass className="h-3.5 w-3.5" />
              <span className="text-xs font-black tabular-nums">{waitingCount} بالانتظار</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-xl">
              <DoorOpen className="h-3.5 w-3.5" />
              <span className="text-xs font-black tabular-nums">{inConsultationCount} عند الطبيب</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-xl">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs font-black tabular-nums">{totalTodayCount} إجمالي</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Link href="/dashboard/appointments">
              <Button variant="link" className="text-primary font-bold text-xs gap-1">
                عرض الكل
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Table Header ────────────────────────────────────────────────── */}
      {waitingAppointments.length > 0 && (
        <div className="hidden md:grid md:grid-cols-[60px_1fr_120px_140px_180px_80px] gap-4 px-6 sm:px-8 py-3 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span className="text-center">الترتيب</span>
          <span>المريض</span>
          <span className="text-center">وقت الحجز</span>
          <span className="text-center">التحصيل</span>
          <span className="text-center">الحالة</span>
          <span className="text-center">المبلغ</span>
        </div>
      )}

      {/* ─── Appointment Rows ────────────────────────────────────────────── */}
      <div className="p-2 sm:p-3">
        {waitingAppointments.length > 0 ? (
          <div className="space-y-1">
            {waitingAppointments.map((apt: any, index: number) => {
              const queueNumber = index + 1;
              const isPaid = paidIds.has(apt.id) || apt.status === 'confirmed';
              const isRemoving = removingIds.has(apt.id);

              return (
                <div
                  key={apt.id}
                  className={cn(
                    'grid grid-cols-1 md:grid-cols-[60px_1fr_120px_140px_180px_80px] gap-4 items-center p-4 rounded-2xl transition-all duration-300',
                    'hover:bg-slate-50/80 dark:hover:bg-slate-800/20 group',
                    isRemoving && 'opacity-0 -translate-x-8 scale-95 pointer-events-none',
                    queueNumber === 1 && 'bg-primary/[0.03] border border-primary/10'
                  )}
                  style={{
                    transitionProperty: 'opacity, transform, background-color',
                  }}
                >
                  {/* Queue Number */}
                  <div className="flex items-center justify-center md:justify-center gap-2 md:gap-0">
                    <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider">الترتيب</span>
                    <div
                      className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center font-black text-lg tabular-nums transition-colors',
                        queueNumber === 1
                          ? 'bg-primary text-white shadow-md shadow-primary/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      )}
                    >
                      {queueNumber}
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black text-base shrink-0">
                      {getInitials(apt.manual_patient_name || 'م')}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 truncate">
                        {apt.manual_patient_name || 'مريض مجهول'}
                        {apt._local && (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 bg-amber-50 text-amber-600 border-amber-100 shrink-0"
                          >
                            أوفلاين
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {apt.type === 'follow_up' ? 'متابعة' : apt.type === 'emergency' ? 'طوارئ' : 'كشف عام'}
                      </span>
                    </div>
                  </div>

                  {/* Booking Time */}
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-300" />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                      {new Date(apt.start_time).toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Payment */}
                  <div className="flex items-center justify-center">
                    {isPaid ? (
                      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-3 py-1.5 rounded-xl">
                        <Check className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-black">تم التحصيل</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl text-[11px] font-black border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 gap-1.5 transition-all"
                        onClick={() => handleCollectPayment(apt.id)}
                        disabled={collectPayment.isPending}
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        تحصيل
                      </Button>
                    )}
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center justify-center gap-2">
                    {apt.status === 'in_consultation' ? (
                      <Badge className="bg-blue-500/10 text-blue-600 border-none px-3 py-1.5 rounded-xl font-black text-[10px] gap-1.5">
                        <DoorOpen className="h-3 w-3" />
                        عند الطبيب
                      </Badge>
                    ) : (
                      <>
                        {/* Waiting Badge */}
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2 py-1 rounded-lg">
                          <Hourglass className="h-3 w-3" />
                          <span className="text-[10px] font-black">انتظار</span>
                        </div>
                        {/* Enter to Doctor Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-xl text-[10px] font-black border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 gap-1 transition-all hover:shadow-sm"
                          onClick={() => handleEnterToDoctor(apt.id)}
                          disabled={updateStatus.isPending}
                        >
                          <DoorOpen className="h-3 w-3" />
                          دخل للطبيب
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-black text-emerald-600 tabular-nums">
                      {apt.amount || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold mr-1">ر.س</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400 font-bold flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
              <Calendar className="h-8 w-8 text-slate-200" />
            </div>
            <div>
              <p className="text-base font-black text-slate-500">لا يوجد مرضى بالانتظار</p>
              <p className="text-sm text-slate-400 mt-1">
                {totalTodayCount > 0
                  ? `تم استقبال جميع المرضى (${totalTodayCount} مريض اليوم)`
                  : 'لم يتم تسجيل أي موعد لليوم بعد'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
