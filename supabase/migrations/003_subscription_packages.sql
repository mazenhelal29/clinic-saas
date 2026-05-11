-- إنشاء جدول الباقات
CREATE TABLE IF NOT EXISTS public.subscription_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    duration_months INT NOT NULL,
    name_ar TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل الحماية (RLS)
ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;

-- سياسة: الجميع يمكنه رؤية الباقات النشطة (لكي تظهر لأصحاب العيادات)
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.subscription_packages;
CREATE POLICY "Anyone can view active packages" ON public.subscription_packages
FOR SELECT USING (is_active = true);

-- سياسة: السوبر أدمن فقط من يمكنه التعديل على الباقات
DROP POLICY IF EXISTS "Super Admin can manage packages" ON public.subscription_packages;
CREATE POLICY "Super Admin can manage packages" ON public.subscription_packages
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- إدخال الباقات الافتراضية إذا كان الجدول فارغاً
INSERT INTO public.subscription_packages (duration_months, name_ar, price)
SELECT 1, 'باقة شهرية', 150
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_packages WHERE duration_months = 1);

INSERT INTO public.subscription_packages (duration_months, name_ar, price)
SELECT 3, 'باقة ربع سنوية (3 شهور)', 400
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_packages WHERE duration_months = 3);

INSERT INTO public.subscription_packages (duration_months, name_ar, price)
SELECT 6, 'باقة نصف سنوية (6 شهور)', 750
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_packages WHERE duration_months = 6);

INSERT INTO public.subscription_packages (duration_months, name_ar, price)
SELECT 12, 'باقة سنوية (12 شهر)', 1400
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_packages WHERE duration_months = 12);
