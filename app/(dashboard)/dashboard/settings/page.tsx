'use client';

import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">الإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة إعدادات العيادة والنظام</p>
      </div>

      <Tabs defaultValue="clinic">
        <TabsList className="mb-4">
          <TabsTrigger value="clinic">بيانات العيادة</TabsTrigger>
          <TabsTrigger value="hours">ساعات العمل</TabsTrigger>
          <TabsTrigger value="security">الأمان</TabsTrigger>
        </TabsList>

        <TabsContent value="clinic">
          <Card>
            <CardHeader>
              <CardTitle>بيانات العيادة</CardTitle>
              <CardDescription>تحديث المعلومات الأساسية للعيادة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>اسم العيادة (عربي)</Label>
                  <Input defaultValue="عيادة النور الطبية" />
                </div>
                <div className="space-y-1.5">
                  <Label>اسم العيادة (إنجليزي)</Label>
                  <Input defaultValue="Al-Noor Medical Clinic" />
                </div>
                <div className="space-y-1.5">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" defaultValue="info@clinic.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>رقم الهاتف</Label>
                  <Input defaultValue="+966 50 123 4567" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button><Save className="h-4 w-4" />حفظ</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>ساعات العمل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map((day, i) => (
                <div key={day} className="flex items-center gap-4 p-3 rounded-lg border">
                  <input type="checkbox" defaultChecked={i < 5} className="h-4 w-4 rounded" />
                  <span className="w-24 text-sm font-medium">{day}</span>
                  <Input type="time" defaultValue="08:00" className="w-28" />
                  <span className="text-muted-foreground text-sm">إلى</span>
                  <Input type="time" defaultValue="17:00" className="w-28" />
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button><Save className="h-4 w-4" />حفظ</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>الأمان وكلمة المرور</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>كلمة المرور الحالية</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label>كلمة المرور الجديدة</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button><Save className="h-4 w-4" />تغيير كلمة المرور</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
