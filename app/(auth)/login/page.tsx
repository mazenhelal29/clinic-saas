'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HeartPulse, Loader2, Lock, Mail, ShieldCheck, Stethoscope, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        setError(
          error.message === 'Invalid login credentials'
            ? 'بيانات الدخول غير صحيحة. تأكد من البريد الإلكتروني وكلمة المرور.'
            : error.message || 'تعذر تسجيل الدخول. يرجى المحاولة مرة أخرى.'
        );
      }
    } catch {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-slate-900 font-cairo relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="w-full max-w-[460px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-xl shadow-primary/10 flex items-center justify-center text-primary border border-primary/5">
            <Stethoscope className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Clinic<span className="text-primary">OS</span>
          </h1>
        </div>

        <Card className="p-8 sm:p-10 border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem]">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">تسجيل الدخول</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">مرحبا بك مجددا في نظامك المفضل</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300 mr-1">البريد الإلكتروني</Label>
              <div className="relative group">
                <Mail className="absolute right-4 top-4 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="h-13 pr-12 rounded-2xl border-slate-200 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mr-1">
                <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">كلمة المرور</Label>
                <Link href="/forgot-password" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute right-4 top-4 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  type="password"
                  placeholder="********"
                  className="h-13 pr-12 rounded-2xl border-slate-200 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98] mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  جاري الدخول
                </>
              ) : (
                'دخول للمنصة'
              )}
            </Button>

            <div className="text-center pt-6 border-t border-slate-50 dark:border-slate-800">
              <p className="text-slate-500 text-sm font-medium">
                ليس لديك حساب؟{' '}
                <Link href="/register" className="text-primary font-black hover:underline underline-offset-4 decoration-2">
                  أنشئ حسابك الآن
                </Link>
              </p>
            </div>
          </form>
        </Card>

        <div className="flex items-center justify-center gap-8 py-4 opacity-60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">تنظيم المواعيد والحجوزات</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">متابعة المرضى</span>
          </div>
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">إدارة الإيرادات والمصروفات</span>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-slate-950 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
    </div>
  );
}
