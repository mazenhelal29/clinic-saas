'use client';

import { Bell, CheckCheck, Calendar, Receipt, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  appointment: Calendar,
  billing: Receipt,
  system: Info,
  message: AlertCircle,
};

const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'appointment', title: 'موعد جديد', body: 'تم تأكيد موعد أحمد محمد مع د. سارة أحمد غداً الساعة 9:00 صباحاً', read: false, created_at: '2025-05-07T08:00:00Z' },
  { id: '2', type: 'billing',     title: 'فاتورة متأخرة', body: 'فاتورة INV-2025-00125 للمريض محمود عبدالله تأخرت عن موعد السداد', read: false, created_at: '2025-05-06T14:00:00Z' },
  { id: '3', type: 'system',      title: 'تحديث النظام', body: 'تم تحديث نظام ClinicOS إلى الإصدار 2.1.0 بنجاح', read: true, created_at: '2025-05-05T10:00:00Z' },
  { id: '4', type: 'appointment', title: 'إلغاء موعد', body: 'ألغت هند الزهراني موعدها المقرر يوم الخميس الساعة 11:00', read: true, created_at: '2025-05-04T16:00:00Z' },
  { id: '5', type: 'billing',     title: 'دفعة مستلمة', body: 'تم استلام دفعة بمبلغ 450 ر.س من أحمد محمد علي لفاتورة INV-2025-00123', read: true, created_at: '2025-05-03T12:00:00Z' },
];

const UNREAD_COUNT = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            الإشعارات
            {UNREAD_COUNT > 0 && <Badge variant="destructive" className="text-xs">{UNREAD_COUNT} جديد</Badge>}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">جميع إشعارات النظام والتنبيهات</p>
        </div>
        <Button variant="outline" size="sm"><CheckCheck className="h-4 w-4" />تعليم الكل كمقروء</Button>
      </div>

      <div className="space-y-2">
        {MOCK_NOTIFICATIONS.map(notif => {
          const Icon = ICON_MAP[notif.type] ?? Bell;
          const iconColors: Record<string, string> = {
            appointment: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
            billing:     'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30',
            system:      'bg-violet-100 text-violet-600 dark:bg-violet-900/30',
            message:     'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
          };
          return (
            <div
              key={notif.id}
              className={cn(
                'flex items-start gap-4 rounded-xl border p-4 transition-colors cursor-pointer',
                notif.read
                  ? 'bg-card hover:bg-muted/30'
                  : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
              )}
            >
              <div className={cn('rounded-xl p-2.5 shrink-0', iconColors[notif.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-sm font-medium', !notif.read && 'text-primary')}>{notif.title}</p>
                  {!notif.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{notif.body}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {new Date(notif.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
