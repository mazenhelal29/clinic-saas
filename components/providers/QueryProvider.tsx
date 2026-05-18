'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { useEffect, useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24,
            staleTime: 15 * 1000,
            refetchOnMount: 'always',
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    try {
      const persister = createSyncStoragePersister({
        storage: window.sessionStorage,
      });

      persistQueryClient({
        queryClient,
        persister,
        maxAge: 1000 * 60 * 60 * 24,
      });
    } catch {
      // sessionStorage can be unavailable in private mode.
    }
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
