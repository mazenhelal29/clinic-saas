'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, Users, CreditCard, ShieldAlert, 
  TrendingUp, Search, 
  CheckCircle2, XCircle, MoreVertical,
  Activity, Loader2, ArrowRight, ShieldCheck, Zap,
  LayoutDashboard, Settings, UserPlus, FileText,
  Crown, LogOut, Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClient();
  const { toast } = useToast();
  const { user, profile, loading, signOut } = useAuth();
  const qc = useQueryClient();
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});
  const [extendDays, setExtendDays] = useState<Record<string, number>>({});

  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.email !== 'mazenhelal29@gmail.com' && profile?.role !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [user, profile, loading, router]);

  // Fetch Platform Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const [clinics, users, active, patients, appointments, revenueData] = await Promise.all([
        supabase.from('clinics').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('clinics').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('amount').eq('status', 'confirmed')
      ]);

      const totalRevenue = (revenueData.data || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      return {
        totalClinics: clinics.count || 0,
        totalUsers: users.count || 0,
        activeClinics: active.count || 0,
        expiredClinics: (clinics.count || 0) - (active.count || 0),
        totalPatients: patients.count || 0,
        totalAppointments: appointments.count || 0,
        totalRevenue: totalRevenue
      };
    },
    refetchInterval: 10000,
  });

  // Fetch All Clinics
  const { data: clinics, isLoading: clinicsLoading } = useQuery({
    queryKey: ['super-admin-clinics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch Packages
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['super-admin-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_packages')
        .select('*')
        .order('duration_months', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (packages) {
      const initial: Record<string, number> = {};
      packages.forEach((pkg: any) => initial[pkg.id] = pkg.price);
      setLocalPrices(initial);
    }
  }, [packages]);

  // Mutations
  const toggleSub = useMutation({
    mutationFn: async ({ id, status, days, currentExpiry }: { id: string, status: string, days?: number, currentExpiry?: string }) => {
      const updates: any = { subscription_status: status };
      if (days !== undefined) {
        const baseTime = (currentExpiry && new Date(currentExpiry).getTime() > Date.now()) 
          ? new Date(currentExpiry).getTime() 
          : Date.now();
        updates.subscription_expiry = new Date(baseTime + (days * 24 * 60 * 60 * 1000)).toISOString();
      }
      const { error } = await supabase.from('clinics').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin-clinics'] });
      qc.invalidateQueries({ queryKey: ['super-admin-stats'] });
      toast({ title: 'تم التحديث', description: 'تم التعديل بنجاح.' });
    }
  });

  const updatePackage = useMutation({
    mutationFn: async ({ id, price }: { id: string, price: number }) => {
      const { error } = await supabase.from('subscription_packages').update({ price }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin-packages'] });
      toast({ title: 'تم الحفظ', description: 'تم تحديث السعر بنجاح.' });
    }
  });

  const filteredClinics = clinics?.filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const sidebarLinks = [
    { id: 'overview', label: 'لوحة القيادة', icon: LayoutDashboard },
    { id: 'clinics', label: 'إدارة العيادات', icon: Building2 },
    { id: 'billing', label: 'الباقات والأسعار', icon: CreditCard },
    { id: 'settings', label: 'إعدادات النظام', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] font-cairo flex" dir="rtl">
      
      {/* Super Admin Sidebar */}
      <aside className="w-72 bg-slate-900 text-slate-300 hidden lg:flex flex-col border-l border-slate-800 shadow-2xl z-50">
        <div className="h-20 flex items-center px-8 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">ClinicOS</h1>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <link.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {link.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="h-5 w-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-40">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {sidebarLinks.find(l => l.id === activeTab)?.label}
            </h2>
            <p className="text-sm font-bold text-slate-500 mt-0.5">
              مرحباً بك مجدداً في مركز التحكم الرئيسي للمنصة.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </button>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
              SA
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'إجمالي العيادات', value: stats?.totalClinics, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'الاشتراكات النشطة', value: stats?.activeClinics, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'الأرباح المقدرة', value: `${(stats?.totalRevenue ?? 0).toLocaleString()} ﷼`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'سجلات المرضى', value: stats?.totalPatients, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                  ].map((stat, i) => (
                    <Card key={i} className="border-none bg-white dark:bg-slate-900 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                          <stat.icon className={`h-8 w-8 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-400 mb-1">{stat.label}</p>
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : stat.value ?? 0}
                          </h3>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-none bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
                    <CardContent className="p-8 relative z-10">
                      <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-emerald-400" />
                        حالة النظام والخوادم
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center border border-white/10">
                          <span className="font-bold text-slate-300">اتصال قاعدة البيانات</span>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-bold">مستقر 100%</Badge>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center border border-white/10">
                          <span className="font-bold text-slate-300">معدل استهلاك المعالج</span>
                          <Badge className="bg-blue-500/20 text-blue-400 border-none font-bold">14% طبيعي</Badge>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center border border-white/10">
                          <span className="font-bold text-slate-300">تخزين الملفات (Storage)</span>
                          <Badge className="bg-amber-500/20 text-amber-400 border-none font-bold">45GB مستخدم</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none bg-white dark:bg-slate-900 rounded-3xl shadow-sm">
                    <CardHeader className="p-8 pb-4">
                      <CardTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="h-6 w-6 text-primary" />
                        النشاط الأخير للعيادات
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                      <div className="space-y-6">
                        {clinics?.slice(0, 4).map((c: any) => (
                          <div key={c.id} className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-500">
                              {c.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="font-black text-slate-900 dark:text-white text-sm">{c.name}</p>
                              <p className="text-xs font-bold text-slate-400 mt-0.5">تم الانضمام: {new Date(c.created_at).toLocaleDateString('ar-SA')}</p>
                            </div>
                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none font-bold">
                              عيادة جديدة
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* TAB: CLINICS */}
            {activeTab === 'clinics' && (
              <Card className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    <CardTitle className="text-2xl font-black text-slate-900 dark:text-white mb-1">العيادات المشتركة</CardTitle>
                    <CardDescription className="text-slate-500 font-medium text-sm">تحكم كامل بصلاحيات العيادات واشتراكاتها.</CardDescription>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute right-4 top-3.5 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="ابحث باسم العيادة..." 
                      className="h-11 pr-11 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 font-bold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 text-xs font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/50">
                        <tr>
                          <th className="p-6 whitespace-nowrap">اسم العيادة / المالك</th>
                          <th className="p-6 whitespace-nowrap">حالة النظام</th>
                          <th className="p-6 whitespace-nowrap">الصلاحية والتاريخ</th>
                          <th className="p-6 whitespace-nowrap">التحكم السريع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {clinicsLoading && (
                          <tr>
                            <td colSpan={4} className="p-16 text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                            </td>
                          </tr>
                        )}
                        {filteredClinics?.map((c: any) => {
                          const expiry = new Date(c.subscription_expiry);
                          const isExpired = expiry < new Date();
                          const daysLeft = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          const isActive = c.subscription_status === 'active' && !isExpired;
                          
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-200">
                              {/* Clinic Info */}
                              <td className="p-6">
                                <div className="flex items-center gap-4">
                                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 font-black text-lg border border-slate-200/50 dark:border-slate-700/50">
                                    {c.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900 dark:text-white text-base tracking-tight">{c.name}</p>
                                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">
                                      ID: <span className="font-mono text-slate-500">{c.owner_id ? c.owner_id.substring(0, 8) : 'N/A'}</span>
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="p-6">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${isActive ? 'bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-red-50/50 border-red-200/50 dark:bg-red-500/10 dark:border-red-500/20'}`}>
                                  <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                  </span>
                                  <span className={`text-xs font-bold ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {isActive ? 'الاشتراك نشط' : 'متوقف'}
                                  </span>
                                </div>
                              </td>

                              {/* Expiry Date */}
                              <td className="p-6">
                                <div className="flex flex-col gap-1.5">
                                  <span className="font-black text-slate-700 dark:text-slate-200 text-sm">
                                    {expiry.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                  {isActive ? (
                                    <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-500">
                                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 max-w-[60px]">
                                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (daysLeft / 365) * 100)}%` }} />
                                      </div>
                                      <span className="text-emerald-600 dark:text-emerald-400">متبقي {daysLeft} يوم</span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] font-black text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-md w-fit">
                                      انتهت الصلاحية
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="p-6">
                                <div className="flex items-center gap-3 w-fit">
                                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                                    <Input 
                                      type="number" 
                                      className="w-16 h-10 text-center text-sm font-black text-slate-900 dark:text-white border-none bg-transparent focus-visible:ring-0 rounded-none" 
                                      placeholder="أيام"
                                      value={extendDays[c.id] !== undefined ? extendDays[c.id] : 30}
                                      onChange={(e) => setExtendDays({ ...extendDays, [c.id]: Number(e.target.value) })}
                                    />
                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                                    <Button 
                                      className="h-10 rounded-none px-4 font-black text-xs bg-transparent text-primary hover:bg-primary hover:text-white transition-all gap-1.5"
                                      onClick={() => toggleSub.mutate({ 
                                        id: c.id, 
                                        status: 'active', 
                                        days: extendDays[c.id] !== undefined ? extendDays[c.id] : 30,
                                        currentExpiry: c.subscription_expiry
                                      })}
                                      disabled={toggleSub.isPending}
                                    >
                                      <TrendingUp className="h-3.5 w-3.5" /> تمديد
                                    </Button>
                                  </div>

                                  {isActive ? (
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      className="h-10 w-10 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:hover:bg-red-900/30 rounded-xl"
                                      onClick={() => toggleSub.mutate({ id: c.id, status: 'suspended' })}
                                      title="إيقاف العيادة"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      className="h-10 w-10 text-emerald-500 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-900 dark:hover:bg-emerald-900/30 rounded-xl"
                                      onClick={() => toggleSub.mutate({ id: c.id, status: 'active' })}
                                      title="تنشيط العيادة"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TAB: BILLING */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <Card className="border-none bg-gradient-to-br from-primary to-blue-600 rounded-3xl text-white shadow-lg shadow-primary/20">
                  <CardContent className="p-8">
                    <h2 className="text-3xl font-black mb-2 tracking-tight">إدارة باقات الاشتراك</h2>
                    <p className="text-white/80 font-medium text-sm max-w-lg">
                      تعديل أسعار الباقات سينعكس فوراً على واجهة المشتركين الجدد. تأكد من مراجعة التغييرات قبل الحفظ.
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packagesLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary m-auto col-span-full py-12" />
                  ) : (
                    packages?.map((pkg: any) => (
                      <Card key={pkg.id} className="border-none bg-white dark:bg-slate-900 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                        <div className="absolute top-0 w-full h-1.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-primary transition-colors" />
                        <CardContent className="p-8 pt-10">
                          <div className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-xl font-black text-sm w-fit mb-6">
                            المدة: {pkg.duration_months} أشهر
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8">{pkg.name_ar}</h3>
                          <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                              السعر الحالي (ريال سعودي)
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-3.5 text-slate-400 font-black">SAR</span>
                              <Input 
                                type="number"
                                className="h-14 pl-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-black text-slate-900 dark:text-white text-xl focus:ring-2 focus:ring-primary/20"
                                value={localPrices[pkg.id] ?? ''}
                                onChange={(e) => setLocalPrices(prev => ({ ...prev, [pkg.id]: Number(e.target.value) }))}
                              />
                            </div>
                            <Button 
                              className="w-full h-12 rounded-xl font-black text-sm mt-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all"
                              onClick={() => updatePackage.mutate({ id: pkg.id, price: localPrices[pkg.id] })}
                              disabled={updatePackage.isPending || localPrices[pkg.id] === pkg.price}
                            >
                              {updatePackage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'تحديث السعر'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <Card className="border-none bg-white dark:bg-slate-900 rounded-3xl shadow-sm text-center py-20">
                <Settings className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">إعدادات النظام العامة</h3>
                <p className="text-slate-500 font-medium">هذه الصفحة قيد التطوير وستتضمن قريباً إعدادات بوابة الدفع والرسائل النصية.</p>
              </Card>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
