'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar, Clock, Download, Loader2, Mail, MessageCircle,
  Phone, Receipt, Search, UserPlus, Users,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { exportToCSV, getInitials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePatients } from '@/hooks/usePatients';

function normalizePhone(phone?: string | null) {
  return (phone ?? '').replace(/[^\d+]/g, '');
}

function createWhatsAppLink(phone: string | undefined, name: string) {
  const normalized = normalizePhone(phone);
  const message = encodeURIComponent(`مرحباً ${name}، نذكركم بإمكانية حجز موعدكم القادم في العيادة. يسعدنا خدمتكم.`);
  return normalized ? `https://wa.me/${normalized.replace(/^\+/, '')}?text=${message}` : '';
}

export default function PatientsPage() {
  const { clinicId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [now, setNow] = useState<number | null>(null);
  const { patients, isLoading } = usePatients();
  const supabase = createClient();

  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const { data: appointments = [] } = useQuery({
    queryKey: ['patient-crm-appointments', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from('appointments')
        .select('id, patient_id, manual_patient_name, start_time, status, amount, type')
        .eq('clinic_id', clinicId)
        .order('start_time', { ascending: false });
      return data ?? [];
    },
  });

  const crmPatients = useMemo(() => {
    return patients.map((patient: any) => {
      const relatedAppointments = appointments.filter((apt: any) => (
        apt.patient_id === patient.id ||
        (apt.manual_patient_name && patient.full_name &&
          apt.manual_patient_name.trim().toLowerCase() === patient.full_name.trim().toLowerCase())
      ));

      const referenceTime = now ?? 0;

      const pastAppointments = relatedAppointments
        .filter((apt: any) => new Date(apt.start_time).getTime() <= referenceTime)
        .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

      const upcomingAppointments = relatedAppointments
        .filter((apt: any) => new Date(apt.start_time).getTime() > referenceTime && apt.status !== 'cancelled')
        .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      const paidAppointments = relatedAppointments.filter((apt: any) => apt.status === 'confirmed' || apt.status === 'completed');
      const revenue = paidAppointments.reduce((sum: number, apt: any) => sum + (Number(apt.amount) || 0), 0);
      const lastVisit = pastAppointments[0] ?? null;
      const nextAppointment = upcomingAppointments[0] ?? null;
      const daysSinceLastVisit = lastVisit
        ? Math.floor((referenceTime - new Date(lastVisit.start_time).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...patient,
        totalVisits: relatedAppointments.length,
        paidVisits: paidAppointments.length,
        revenue,
        lastVisit,
        nextAppointment,
        daysSinceLastVisit,
        needsFollowUp: !nextAppointment && (daysSinceLastVisit === null || daysSinceLastVisit >= 30),
        whatsappHref: createWhatsAppLink(patient.phone, patient.full_name),
      };
    });
  }, [appointments, now, patients]);

  const filteredPatients = crmPatients.filter((p: any) =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const crmSummary = useMemo(() => ({
    totalPatients: crmPatients.length,
    totalRevenue: crmPatients.reduce((sum: number, patient: any) => sum + patient.revenue, 0),
    needsFollowUp: crmPatients.filter((patient: any) => patient.needsFollowUp).length,
    upcoming: crmPatients.filter((patient: any) => patient.nextAppointment).length,
  }), [crmPatients]);

  const handleExport = () => {
    if (crmPatients.length > 0) {
      const exportData = crmPatients.map((p: any) => ({
        'الاسم': p.full_name,
        'رقم المريض': p.id,
        'الهاتف': p.phone || 'غير متوفر',
        'البريد الإلكتروني': p.email || 'غير متوفر',
        'عدد الزيارات': p.totalVisits,
        'إجمالي التحصيل': p.revenue,
        'آخر زيارة': p.lastVisit ? new Date(p.lastVisit.start_time).toLocaleDateString('ar-SA') : 'لا توجد',
        'تاريخ التسجيل': new Date(p.created_at).toLocaleDateString('ar-SA'),
      }));
      exportToCSV(exportData, 'سجل_المرضى_CRM');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">سجل المرضى</h1>
          <p className="text-muted-foreground mt-1">CRM مختصر لكل مريض: الزيارات، التحصيل، المتابعة، والتواصل السريع.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="rounded-2xl h-12 px-6 font-bold gap-2"
            onClick={handleExport}
            disabled={crmPatients.length === 0}
          >
            <Download className="h-5 w-5" />
            تصدير Excel
          </Button>
          <Button className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 gap-2">
            <UserPlus className="h-5 w-5" />
            إضافة مريض يدوياً
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="بحث في سجل المرضى..."
            className="h-12 pr-12 rounded-2xl bg-white border-muted/50 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المرضى', value: crmSummary.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'إجمالي التحصيل', value: `${crmSummary.totalRevenue.toLocaleString()} ريال`, icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'يحتاجون متابعة', value: crmSummary.needsFollowUp, icon: MessageCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'لديهم موعد قادم', value: crmSummary.upcoming, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((item) => (
          <div key={item.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm">
            <div className={`${item.bg} ${item.color} h-12 w-12 rounded-xl flex items-center justify-center`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">{item.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.length > 0 ? (
          filteredPatients.map((p: any) => (
            <Card key={p.id} className="border-none shadow-sm hover:shadow-md transition-all rounded-[2rem] overflow-hidden group">
              <CardContent className="p-7">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black group-hover:scale-110 transition-transform">
                    {getInitials(p.full_name || 'P')}
                  </div>
                  {p.needsFollowUp ? (
                    <Badge className="bg-amber-500/10 text-amber-700 border-none rounded-lg font-bold">يحتاج متابعة</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-none rounded-lg font-bold">نشط</Badge>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-black text-xl text-slate-900 dark:text-white line-clamp-1">{p.full_name}</h3>
                    <Badge variant="outline" className="mt-2 bg-slate-50 text-slate-500 border-slate-100 rounded-lg font-bold">
                      رقم المريض: {p.id.slice(0, 6).toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3">
                      <p className="text-[10px] font-bold text-slate-400">الزيارات</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">{p.totalVisits}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 p-3">
                      <p className="text-[10px] font-bold text-emerald-600">التحصيل</p>
                      <p className="text-lg font-black text-emerald-700">{p.revenue.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 p-3">
                      <p className="text-[10px] font-bold text-indigo-600">مدفوعة</p>
                      <p className="text-lg font-black text-indigo-700">{p.paidVisits}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>تاريخ التسجيل: {new Date(p.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    {p.phone && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{p.phone}</span>
                      </div>
                    )}
                    {p.email && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="line-clamp-1">{p.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>آخر زيارة: {p.lastVisit ? new Date(p.lastVisit.start_time).toLocaleDateString('ar-SA') : 'لا توجد زيارات'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>الموعد القادم: {p.nextAppointment ? new Date(p.nextAppointment.start_time).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Link href={`/dashboard/medical-records?patient=${p.id}`} className="block">
                      <Button variant="outline" className="w-full rounded-xl border-primary/10 text-primary hover:bg-primary/5 font-bold">
                        السجل الطبي
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="rounded-xl border-emerald-100 text-emerald-700 hover:bg-emerald-50 font-bold gap-2"
                      disabled={!p.whatsappHref}
                      onClick={() => p.whatsappHref && window.open(p.whatsappHref, '_blank', 'noopener,noreferrer')}
                    >
                      <MessageCircle className="h-4 w-4" />
                      واتساب
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-muted">
            <Users className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800">لا يوجد مرضى حالياً</h3>
            <p className="text-muted-foreground mt-2">عند إضافة حجز لمريض جديد، سيظهر ملفه الشخصي هنا تلقائياً.</p>
          </div>
        )}
      </div>
    </div>
  );
}
