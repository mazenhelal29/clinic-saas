-- Keep booking-related tables compatible with the dashboard flows.
-- Older deployments may be missing columns that the client already uses.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS mrn TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE public.patients
SET mrn = 'PT-' || right(id::text, 8)
WHERE mrn IS NULL;

UPDATE public.patients
SET is_active = true
WHERE is_active IS NULL;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS specialization TEXT DEFAULT 'عام',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE public.doctors
SET is_active = true
WHERE is_active IS NULL;

UPDATE public.doctors
SET specialization = 'عام'
WHERE specialization IS NULL;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_patient_name TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'consultation',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.appointments
  ALTER COLUMN patient_id DROP NOT NULL,
  ALTER COLUMN status SET DEFAULT 'scheduled';
