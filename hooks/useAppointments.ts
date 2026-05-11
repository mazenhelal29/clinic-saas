'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { AppointmentInput } from '@/lib/validations/appointment';

import offlineDb from '@/lib/db/offline-db';
import { isEffectivelyOffline } from './useNetworkStatus';

function generateLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useAppointments() {
  const supabase = createClient();
  const { user, clinicId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createAppointment = useMutation({
    networkMode: 'always',
    mutationFn: async (data: AppointmentInput) => {
      if (await isEffectivelyOffline()) {
        const db = offlineDb;
        const now = new Date().toISOString();
        const localId = generateLocalId();
        
        // Attempt to find clinicId from cache if state is missing
        let localClinicId = clinicId;
        if (!localClinicId && user?.id) {
          const cachedProfile = localStorage.getItem(`profile_${user.id}`);
          if (cachedProfile) {
            localClinicId = JSON.parse(cachedProfile).clinic_id;
          }
        }
        
        if (!localClinicId) {
          throw new Error('تعذر تحديد العيادة. يرجى الانتظار حتى تحميل البيانات.');
        }

        // Save patient locally
        const localPatientId = generateLocalId();
        await db.patients.put({
          id: localPatientId,
          clinic_id: localClinicId,
          full_name: data.manual_patient_name ?? '',
          phone: '',
          email: '',
          gender: 'other',
          date_of_birth: now.split('T')[0],
          created_at: now,
          updated_at: now,
          _synced: 0,
        });

        // Save appointment locally
        await db.appointments.put({
          id: localId,
          clinic_id: localClinicId,
          patient_id: localPatientId,
          manual_patient_name: data.manual_patient_name,
          start_time: data.start_time,
          amount: data.amount,
          type: data.type,
          status: 'pending',
          notes: data.notes,
          created_at: now,
          updated_at: now,
          _synced: 0,
        });

        // Queue patient insert for later sync
        await db.offline_queue.add({
          action: 'INSERT_PATIENT',
          table: 'patients',
          payload: {
            id: localPatientId,
            clinic_id: localClinicId,
            full_name: data.manual_patient_name ?? '',
            phone: '',
            email: '',
            gender: 'other',
            date_of_birth: now.split('T')[0],
          },
          created_at: now,
          retries: 0,
        });

        // Queue appointment insert for later sync
        await db.offline_queue.add({
          action: 'INSERT_APPOINTMENT',
          table: 'appointments',
          payload: {
            id: localId,
            clinic_id: localClinicId,
            patient_id: localPatientId,
            manual_patient_name: data.manual_patient_name,
            start_time: data.start_time,
            type: data.type,
            amount: data.amount,
            notes: data.notes,
            status: 'pending',
          },
          created_at: now,
          retries: 0,
        });

        return; // Done — sync will happen when back online
      }

      // ─── ONLINE PATH (original logic, unchanged) ───────────────────────
      let currentClinicId = clinicId;
      
      // Fallback: If clinicId is missing in state, fetch it directly
      if (!currentClinicId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', session.user.id)
            .single();
          currentClinicId = profile?.clinic_id;
        }
      }

      if (!currentClinicId) throw new Error('تعذر العثور على مُعرّف العيادة. يرجى تحديث الصفحة.');
      // 1. Create a patient record first (Auto-registration)
      const { data: patient, error: pError } = await supabase
        .from('patients')
        .insert({
          clinic_id: currentClinicId,
          full_name: data.manual_patient_name,
          phone: '', 
          email: '',
          gender: 'other',
          date_of_birth: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (pError) {
        console.error('CRITICAL: Error auto-creating patient:', pError.message);
        // If it fails, we still try to create the appointment to not block the user
      } else {
        console.log('Patient auto-created successfully:', patient.id);
      }

      // 2. Ensure doctor_id exists
      let doctorId = data.doctor_id;
      if (!doctorId) {
        const { data: doctors } = await supabase
          .from('doctors')
          .select('id')
          .eq('clinic_id', currentClinicId)
          .limit(1);
        
        if (doctors && doctors.length > 0) {
          doctorId = doctors[0].id;
        } else {
          // Auto-create a default doctor if none exists
          const { data: newDoc } = await supabase
            .from('doctors')
            .insert({
              clinic_id: currentClinicId,
              full_name: 'طبيب العيادة الأساسي',
              is_active: true
            })
            .select()
            .single();
          if (newDoc) doctorId = newDoc.id;
        }
      }

      if (!doctorId) throw new Error('لا يوجد طبيب مسجل في العيادة.');

      // 3. Create the appointment linked to this new patient and doctor
      const { error } = await supabase
        .from('appointments')
        .insert({
          clinic_id: currentClinicId,
          patient_id: patient?.id || null, 
          doctor_id: doctorId,
          manual_patient_name: data.manual_patient_name,
          start_time: data.start_time,
          type: data.type,
          amount: data.amount,
          notes: data.notes,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });

      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      toast({
        title: isOffline ? 'تم الحفظ محلياً ✓' : 'تم الحجز بنجاح',
        description: isOffline
          ? 'سيتم المزامنة مع السيرفر تلقائياً عند عودة الاتصال.'
          : 'تم تسجيل المريض والموعد في النظام تلقائياً.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ في الحجز',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createAppointment,
  };
}


