'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Stethoscope, User, Mail, Lock, Building, Loader2, ShieldCheck, Zap, Globe } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    clinic_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const { signUp, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    const { error } = await signUp(formData);
    if (error) {
      console.error('Registration Error Detail:', error);
      setError(error.message || 'حدث خطأ غير متوقع أثناء التسجيل');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-slate-900 font-cairo relative overflow-hidden py-16">
      
      {/* Top Decoration */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      <div className="w-full max-w-[580px] space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 relative z-10">
        {/* Brand Logo */}
        <div className="flex flex-col items-center space-y-3">
          <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-xl shadow-primary/10 flex items-center justify-center text-primary border border-primary/5">
            <Stethoscope className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Clinic<span className="text-primary">OS</span></h1>
        </div>

        <Card className="p-8 sm:p-12 border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl rounded-[3rem]">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white">سجّل عيادتك الآن</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">ابدأ رحلة النجاح مع أقوى نظام إدارة طبية</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2 animate-shake">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600 mr-1">اسم العيادة</Label>
                <div className="relative">
                  <Building className="absolute right-4 top-4 h-5 w-5 text-slate-300" />
                  <Input
                    placeholder="عيادة النور"
                    className="h-13 pr-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:ring-primary/20 focus:border-primary transition-all"
                    value={formData.clinic_name}
                    onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600 mr-1">اسمك الكامل</Label>
                <div className="relative">
                  <User className="absolute right-4 top-4 h-5 w-5 text-slate-300" />
                  <Input
                    placeholder="د. محمد"
                    className="h-13 pr-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:ring-primary/20 focus:border-primary transition-all"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-600 mr-1">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-4 top-4 h-5 w-5 text-slate-300" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="h-13 pr-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:ring-primary/20 focus:border-primary transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600 mr-1">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-4 top-4 h-5 w-5 text-slate-300" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="h-13 pr-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:ring-primary/20 focus:border-primary transition-all"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600 mr-1">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-4 top-4 h-5 w-5 text-slate-300" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="h-13 pr-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-primary/20 focus:border-primary transition-all"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-lg shadow-primary/25 transition-all active:scale-[0.98] mt-4" 
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إنشاء الحساب والبدء'}
            </Button>

            <div className="text-center pt-6 border-t border-slate-50 dark:border-slate-800">
              <p className="text-slate-500 text-sm font-medium">
                لديك حساب بالفعل؟{' '}
                <Link href="/login" className="text-primary font-black hover:underline underline-offset-4 decoration-2">تسجيل الدخول</Link>
              </p>
            </div>
          </form>
        </Card>

        {/* Professional Footer Insignia */}
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 py-4 opacity-50">
           <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">Encrypted</span>
           </div>
           <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">Optimized</span>
           </div>
           <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">Global Tech</span>
           </div>
        </div>
      </div>

      {/* Subtle Background Mesh */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-slate-950 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
    </div>
  );
}
