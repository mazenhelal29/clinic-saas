'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type { Patient } from '@/types';
import type { PatientInput } from '@/lib/validations/patient';
import { generateMRN, withTimeout } from '@/lib/utils';
import offlineDb from '@/lib/db/offline-db';
import { isEffectivelyOffline } from './useNetworkStatus';
import { useToast } from './use-toast';

function generateLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function usePatients() {
  const { clinicId } = useAuth();
  const supabase = createClient();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ['patients', clinicId],
    enabled: !!clinicId,
    networkMode: 'always',
    queryFn: async () => {
      const tryLocal = async () => {
        const local = await offlineDb.patients
          .where('clinic_id')
          .equals(clinicId!)
          .reverse()
          .sortBy('created_at');
        return local.map((p) => ({ ...p, _local: true })) as unknown as Patient[];
      };

      if (await isEffectivelyOffline()) return tryLocal();

      try {
        const result = await withTimeout(
          supabase
            .from('patients')
            .select('*')
            .eq('clinic_id', clinicId!)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          5000
        );
        const { data, error } = result;
        if (error) throw error;

        // Update local DB cache with fresh server data
        if (data && data.length > 0) {
          const toPut = data.map((p: any) => ({ ...p, _synced: 1 as const }));
          await offlineDb.patients.bulkPut(toPut);
        }

        // Also include any unsynced local records not yet sent to server
        try {
          const unsynced = await offlineDb.patients
            .where('clinic_id').equals(clinicId!)
            .and((p) => p._synced === 0)
            .toArray();
          const serverIds = new Set((data ?? []).map((r: any) => r.id));
          const pendingLocal = unsynced
            .filter((p) => !serverIds.has(p.id))
            .map((p) => ({ ...p, _local: true })) as unknown as Patient[];
          return [...pendingLocal, ...(data ?? [])] as Patient[];
        } catch {
          return (data ?? []) as Patient[];
        }
      } catch {
        return tryLocal();
      }
    },
  });

  const createPatient = useMutation({
    networkMode: 'always',
    mutationFn: async (input: PatientInput) => {
      if (await isEffectivelyOffline()) {
        const now = new Date().toISOString();
        const localId = generateLocalId();
        const localClinicId = clinicId ?? 'unknown';

        const payload = {
          ...input,
          id: localId,
          clinic_id: localClinicId,
          mrn: generateMRN(),
          is_active: true,
          created_at: now,
          updated_at: now,
          _synced: 0 as const,
        };

        await offlineDb.patients.put(payload);
        
        await offlineDb.offline_queue.add({
          action: 'INSERT_PATIENT',
          table: 'patients',
          payload: { ...input, id: localId, clinic_id: localClinicId, mrn: payload.mrn, is_active: true },
          created_at: now,
          retries: 0,
        });
        return payload as unknown as Patient;
      }

      let currentClinicId = clinicId;
      if (!currentClinicId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', session.user.id).single();
          currentClinicId = profile?.clinic_id;
        }
      }
      if (!currentClinicId) throw new Error('تعذر العثور على مُعرّف العيادة. يرجى تحديث الصفحة.');

      const { data, error } = await supabase
        .from('patients')
        .insert({ ...input, clinic_id: currentClinicId, mrn: generateMRN(), is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data as Patient;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients', clinicId] });
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        toast({ title: 'تم الحفظ محلياً ✓', description: 'سيتم المزامنة تلقائياً.' });
      }
    },
  });

  const updatePatient = useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, input }: { id: string; input: Partial<PatientInput> }) => {
      if (await isEffectivelyOffline()) {
        const now = new Date().toISOString();
        const existing = await offlineDb.patients.get(id);
        
        if (existing) {
          const updated = { ...existing, ...input, updated_at: now, _synced: 0 as const };
          await offlineDb.patients.put(updated);
        } else {
          // If we don't have it locally, we still queue it for sync
          await offlineDb.patients.put({
            id, clinic_id: clinicId ?? 'unknown', full_name: input.full_name ?? '',
            created_at: now, updated_at: now, _synced: 0 as const, ...input
          });
        }

        await offlineDb.offline_queue.add({
          action: 'UPDATE_PATIENT',
          table: 'patients',
          payload: { id, ...input },
          created_at: now,
          retries: 0,
        });
        return { id, ...input } as unknown as Patient;
      }

      const { data, error } = await supabase
        .from('patients')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('clinic_id', clinicId!)
        .select()
        .single();
      if (error) throw error;
      return data as Patient;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients', clinicId] });
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        toast({ title: 'تم التحديث محلياً ✓', description: 'سيتم المزامنة تلقائياً.' });
      }
    },
  });

  const deletePatient = useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      if (await isEffectivelyOffline()) {
        const now = new Date().toISOString();
        const existing = await offlineDb.patients.get(id);
        if (existing) {
          // Soft delete locally (we don't sync this back yet, but if needed we can queue it)
          await offlineDb.patients.delete(id);
        }
        
        await offlineDb.offline_queue.add({
          action: 'UPDATE_PATIENT', // Soft delete is an update
          table: 'patients',
          payload: { id, is_active: false },
          created_at: now,
          retries: 0,
        });
        return;
      }

      const { error } = await supabase
        .from('patients')
        .update({ is_active: false })
        .eq('id', id)
        .eq('clinic_id', clinicId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients', clinicId] }),
  });

  return { patients, isLoading, createPatient, updatePatient, deletePatient };
}

