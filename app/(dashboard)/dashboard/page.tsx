'use client';

import { useState } from 'react';
import { 
  Users, Calendar, Receipt, Stethoscope, 
  Plus, Loader2,
  TrendingUp,
  FileText, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { AddAppointmentModal } from '@/components/dashboard/AddAppointmentModal';
import { TodayWaitingQueue } from '@/components/dashboard/TodayWaitingQueue';
import { cn, withTimeout } from '@/lib/utils';
import Link from 'next/link';
import { isEffectivelyOffline } from '@/hooks/useNetworkStatus';
import offlineDb from '@/lib/db/offline-db';

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
      const pendingPatients = new Set(await offlineDb.patients.where('_synced').equals(0).primaryKeys());
      const pendingDoctors = new Set(await offlineDb.doctors.where('_synced').equals(0).primaryKeys());
      const pendingApts = new Set(await offlineDb.appointments.where('_synced').equals(0).primaryKeys());

      if (patients.data) {
        const toPut = patients.data.filter((p: any) => !pendingPatients.has(p.id)).map((p: any) => ({ ...p, _synced: 1 as const }));
        if (toPut.length > 0) await offlineDb.patients.bulkPut(toPut);
      }
      if (doctors.data) {
        const toPut = doctors.data.filter((d: any) => !pendingDoctors.has(d.id)).map((d: any) => ({ ...d, _synced: 1 as const }));
        if (toPut.length > 0) await offlineDb.doctors.bulkPut(toPut);
      }
      if (latestApts.data) {
        const toPut = latestApts.data.filter((a: any) => !pendingApts.has(a.id)).map((a: any) => ({ ...a, _synced: 1 as const }));
        if (toPut.length > 0) await offlineDb.appointments.bulkPut(toPut);
      }
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
  if (loading || !clinicId || isLoading) {
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

  const todayLabel = new Date().toLocaleDateString('ar-SA', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-20">
      
      {/* Top Professional Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            مرحباً، {profile?.full_name ?? 'دكتور'}
          </h1>
          <p className="text-slate-500 font-medium mt-1">إليك نظرة شاملة على أداء العيادة اليوم {todayLabel}</p>
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
          <TodayWaitingQueue />
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
              
              <Link href="/dashboard/reports">
                <Button className="w-full h-14 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-100 shadow-xl">عرض التقارير التفصيلية</Button>
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-black text-xl mb-6 flex items-center gap-3">
              <Plus className="h-5 w-5 text-primary" />
              روابط سريعة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'إضافة مريض', href: '/dashboard/patients', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50/50' },
                { label: 'تقرير مالي', href: '/dashboard/billing', icon: Receipt, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
                { label: 'سجل طبي', href: '/dashboard/medical-records', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50/50' },
                { label: 'الإعدادات', href: '/dashboard/settings', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50/50' },
              ].map((link, i) => (
                <Link key={i} href={link.href} className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all hover:scale-[1.02] group">
                  <div className={cn("p-3 rounded-xl transition-colors group-hover:bg-white dark:group-hover:bg-slate-700 shadow-sm", link.bg)}>
                    <link.icon className={cn("h-6 w-6", link.color)} />
                  </div>
                  <span className="text-xs font-black text-slate-600 dark:text-slate-400">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AddAppointmentModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
