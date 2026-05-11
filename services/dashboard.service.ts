import { createClient } from '@/lib/supabase/server';

export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  pendingInvoices: number;
  monthlyRevenue: number;
}

export async function getDashboardStats(clinicId: string): Promise<DashboardStats> {
  const supabase = await createClient();

  // Parallel queries for better performance
  const [patients, appointments, invoices] = await Promise.all([
    supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('is_active', true),
    
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('start_time', new Date().toISOString().split('T')[0]),

    supabase
      .from('invoices')
      .select('total')
      .eq('clinic_id', clinicId)
      .eq('status', 'sent')
  ]);

  // Mock revenue for now as it needs a specific aggregation
  const monthlyRevenue = 48200; 

  return {
    totalPatients: patients.count ?? 0,
    todayAppointments: appointments.count ?? 0,
    pendingInvoices: invoices.data?.length ?? 0,
    monthlyRevenue
  };
}
