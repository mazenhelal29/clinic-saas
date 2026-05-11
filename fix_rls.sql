DROP POLICY IF EXISTS "Admins can manage doctors" ON doctors;
DROP POLICY IF EXISTS "Clinic members can view doctors" ON doctors;
CREATE POLICY "Doctors All" ON doctors FOR ALL USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())) WITH CHECK (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Clinic members can manage patients" ON patients;
CREATE POLICY "Patients All" ON patients FOR ALL USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())) WITH CHECK (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Clinic members can manage appointments" ON appointments;
CREATE POLICY "Appointments All" ON appointments FOR ALL USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())) WITH CHECK (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
