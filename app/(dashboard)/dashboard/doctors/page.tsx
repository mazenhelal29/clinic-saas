'use client';

import { useState } from 'react';
import { Plus, Phone, Stethoscope, Loader2, UserPlus, Mail, Award, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useDoctors } from '@/hooks/useDoctors';
import { getInitials } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doctorSchema, type DoctorInput } from '@/lib/validations/doctor';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function DoctorsPage() {
  const { doctors, isLoading, createDoctor } = useDoctors();
  const { clinicId } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DoctorInput>({
    resolver: zodResolver(doctorSchema),
  });

  const onSubmit = async (data: DoctorInput) => {
    if (!clinicId) {
      toast({ title: 'خطأ في النظام', description: 'لم يتم التعرف على معرف العيادة. جرب إعادة تسجيل الدخول.', variant: 'destructive' });
      return;
    }

    try {
      console.log('Adding doctor for clinic:', clinicId, data);
      await createDoctor.mutateAsync(data);
      toast({ title: 'تمت الإضافة', description: 'تم إضافة الطبيب بنجاح.' });
      setIsModalOpen(false);
      reset();
    } catch (error: any) {
      console.error('Add Doctor Error:', error);
      toast({ title: 'خطأ في قاعدة البيانات', description: error.message || 'فشل في إضافة الطبيب.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Clinic ID Debug (Only for development) */}
      {!clinicId && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3 text-amber-600">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">تنبيه: لم يتم تحميل معرف العيادة. يرجى الانتظار أو تحديث الصفحة.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight">الكادر الطبي</h1>
          <p className="text-muted-foreground mt-1">إدارة وتحرير بيانات الأطباء في العيادة</p>
        </div>
        <Button size="lg" className="rounded-2xl gap-2 h-14 px-8 font-bold shadow-lg shadow-primary/20" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-5 w-5" />
          إضافة طبيب جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {doctors.map((doc) => (
          <Card key={doc.id} className="rounded-3xl border-muted/50 overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary text-xl font-black">
                    {getInitials(doc.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg leading-none">{doc.full_name}</h3>
                    <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-600 border-none text-[10px] px-2 py-0">نشط</Badge>
                  </div>
                  <p className="text-primary font-medium text-sm">{doc.specialization}</p>
                  <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {doc.phone || 'بدون هاتف'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {doctors.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed border-muted">
           <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
           <h3 className="text-xl font-bold">لا يوجد أطباء بعد</h3>
           <p className="text-muted-foreground mt-2">ابدأ بإضافة أول طبيب لعيادتك الآن.</p>
        </div>
      )}

      {/* Add Doctor Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">إضافة طبيب جديد</DialogTitle>
            <DialogDescription>أدخل بيانات الطبيب المهنية للتسجيل في النظام.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="font-bold">الاسم بالكامل</Label>
              <Input placeholder="د. محمد علي" className="h-12 rounded-xl" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="font-bold">التخصص</Label>
              <Input placeholder="طب الأسنان، جلدية، إلخ" className="h-12 rounded-xl" {...register('specialization')} />
              {errors.specialization && <p className="text-xs text-destructive">{errors.specialization.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">رقم الهاتف</Label>
                <Input placeholder="05xxxxxxxx" className="h-12 rounded-xl" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">البريد الإلكتروني</Label>
                <Input type="email" placeholder="doctor@clinic.com" className="h-12 rounded-xl" {...register('email')} />
              </div>
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button type="button" variant="outline" className="rounded-xl h-12 px-6" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createDoctor.isPending} className="rounded-xl h-12 px-8 bg-primary hover:bg-primary/90 font-bold">
                {createDoctor.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ البيانات'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
