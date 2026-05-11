'use client';

import { Menu, Bell, Sun, Moon, Globe, LogOut, User, ChevronDown } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useRTL } from '@/components/providers/RTLProvider';
import { getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TopbarProps {
  onMenuClick: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin:  'سوبر أدمن',
  clinic_admin: 'مدير العيادة',
  doctor:       'طبيب',
  staff:        'موظف',
  patient:      'مريض',
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const { lang, toggleLang } = useRTL();

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-8 gap-4">
      {/* Mobile menu toggle */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="lg:hidden h-11 w-11 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" 
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6 text-slate-600" />
      </Button>

      <div className="flex-1" />

      {/* Action Icons Group */}
      <div className="flex items-center gap-3">
        {/* Language */}
        <Button variant="ghost" size="icon" onClick={toggleLang} className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-500">
          <Globe className="h-5 w-5" />
        </Button>

        {/* Theme */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-500"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-500">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white dark:ring-slate-900" />
        </Button>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-3 h-12 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
              <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-800 shadow-sm">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-white font-black text-xs">
                  {getInitials(profile?.full_name ?? 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-start">
                <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{profile?.full_name ?? 'مستخدم'}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-slate-100 shadow-2xl">
            <DropdownMenuLabel className="p-4">
              <p className="font-black text-slate-900 dark:text-white leading-none">{profile?.full_name}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">{profile?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-xl h-11 font-bold gap-3 focus:bg-slate-50">
              <User className="h-4 w-4 text-slate-500" />
              إعدادات الحساب
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-xl h-11 font-black gap-3 text-red-500 focus:text-red-500 focus:bg-red-50 cursor-pointer" onSelect={() => signOut()}>
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
