'use client';

import { useState } from 'react';
import { 
  Users, Calendar, Receipt, Stethoscope, 
  Plus, Loader2, Clock, CheckCircle, XCircle, Check, 
  ArrowUpRight, TrendingUp, UserCheck, ChevronDown,
  FileText, Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { AddAppointmentModal } from '@/components/dashboard/AddAppointmentModal';
import { getInitials, cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { isEffectivelyOffline } from '@/hooks/useNetworkStatus';
import offlineDb from '@/lib/db/offline-db';
import { withTimeout } from '@/lib/utils';

async function fetchDashboardData(clinicId: string) {
  const supabase = createClient();

  const tryLocal = async () => {
    const [patientsCount, appointmentsCount, doctorsCount, revenueData, latestApts] = await Promise.all([
      offlineDb.patients.where('clinic_id').equals(clinicId).count(),
      offlineDb.appointments.where('clinic_id').equals(clinicId).count(),
      offlineDb.doctors.where('clinic_id').equals(clinicId).count(),
      offlineDb.appointments.where('clinic_id').equals(clinicId).and(a => a.status === 'confirmed').toArray(),
      offlineDb.appointments.where('clinic_id').equals(clinicId).reverse().sortBy('start_time')
    ]);
    
    const totalRevenue = revenueData.reduce((acc, curr) => acc + (Number((curr as any).amount) || 0), 0);
    
    return {
      totalPatients: patientsCount,
      totalAppointments: appointmentsCount,
      activeDoctors: doctorsCount,
      revenue: totalRevenue,
      latestAppointments: latestApts.slice(0, 6)
    };
  };

  if (await isEffectivelyOffline()) return tryLocal();
  
  try {
    const results = await withTimeout(
      Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('doctors').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('appointments').select('amount').eq('clinic_id', clinicId).eq('status', 'confirmed'),
        supabase.from('appointments').select('*').eq('clinic_id', clinicId).order('start_time', { ascending: false }).limit(6)
      ]),
      5000
    );
    
    const [patients, appointments, doctors, revenueData, latestApts] = results;
    
    // Proactive Cache Update: Hydrate local DB with fresh data from server
    try {
      if (patients.data) await offlineDb.patients.bulkPut(patients.data.map((p: any) => ({ ...p, _synced: 1 })));
      if (doctors.data) await offlineDb.doctors.bulkPut(doctors.data.map((d: any) => ({ ...d, _synced: 1 })));
      if (latestApts.data) await offlineDb.appointments.bulkPut(latestApts.data.map((a: any) => ({ ...a, _synced: 1 })));
    } catch (e) {
      console.warn('Dashboard proactive sync failed', e);
    }

    // Merge unsynced local appointments to show them even when online
    let mergedApts = latestApts.data || [];
    let extraRevenue = 0;
    try {
      const unsynced = await offlineDb.appointments
        .where('clinic_id').equals(clinicId)
        .and(a => a._synced === 0)
        .toArray();
      
      const serverIds = new Set(mergedApts.map((a:any) => a.id));
      const pendingLocal = unsynced
        .filter(a => !serverIds.has(a.id))
        .map(a => ({ ...a, _local: true }));
      
      mergedApts = [...pendingLocal, ...mergedApts]
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        .slice(0, 6);

      // Add revenue from unsynced confirmed appointments
      extraRevenue = unsynced
        .filter(a => a.status === 'confirmed')
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    } catch (e) {
      console.warn('Dashboard merge unsynced failed', e);
    }

    let extraPatients = 0;
    let extraAppointments = 0;
    try {
      extraPatients = await offlineDb.patients.where('clinic_id').equals(clinicId).and(p => p._synced === 0).count();
      extraAppointments = await offlineDb.appointments.where('clinic_id').equals(clinicId).and(a => a._synced === 0).count();
    } catch (e) {
      console.warn('Dashboard count merge failed', e);
    }

    const serverRevenue = (revenueData.data || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalRevenue = serverRevenue + extraRevenue;
    
    return {
      totalPatients: (patients.count || 0) + extraPatients,
      totalAppointments: (appointments.count || 0) + extraAppointments,
      activeDoctors: doctors.count || 0,
      revenue: totalRevenue,
      latestAppointments: mergedApts
    };
  } catch {
    return tryLocal();
  }
}

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, profile, clinicId, loading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const supabase = createClient();
  const router = useRouter();
  const role = profile?.role;

  // Redirect Super Admin to their dedicated dashboard
  useEffect(() => {
    // FORCE REDIRECT FOR SUPER ADMIN EMAIL
    if (user?.email === 'mazenhelal29@gmail.com') {
      console.log('Detected platform owner, forcing super-admin access');
      router.replace('/super-admin');
      return;
    }

    if (!loading && role === 'super_admin') {
      router.replace('/super-admin');
    }
  }, [role, user, loading, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-data', clinicId],
    queryFn: () => fetchDashboardData(clinicId!),
    enabled: !!clinicId,
    networkMode: 'always',
  });

  const updateStatus = useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      if (await isEffectivelyOffline()) {
        const now = new Date().toISOString();
        await offlineDb.appointments.update(id, { 
          status, 
          updated_at: now,
          _synced: 0 as const 
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
        .update({ status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['dashboard-data', clinicId] });
      toast({ 
        title: variables.status === 'confirmed' ? 'تم التأكيد' : 'تم الإلغاء', 
        description: 'تم تحديث حالة الموعد وتحديث السجلات المالية.' 
      });
    },
    onError: (err: any) => {
      toast({ title: 'خطأ في التحديث', description: err.message, variant: 'destructive' });
    }
  });

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center bg-slate-50/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <p className="text-sm font-medium text-slate-400 animate-pulse">جاري تحضير البيانات...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: 'إجمالي المرضى',      value: data?.totalPatients ?? 0,      icon: Users,      color: 'text-blue-600',    bg: 'bg-blue-50/50',    trend: '+12%' },
    { title: 'المواعيد الكلية',    value: data?.totalAppointments ?? 0,   icon: Calendar,   color: 'text-indigo-600',  bg: 'bg-indigo-50/50',  trend: '+5%' },
    { title: 'صافي الإيرادات',     value: `${(data?.revenue ?? 0).toLocaleString()} ريال`, icon: Receipt,    color: 'text-emerald-600', bg: 'bg-emerald-50/50', trend: '+18%' },
    { title: 'الكادر الطبي',       value: data?.activeDoctors ?? 0,      icon: Stethoscope,color: 'text-orange-600',  bg: 'bg-orange-50/50',  trend: 'نشط' },
  ];

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-20">
      
      {/* Top Professional Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            مرحباً، {profile?.full_name ?? 'دكتور'}
          </h1>
          <p className="text-slate-500 font-medium mt-1">إليك نظرة شاملة على أداء العيادة اليوم {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">النظام متصل</span>
          </div>
          <Button 
            className="rounded-xl h-12 px-6 font-black gap-2 shadow-lg shadow-primary/20" 
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-5 w-5" /> حجز موعد جديد
          </Button>
        </div>
      </div>

      {/* Stats Grid - Cleaner & More Informative */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-lg", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{stat.trend}</span>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main List Area */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-black text-slate-900 dark:text-white">جدول المواعيد اليوم</h2>
              </div>
              <Link href="/dashboard/appointments">
                <Button variant="link" className="text-primary font-bold">عرض الجدول الكامل</Button>
              </Link>
            </div>
            
            <div className="p-2 sm:p-4">
              {data?.latestAppointments && data.latestAppointments.length > 0 ? (
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {data.latestAppointments.slice(0, 8).map((apt: any) => (
                    <div key={apt.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors rounded-xl gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black text-lg shrink-0">
                          {getInitials(apt.manual_patient_name || 'M')}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                            {apt.manual_patient_name || 'مريض مجهول'}
                            {apt._local && <Badge variant="outline" className="text-[9px] h-4 bg-amber-50 text-amber-600 border-amber-100">أوفلاين</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 font-medium">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(apt.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>{apt.type || 'كشف عام'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-start md:text-end">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">المبلغ</p>
                          <p className="text-sm font-black text-emerald-600 tabular-nums">{apt.amount || 0} ريال</p>
                        </div>
                        
                        <div className="min-w-[120px] flex justify-end">
                          {apt.status === 'confirmed' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-2 rounded-xl font-black text-[10px] gap-2">
                              <Check className="h-3.5 w-3.5" /> تم التحصيل
                            </Badge>
                          ) : apt.status === 'cancelled' ? (
                            <Badge className="bg-red-500/10 text-red-600 border-none px-4 py-2 rounded-xl font-black text-[10px] gap-2">
                              <XCircle className="h-3.5 w-3.5" /> ملغي
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 rounded-xl text-[10px] font-black border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => updateStatus.mutate({ id: apt.id, status: 'confirmed' })}
                                disabled={updateStatus.isPending}
                              >
                                تأكيد
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 w-9 p-0 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50"
                                onClick={() => updateStatus.mutate({ id: apt.id, status: 'cancelled' })}
                                disabled={updateStatus.isPending}
                              >
                                <XCircle className="h-4.5 w-4.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 font-bold flex flex-col items-center gap-4">
                  <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-slate-200" />
                  </div>
                  <span>لا توجد مواعيد مسجلة لليوم</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Info Sidebar */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-slate-950 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10">
              <div className="p-3 bg-white/10 rounded-2xl w-fit mb-6">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-black mb-2">إحصائيات ذكية</h3>
              <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">أداء العيادة ارتفع بنسبة 24% عن الشهر الماضي. نظام التقارير جاهز للمراجعة.</p>
              
              <div className="space-y-4 mb-8">
                {[
                  { label: 'سعة العيادة اليوم', value: '85%', color: 'bg-primary' },
                  { label: 'معدل رضا المرضى', value: '98%', color: 'bg-emerald-500' }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400">{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", item.color)} style={{ width: item.value }} />
                    </div>
                  </div>
                ))}
              </div>
              
              <Button className="w-full h-14 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-100 shadow-xl">عرض التقارير التفصيلية</Button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-black text-xl mb-6 flex items-center gap-3">
              <Plus className="h-5 w-5 text-primary" />
              روابط سريعة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'إضافة مريض', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50/50' },
                { label: 'تقرير مالي', icon: Receipt, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
                { label: 'سجل طبي', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50/50' },
                { label: 'الإعدادات', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50/50' },
              ].map((link, i) => (
                <button key={i} className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all hover:scale-[1.02] group">
                  <div className={cn("p-3 rounded-xl transition-colors group-hover:bg-white dark:group-hover:bg-slate-700 shadow-sm", link.bg)}>
                    <link.icon className={cn("h-6 w-6", link.color)} />
                  </div>
                  <span className="text-xs font-black text-slate-600 dark:text-slate-400">{link.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AddAppointmentModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
