-- تحديث دالة إنشاء المستخدم لمنح 7 أيام مجانية تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_clinic_id UUID;
BEGIN
    -- 1. Create a default clinic for the new user with a 7-day trial
    INSERT INTO public.clinics (name, slug, owner_id, subscription_status, subscription_expiry)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'عيادتي الجديدة'), 
        'clinic-' || substr(md5(random()::text), 0, 8),
        NEW.id,
        'trialing',
        NOW() + INTERVAL '7 days'
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
