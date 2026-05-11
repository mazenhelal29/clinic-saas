-- معالجة بيانات العيادات القديمة لتطبيق نظام الحجب (Subscription Enforcement)

-- 1. إعطاء حالة "trialing" للعيادات التي ليس لديها حالة اشتراك
UPDATE public.clinics 
SET subscription_status = 'trialing' 
WHERE subscription_status IS NULL;

-- 2. إعطاء تاريخ انتهاء افتراضي (7 أيام من الآن) للعيادات التي ليس لها تاريخ انتهاء
UPDATE public.clinics 
SET subscription_expiry = NOW() + INTERVAL '7 days' 
WHERE subscription_expiry IS NULL;

-- 3. (اختياري) تنشيط العيادات المنتهية مؤقتاً لتجنب إيقافها فجأة (يوم واحد تنبيه)
-- يمكنك إزالة التعليق عن هذا الكود إذا أردت إعطاء مهلة يوم للجميع
-- UPDATE public.clinics 
-- SET subscription_expiry = NOW() + INTERVAL '1 day' 
-- WHERE subscription_expiry < NOW();
