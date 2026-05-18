'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { AppointmentInput } from '@/lib/validations/appointment';
import { generateMRN, withTimeout } from '@/lib/utils';

import offlineDb from '@/lib/db/offline-db';
import { isEffectivelyOffline } from './useNetworkStatus';

const SUPABASE_TIMEOUT_MS = 8000;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

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
    onMutate: async (data: AppointmentInput) => {
      const optimisticClinicId = clinicId ?? 'pending-clinic';
      const now = new Date().toISOString();
      const optimisticPatientId = generateLocalId();
      const optimisticAppointment = {
        id: generateLocalId(),
        clinic_id: optimisticClinicId,
        patient_id: optimisticPatientId,
        manual_patient_name: data.manual_patient_name,
        start_time: data.start_time,
        type: data.type,
        amount: data.amount,
        notes: data.notes,
        status: 'scheduled',
        created_at: now,
        updated_at: now,
        _optimistic: true,
      };
      const optimisticPatient = {
        id: optimisticPatientId,
        clinic_id: optimisticClinicId,
        full_name: data.manual_patient_name ?? '',
        phone: '',
        email: '',
        gender: 'other',
        created_at: now,
        updated_at: now,
        is_active: true,
        _optimistic: true,
      };

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['appointments'] }),
        queryClient.cancelQueries({ queryKey: ['dashboard-data'] }),
        queryClient.cancelQueries({ queryKey: ['patients'] }),
      ]);

      queryClient.setQueriesData({ queryKey: ['appointments'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return [optimisticAppointment, ...old];
      });

      queryClient.setQueriesData({ queryKey: ['patients'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return [optimisticPatient, ...old];
      });

      queryClient.setQueriesData({ queryKey: ['dashboard-data'] }, (old: any) => {
        if (!old || typeof old !== 'object') return old;
        const latestAppointments = Array.isArray(old.latestAppointments)
          ? [optimisticAppointment, ...old.latestAppointments].slice(0, 6)
          : [optimisticAppointment];

        return {
          ...old,
          totalPatients: Number(old.totalPatients ?? 0) + 1,
          totalAppointments: Number(old.totalAppointments ?? 0) + 1,
          latestAppointments,
        };
      });

      return { optimisticAppointmentId: optimisticAppointment.id, optimisticPatientId };
    },
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
        const localPatientId = crypto.randomUUID();
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
      const today = new Date().toISOString().split('T')[0];
      const patientBase = {
        clinic_id: currentClinicId,
        full_name: data.manual_patient_name,
        phone: '',
        email: '',
        gender: 'other',
      };
      const patientPayloads = [
        { ...patientBase, mrn: generateMRN(), is_active: true, dob: today },
        { ...patientBase, mrn: generateMRN(), is_active: true, date_of_birth: today },
        { ...patientBase, dob: today },
        { ...patientBase, date_of_birth: today },
        patientBase,
      ];

      let patient: { id: string } | null = null;
      let lastPatientError: unknown = null;

      for (const payload of patientPayloads) {
        let createdPatient: { id: string } | null = null;
        let error: unknown = null;

        try {
          const result = await withTimeout(
            supabase.from('patients').insert(payload).select('id').single(),
            SUPABASE_TIMEOUT_MS
          );
          createdPatient = result.data;
          error = result.error;
        } catch (caughtError) {
          error = caughtError;
        }

        if (!error && createdPatient?.id) {
          patient = createdPatient;
          break;
        }

        lastPatientError = error;
      }

      if (!patient) {
        throw new Error(getErrorMessage(lastPatientError, 'تعذر إنشاء ملف المريض الجديد.'));
      }

      // 2. Ensure doctor_id exists
      let doctorId = data.doctor_id;
      if (!doctorId) {
        const { data: doctors } = await withTimeout(
          supabase
            .from('doctors')
            .select('id')
            .eq('clinic_id', currentClinicId)
            .limit(1),
          SUPABASE_TIMEOUT_MS
        );

        if (doctors && doctors.length > 0) {
          doctorId = doctors[0].id;
        } else {
          // Auto-create a default doctor if none exists
          const { data: newDoc } = await withTimeout(
            supabase
              .from('doctors')
              .insert({
                clinic_id: currentClinicId,
                full_name: 'طبيب العيادة الأساسي',
                specialization: 'عام',
                is_active: true
              })
              .select('id')
              .single(),
            SUPABASE_TIMEOUT_MS
          );
          if (newDoc) doctorId = newDoc.id;
        }
      }

      if (!doctorId) throw new Error('لا يوجد طبيب مسجل في العيادة.');

      // 3. Create the appointment linked to this new patient and doctor
      const appointmentBase = {
        clinic_id: currentClinicId,
        patient_id: patient.id,
        doctor_id: doctorId,
        manual_patient_name: data.manual_patient_name,
        start_time: data.start_time,
        type: data.type,
        amount: data.amount,
        notes: data.notes,
        status: 'scheduled',
      };
      const appointmentPayloads = user?.id
        ? [{ ...appointmentBase, created_by: user.id }, appointmentBase]
        : [appointmentBase];

      let lastAppointmentError: unknown = null;

      for (const payload of appointmentPayloads) {
        let error: unknown = null;

        try {
          const result = await withTimeout(
            supabase.from('appointments').insert(payload).select('id').single(),
            SUPABASE_TIMEOUT_MS
          );
          error = result.error;
        } catch (caughtError) {
          error = caughtError;
        }

        if (!error) return;
        lastAppointmentError = error;
      }

      throw new Error(getErrorMessage(lastAppointmentError, 'تعذر إنشاء الحجز.'));
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['appointments'] });
      queryClient.refetchQueries({ queryKey: ['dashboard-data'] });
      queryClient.refetchQueries({ queryKey: ['patients'] });
      queryClient.refetchQueries({ queryKey: ['today-waiting-queue'] });
      queryClient.refetchQueries({ queryKey: ['reports-data'] });

      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      toast({
        title: isOffline ? 'تم الحفظ محلياً ✓' : 'تم الحجز بنجاح',
        description: isOffline
          ? 'سيتم المزامنة مع السيرفر تلقائياً عند عودة الاتصال.'
          : 'تم تسجيل المريض والموعد في النظام تلقائياً.',
      });
    },
    onError: (error: unknown, _data, context) => {
      if (context?.optimisticAppointmentId) {
        queryClient.setQueriesData({ queryKey: ['appointments'] }, (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.filter((appointment) => appointment.id !== context.optimisticAppointmentId);
        });
        queryClient.setQueriesData({ queryKey: ['dashboard-data'] }, (old: any) => {
          if (!old || typeof old !== 'object') return old;
          return {
            ...old,
            totalPatients: Math.max(0, Number(old.totalPatients ?? 0) - 1),
            totalAppointments: Math.max(0, Number(old.totalAppointments ?? 0) - 1),
            latestAppointments: Array.isArray(old.latestAppointments)
              ? old.latestAppointments.filter((appointment: any) => appointment.id !== context.optimisticAppointmentId)
              : old.latestAppointments,
          };
        });
      }

      if (context?.optimisticPatientId) {
        queryClient.setQueriesData({ queryKey: ['patients'] }, (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.filter((patient) => patient.id !== context.optimisticPatientId);
        });
      }

      toast({
        title: 'خطأ في الحجز',
        description: getErrorMessage(error, 'تعذر إنشاء الحجز.'),
        variant: 'destructive',
      });
    },
  });

  return {
    createAppointment,
  };
}
