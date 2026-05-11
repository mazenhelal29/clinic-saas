'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TrialBanner } from '@/components/layout/TrialBanner';
import { Topbar } from '@/components/layout/Topbar';
import { ExpiredBlocker } from '@/components/layout/ExpiredBlocker';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - Always force it to show on desktop */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <ExpiredBlocker />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <TrialBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
