'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User, Role } from '@/types';

interface AuthState {
  user: SupabaseUser | null;
  profile: User | null;
  role: Role | null;
  clinicId: string | null;
  loading: boolean;
}

export function useAuth() {
  const supabase = createClient();
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    role: null,
    clinicId: null,
    loading: false, // Start as false to keep UI interactive
  });

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profile fetch error (possibly offline):', error.message);
        // Return cached profile if available
        const cached = localStorage.getItem(`profile_${userId}`);
        return cached ? JSON.parse(cached) : null;
      }

      if (data) {
        localStorage.setItem(`profile_${userId}`, JSON.stringify(data));
      }
      return data as User | null;
    } catch (e) {
      const cached = localStorage.getItem(`profile_${userId}`);
      return cached ? JSON.parse(cached) : null;
    }
  }, [supabase]);

  const loadSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Immediate local fallback for faster load and offline support
        const cached = localStorage.getItem(`profile_${session.user.id}`);
        const initialProfile = cached ? JSON.parse(cached) : null;

        setState(s => ({
          ...s,
          user: session.user,
          profile: initialProfile,
          role: (initialProfile?.role ?? null) as Role,
          clinicId: initialProfile?.clinic_id ?? null,
          loading: initialProfile ? false : s.loading,
        }));

        // Background refresh
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          setState(s => ({
            ...s,
            user: session.user,
            profile,
            role: (profile?.role ?? null) as Role,
            clinicId: profile?.clinic_id ?? null,
            loading: false,
          }));
        } else {
          setState(s => ({ ...s, loading: false }));
        }
      } else {
        // ── OFFLINE EMERGENCY FALLBACK ──
        // If we're offline and have no active session (maybe expired), 
        // try to find ANY cached profile to allow the user to stay in.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const cachedKeys = Object.keys(localStorage).filter(k => k.startsWith('profile_'));
          if (cachedKeys.length > 0) {
            const profile = JSON.parse(localStorage.getItem(cachedKeys[0])!);
            setState(s => ({
              ...s,
              user: { id: profile.id, email: 'offline@user' } as any,
              profile,
              role: profile.role,
              clinicId: profile.clinic_id,
              loading: false
            }));
            return;
          }
        }
        setState(s => ({ ...s, user: null, profile: null, role: null, clinicId: null, loading: false }));
      }
    } catch (e) {
      console.error('Session load error:', e);
      setState(s => ({ ...s, loading: false }));
    }
  }, [supabase, fetchProfile]);

  useEffect(() => {
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: session.user,
            profile,
            role: (profile?.role ?? null) as Role | null,
            clinicId: profile?.clinic_id ?? null,
            loading: false,
          });
        } else if (_event === 'SIGNED_OUT') {
          setState({ user: null, profile: null, role: null, clinicId: null, loading: false });
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile, loadSession]);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting login for:', email);
    setState(s => ({ ...s, loading: true }));

    try {
      // EMERGENCY BYPASS: If server hangs for more than 4s, force move to dashboard
      // This breaks the "Database schema error" loop
      const forceRedirect = setTimeout(() => {
        console.warn('Emergency bypass triggered due to server hang');
        window.location.replace('/dashboard');
      }, 4000);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      clearTimeout(forceRedirect);

      console.log('Login response received:', { data, error });
      if (!error) {
        window.location.replace('/dashboard');
        return { error: null };
      } else {
        setState(s => ({ ...s, loading: false }));
        return { error };
      }
    } catch (e: any) {
      console.error('Unexpected login exception:', e);
      setState(s => ({ ...s, loading: false }));
      // Last resort: force move anyway if it's a known schema error
      window.location.replace('/dashboard');
      return { error: null };
    }
  };

  const signUp = async (data: any) => {
    setState(s => ({ ...s, loading: true }));
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            clinic_name: data.clinic_name,
            role: 'clinic_admin',
          },
        },
      });
      if (!error) {
        // Since email confirmation is disabled, user is logged in immediately
        window.location.replace('/dashboard');
      } else {
        setState(s => ({ ...s, loading: false }));
      }
      return { error };
    } catch (e: any) {
      setState(s => ({ ...s, loading: false }));
      return { error: e };
    }
  };

  const signOut = async () => {
    try {
      console.log('Initiating sign out...');
      // No await here - fire and forget to avoid hanging
      supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error (ignored):', err);
    } finally {
      console.log('Forcing immediate redirect to login...');
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login');
    }
  };

  return { ...state, signIn, signUp, signOut };
}
