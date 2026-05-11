import { createClient } from '@/lib/supabase/server';
import type { Patient } from '@/types';
import type { PatientInput } from '@/lib/validations/patient';
import { generateMRN } from '@/lib/utils';

export async function getPatients(clinicId: string): Promise<Patient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Patient[];
}

export async function getPatientById(clinicId: string, id: string): Promise<Patient | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Patient;
}

export async function createPatient(clinicId: string, input: PatientInput): Promise<Patient> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patients')
    .insert({ ...input, clinic_id: clinicId, mrn: generateMRN(), is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data as Patient;
}

export async function updatePatient(
  clinicId: string, id: string, input: Partial<PatientInput>
): Promise<Patient> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patients')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .select()
    .single();
  if (error) throw error;
  return data as Patient;
}

export async function getPatientsCount(clinicId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('is_active', true);
  return count ?? 0;
}
