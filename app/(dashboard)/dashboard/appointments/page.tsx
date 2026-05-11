'use client';

import { useState } from 'react';
import { 
  Calendar, Search, Filter, Plus, Loader2, 
  Clock, CheckCircle, XCircle, Check, MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { AddAppointmentModal } from '@/components/dashboard/AddAppointmentModal';
import { getInitials, withTimeout } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function AppointmentsPage() {
  const { clinicId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const supabase = createClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', clinicId],
    queryFn: async () => {


      // ── Offline or Supabase unreachable → use IndexedDB ──────────────
      const tryLocal = async () => {
        const { default: offlineDb } = await import('@/lib/db/offline-db');
        const local = await offlineDb.appointments
          .where('clinic_id')
          .equals(clinicId!)
          .toArray();
        // shape matches Supabase rows closely enough for the UI
        return local.map((a) => ({ ...a, _local: true }));
      };

      if (!navigator.onLine) return tryLocal();

      // ── Online: fetch from Supabase with a 5-second timeout ───────────
      try {
        const result = await withTimeout(
          supabase
            .from('appointments')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('start_time', { ascending: false }),
          5000
        );
        const { data, error } = result as { data: any[]; error: any };
        if (error) throw error;

        // Update local DB cache with fresh server data
        if (data && data.length > 0) {
          try {
            const { default: offlineDb } = await import('@/lib/db/offline-db');
            const toPut = data.map((a: any) => ({ ...a, _synced: 1 as const }));
            await offlineDb.appointments.bulkPut(toPut);
          } catch (e) {
            console.warn('Failed to cache appointments locally', e);
          }
        }

        // Also include any unsynced local records not yet sent to server
        try {
          const { default: offlineDb } = await import('@/lib/db/offline-db');
          const unsynced = await offlineDb.appointments
            .where('clinic_id').equals(clinicId!)
            .and((a) => a._synced === 0)
            .toArray();
          const serverIds = new Set((data ?? []).map((r: any) => r.id));
          const pendingLocal = unsynced
            .filter((a) => !serverIds.has(a.id))
            .map((a) => ({ ...a, _local: true }));
          return [...pendingLocal, ...(data ?? [])];
        } catch {
          return data ?? [];
        }
      } catch {
        // Supabase unreachable (timeout, no internet despite onLine flag)
        return tryLocal();
      }
    },
    enabled: !!clinicId,
    networkMode: 'always',
  });


  const updateStatus = useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', clinicId] });
      qc.invalidateQueries({ queryKey: ['dashboard-data', clinicId] });
      toast({ title: 'تم التحديث', description: 'تم تحديث حالة الموعد بنجاح.' });
    }
  });

  const filteredAppointments = appointments?.filter((apt: any) => 
    apt.manual_patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">جدول المواعيد</h1>
          <p className="text-muted-foreground mt-1">تتبع وإدارة مواعيد المرضى والتحصيلات المالية.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 gap-2">
          <Plus className="h-5 w-5" />
          حجز جديد
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="بحث باسم المريض..." 
            className="h-12 pr-12 rounded-2xl bg-white border-muted/50 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-12 rounded-2xl px-6 border-muted/50 bg-white gap-2">
          <Filter className="h-4 w-4" />
          تصفية
        </Button>
      </div>

      {/* Appointments List/Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAppointments && filteredAppointments.length > 0 ? (
          filteredAppointments.map((apt: any) => (
            <Card key={apt.id} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden rounded-3xl">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center p-6 gap-6">
                  {/* Left: Patient Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-black">
                      {getInitials(apt.manual_patient_name || 'M')}
                    </div>
                    <div>
                      <h3 className="font-black text-lg flex items-center gap-2">
                        {apt.manual_patient_name || 'مريض مجهول'}
                        {apt._local && (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] font-black border-none rounded-md px-2 py-0">محلي</Badge>
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary/60" /> {new Date(apt.start_time).toLocaleDateString('ar-SA')} - {new Date(apt.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{apt.amount || 0} ريال</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions & Status */}
                  <div className="flex items-center gap-3 border-t sm:border-none pt-4 sm:pt-0">
                    {apt.status === 'confirmed' ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-5 py-2 rounded-2xl gap-2 font-bold">
                        <CheckCircle className="h-4 w-4" /> موعد مؤكد ومحصل
                      </Badge>
                    ) : apt.status === 'cancelled' ? (
                      <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 px-5 py-2 rounded-2xl gap-2 font-bold">
                        <XCircle className="h-4 w-4" /> تم الإلغاء
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          className="rounded-2xl h-11 px-5 text-red-500 hover:bg-red-50 border-red-100 font-bold"
                          onClick={() => updateStatus.mutate({ id: apt.id, status: 'cancelled' })}
                          disabled={updateStatus.isPending}
                        >
                          إلغاء الموعد
                        </Button>
                        <Button 
                          className="rounded-2xl h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200"
                          onClick={() => updateStatus.mutate({ id: apt.id, status: 'confirmed' })}
                          disabled={updateStatus.isPending}
                        >
                          <Check className="h-4 w-4 ml-2" /> تأكيد الموعد
                        </Button>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" className="rounded-xl h-11 w-11">
                      <MoreVertical className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-muted">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium text-lg">لا توجد مواعيد مطابقة للبحث</p>
            <Button variant="link" className="mt-2 text-primary font-bold" onClick={() => setSearchTerm('')}>عرض كل المواعيد</Button>
          </div>
        )}
      </div>

      <AddAppointmentModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
