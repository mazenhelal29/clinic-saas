import { z } from 'zod';

export const appointmentSchema = z.object({
  patient_id: z.string().uuid().optional().nullable(),
  manual_patient_name: z.string().min(1, 'اسم المريض مطلوب'),
  doctor_id: z.string().uuid().optional().nullable(), // Made optional
  start_time: z.string().min(1, 'وقت الموعد مطلوب'),
  type: z.string().min(1, 'نوع الزيارة مطلوب'),
  amount: z.union([z.string(), z.number()]).transform((val) => Number(val) || 0),
  notes: z.string().optional(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type AppointmentFormValues = z.input<typeof appointmentSchema>;
