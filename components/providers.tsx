'use client';

import { AuthProvider } from '@/lib/auth-context';
import { DataCacheProvider } from '@/lib/data-cache';
import { Toaster } from 'sonner';
import { Navigation } from '@/components/navigation';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataCacheProvider>
        <Navigation />
        {children}
        <Toaster position="top-center" richColors />
      </DataCacheProvider>
    </AuthProvider>
  );
}
