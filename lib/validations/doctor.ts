import { z } from 'zod';

export const doctorSchema = z.object({
  full_name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  specialization: z.string().min(2, 'التخصص مطلوب'),
  phone: z.string().optional(),
  email: z.string().email('بريد إلكتروني غير صحيح').optional().or(z.literal('')),
});

export type DoctorInput = z.infer<typeof doctorSchema>;
