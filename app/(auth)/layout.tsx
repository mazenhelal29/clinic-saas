'use client';

import { Stethoscope } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-cairo">
      {/* Optional: Simple Top Navigation */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Stethoscope className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">ClinicOS</span>
        </div>
      </div>

      <main className="flex min-h-screen items-center justify-center">
        {children}
      </main>
    </div>
  );
}
