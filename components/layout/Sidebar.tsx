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
    <aside className="w-72 h-screen bg-[#0f172a] text-white flex flex-col border-e border-white/10 shrink-0 relative z-50">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/5">
        <div className="bg-blue-600 p-2 rounded-xl me-3">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold">ClinicOS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        <button
          onClick={() => {
            console.log('Sidebar logout clicked');
            signOut();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-400 hover:bg-red-400/10 hover:text-red-300 mt-4 relative z-[100] cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">تسجيل الخروج</span>
        </button>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <Link href="/dashboard/subscription" className="block bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl border border-white/5">
           <Badge className="bg-blue-600/20 text-blue-400 border-none mb-2 hover:bg-blue-600/30">إدارة الاشتراك</Badge>
           <p className="text-sm font-bold">تجديد أو ترقية الباقة</p>
        </Link>
      </div>
    </aside>
  );
}
