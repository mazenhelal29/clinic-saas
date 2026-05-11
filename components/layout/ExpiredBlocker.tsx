'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { ShieldAlert, CreditCard } from 'lucide-react';
import Link from 'next/link';

export function ExpiredBlocker() {
  const { clinicId } = useAuth();
  const pathname = usePathname();
  const supabase = createClient();

  const { data: clinic, isLoading } = useQuery({
    queryKey: ['clinic-expiry-check', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('subscription_expiry, subscription_status')
        .eq('id', clinicId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Do not block the subscription page or loading states
  if (isLoading || !clinic || pathname === '/dashboard/subscription') {
    return null;
  }

  const expiryDate = clinic.subscription_expiry ? new Date(clinic.subscription_expiry) : new Date();
  const isExpired = expiryDate < new Date();
  const isSuspended = clinic.subscription_status === 'suspended';

  if (isExpired || isSuspended) {
    return (
      <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 font-cairo animate-in fade-in duration-500">
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-lg w-full text-center shadow-2xl shadow-red-500/10 border-2 border-red-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-amber-500" />
          
          <div className="bg-red-50 dark:bg-red-900/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="h-12 w-12 text-red-500" />
          </div>
          
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">
            {isSuspended ? 'تم إيقاف حساب العيادة' : 'انتهى اشتراك العيادة!'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mb-8 leading-relaxed">
            {isSuspended 
              ? 'عذراً، تم إيقاف الوصول إلى النظام من قبل الإدارة. يرجى التواصل مع الدعم الفني لاستعادة الحساب.'
              : 'عذراً، لقد انتهت صلاحية اشتراك العيادة أو الفترة التجريبية. تم إيقاف الوصول إلى النظام والسجلات الطبية مؤقتاً لحين تجديد الباقة.'}
          </p>

          <Link href="/dashboard/subscription" className="w-full block">
            <button className="w-full h-14 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20">
              <CreditCard className="h-5 w-5" />
              {isSuspended ? 'الاطلاع على تفاصيل الاشتراك' : 'تجديد الاشتراك الآن'}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
