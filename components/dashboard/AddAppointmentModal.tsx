'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, DollarSign, User } from 'lucide-react';
import { appointmentSchema, type AppointmentInput, type AppointmentFormValues } from '@/lib/validations/appointment';
import { useAppointments } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AddAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAppointmentModal({ open, onOpenChange }: AddAppointmentModalProps) {
  const { createAppointment } = useAppointments();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      amount: "0",
      type: "consultation"
    }
  });

  const onSubmit = async (data: AppointmentFormValues) => {
    try {
      const validatedData = appointmentSchema.parse(data) as AppointmentInput;
      await createAppointment.mutateAsync(validatedData);
      toast({ title: 'تم الحجز بنجاح', description: 'تم إضافة الموعد وتحديث الإيرادات.' });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'فشل في عملية الحجز.';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] border-primary/20 rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">حجز موعد جديد</DialogTitle>
          <DialogDescription>سجل بيانات المريض والمبلغ المحصل مباشرة.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="font-bold">اسم المريض</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="أدخل اسم المريض" className="pl-10 h-12 rounded-xl" {...register('manual_patient_name')} />
            </div>
            {errors.manual_patient_name && <p className="text-xs text-destructive">{errors.manual_patient_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">المبلغ المحصل</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-emerald-600" />
                <Input type="text" placeholder="0.00" className="pl-10 h-12 rounded-xl font-bold text-lg" {...register('amount')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">نوع الزيارة</Label>
              <Select onValueChange={(val) => setValue('type', val)} defaultValue="consultation">
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">كشف جديد</SelectItem>
                  <SelectItem value="follow_up">متابعة</SelectItem>
                  <SelectItem value="emergency">طوارئ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">توقيت الحجز</Label>
            <Input type="datetime-local" className="h-12 rounded-xl" {...register('start_time')} />
            {errors.start_time && <p className="text-xs text-destructive">{errors.start_time.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" className="h-12 px-6 rounded-xl" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button 
              type="submit" 
              disabled={createAppointment.isPending} 
              className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 font-black text-white shadow-lg shadow-primary/25 min-w-[140px]"
            >
              {createAppointment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'تأكيد الحجز والحفظ'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
