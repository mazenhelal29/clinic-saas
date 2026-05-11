import type { Metadata } from 'next';
import { Cairo, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { RTLProvider } from '@/components/providers/RTLProvider';
import { Toaster } from '@/components/ui/toaster';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ServiceWorkerRegistrar } from '@/components/providers/ServiceWorkerRegistrar';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'ClinicOS — نظام إدارة العيادات', template: '%s | ClinicOS' },
  description: 'نظام متكامل لإدارة العيادات الطبية - مواعيد، مرضى، فواتير',
  keywords: ['clinic management', 'إدارة عيادة', 'مواعيد طبية', 'SaaS'],
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} ${inter.variable} font-cairo antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <RTLProvider>
              {children}
              <Toaster />
              <OfflineBanner />
              <ServiceWorkerRegistrar />
            </RTLProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
