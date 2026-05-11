'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, ShieldAlert, PhoneForwarded } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SubscriptionPage() {
  const { clinicId } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);

  // Fetch Current Clinic Status
  const { data: clinic, isLoading: clinicLoading, isError: clinicError } = useQuery({
    queryKey: ['clinic-subscription', clinicId],
    enabled: !!clinicId,
    retry: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch Available Packages
  const { data: packages, isLoading: packagesLoading, isError: packagesError } = useQuery({
    queryKey: ['available-packages'],
    retry: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_packages')
        .select('*')
        .eq('is_active', true)
        .order('duration_months', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const handleSelectPackage = (pkg: any) => {
    setSelectedPkg(pkg.id);
    toast({
      title: 'تم اختيار الباقة',
      description: 'يرجى التواصل مع الإدارة لإتمام الدفع وتفعيل الباقة.',
    });
  };

  if ((clinicLoading && !!clinicId) || packagesLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">جاري تحميل بيانات الاشتراك...</p>
      </div>
    );
  }

  if (packagesError || clinicError) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <ShieldAlert className="h-16 w-16 text-red-500 opacity-50" />
        <h3 className="text-xl font-bold">عذراً، حدث خطأ</h3>
        <p className="text-muted-foreground">حدث خطأ أثناء تحميل بيانات الاشتراك. يرجى تسجيل الخروج والدخول مجدداً أو تحديث الصفحة.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">تحديث الصفحة</Button>
      </div>
    );
  }

  const expiryDate = clinic?.subscription_expiry ? new Date(clinic.subscription_expiry) : new Date();
  const isExpired = expiryDate < new Date();

  return (
    <div className="space-y-10 font-cairo max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">إدارة الاشتراك</h1>
        <p className="text-slate-500 font-medium text-lg">تحكم في خطة اشتراك العيادة وتجديد الباقات.</p>
      </div>

      {/* Current Status Card */}
      <Card className="border-none shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 relative">
        <div className={`absolute top-0 right-0 w-2 h-full ${isExpired ? 'bg-red-500' : 'bg-emerald-500'}`} />
        <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {isExpired ? (
                <ShieldAlert className="h-8 w-8 text-red-500" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              )}
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">حالة الاشتراك الحالي</h2>
            </div>
            <div className="flex gap-4 items-center">
              <Badge className={`px-4 py-1.5 rounded-xl text-sm font-bold border-none ${
                isExpired ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
              }`}>
                {isExpired ? 'منتهي الصلاحية' : 'نشط'}
              </Badge>
              <p className="text-slate-500 font-bold">
                تاريخ الانتهاء: {clinic ? new Date(clinic.subscription_expiry).toLocaleDateString('ar-SA') : '...'}
              </p>
            </div>
          </div>
          {isExpired && (
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl max-w-sm border border-red-100 dark:border-red-900/50">
              <p className="text-red-600 text-sm font-bold text-center">عذراً، لقد انتهى اشتراك العيادة. يرجى اختيار باقة جديدة للتجديد واستعادة الوصول للنظام.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Packages Grid */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white">اختر باقة التجديد</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages?.map((pkg: any) => (
            <Card 
              key={pkg.id} 
              className={`border-2 transition-all cursor-pointer rounded-[2rem] overflow-hidden ${
                selectedPkg === pkg.id 
                  ? 'border-primary shadow-xl shadow-primary/20 bg-primary/5' 
                  : 'border-transparent shadow-[0_10px_30px_rgba(0,0,0,0.02)] bg-white dark:bg-slate-900 hover:border-primary/30'
              }`}
              onClick={() => handleSelectPackage(pkg)}
            >
              <CardContent className="p-8 space-y-6 text-center">
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none rounded-lg px-4 py-1.5 font-black mb-4 inline-block">
                  {pkg.duration_months} {pkg.duration_months === 1 ? 'شهر' : 'شهور'}
                </Badge>
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">{pkg.name_ar}</h4>
                  <p className="text-4xl font-black text-primary">
                    {pkg.price} <span className="text-sm text-slate-400 font-bold">ريال</span>
                  </p>
                </div>
                <Button 
                  variant={selectedPkg === pkg.id ? 'default' : 'outline'}
                  className={`w-full h-12 rounded-2xl font-black ${
                    selectedPkg === pkg.id ? 'shadow-lg shadow-primary/20 bg-primary text-white' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {selectedPkg === pkg.id ? 'تم الاختيار' : 'اختيار الباقة'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Instructions */}
      {selectedPkg && (
        <Card className="border-none shadow-2xl shadow-primary/10 rounded-[3rem] overflow-hidden bg-gradient-to-br from-primary to-blue-600 text-white relative animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <CardContent className="p-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4">
              <h3 className="text-3xl font-black">طريقة الدفع والتفعيل</h3>
              <p className="text-white/80 font-medium text-lg max-w-xl">
                لقد قمت باختيار باقة لتجديد اشتراكك. يرجى تحويل قيمة الباقة إلى حسابنا البنكي الموضح أدناه، ثم التواصل معنا لتفعيل الاشتراك فوراً.
              </p>
            </div>
            <div className="flex flex-col gap-3 min-w-[250px]">
              <a href="https://wa.me/201000000000" target="_blank" rel="noreferrer" className="w-full">
                <Button className="w-full h-14 bg-white text-primary hover:bg-white/90 rounded-2xl font-black text-lg flex items-center justify-center gap-2">
                  <PhoneForwarded className="h-5 w-5" /> تواصل عبر واتساب للتفعيل
                </Button>
              </a>
              <div className="text-center p-3 bg-black/20 rounded-xl space-y-1 mt-2">
                <p className="text-xs font-bold text-white/70 uppercase tracking-widest">معلومات التحويل</p>
                <p className="text-lg font-black text-white">SA 12 3456 7890 0000</p>
                <p className="text-sm font-bold text-white/90">بنك الراجحي - مؤسسة الشفاء</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
