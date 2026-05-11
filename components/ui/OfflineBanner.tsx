'use client';

/**
 * OfflineBanner.tsx
 * Non-intrusive status bar shown when the app detects no internet connection.
 * Disappears automatically once connectivity is restored.
 * Uses useOfflineSync to trigger queue flush and show sync progress.
 */
import { useEffect, useState } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

type SyncState = 'idle' | 'syncing' | 'done';

export function OfflineBanner() {
  const { isOnline } = useOfflineSync();
  const [syncState, setSyncState]   = useState<SyncState>('idle');
  const [visible, setVisible]       = useState(false);
  const [pendingCount, setPending]  = useState(0);

  // Refresh pending count from IndexedDB
  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function checkQueue() {
      try {
        const { default: offlineDb } = await import('@/lib/db/offline-db');
        const count = await offlineDb.offline_queue.count();
        setPending(count);
      } catch {
        // ignore if DB not ready
      }
    }

    const timer = setInterval(checkQueue, 3000);
    checkQueue();
    return () => clearInterval(timer);
  }, []);

  // Show banner when offline; on reconnect briefly show "syncing" then "done"
  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      setSyncState('idle');
    } else {
      if (visible) {
        // Was offline, now online → show syncing feedback
        setSyncState('syncing');
        setTimeout(() => {
          setSyncState('done');
          setTimeout(() => {
            setVisible(false);
            setSyncState('idle');
          }, 2500);
        }, 2000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]
        flex items-center gap-3 px-5 py-3
        rounded-2xl shadow-2xl border backdrop-blur-sm
        text-sm font-medium
        transition-all duration-500 ease-out
        ${syncState === 'done'
          ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
          : 'bg-slate-950/90 border-slate-700 text-slate-200'}
      `}
    >
      {syncState === 'idle' && (
        <>
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            أنت غير متصل بالإنترنت
            {pendingCount > 0 && (
              <span className="ms-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                {pendingCount} عملية معلقة
              </span>
            )}
          </span>
          <span className="text-slate-400 text-xs">البيانات تُحفظ محلياً</span>
        </>
      )}

      {syncState === 'syncing' && (
        <>
          <RefreshCw className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
          <span>جارٍ المزامنة مع السيرفر…</span>
        </>
      )}

      {syncState === 'done' && (
        <>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>تم المزامنة بنجاح ✓</span>
        </>
      )}
    </div>
  );
}
