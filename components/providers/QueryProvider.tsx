'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep cache alive for 24 h so offline users see their last data
            gcTime: 1000 * 60 * 60 * 24,
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  // Wire up persistence imperatively (client-only, no Provider swap).
  // Using the imperative API keeps QueryClientProvider as the single
  // provider so useQueryClient() always resolves on the very first render.
  useEffect(() => {
    try {
      const persister = createSyncStoragePersister({
        storage: window.sessionStorage,
      });
      persistQueryClient({
        queryClient,
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 h
      });
    } catch {
      // sessionStorage unavailable (private mode, etc.) — silently skip
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
