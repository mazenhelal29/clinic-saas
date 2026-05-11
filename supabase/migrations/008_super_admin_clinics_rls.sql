-- Enable Super Admin to manage all clinics
-- This fixes the issue where extending subscriptions silently fails due to RLS blocking updates on clinics not owned by the Super Admin

-- 1. Allow Super Admin to UPDATE any clinic
CREATE POLICY "Super Admins can update any clinic" ON clinics 
FOR UPDATE 
USING (
  auth.jwt() ->> 'email' = 'mazenhelal29@gmail.com' 
  OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 2. Allow Super Admin to SELECT (view) any clinic
-- (They can already see them via the RPC or if they bypass RLS, but it's good practice)
CREATE POLICY "Super Admins can view any clinic" ON clinics 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' = 'mazenhelal29@gmail.com' 
  OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);
