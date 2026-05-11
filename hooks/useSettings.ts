'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type { Clinic } from '@/types';

export function useSettings() {
  const { clinicId } = useAuth();
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: clinic, isLoading } = useQuery<Clinic>({
    queryKey: ['clinic', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId!)
        .single();
      if (error) throw error;
      return data as Clinic;
    },
  });

  const updateClinic = useMutation({
    mutationFn: async (updates: Partial<Clinic>) => {
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
        .from('clinics')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', currentClinicId)
        .select()
        .single();
      if (error) throw error;
      return data as Clinic;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', clinicId] }),
  });

  return { clinic, isLoading, updateClinic };
}
