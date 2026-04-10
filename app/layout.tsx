import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers';
import Script from 'next/script';
import Image from 'next/image';
import { InstallPWA } from '@/components/InstallPWA';
import { VersionChecker } from '@/components/VersionChecker';

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
          <main className="min-h-[100dvh]">
            {children}
          </main>
          <InstallPWA />
          <VersionChecker />
        </AppProviders>
        
        <Script id="sw-bootstrap" strategy="afterInteractive">
          {`
            (function() {
              if (!('serviceWorker' in navigator)) return;

              var APP_VERSION = '1.1.0';
              var NUKE_KEY = 'pocketpost_sw_nuked_v3';

              // ═══ PHASE 0: Force-check ALL existing registrations on every load ═══
              // This ensures the browser always checks for updated SW files,
              // even if the user has been idle or on mobile background.
              navigator.serviceWorker.getRegistrations().then(function(regs) {
                regs.forEach(function(reg) {
                  reg.update().catch(function() {});
                });
              });

              // ═══ PHASE 1: One-time nuke of ALL old service workers ═══
              // This frees users stuck on the old cache-first SW.
              // Bumping the NUKE_KEY (v2 → v3) forces a re-nuke for ALL users.
              if (!localStorage.getItem(NUKE_KEY)) {
                console.log('[SW-Bootstrap] Nuking all old service workers (v3)...');
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  var promises = regs.map(function(reg) {
                    console.log('[SW-Bootstrap] Unregistering:', reg.scope);
                    return reg.unregister();
                  });
                  return Promise.all(promises);
                }).then(function() {
                  // Purge ALL caches
                  if ('caches' in window) {
                    return caches.keys().then(function(keys) {
                      return Promise.all(keys.map(function(k) {
                        console.log('[SW-Bootstrap] Purging cache:', k);
                        return caches.delete(k);
                      }));
                    });
                  }
                }).then(function() {
                  localStorage.setItem(NUKE_KEY, Date.now().toString());
                  // Also clear old nuke keys to avoid localStorage bloat
                  localStorage.removeItem('pocketpost_sw_nuked');
                  localStorage.removeItem('pocketpost_sw_nuked_v2');
                  console.log('[SW-Bootstrap] Nuke complete. Registering fresh SW...');
                  registerSW();
                }).catch(function(err) {
                  console.warn('[SW-Bootstrap] Nuke failed:', err);
                  localStorage.setItem(NUKE_KEY, 'failed');
                  registerSW();
                });
              } else {
                registerSW();
              }

              // ═══ PHASE 2: Register SW with version-based cache-busting ═══
              function registerSW() {
                var swUrl = '/sw.js';
                navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' })
                  .then(function(registration) {
                    console.log('[SW] Registered:', registration.scope);

                    // Force update check immediately
                    registration.update();

                    // Re-check every 5 minutes
                    setInterval(function() {
                      registration.update();
                    }, 5 * 60 * 1000);

                    // If a new SW is already waiting, tell it to activate NOW
                    if (registration.waiting) {
                      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }

                    // Watch for future updates — auto-activate, never leave in waiting state
                    registration.addEventListener('updatefound', function() {
                      var newWorker = registration.installing;
                      if (!newWorker) return;
                      newWorker.addEventListener('statechange', function() {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          console.log('[SW] New worker installed — activating immediately');
                          newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                      });
                    });
                  })
                  .catch(function(err) {
                    console.error('[SW] Registration failed:', err);
                  });
              }

              // ═══ PHASE 3: Auto-reload when new SW takes control ═══
              var refreshing = false;
              navigator.serviceWorker.addEventListener('controllerchange', function() {
                if (refreshing) return;
                refreshing = true;
                console.log('[SW] New controller active — hard reloading page');
                window.location.reload();
              });
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
