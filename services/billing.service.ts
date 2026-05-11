import { createClient } from '@/lib/supabase/server';
import type { Invoice, Payment } from '@/types';
import { generateInvoiceNumber } from '@/lib/utils';

export async function getInvoices(clinicId: string): Promise<Invoice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*, patient:patients(full_name, mrn), items:invoice_items(*)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

export async function getInvoiceById(clinicId: string, id: string): Promise<Invoice | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*, patient:patients(*), items:invoice_items(*)')
    .eq('clinic_id', clinicId)
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Invoice;
}

export async function createInvoice(
  clinicId: string,
  patientId: string,
  items: Array<{ description: string; qty: number; unit_price: number }>,
  appointmentId?: string
): Promise<Invoice> {
  const supabase = await createClient();
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      appointment_id: appointmentId,
      invoice_number: generateInvoiceNumber(),
      status: 'draft',
      subtotal,
      tax,
      discount: 0,
      total,
    })
    .select()
    .single();
  if (invErr) throw invErr;

  const invoiceItems = items.map((i) => ({
    invoice_id: invoice.id,
    description: i.description,
    qty: i.qty,
    unit_price: i.unit_price,
    total: i.qty * i.unit_price,
  }));

  const { error: itemsErr } = await supabase.from('invoice_items').insert(invoiceItems);
  if (itemsErr) throw itemsErr;

  return invoice as Invoice;
}

export async function recordPayment(
  clinicId: string,
  invoiceId: string,
  amount: number,
  method: Payment['method']
): Promise<void> {
  const supabase = await createClient();
  await supabase.from('payments').insert({
    clinic_id: clinicId,
    invoice_id: invoiceId,
    amount,
    method,
    paid_at: new Date().toISOString(),
  });
  await supabase
    .from('invoices')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('clinic_id', clinicId);
}

export async function getMonthlyRevenue(clinicId: string): Promise<number> {
  const supabase = await createClient();
  const start = new Date();
  start.setDate(1);
  const { data } = await supabase
    .from('payments')
    .select('amount')
    .eq('clinic_id', clinicId)
    .gte('paid_at', start.toISOString());
  return (data ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
}
