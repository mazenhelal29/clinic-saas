export type Role = 'super_admin' | 'clinic_admin' | 'doctor' | 'staff' | 'patient';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type Gender = 'male' | 'female' | 'other';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paused';
export type NotificationType = 'appointment' | 'billing' | 'system' | 'message';

export interface Clinic {
  id: string;
  name: string;
  name_ar?: string;
  slug: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  plan_id?: string;
  owner_id: string;
  settings: ClinicSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicSettings {
  timezone: string;
  currency: string;
  language: 'ar' | 'en';
  working_hours: WorkingHours;
  appointment_duration: number;
}

export interface WorkingHours {
  [day: string]: { open: string; close: string; is_open: boolean };
}

export interface User {
  id: string;
  clinic_id: string;
  role: Role;
  full_name: string;
  full_name_ar?: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  user_id?: string;
  mrn: string;
  full_name: string;
  full_name_ar?: string;
  dob?: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: string;
  blood_type?: string;
  allergies?: string[];
  emergency_contact?: EmergencyContact;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Doctor {
  id: string;
  clinic_id: string;
  full_name: string;
  specialization: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DoctorSchedule {
  [day: string]: { slots: string[]; is_available: boolean };
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  type: string;
  reason?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface MedicalRecord {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  notes?: string;
  files?: FileRecord[];
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface FileRecord {
  id: string;
  clinic_id: string;
  record_id?: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  uploaded_by: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id?: string;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  due_date?: string;
  notes?: string;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  description_ar?: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface Payment {
  id: string;
  clinic_id: string;
  invoice_id: string;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'insurance';
  reference?: string;
  paid_at: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  clinic_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  stripe_sub_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  clinic_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  title_ar?: string;
  body: string;
  body_ar?: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  total_patients: number;
  total_appointments_today: number;
  total_revenue_month: number;
  total_doctors: number;
  appointment_completion_rate: number;
  pending_invoices: number;
}

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ['*'],
  clinic_admin: [
    'dashboard', 'patients', 'doctors', 'staff', 'appointments',
    'medical_records', 'billing', 'notifications', 'settings', 'reports',
  ],
  doctor: [
    'dashboard', 'patients:read', 'appointments', 'medical_records', 'notifications',
  ],
  staff: [
    'dashboard', 'patients', 'appointments', 'billing', 'notifications',
  ],
  patient: [
    'appointments:own', 'medical_records:own', 'billing:own', 'notifications:own',
  ],
};
