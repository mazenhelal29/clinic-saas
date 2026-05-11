'use client';

import { useState } from 'react';
import { 
  Users, Calendar, Receipt, Stethoscope, 
  Plus, Loader2, Clock, CheckCircle, XCircle, Check, 
  ArrowUpRight, TrendingUp, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { AddAppointmentModal } from '@/components/dashboard/AddAppointmentModal';
import { getInitials } from '@/lib/utils';
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
      
      {/* Premium Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <Badge className="bg-primary/10 text-primary border-none rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-2">ClinicOS Dashboard</Badge>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              أهلاً بك، <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">{profile?.full_name?.split(' ')[0] ?? 'دكتور'}</span>
            </h1>
            <p className="text-slate-500 text-lg font-medium max-w-xl">لديك {data?.latestAppointments?.filter((a:any) => a.status === 'pending').length ?? 0} مواعيد تنتظر التأكيد اليوم. لنقم بإنجازها!</p>
          </div>
          <Button 
            size="lg" 
            className="rounded-[2rem] h-16 px-10 shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95 bg-primary text-white font-black text-lg gap-3" 
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-6 w-6" />
            حجز سريع
          </Button>
        </div>
        {/* Background Accent */}
        <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[150%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((s) => (
          <Card key={s.title} className="group border-none bg-white dark:bg-slate-900/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-[2.5rem] hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 cursor-default">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`${s.bg} ${s.color} p-4 rounded-3xl transition-transform group-hover:scale-110 duration-500`}>
                  <s.icon className="h-7 w-7" />
                </div>
                <Badge variant="outline" className="rounded-full px-3 border-slate-100 text-slate-400 font-bold text-[10px]">{s.trend}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{s.title}</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Smooth Appointment List */}
        <Card className="xl:col-span-8 rounded-[3rem] border-none bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="p-10 pb-4 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <Clock className="h-6 w-6 text-primary" />
                المواعيد الأخيرة
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium">متابعة الحالات وتأكيد الحضور والتحصيل المالي.</CardDescription>
            </div>
            <Link href="/dashboard/appointments">
               <Button variant="ghost" className="rounded-2xl text-primary font-bold gap-2">عرض الكل <ArrowUpRight className="h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-10 pt-4">
            <div className="space-y-4">
              {(data?.latestAppointments?.length ?? 0) > 0 ? (
                data!.latestAppointments.map((apt: any) => (
                  <div key={apt.id} className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[2rem] bg-slate-50/50 dark:bg-slate-800/30 border border-transparent hover:border-primary/10 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 gap-6">
                    <div className="flex items-center gap-5">
                      <div className="h-16 w-16 rounded-[1.5rem] bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-primary text-xl font-black group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        {getInitials(apt.manual_patient_name || 'M')}
                      </div>
                      <div className="space-y-1">
                        <div className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                          {apt.manual_patient_name || 'مريض مجهول'}
                          {apt._local && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] font-black border-none rounded-md px-2 py-0">محلي</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm font-bold text-slate-400">
                          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {new Date(apt.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-0.5 rounded-full">{apt.amount || 0} ريال</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {apt.status === 'confirmed' ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-black px-6 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                          <CheckCircle className="h-5 w-5" /> مؤكد
                        </div>
                      ) : apt.status === 'cancelled' ? (
                        <div className="flex items-center gap-2 text-red-500 font-black px-6 py-2 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                          <XCircle className="h-5 w-5" /> ملغي
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Button 
                            variant="ghost" 
                            className="rounded-2xl h-12 px-6 text-red-500 hover:bg-red-50 font-bold transition-colors"
                            onClick={() => updateStatus.mutate({ id: apt.id, status: 'cancelled' })}
                            disabled={updateStatus.isPending}
                          >
                            إلغاء
                          </Button>
                          <Button 
                            className="rounded-2xl h-12 px-6 bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-black shadow-lg transition-transform active:scale-95"
                            onClick={() => updateStatus.mutate({ id: apt.id, status: 'confirmed' })}
                            disabled={updateStatus.isPending}
                          >
                            تأكيد الحضور
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                   <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center">
                      <Calendar className="h-10 w-10 text-slate-200" />
                   </div>
                   <p className="text-slate-400 font-bold">لا توجد مواعيد مسجلة اليوم</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Small Progress / Quick Actions */}
        <div className="xl:col-span-4 space-y-8">
           <Card className="rounded-[3rem] border-none bg-primary p-10 text-white shadow-2xl shadow-primary/20 relative overflow-hidden group">
              <div className="relative z-10 space-y-6">
                 <div className="p-3 bg-white/20 rounded-2xl w-fit">
                    <TrendingUp className="h-6 w-6" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black">نمو العيادة</h3>
                    <p className="text-white/70 font-medium">أداء عيادتك ارتفع بنسبة 24% عن الشهر الماضي. عمل رائع!</p>
                 </div>
                 <Button className="w-full h-14 bg-white text-primary font-black rounded-2xl hover:bg-white/90">مشاهدة التقارير</Button>
              </div>
              <div className="absolute bottom-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
           </Card>

           <Card className="rounded-[3rem] border-none bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.02)] p-10">
              <CardTitle className="text-xl font-black mb-6 flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-indigo-500" />
                إحصائيات سريعة
              </CardTitle>
              <div className="space-y-6">
                 {[
                   { label: 'المرضى الجدد', value: '14 مريض', progress: 65, color: 'bg-indigo-500' },
                   { label: 'معدل الحضور', value: '92%', progress: 92, color: 'bg-emerald-500' },
                   { label: 'المواعيد الملغاة', value: '3 مواعيد', progress: 15, color: 'bg-red-400' }
                 ].map((item, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                         <span className="text-slate-500">{item.label}</span>
                         <span className="text-slate-900 dark:text-white">{item.value}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                         <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.progress}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </Card>
        </div>
      </div>

      <AddAppointmentModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
