'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

export function TrialBanner() {
  const { clinicId } = useAuth();
  const supabase = createClient();

  const { data: clinic, isLoading } = useQuery({
    queryKey: ['clinic-trial-status', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('subscription_status, subscription_expiry')
        .eq('id', clinicId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  if (isLoading || !clinic) return null;

  if (clinic.subscription_status === 'trialing') {
    const daysLeft = Math.ceil((new Date(clinic.subscription_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0) {
      return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-amber-800 dark:text-amber-300 font-bold">الفترة التجريبية نشطة</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">متبقي {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'} وتتوقف خدمات النظام. اشترك الآن لضمان استمرار العمل.</p>
            </div>
          </div>
          <Link href="/dashboard/subscription" className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20 text-sm">
            الاشتراك الآن
          </Link>
        </div>
      );
    } else {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-red-800 dark:text-red-300 font-bold">انتهت الفترة التجريبية</p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">تم إيقاف بعض الخدمات لانتهاء الفترة المجانية. يرجى تجديد الاشتراك.</p>
            </div>
          </div>
          <Link href="/dashboard/subscription" className="shrink-0 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold transition-colors shadow-lg shadow-red-600/20 text-sm">
            تجديد الاشتراك
          </Link>
        </div>
      );
    }
  }

  return null;
}
