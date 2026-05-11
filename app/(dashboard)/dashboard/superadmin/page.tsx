'use client';

import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  ShieldCheck, 
  Search, 
  MoreVertical,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

const MOCK_CLINICS = [
  { id: '1', name: 'عيادة النور', owner: 'د. محمد أحمد', plan: 'pro', status: 'active', revenue: '12,500 ر.س', created_at: '2024-01-15' },
  { id: '2', name: 'مجمع الشفاء الطبي', owner: 'د. سارة خالد', plan: 'enterprise', status: 'active', revenue: '45,200 ر.س', created_at: '2024-02-10' },
  { id: '3', name: 'مركز مكة للأسنان', owner: 'د. فهد سليمان', plan: 'basic', status: 'past_due', revenue: '3,800 ر.س', created_at: '2024-03-05' },
  { id: '4', name: 'عيادة التخصصي', owner: 'د. ليلى حسن', plan: 'pro', status: 'active', revenue: '8,900 ر.س', created_at: '2024-03-20' },
];

const PLAN_BADGES: Record<string, any> = {
  basic: { label: 'أساسية', variant: 'outline' },
  pro: { label: 'احترافية', variant: 'info' },
  enterprise: { label: 'مؤسسات', variant: 'success' },
};

const STATUS_BADGES: Record<string, any> = {
  active: { label: 'نشط', variant: 'success' },
  past_due: { label: 'متأخر', variant: 'warning' },
  cancelled: { label: 'ملغي', variant: 'destructive' },
};

export default function SuperAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            لوحة تحكم النظام (SuperAdmin)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة العيادات، الاشتراكات، ومراقبة أداء المنصة</p>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي العيادات', value: '142', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'إجمالي المستخدمين', value: '1,840', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'الإيرادات الشهرية (MRR)', value: '128,400 ر.س', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'معدل النمو', value: '+14%', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clinics Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>العيادات المشتركة</CardTitle>
                <CardDescription>إدارة العيادات وتفاصيل اشتراكاتهم</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="بحث عن عيادة..." className="ps-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium">العيادة</th>
                    <th className="px-4 py-3 text-start font-medium">الخطة</th>
                    <th className="px-4 py-3 text-start font-medium">الحالة</th>
                    <th className="px-4 py-3 text-start font-medium">الإيرادات</th>
                    <th className="px-4 py-3 text-end font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {MOCK_CLINICS.map((clinic) => (
                    <tr key={clinic.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{clinic.name}</p>
                        <p className="text-xs text-muted-foreground">{clinic.owner}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={PLAN_BADGES[clinic.plan].variant}>
                          {PLAN_BADGES[clinic.plan].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGES[clinic.status].variant}>
                          {STATUS_BADGES[clinic.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{clinic.revenue}</td>
                      <td className="px-4 py-3 text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>عرض التفاصيل</DropdownMenuItem>
                            <DropdownMenuItem>تعديل الاشتراك</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">إيقاف الحساب</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* System Health & Logs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>حالة النظام</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'الخادم (Server)', status: 'online', up: '99.9%' },
                { label: 'قاعدة البيانات (Database)', status: 'online', up: '100%' },
                { label: 'التخزين (Storage)', status: 'online', up: '99.8%' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.up}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>آخر النشاطات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { msg: 'تسجيل عيادة جديدة: مجمع التحلية', time: 'منذ 5 دقائق' },
                { msg: 'ترقية خطة: عيادة النور (إلى Pro)', time: 'منذ ساعتين' },
                { msg: 'تنبيه: فشل دفع اشتراك مركز مكة', time: 'منذ 4 ساعات' },
              ].map((log, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium leading-tight">{log.msg}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{log.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
