'use client';

import { useState } from 'react';
import { 
  Users, Search, Plus, Loader2, 
  Calendar, Phone, Mail, MoreVertical,
  UserPlus, Download
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePatients } from '@/hooks/usePatients';
import { getInitials, exportToCSV } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function PatientsPage() {
  const { clinicId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const { patients, isLoading } = usePatients();

  const filteredPatients = patients?.filter((p: any) => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    if (patients && patients.length > 0) {
      const exportData = patients.map(p => ({
        'الاسم': p.full_name,
        'رقم المريض': p.id,
        'الهاتف': p.phone || 'غير متوفر',
        'البريد الإلكتروني': p.email || 'غير متوفر',
        'تاريخ التسجيل': new Date(p.created_at).toLocaleDateString('ar-SA')
      }));
      exportToCSV(exportData, 'سجل_المرضى');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">سجل المرضى</h1>
          <p className="text-muted-foreground mt-1">إدارة كافة بيانات المرضى المسجلين من خلال المواعيد.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="rounded-2xl h-12 px-6 font-bold gap-2"
            onClick={handleExport}
            disabled={!patients || patients.length === 0}
          >
            <Download className="h-5 w-5" />
            تصدير Excel
          </Button>
          <Button className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 gap-2">
            <UserPlus className="h-5 w-5" />
            إضافة مريض يدوياً
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="بحث في سجل المرضى..." 
            className="h-12 pr-12 rounded-2xl bg-white border-muted/50 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients && filteredPatients.length > 0 ? (
          filteredPatients.map((p: any) => (
            <Card key={p.id} className="border-none shadow-sm hover:shadow-md transition-all rounded-[2.5rem] overflow-hidden group">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black group-hover:scale-110 transition-transform">
                    {getInitials(p.full_name || 'P')}
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-black text-xl text-slate-900 dark:text-white line-clamp-1">{p.full_name}</h3>
                    <Badge variant="outline" className="mt-2 bg-slate-50 text-slate-500 border-slate-100 rounded-lg font-bold">
                      رقم المريض: {p.id.slice(0, 6).toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>تاريخ التسجيل: {new Date(p.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    {p.phone && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{p.phone}</span>
                      </div>
                    )}
                    {p.email && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="line-clamp-1">{p.email}</span>
                      </div>
                    )}
                  </div>

                  <Link href={`/dashboard/medical-records?patient=${p.id}`} className="w-full mt-4 block">
                    <Button variant="outline" className="w-full rounded-xl border-primary/10 text-primary hover:bg-primary/5 font-bold">
                      عرض السجل الطبي
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-muted">
            <Users className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800">لا يوجد مرضى حالياً</h3>
            <p className="text-muted-foreground mt-2">عند إضافة حجز مريض جديد، سيظهر ملفه الشخصي هنا تلقائياً.</p>
          </div>
        )}
      </div>
    </div>
  );
}
