import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers';
import Script from 'next/script';
import Image from 'next/image';
import { InstallPWA } from '@/components/InstallPWA';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pocketpost.saptech.online'),
  title: {
    default: 'PocketPost | Trusted Task Marketplace & Global Delivery',
    template: '%s | PocketPost'
  },
  description: 'PocketPost connects you with verified carriers for rapid task completion and global peer-to-peer delivery. Save up to 70% on cross-border shipping while maintaining total privacy.',
  keywords: ['task marketplace', 'peer to peer delivery', 'courier service', 'verified carriers', 'safe delivery', 'global shipping', 'PocketPost'],
  manifest: '/manifest.json',
  authors: [{ name: 'PocketPost Team' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'PocketPost | Trusted Task Marketplace & Global Delivery',
    description: 'Post tasks, discover opportunities, and connect with verified carriers rapidly. Join the first peer-to-peer delivery network.',
    url: 'https://pocketpost.saptech.online',
    siteName: 'PocketPost',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'PocketPost - Trusted Task Marketplace',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PocketPost | Trusted Task Marketplace & Global Delivery',
    description: 'The fastest, most secure way to get things delivered globally through a trusted network of carriers.',
    images: ['/twitter-image.png'],
    creator: '@pocketpost',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-transparent text-slate-900 font-sans antialiased selection:bg-blue-500/30 pb-20 md:pb-0 md:pt-16 min-h-[100dvh]">
        
        {/* 🌐 GLOBAL PERSISTENT BACKGROUND (Web & Mobile) */}
        <div className="fixed inset-0 z-[-1] pointer-events-none bg-slate-50">
          <Image
            src="/BACKGROUND.png"
            alt="Global Background"
            fill
            className="object-cover opacity-100 object-top lg:object-center"
            priority
            unoptimized
          />
        </div>

        <AppProviders>
          <main className="relative z-0 min-h-[100dvh]">
            {children}
          </main>
          <InstallPWA />
        </AppProviders>
        
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
