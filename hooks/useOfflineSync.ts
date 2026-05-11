'use client';

/**
 * useOfflineSync.ts
 * Watches the offline_queue in IndexedDB. When the browser comes back online
 * it iterates pending actions and replays them against Supabase.
 * No existing service code is touched – this layer sits on top.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import offlineDb, { type OfflineQueueItem } from '@/lib/db/offline-db';
import { useNetworkStatus } from './useNetworkStatus';

const MAX_RETRIES = 3;

async function replayAction(item: OfflineQueueItem): Promise<boolean> {
  const supabase = createClient();
  try {
    const action = item.action;

    const isInsert = action.startsWith('INSERT_');
    const isUpdate = action.startsWith('UPDATE_');

    if (isInsert) {
      const { error } = await supabase
        .from(item.table)
        .insert(item.payload as Record<string, unknown>);
      if (error) {
        console.error(`[OfflineSync] Insert failed for ${item.table}:`, error.message, error.details);
        throw error;
      }
    }

    if (isUpdate) {
      const { id, ...rest } = item.payload as Record<string, unknown>;
      const { error } = await supabase
        .from(item.table)
        .update(rest)
        .eq('id', id);
      if (error) {
        console.error(`[OfflineSync] Update failed for ${item.table}:`, error.message, error.details);
        throw error;
      }
    }

    return true;
  } catch (err: any) {
    console.warn('[OfflineSync] Failed to replay action', item.action, err?.message || err);
    return false;
  }
}

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus();
  const queryClient  = useQueryClient();
  const syncingRef   = useRef(false);

  const flushQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const pending = await offlineDb.offline_queue.toArray();
      if (pending.length === 0) return;

      console.info(`[OfflineSync] Flushing ${pending.length} queued action(s)…`);

      for (const item of pending) {
        const ok = await replayAction(item);
        if (ok) {
          // Mark corresponding local row as synced
          await offlineDb
            .table(item.table)
            .where('id')
            .equals((item.payload as Record<string, unknown>).id as string)
            .modify({ _synced: 1 });

          // Remove from queue
          await offlineDb.offline_queue.delete(item.id!);
        } else {
          const retries = (item.retries ?? 0) + 1;
          if (retries >= MAX_RETRIES) {
            console.error(`[OfflineSync] Max retries (${MAX_RETRIES}) reached. Dropping item from queue:`, {
              id: item.id,
              action: item.action,
              table: item.table,
              payload: item.payload
            });
            await offlineDb.offline_queue.delete(item.id!);
          } else {
            await offlineDb.offline_queue.update(item.id!, { retries });
          }
        }
      }

      // Invalidate queries so UI refreshes with server truth
      await queryClient.invalidateQueries();
      console.info('[OfflineSync] Queue flushed ✓');
    } finally {
      syncingRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    if (isOnline) {
      flushQueue();
    }
  }, [isOnline, flushQueue]);

  return { isOnline, flushQueue };
}
