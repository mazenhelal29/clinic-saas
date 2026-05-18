'use client';

import { useState } from 'react';
import { Plus, FileText, Download, Eye, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import offlineDb from '@/lib/db/offline-db';
import { isEffectivelyOffline } from '@/hooks/useNetworkStatus';
import { withTimeout } from '@/lib/utils';

function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function MedicalRecordsPage() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const supabase = createClient();
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [prescription, setPrescription] = useState('');

  // Fetch Medical Records
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['medical-records', clinicId],
    enabled: !!clinicId,
    networkMode: 'always',
    queryFn: async () => {
      const tryLocal = async () => {
        const local = await offlineDb.medical_records.where('clinic_id').equals(clinicId!).toArray();
        return local.map(a => ({ ...a, _local: true })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      };
      if (await isEffectivelyOffline()) return tryLocal();

      try {
        const result = await withTimeout(
          supabase
            .from('medical_records')
            .select(`*, patients (full_name), doctors (full_name)`)
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false }),
          5000
        );
        const { data, error } = result as { data: any[]; error: any };
        if (error) throw error;

        // Update local DB cache with fresh server data
        if (data && data.length > 0) {
          try {
            const pendingRecords = new Set(await offlineDb.medical_records.where('_synced').equals(0).primaryKeys());
            const toPut = data.filter((r: any) => !pendingRecords.has(r.id)).map((r: any) => ({ ...r, _synced: 1 as const }));
            if (toPut.length > 0) await offlineDb.medical_records.bulkPut(toPut);
          } catch (e) {
            console.warn('Failed to cache records locally', e);
          }
        }

        try {
          const unsynced = await offlineDb.medical_records.where('clinic_id').equals(clinicId!).and(a => a._synced === 0).toArray();
          const serverIds = new Set((data ?? []).map(r => r.id));
          const pendingLocal = unsynced.filter(a => !serverIds.has(a.id)).map(a => ({ ...a, _local: true }));
          return [...pendingLocal, ...(data ?? [])];
        } catch { return data ?? []; }
      } catch { return tryLocal(); }
    }
  });

  // Fetch Patients for Dropdown
  const { data: patients } = useQuery({
    queryKey: ['patients', clinicId],
    enabled: !!clinicId,
    networkMode: 'always',
    queryFn: async () => {
      if (await isEffectivelyOffline()) {
        return await offlineDb.patients.where('clinic_id').equals(clinicId!).toArray();
      }
      const { data } = await supabase.from('patients').select('id, full_name').eq('clinic_id', clinicId);
      return data || [];
    }
  });

  // Fetch Doctors for Dropdown
  const { data: doctors } = useQuery({
    queryKey: ['doctors', clinicId],
    enabled: !!clinicId,
    networkMode: 'always',
    queryFn: async () => {
      if (await isEffectivelyOffline()) {
        return await offlineDb.doctors.where('clinic_id').equals(clinicId!).toArray();
      }
      const { data } = await supabase.from('doctors').select('id, full_name').eq('clinic_id', clinicId);
      return data || [];
    }
  });

  // Add Record Mutation
  const addRecord = useMutation({
    networkMode: 'always',
    mutationFn: async () => {
      if (!patientId || !diagnosis || !treatment) throw new Error('يرجى تعبئة كافة الحقول المطلوبة');
      
      const payload = {
        clinic_id: clinicId,
        patient_id: patientId,
        doctor_id: doctorId || null,
        diagnosis,
        treatment,
        prescription
      };

      if (await isEffectivelyOffline()) {
        const now = new Date().toISOString();
        const localId = generateLocalId();
        const fullPayload = { ...payload, id: localId, created_at: now, updated_at: now, _synced: 0 as const };
        
        await offlineDb.medical_records.put(fullPayload as any);
        await offlineDb.offline_queue.add({
          action: 'INSERT_MEDICAL_RECORD',
          table: 'medical_records',
          payload: { ...payload, id: localId },
          created_at: now,
          retries: 0,
        });
        return;
      }
      
      const { error } = await supabase.from('medical_records').insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records'] });
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      toast({ 
        title: isOffline ? 'تم الحفظ محلياً ✓' : 'تمت الإضافة', 
        description: isOffline ? 'سيتم المزامنة تلقائياً.' : 'تم حفظ السجل الطبي بنجاح' 
      });
      setIsDialogOpen(false);
      setPatientId(''); setDoctorId(''); setDiagnosis(''); setTreatment(''); setPrescription('');
    },
    onError: (error: any) => {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  });

  const handleUnderDevelopment = (feature: string) => {
    toast({
      title: 'ميزة قيد التطوير',
      description: `ميزة (${feature}) سيتم تفعيلها قريباً.`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-cairo animate-fade-in py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">السجلات الطبية</h1>
          <p className="text-muted-foreground mt-1">عرض وإدارة السجلات الطبية والتشخيصات للمرضى</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 gap-2">
              <Plus className="h-5 w-5" /> إضافة سجل جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] font-cairo rounded-3xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">إضافة سجل طبي جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">المريض <span className="text-red-500">*</span></Label>
                  <select 
                    className="flex h-12 w-full rounded-2xl border border-input bg-slate-50 px-3 py-2 text-sm focus:ring-primary/20"
                    value={patientId} onChange={e => setPatientId(e.target.value)}
                  >
                    <option value="">اختر المريض...</option>
                    {patients?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">الطبيب المعالج</Label>
                  <select 
                    className="flex h-12 w-full rounded-2xl border border-input bg-slate-50 px-3 py-2 text-sm focus:ring-primary/20"
                    value={doctorId} onChange={e => setDoctorId(e.target.value)}
                  >
                    <option value="">اختر الطبيب...</option>
                    {doctors?.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold">التشخيص الطبي <span className="text-red-500">*</span></Label>
                <Textarea 
                  placeholder="وصف حالة المريض والتشخيص..." 
                  className="rounded-2xl bg-slate-50 resize-none h-24"
                  value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold">خطة العلاج <span className="text-red-500">*</span></Label>
                <Textarea 
                  placeholder="خطوات العلاج أو الإجراءات التي تمت..." 
                  className="rounded-2xl bg-slate-50 resize-none h-24"
                  value={treatment} onChange={e => setTreatment(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold">الوصفة الطبية (الأدوية)</Label>
                <Input 
                  placeholder="أسماء الأدوية والجرعات..." 
                  className="h-12 rounded-2xl bg-slate-50"
                  value={prescription} onChange={e => setPrescription(e.target.value)}
                />
              </div>
            </div>
            <Button 
              className="w-full h-12 rounded-2xl font-black text-lg" 
              onClick={() => addRecord.mutate()}
              disabled={addRecord.isPending}
            >
              {addRecord.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'حفظ السجل'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {recordsLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : records && records.length > 0 ? (
          records.map((rec: any) => (
            <Card key={rec.id} className="border-none shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 shrink-0">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">
                          {rec.patients?.full_name || 'مريض غير معروف'}
                        </h3>
                        <p className="text-sm font-bold text-muted-foreground flex items-center gap-2 mt-1">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                            {rec.doctors?.full_name || 'بدون طبيب محدد'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {formatDateTime(rec.created_at)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-50 hover:bg-slate-100 rounded-xl" onClick={() => handleUnderDevelopment('طباعة السجل')}>
                          <Eye className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-50 hover:bg-slate-100 rounded-xl" onClick={() => handleUnderDevelopment('تحميل PDF')}>
                          <Download className="h-4 w-4 text-slate-600" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">التشخيص</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{rec.diagnosis}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">خطة العلاج</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{rec.treatment}</p>
                      </div>
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wider">الوصفة الطبية</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{rec.prescription || 'لا يوجد أدوية'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-24 text-center border-none shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
            <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">لا يوجد سجلات طبية</h3>
            <p className="text-muted-foreground mt-2 font-medium">قم بإضافة أول سجل طبي بالنقر على الزر بالأعلى.</p>
          </div>
        )}
      </div>
    </div>
  );
}
