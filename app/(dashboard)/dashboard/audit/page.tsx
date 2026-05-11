'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Activity, User, Calendar, Database, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LOGIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const ENTITY_LABELS: Record<string, string> = {
  PATIENT: 'مريض',
  APPOINTMENT: 'موعد',
  INVOICE: 'فاتورة',
  SETTINGS: 'إعدادات النظام',
  AUTH: 'نظام الدخول',
};

export default function AuditLogsPage() {
  const { clinicId } = useAuth();
  const supabase = createClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      // Fetch logs and join with profiles to get the user's name
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-cairo py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-primary" />
            سجل نشاطات النظام
          </h1>
          <p className="text-muted-foreground mt-2">مراقبة كافة تحركات الموظفين والتغييرات داخل العيادة لضمان الأمان والشفافية.</p>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log: any) => (
                <div key={log.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl">
                      <Activity className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {(log.profiles && !Array.isArray(log.profiles)) ? (log.profiles as any).full_name : 'النظام الآلي'}
                        </span>
                        <span className="text-muted-foreground text-sm">قام بإجراء</span>
                        <Badge className={`border-none ${ACTION_COLORS[log.action_type] || 'bg-slate-100 text-slate-700'}`}>
                          {log.action_type === 'CREATE' ? 'إضافة' : log.action_type === 'UPDATE' ? 'تعديل' : log.action_type === 'DELETE' ? 'حذف' : log.action_type}
                        </Badge>
                        <span className="text-muted-foreground text-sm">على سجل</span>
                        <Badge variant="outline" className="font-bold">
                          {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg inline-block">
                        {log.details?.message || `تم تسجيل حركة ${log.action_type} بنجاح.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground whitespace-nowrap bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl">
                    <Calendar className="h-4 w-4" />
                    {formatDateTime(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-20 text-center">
              <Database className="h-16 w-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">لا يوجد سجلات نشاط حتى الآن</h3>
              <p className="text-muted-foreground mt-2">ستظهر هنا كافة حركات الإضافة والتعديل والحذف التي يقوم بها الموظفون.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
