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
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 backdrop-blur px-4 gap-3">
      {/* Mobile menu */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Language toggle */}
        <Button variant="ghost" size="icon" onClick={toggleLang} title="تغيير اللغة">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{lang === 'ar' ? 'English' : 'عربي'}</span>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="تغيير المظهر"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-background" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {getInitials(profile?.full_name ?? 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-start">
                <p className="text-sm font-medium leading-none">{profile?.full_name ?? 'مستخدم'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground font-normal">{profile?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="h-4 w-4" />
              الملف الشخصي
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onSelect={() => signOut()}>
              <LogOut className="me-2 h-4 w-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
