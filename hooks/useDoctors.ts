'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type { Doctor } from '@/types';
import type { DoctorInput } from '@/lib/validations/doctor';
import { withTimeout } from '@/lib/utils';
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

export function useDoctors() {
  const { clinicId } = useAuth();
  const supabase = createClient();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({
    queryKey: ['doctors', clinicId],
    enabled: !!clinicId,
    networkMode: 'always',
    queryFn: async () => {
      const tryLocal = async () => {
        const local = await offlineDb.doctors
          .where('clinic_id')
          .equals(clinicId!)
          .sortBy('full_name');
        return local.map(d => ({ ...d, _local: true })) as unknown as Doctor[];
      };

      if (await isEffectivelyOffline()) return tryLocal();

      try {
        const result = await withTimeout(
          supabase
            .from('doctors')
            .select('*')
            .eq('clinic_id', clinicId!)
            .eq('is_active', true)
            .order('full_name', { ascending: true }),
          5000
        );
        const { data, error } = result;
        if (error) throw error;

        // Update local DB cache with fresh server data
        if (data && data.length > 0) {
          const toPut = data.map((d: any) => ({ ...d, _synced: 1 as const }));
          await offlineDb.doctors.bulkPut(toPut);
        }

        // Merge unsynced local doctors
        try {
          const unsynced = await offlineDb.doctors
            .where('clinic_id').equals(clinicId!)
            .and(d => d._synced === 0)
            .toArray();
          const serverIds = new Set((data ?? []).map(r => r.id));
          const pendingLocal = unsynced
            .filter(d => !serverIds.has(d.id))
            .map(d => ({ ...d, _local: true })) as unknown as Doctor[];
          return [...pendingLocal, ...(data ?? [])] as Doctor[];
        } catch {
          return (data ?? []) as Doctor[];
        }
      } catch {
        return tryLocal();
      }
    },
  });

  const createDoctor = useMutation({
    networkMode: 'always',
    mutationFn: async (input: DoctorInput) => {
      if (await isEffectivelyOffline()) {
        const now = new Date().toISOString();
        const localId = generateLocalId();
        const localClinicId = clinicId ?? 'unknown';

        const payload = {
          ...input,
          id: localId,
          clinic_id: localClinicId,
          is_active: true,
          created_at: now,
          updated_at: now,
          _synced: 0 as const,
        };

        await offlineDb.doctors.put(payload as any);
        await offlineDb.offline_queue.add({
          action: 'INSERT_DOCTOR',
          table: 'doctors',
          payload: { ...input, id: localId, clinic_id: localClinicId, is_active: true },
          created_at: now,
          retries: 0,
        });
        return payload as unknown as Doctor;
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
        .from('doctors')
        .insert({ ...input, clinic_id: currentClinicId, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data as Doctor;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors', clinicId] });
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        toast({ title: 'تم الحفظ محلياً ✓', description: 'سيتم المزامنة تلقائياً.' });
      }
    },
  });

  const updateDoctor = useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, input }: { id: string; input: Partial<DoctorInput> }) => {
      if (await isEffectivelyOffline()) {
        const now = new Date().toISOString();
        const existing = await offlineDb.doctors.get(id);
        if (existing) {
          const updated = { ...existing, ...input, updated_at: now, _synced: 0 as const };
          await offlineDb.doctors.put(updated);
        }

        await offlineDb.offline_queue.add({
          action: 'UPDATE_DOCTOR',
          table: 'doctors',
          payload: { id, ...input },
          created_at: now,
          retries: 0,
        });
        return { id, ...input } as unknown as Doctor;
      }

      const { data, error } = await supabase
        .from('doctors')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('clinic_id', clinicId!)
        .select()
        .single();
      if (error) throw error;
      return data as Doctor;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors', clinicId] });
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        toast({ title: 'تم التحديث محلياً ✓', description: 'سيتم المزامنة تلقائياً.' });
      }
    },
  });

  const deleteDoctor = useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      if (await isEffectivelyOffline()) {
        const now = new Date().toISOString();
        await offlineDb.doctors.update(id, { is_active: false, _synced: 0 as const });
        await offlineDb.offline_queue.add({
          action: 'UPDATE_DOCTOR',
          table: 'doctors',
          payload: { id, is_active: false },
          created_at: now,
          retries: 0,
        });
        return;
      }

      const { error } = await supabase
        .from('doctors')
        .update({ is_active: false })
        .eq('id', id)
        .eq('clinic_id', clinicId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors', clinicId] }),
  });

  return { doctors, isLoading, createDoctor, updateDoctor, deleteDoctor };
}
