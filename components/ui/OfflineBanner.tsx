'use client';

import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

/**
 * OfflineBanner component
 * Displays a sticky notification at the bottom when the user is offline.
 * Transitions to a "Back Online" message briefly when connection is restored.
 */
export function OfflineBanner() {
  const { isOnline } = useOfflineSync();
  const wasOfflineRef = useRef(false);
  const [showRestoredState, setShowRestoredState] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (wasOfflineRef.current) {
      const showTimer = window.setTimeout(() => setShowRestoredState(true), 0);
      const hideTimer = window.setTimeout(() => {
        setShowRestoredState(false);
        wasOfflineRef.current = false;
      }, 4000);

      return () => {
        window.clearTimeout(showTimer);
        window.clearTimeout(hideTimer);
      };
    }
  }, [isOnline]);

  if (isOnline && !showRestoredState) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md flex items-center justify-between gap-4 px-5 py-4 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-8 duration-500 ease-out",
        isOnline 
          ? "bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-emerald-500/10" 
          : "bg-amber-50/90 border-amber-200 text-amber-900 shadow-amber-500/10"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-2.5 rounded-full shrink-0",
          isOnline ? "bg-emerald-100" : "bg-amber-100"
        )}>
          {isOnline ? (
            <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" style={{ animationDuration: '4s' }} />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-600" />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[15px] font-bold leading-tight">
            {isOnline ? 'تم استعادة الاتصال بنجاح' : 'أنت تعمل في وضع عدم الاتصال'}
          </p>
          <p className="text-xs font-medium opacity-80 leading-relaxed">
            {isOnline 
              ? 'يتم الآن مزامنة بياناتك مع السيرفر...' 
              : 'يمكنك الاستمرار في استخدام النظام، سيتم حفظ التغييرات محلياً ومزامنتها فور عودة الإنترنت.'}
          </p>
        </div>
      </div>
      
      {!isOnline && (
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-bold rounded-lg transition-all active:scale-95 shrink-0 shadow-sm"
        >
          تحديث
        </button>
      )}
    </div>
  );
}
