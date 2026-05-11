import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'البريد الإلكتروني غير صالح' }),
  password: z.string().min(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }),
});

export const registerClinicSchema = z.object({
  clinic_name: z.string().min(2, { message: 'اسم العيادة مطلوب' }),
  full_name: z.string().min(2, { message: 'الاسم الكامل مطلوب' }),
  email: z.string().email({ message: 'البريد الإلكتروني غير صالح' }),
  password: z.string().min(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }),
  confirm_password: z.string(),
  phone: z.string().optional(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirm_password'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'البريد الإلكتروني غير صالح' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterClinicInput = z.infer<typeof registerClinicSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
