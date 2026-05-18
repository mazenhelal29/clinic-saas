'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Mail, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setMessage('');
    setError('');
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message || 'تعذر إرسال رابط استعادة كلمة المرور.');
      } else {
        setMessage('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.');
      }
    } catch {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-slate-900 font-cairo relative overflow-hidden">
      <div className="w-full max-w-[460px] space-y-8 relative z-10">
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
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">استعادة كلمة المرور</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">اكتب بريدك الإلكتروني وسنرسل لك رابط الاستعادة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs font-bold border border-emerald-100">
                {message}
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

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري الإرسال
                </>
              ) : (
                'إرسال رابط الاستعادة'
              )}
            </Button>

            <Button asChild variant="outline" className="w-full h-12 rounded-2xl font-bold">
              <Link href="/login">
                <ArrowRight className="h-4 w-4" />
                الرجوع لتسجيل الدخول
              </Link>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
