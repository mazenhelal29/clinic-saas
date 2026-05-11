'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, FileText,
  Receipt, Settings, Stethoscope, Activity, X, CreditCard, ShieldAlert, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { label: 'لوحة التحكم',   href: '/dashboard',         icon: LayoutDashboard },
  { label: 'المرضى',        href: '/dashboard/patients',       icon: Users },
  { label: 'الأطباء',       href: '/dashboard/doctors',        icon: Stethoscope },
  { label: 'المواعيد',      href: '/dashboard/appointments',   icon: Calendar },
  { label: 'السجلات الطبية', href: '/dashboard/medical-records', icon: FileText },
  { label: 'الفواتير',      href: '/dashboard/billing',        icon: Receipt },
  { label: 'التقارير',      href: '/dashboard/reports',        icon: BarChart3 },
  { label: 'الاشتراك',      href: '/dashboard/subscription',   icon: CreditCard },
  { label: 'سجل النشاطات',  href: '/dashboard/audit',          icon: ShieldAlert },
  { label: 'الإعدادات',     href: '/dashboard/settings',       icon: Settings },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <>
      {/* Professional Backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45] lg:hidden animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 w-72 bg-slate-900 text-white flex flex-col border-e border-white/5 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Professional Header */}
        <div className="h-24 flex items-center px-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none uppercase">Clinic<span className="text-primary">OS</span></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Enterprise Edition</span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden ms-auto p-2 text-slate-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation - High Clarity */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                className={cn(
                  "group flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-primary text-white shadow-md" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                <span className="font-bold text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Professional Footer Actions */}
        <div className="p-4 space-y-4">
          <Link href="/dashboard/subscription" className="block p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
             <div className="flex items-center gap-3 mb-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">نظام الاشتراك</span>
             </div>
             <p className="text-xs font-bold text-slate-200">باقة العيادة الذكية نشطة</p>
          </Link>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-6 py-4 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-bold text-sm"
          >
            <LogOut className="h-5 w-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
