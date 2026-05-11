'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, Calendar, Receipt, Users, Stethoscope, BarChart3, Activity } from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { arSA } from 'date-fns/locale';

// Simple bar component for visual representation since we don't have complex chart components ready
const SimpleBar = ({ height, label, value }: { height: number, label: string, value: string }) => (
  <div className="flex flex-col items-center gap-2 group">
    <div className="h-40 w-12 bg-slate-100 dark:bg-slate-800 rounded-t-xl relative flex items-end justify-center overflow-hidden">
      <div 
        className="w-full bg-primary/80 group-hover:bg-primary transition-all duration-500 rounded-t-xl"
        style={{ height: `${Math.max(5, height)}%` }}
      />
      <span className="absolute top-2 text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity rotate-[-90deg] whitespace-nowrap">
        {value}
      </span>
    </div>
    <span className="text-xs font-bold text-slate-500">{label}</span>
  </div>
);

export default function ReportsPage() {
  const { clinicId } = useAuth();
  const supabase = createClient();
  const [timeRange, setTimeRange] = useState('month'); // day, week, month, year

  const { data, isLoading } = useQuery({
    queryKey: ['reports-data', clinicId],
    queryFn: async () => {
      // Fetch all appointments for the clinic to aggregate
      const [appointmentsRes, patientsRes, doctorsRes] = await Promise.all([
        supabase.from('appointments').select('id, start_time, status, amount, type').eq('clinic_id', clinicId),
        supabase.from('patients').select('id, created_at').eq('clinic_id', clinicId),
        supabase.from('doctors').select('id, full_name, specialization').eq('clinic_id', clinicId)
      ]);

      return {
        appointments: appointmentsRes.data || [],
        patients: patientsRes.data || [],
        doctors: doctorsRes.data || []
      };
    },
    enabled: !!clinicId,
  });

  const filteredData = useMemo(() => {
    if (!data) return null;

    const now = new Date();
    let startDate = now;

    switch (timeRange) {
      case 'day':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subMonths(now, 1);
        break;
      case 'year':
        startDate = subYears(now, 1);
        break;
    }

    const interval = { start: startDate, end: endOfDay(now) };

    const periodAppointments = data.appointments.filter(a => isWithinInterval(new Date(a.start_time), interval));
    const periodPatients = data.patients.filter(p => isWithinInterval(new Date(p.created_at), interval));
    
    const completedAppointments = periodAppointments.filter(a => a.status === 'confirmed' || a.status === 'completed');
    const totalRevenue = completedAppointments.reduce((sum, apt) => sum + (Number(apt.amount) || 0), 0);
    const cancelledCount = periodAppointments.filter(a => a.status === 'cancelled').length;

    // Generate dummy chart data based on the period for visual effect
    const chartData = Array.from({ length: 7 }).map((_, i) => {
      const day = subDays(now, 6 - i);
      const dayApts = periodAppointments.filter(a => isWithinInterval(new Date(a.start_time), { start: startOfDay(day), end: endOfDay(day) }));
      const dayRevenue = dayApts.filter(a => a.status === 'confirmed').reduce((sum, apt) => sum + (Number(apt.amount) || 0), 0);
      
      return {
        label: format(day, 'EEEE', { locale: arSA }).split(' ')[0],
        revenue: dayRevenue,
        appointments: dayApts.length
      };
    });

    const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);

    return {
      totalAppointments: periodAppointments.length,
      completedAppointments: completedAppointments.length,
      cancelledAppointments: cancelledCount,
      totalRevenue,
      newPatients: periodPatients.length,
      chartData,
      maxRevenue
    };
  }, [data, timeRange]);

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            التقارير والإحصائيات
          </h1>
          <p className="text-slate-500 mt-2 font-medium">نظرة شاملة على أداء العيادة، الإيرادات، والمواعيد.</p>
        </div>
      </div>

      <Tabs defaultValue="month" value={timeRange} onValueChange={setTimeRange} className="space-y-8">
        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl inline-block shadow-sm border border-slate-100 dark:border-slate-800">
          <TabsList className="bg-transparent gap-2 h-auto p-0">
            <TabsTrigger value="day" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">اليوم</TabsTrigger>
            <TabsTrigger value="week" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">هذا الأسبوع</TabsTrigger>
            <TabsTrigger value="month" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">هذا الشهر</TabsTrigger>
            <TabsTrigger value="year" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">هذا العام</TabsTrigger>
          </TabsList>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none bg-white dark:bg-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-[2rem] overflow-hidden relative group">
            <CardContent className="p-8 relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 p-4 rounded-2xl">
                  <Receipt className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-400 mb-1">إجمالي الإيرادات</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white">{filteredData?.totalRevenue.toLocaleString()} ريال</p>
            </CardContent>
            <div className="absolute right-[-10%] bottom-[-10%] w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          </Card>

          <Card className="border-none bg-white dark:bg-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-[2rem] overflow-hidden relative group">
            <CardContent className="p-8 relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 p-4 rounded-2xl">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-400 mb-1">المواعيد المنجزة</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white">{filteredData?.completedAppointments}</p>
            </CardContent>
            <div className="absolute right-[-10%] bottom-[-10%] w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
          </Card>

          <Card className="border-none bg-white dark:bg-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-[2rem] overflow-hidden relative group">
            <CardContent className="p-8 relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 p-4 rounded-2xl">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-400 mb-1">المرضى الجدد</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white">{filteredData?.newPatients}</p>
            </CardContent>
            <div className="absolute right-[-10%] bottom-[-10%] w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
          </Card>

          <Card className="border-none bg-white dark:bg-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-[2rem] overflow-hidden relative group">
            <CardContent className="p-8 relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-2xl">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-400 mb-1">المواعيد الملغاة</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white">{filteredData?.cancelledAppointments}</p>
            </CardContent>
            <div className="absolute right-[-10%] bottom-[-10%] w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors" />
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none bg-white dark:bg-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-[3rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                تحليل الإيرادات
              </CardTitle>
              <CardDescription>نمو الإيرادات خلال الفترة المحددة</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 flex justify-center items-end h-64 gap-4 mt-8">
              {filteredData?.chartData.map((d, i) => (
                <SimpleBar 
                  key={i} 
                  height={(d.revenue / filteredData.maxRevenue) * 100} 
                  label={d.label} 
                  value={`${d.revenue} ر.س`}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="border-none bg-white dark:bg-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-[3rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                نشاط المواعيد
              </CardTitle>
              <CardDescription>حجم المواعيد المنجزة خلال الفترة</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 flex justify-center items-end h-64 gap-4 mt-8">
              {filteredData?.chartData.map((d, i) => {
                const maxApt = Math.max(...filteredData.chartData.map(c => c.appointments), 1);
                return (
                  <div key={i} className="flex flex-col items-center gap-2 group">
                    <div className="h-40 w-12 bg-slate-100 dark:bg-slate-800 rounded-t-xl relative flex items-end justify-center overflow-hidden">
                      <div 
                        className="w-full bg-blue-500/80 group-hover:bg-blue-500 transition-all duration-500 rounded-t-xl"
                        style={{ height: `${Math.max(5, (d.appointments / maxApt) * 100)}%` }}
                      />
                      <span className="absolute top-2 text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.appointments}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{d.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
