'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { AuthError, User as SupabaseUser } from '@supabase/supabase-js';
import type { User, Role } from '@/types';

interface AuthState {
  user: SupabaseUser | null;
  profile: User | null;
  role: Role | null;
  clinicId: string | null;
  loading: boolean;
}

const initialAuthState: AuthState = {
  user: null,
  profile: null,
  role: null,
  clinicId: null,
  loading: true,
};

let sharedAuthState: AuthState = initialAuthState;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer));
  });
}

export function useAuth() {
  const router = useRouter();
  // Memoize supabase client to prevent hook dependency changes
  const supabase = useMemo(() => createClient(), []);
  
  const [state, setLocalState] = useState<AuthState>(sharedAuthState);

  const setAuthState = useCallback((updater: AuthState | ((state: AuthState) => AuthState)) => {
    setLocalState((current) => {
      const next = typeof updater === 'function'
        ? (updater as (state: AuthState) => AuthState)(current)
        : updater;
      sharedAuthState = next;
      return next;
    });
  }, []);

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

        setAuthState(s => ({
          ...s,
          user: session.user,
          profile: initialProfile,
          role: (initialProfile?.role ?? null) as Role,
          clinicId: initialProfile?.clinic_id ?? null,
          loading: !initialProfile,
        }));

        // Background refresh
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          setAuthState(s => ({
            ...s,
            user: session.user,
            profile,
            role: (profile?.role ?? null) as Role,
            clinicId: profile?.clinic_id ?? null,
            loading: false,
          }));
        } else {
          setAuthState(s => ({ ...s, loading: false }));
        }
      } else {
        // ── OFFLINE EMERGENCY FALLBACK ──
        // If we're offline and have no active session (maybe expired), 
        // try to find ANY cached profile to allow the user to stay in.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const cachedKeys = Object.keys(localStorage).filter(k => k.startsWith('profile_'));
          if (cachedKeys.length > 0) {
            const profile = JSON.parse(localStorage.getItem(cachedKeys[0])!);
            setAuthState(s => ({
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
        setAuthState(s => ({ ...s, user: null, profile: null, role: null, clinicId: null, loading: false }));
      }
    } catch (e) {
      console.error('Session load error:', e);
      setAuthState(s => ({ ...s, loading: false }));
    }
  }, [supabase, fetchProfile, setAuthState]);

  // ── COMBINED AUTH & POLLING LOGIC ──
  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadSession();
    }, 0);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setAuthState({
            user: session.user,
            profile,
            role: (profile?.role ?? null) as Role | null,
            clinicId: profile?.clinic_id ?? null,
            loading: false,
          });
        } else if (_event === 'SIGNED_OUT') {
          setAuthState({ user: null, profile: null, role: null, clinicId: null, loading: false });
        }
      }
    );

    // Polling logic for new users
    let interval: NodeJS.Timeout | null = null;
    if (state.user && !state.clinicId && !state.loading) {
      let attempts = 0;
      interval = setInterval(async () => {
        attempts++;
        console.log(`Polling attempt ${attempts} for clinicId...`);
        const profile = await fetchProfile(state.user!.id);
        if (profile?.clinic_id) {
          setAuthState(s => ({ ...s, profile, role: profile.role as Role, clinicId: profile.clinic_id, loading: false }));
          if (interval) clearInterval(interval);
          return;
        }

        if (attempts >= 3) {
          if (interval) clearInterval(interval);
          try {
            const clinicName = state.user?.user_metadata?.clinic_name || 'عيادتي';
            const fullName = state.user?.user_metadata?.full_name || 'طبيب جديد';
            const { data: clinic } = await supabase.from('clinics').insert({
              name: clinicName,
              slug: `clinic-${Math.random().toString(36).substring(2, 10)}`,
              owner_id: state.user!.id
            }).select().single();
            if (clinic) {
              const { data: prof } = await supabase.from('profiles').insert({
                id: state.user!.id,
                clinic_id: clinic.id,
                full_name: fullName,
                email: state.user!.email!,
                role: 'clinic_admin'
              }).select().single();
                if (prof) {
                  setAuthState(s => ({ ...s, profile: prof, role: 'clinic_admin', clinicId: clinic.id, loading: false }));
                  window.location.reload(); 
                }
              }
            } catch (err: any) { 
              console.error('Fallback failed:', err);
              alert(`فشل إعداد العيادة تلقائياً: ${err.message || 'خطأ غير معروف'}`);
            }
          }
        }, 2000);
      }

    return () => {
      window.clearTimeout(loadTimer);
      subscription.unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [supabase, fetchProfile, loadSession, setAuthState, state.user, state.clinicId, state.loading]);

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | Error | null }> => {
    setAuthState(s => ({ ...s, loading: true }));

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        12000,
        'استغرق تسجيل الدخول وقتا أطول من المتوقع. تأكد من الاتصال وحاول مرة أخرى.'
      );

      if (!error) {
        window.location.replace('/dashboard');
        return { error: null };
      }

      setAuthState(s => ({ ...s, loading: false }));
      return { error };
    } catch (e: unknown) {
      setAuthState(s => ({ ...s, loading: false }));
      return { error: e instanceof Error ? e : new Error('حدث خطأ غير متوقع أثناء تسجيل الدخول.') };
    }
  };

  const signUp = async (data: any) => {
    setAuthState(s => ({ ...s, loading: true }));
    try {
      // Emergency redirect safety for slow triggers
      const forceRedirect = setTimeout(() => {
        window.location.replace('/dashboard');
      }, 5000);

      const { error } = await withTimeout(
        supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.full_name,
              clinic_name: data.clinic_name,
              role: 'clinic_admin',
            },
          },
        }),
        12000,
        'استغرق إنشاء الحساب وقتا أطول من المتوقع. تأكد من الاتصال وحاول مرة أخرى.'
      );
      
      clearTimeout(forceRedirect);

      if (!error) {
        // Wait 2 seconds for triggers to finish before redirecting
        setTimeout(() => {
          window.location.replace('/dashboard');
        }, 2000);
      } else {
        setAuthState(s => ({ ...s, loading: false }));
      }
      return { error };
    } catch (e: any) {
      setAuthState(s => ({ ...s, loading: false }));
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
