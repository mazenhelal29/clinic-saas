'use client';

import { useAuth } from './useAuth';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Clinic } from '@/types';

export function useClinic() {
  const { clinicId } = useAuth();
  const supabase = createClient();

  const { data: clinic, isLoading } = useQuery<Clinic | null>({
    queryKey: ['clinic', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      if (!clinicId) return null;
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();
      if (error) throw error;
      return data as Clinic;
    },
  });

  return { clinic, isLoading, clinicId };
}
