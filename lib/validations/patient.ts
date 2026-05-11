import { z } from 'zod';

export const patientSchema = z.object({
  full_name: z.string().min(2, { message: 'الاسم الكامل مطلوب' }),
  full_name_ar: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().min(9, { message: 'رقم الهاتف غير صالح' }).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  blood_type: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.array(z.string()).optional(),
  notes: z.string().optional(),
  emergency_contact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
  }).optional(),
});

export type PatientInput = z.infer<typeof patientSchema>;
