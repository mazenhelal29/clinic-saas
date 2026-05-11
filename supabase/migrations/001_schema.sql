-- CLINIC MANAGEMENT SYSTEM SCHEMA (FINAL PRODUCTION VERSION)

-- 1. CLEANUP (CAUTION: This will delete existing data)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;

-- 2. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. TABLES

-- CLINICS TABLE
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_ar TEXT,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    plan_id TEXT DEFAULT 'free',
    owner_id UUID NOT NULL, -- References auth.users
    settings JSONB DEFAULT '{
        "timezone": "Asia/Riyadh",
        "currency": "SAR",
        "language": "ar"
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROFILES TABLE (Linked to Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'doctor',
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PATIENTS TABLE
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gender TEXT,
    dob DATE,
    address TEXT,
    medical_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DOCTORS TABLE
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    specialization TEXT,
    phone TEXT,
    email TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- APPOINTMENTS TABLE (Updated with Amount and Manual Name)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE, -- Optional for manual entry
    manual_patient_name TEXT, -- For manual entry
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'scheduled',
    type TEXT DEFAULT 'consultation',
    amount NUMERIC(10,2) DEFAULT 0, -- NEW: Revenue tracking
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ENABLE RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES

-- CLINICS
CREATE POLICY "Clinics are viewable by members" ON clinics FOR SELECT USING (id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can update clinics" ON clinics FOR UPDATE USING (owner_id = auth.uid());

-- PROFILES
CREATE POLICY "Profiles are viewable by clinic members" ON profiles FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- PATIENTS
CREATE POLICY "Clinic members can manage patients" ON patients FOR ALL USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

-- DOCTORS
CREATE POLICY "Clinic members can view doctors" ON doctors FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage doctors" ON doctors FOR ALL USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

-- APPOINTMENTS
CREATE POLICY "Clinic members can manage appointments" ON appointments FOR ALL USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

-- 6. AUTH TRIGGER (Automated Clinic/Profile Creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_clinic_id UUID;
BEGIN
    -- 1. Create a default clinic for the new user
    INSERT INTO public.clinics (name, slug, owner_id)
    VALUES (
        'عيادتي الجديدة', 
        'clinic-' || substr(md5(random()::text), 0, 8),
        NEW.id
    ) RETURNING id INTO new_clinic_id;

    -- 2. Create the profile linked to the clinic
    INSERT INTO public.profiles (id, clinic_id, full_name, email, role)
    VALUES (
        NEW.id,
        new_clinic_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
        NEW.email,
        'clinic_admin'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
