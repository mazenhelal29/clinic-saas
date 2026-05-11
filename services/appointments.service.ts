import { createClient } from '@/lib/supabase/server';
import type { Appointment } from '@/types';
import type { AppointmentInput } from '@/lib/validations/appointment';

export async function getAppointments(clinicId: string, date?: string): Promise<Appointment[]> {
  const supabase = await createClient();
  let query = supabase
    .from('appointments')
    .select('*, patient:patients(full_name, mrn, phone), doctor:doctors(user:users(full_name))')
    .eq('clinic_id', clinicId)
    .order('start_time', { ascending: true });

  if (date) {
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    query = query.gte('start_time', start).lte('start_time', end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function getAppointmentById(clinicId: string, id: string): Promise<Appointment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patient:patients(*), doctor:doctors(*, user:users(*))')
    .eq('clinic_id', clinicId)
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Appointment;
}

export async function createAppointment(
  clinicId: string, input: AppointmentInput, createdBy: string
): Promise<Appointment> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...input, clinic_id: clinicId, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data as Appointment;
}

export async function updateAppointmentStatus(
  clinicId: string, id: string, status: Appointment['status']
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', clinicId);
  if (error) throw error;
}

export async function getTodayAppointmentsCount(clinicId: string): Promise<number> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .gte('start_time', `${today}T00:00:00`)
    .lte('start_time', `${today}T23:59:59`);
  return count ?? 0;
}
