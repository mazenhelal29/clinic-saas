/**
 * offline-db.ts
 * Local IndexedDB database using Dexie.js for offline-first support.
 * Mirrors the main Supabase tables locally and maintains an action queue
 * that is flushed to Supabase when internet connectivity is restored.
 */
import Dexie, { type Table } from 'dexie';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocalPatient {
  id: string;          // uuid (generated locally when offline)
  clinic_id: string;
  full_name: string;
  mrn?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  _synced: 0 | 1;     // 0 = pending sync, 1 = synced
}

export interface LocalAppointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id?: string;
  start_time: string;
  end_time?: string;
  status: string;
  amount?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  _synced: 0 | 1;
  manual_patient_name?: string;
  type?: string;
}

export interface LocalDoctor {
  id: string;
  clinic_id: string;
  full_name: string;
  specialty?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _synced: 0 | 1;
}

export interface LocalInvoice {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id?: string;
  invoice_number: string;
  amount: number;
  status: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  _synced: 0 | 1;
}

export interface LocalMedicalRecord {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id?: string;
  appointment_id?: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
  _synced: 0 | 1;
}

export type OfflineAction =
  | 'INSERT_PATIENT'
  | 'UPDATE_PATIENT'
  | 'INSERT_APPOINTMENT'
  | 'UPDATE_APPOINTMENT_STATUS'
  | 'INSERT_INVOICE'
  | 'UPDATE_INVOICE'
  | 'INSERT_MEDICAL_RECORD'
  | 'UPDATE_MEDICAL_RECORD'
  | 'INSERT_DOCTOR'
  | 'UPDATE_DOCTOR';

export interface OfflineQueueItem {
  id?: number;           // auto-increment PK
  action: OfflineAction;
  table: string;         // supabase table name
  payload: Record<string, unknown>;
  created_at: string;
  retries: number;
}

// ---------------------------------------------------------------------------
// Dexie DB class
// ---------------------------------------------------------------------------

class ClinicOfflineDB extends Dexie {
  patients!: Table<LocalPatient, string>;
  appointments!: Table<LocalAppointment, string>;
  doctors!: Table<LocalDoctor, string>;
  invoices!: Table<LocalInvoice, string>;
  medical_records!: Table<LocalMedicalRecord, string>;
  offline_queue!: Table<OfflineQueueItem, number>;

  constructor() {
    super('ClinicOS_OfflineDB');

    this.version(1).stores({
      patients:      'id, clinic_id, _synced, created_at',
      appointments:  'id, clinic_id, patient_id, doctor_id, status, _synced, start_time',
      offline_queue: '++id, action, table, created_at',
    });

    this.version(2).stores({
      patients:      'id, clinic_id, _synced, created_at',
      appointments:  'id, clinic_id, patient_id, doctor_id, status, _synced, start_time',
      offline_queue: '++id, action, table, created_at',
      doctors:       'id, clinic_id, _synced, is_active',
      invoices:      'id, clinic_id, patient_id, appointment_id, status, _synced, created_at',
      medical_records: 'id, clinic_id, patient_id, doctor_id, _synced, created_at',
    });
  }
}

// Singleton instance
const offlineDb = new ClinicOfflineDB();

export default offlineDb;
