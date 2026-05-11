-- إنشاء جدول سجل النشاطات (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE'
    entity_type TEXT NOT NULL, -- e.g., 'PATIENT', 'APPOINTMENT', 'INVOICE'
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb, -- Store old/new values or custom messages
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Clinic members can view their clinic's logs
DROP POLICY IF EXISTS "Clinic members can view audit logs" ON public.audit_logs;
CREATE POLICY "Clinic members can view audit logs" ON public.audit_logs
FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
);

-- Only system or specific functions can insert (but for simplicity, we allow authenticated users to insert their own logs)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
);
