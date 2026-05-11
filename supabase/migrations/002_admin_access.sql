-- 1. Add subscription columns to clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month');

-- 2. Update RLS for Super Admin (Mazen)
-- This allows the Super Admin to see and manage ALL clinics regardless of membership
DROP POLICY IF EXISTS "Super Admin can view all clinics" ON clinics;
CREATE POLICY "Super Admin can view all clinics" ON clinics 
FOR SELECT USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'mazenhelal29@gmail.com'
);

DROP POLICY IF EXISTS "Super Admin can update all clinics" ON clinics;
CREATE POLICY "Super Admin can update all clinics" ON clinics 
FOR UPDATE USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'mazenhelal29@gmail.com'
);

-- 3. Allow Super Admin to view all profiles (to see clinic owners)
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON profiles;
CREATE POLICY "Super Admin can view all profiles" ON profiles 
FOR SELECT USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'mazenhelal29@gmail.com'
);
