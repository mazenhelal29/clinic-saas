import { createClient } from '@/lib/supabase/client';
import type { LoginInput, RegisterClinicInput } from '@/lib/validations/auth';

export const authService = {
  async login({ email, password }: LoginInput) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async register({ email, password, full_name, clinic_name }: RegisterClinicInput) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          clinic_name,
          role: 'clinic_admin',
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  },

  async getSession() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },
};
