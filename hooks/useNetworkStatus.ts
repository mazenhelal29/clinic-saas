'use client';

/**
 * useNetworkStatus.ts
 * Tracks online/offline connectivity in real time.
 * Returns { isOnline } - updates automatically when the connection changes.
 */
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setIsOnline(navigator.onLine), 0);

    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

import { createClient } from '@/lib/supabase/client';

/**
 * Returns true if the device is effectively offline.
 * Checks navigator.onLine first (fast), then does a lightweight
 * Supabase ping with a 3-second timeout to catch "connected to router
 * but no real internet" situations.
 */
export async function isEffectivelyOffline(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;

  try {
    const supabase = createClient();
    
    await Promise.race([
      Promise.resolve(supabase.from('appointments').select('id', { count: 'exact', head: true })),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('TIMEOUT')), 3000)
      ),
    ]);

    return false; // Supabase responded → we're online
  } catch {
    return true; // Timed out or failed → treat as offline
  }
}
