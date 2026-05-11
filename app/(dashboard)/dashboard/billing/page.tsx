'use client';

import { useState } from 'react';
import { Plus, Receipt, CheckCircle, Clock, AlertCircle, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, exportToCSV, withTimeout } from '@/lib/utils';
import type { Invoice } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import offlineDb from '@/lib/db/offline-db';
import { isEffectivelyOffline } from '@/hooks/useNetworkStatus';

const STATUS_MAP = {
  paid:      { label: 'مدفوعة', variant: 'success' as const, icon: CheckCircle },
  sent:      { label: 'مرسلة',  variant: 'info' as const,    icon: Clock },
  overdue:   { label: 'متأخرة', variant: 'destructive' as const, icon: AlertCircle },
  draft:     { label: 'مسودة',  variant: 'outline' as const, icon: Receipt },
  cancelled: { label: 'ملغاة',  variant: 'outline' as const, icon: Receipt },
};

export default function BillingPage() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', clinicId],
    enabled: !!clinicId,
    networkMode: 'always',
    queryFn: async () => {
      const tryLocal = async () => {
        const local = await offlineDb.invoices
          .where('clinic_id')
          .equals(clinicId!)
          .reverse()
          .sortBy('created_at');
        return local.map(i => ({ ...i, _local: true })) as unknown as Invoice[];
      };

      if (await isEffectivelyOffline()) return tryLocal();

      try {
        const result = await withTimeout(
          supabase
            .from('invoices')
            .select('*, patient:patients(full_name)')
            .eq('clinic_id', clinicId!)
            .order('created_at', { ascending: false }),
          5000
        );
        const { data, error } = result as { data: any[]; error: any };
        if (error) throw error;

        // Update local DB cache with fresh server data
        if (data && data.length > 0) {
          try {
            const toPut = data.map((i: any) => ({ ...i, _synced: 1 as const }));
            await offlineDb.invoices.bulkPut(toPut);
          } catch (e) {
            console.warn('Failed to cache invoices locally', e);
          }
        }

        // Merge unsynced local invoices
        try {
          const unsynced = await offlineDb.invoices
            .where('clinic_id').equals(clinicId!)
            .and(i => i._synced === 0)
            .toArray();
          const serverIds = new Set((data ?? []).map(r => r.id));
          const pendingLocal = unsynced
            .filter(i => !serverIds.has(i.id))
            .map(i => ({ ...i, _local: true })) as unknown as Invoice[];
          return [...pendingLocal, ...(data ?? [])] as Invoice[];
        } catch {
          return (data ?? []) as Invoice[];
        }
      } catch {
        return tryLocal();
      }
    }
  });

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0);
  const totalPending = invoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((s, i) => s + (i.total ?? 0), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total ?? 0), 0);

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'invoice_number', header: 'رقم الفاتورة', sortable: true },
    { key: 'patient', header: 'المريض', render: (_, row) => (row.patient as any)?.full_name ?? '—' },
    {
      key: 'total', header: 'المبلغ', sortable: true,
      render: (v) => <span className="font-semibold">{formatCurrency(v as number)}</span>,
    },
    { key: 'due_date', header: 'تاريخ الاستحقاق', render: (v) => formatDate(v as string) },
    { key: 'created_at', header: 'تاريخ الإنشاء', sortable: true, render: (v) => formatDate(v as string) },
    {
      key: 'status', header: 'الحالة',
      render: (v) => {
        const s = STATUS_MAP[v as keyof typeof STATUS_MAP];
        const isLocal = (v as any)?._local;
        return s ? (
          <div className="flex items-center gap-2">
            <Badge variant={s.variant}>{s.label}</Badge>
            {isLocal && <Badge variant="outline" className="text-[10px] px-1 py-0 opacity-50">محلي</Badge>}
          </div>
        ) : <Badge variant="outline">{String(v)}</Badge>;
      },
    },
  ];

  const handleExport = () => {
    const exportData = invoices.map(i => ({
      'رقم الفاتورة': i.invoice_number,
      'المريض': (i.patient as any)?.full_name || '—',
      'المبلغ': i.total,
      'تاريخ الاستحقاق': i.due_date,
      'تاريخ الإنشاء': i.created_at,
      'الحالة': STATUS_MAP[i.status as keyof typeof STATUS_MAP]?.label || i.status
    }));
    exportToCSV(exportData, 'سجل_الفواتير');
  };

  const handleUnderDevelopment = () => {
    toast({
      title: 'ميزة قيد التطوير',
      description: 'نظام إنشاء الفواتير سيتم تفعيله بالكامل في التحديث القادم.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">الفواتير والمدفوعات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة الفواتير وتتبع المدفوعات</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> تصدير Excel
          </Button>
          <Button onClick={handleUnderDevelopment}><Plus className="h-4 w-4" />فاتورة جديدة</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'إجمالي المحصّل', value: formatCurrency(totalRevenue), icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'فواتير معلقة',   value: formatCurrency(totalPending), icon: Clock,       color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
          { label: 'فواتير متأخرة',  value: formatCurrency(totalOverdue), icon: AlertCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
        ].map(s => (
          <Card key={s.label} className="card-hover">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`rounded-xl p-3 ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold mt-0.5">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <DataTable
            data={invoices as unknown as Record<string, unknown>[]}
            columns={columns}
            searchPlaceholder="بحث بالفاتورة أو المريض..."
          />
        )}
      </div>
    </div>
  );
}

