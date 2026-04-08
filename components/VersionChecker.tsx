'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// Version Checker — The Heartbeat of the Update System
// ═══════════════════════════════════════════════════════════════
//
// How it works:
//   1. On mount, fetch /version.json (never cached by SW)
//   2. Compare remote version against localStorage "app_version"
//   3. If mismatch → show update banner (or force reload if `forceUpdate`)
//   4. On SW update detected → also show banner
//   5. Every 5 minutes, re-check for new versions

const LOCAL_VERSION_KEY = 'pocketpost_app_version';
const LOCAL_BUILD_KEY = 'pocketpost_build_timestamp';
const CHECK_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes (aggressive for mobile)

interface VersionInfo {
  version: string;
  buildTimestamp: string;
  minVersion: string;
  forceUpdate: boolean;
  changelog: string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<VersionInfo | null>(null);
  const [swWaiting, setSwWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // ─── Fetch remote version and compare ───────────────────────
  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (!res.ok) return;

      const remote: VersionInfo = await res.json();
      const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);
      const localBuild = localStorage.getItem(LOCAL_BUILD_KEY);

      // First launch: store current version silently
      if (!localVersion) {
        localStorage.setItem(LOCAL_VERSION_KEY, remote.version);
        localStorage.setItem(LOCAL_BUILD_KEY, remote.buildTimestamp);
        return;
      }

      // Detect version OR build mismatch (build catches same-version redeploys)
      const versionMismatch = compareVersions(remote.version, localVersion) > 0;
      const buildMismatch = remote.buildTimestamp !== localBuild;

      if (versionMismatch || (buildMismatch && remote.forceUpdate)) {
        setRemoteVersion(remote);

        // Force update: skip UI, nuke everything, reload
        if (remote.forceUpdate || compareVersions(remote.minVersion, localVersion) > 0) {
          console.log(`[VersionChecker] FORCE UPDATE: ${localVersion} → ${remote.version}`);
          localStorage.setItem(LOCAL_VERSION_KEY, remote.version);
          localStorage.setItem(LOCAL_BUILD_KEY, remote.buildTimestamp);
          
          await nukeAndReload();
          return;
        }

        // Soft update: show banner
        if (versionMismatch) {
          setUpdateAvailable(true);
        }
      }
    } catch (err) {
      // Silently fail — don't block the app for a version check
      console.warn('[VersionChecker] Failed to fetch version:', err);
    }
  }, []);

  // ─── Nuclear cleanup: destroy all SWs and caches, then reload ─
  const nukeAndReload = async () => {
    try {
      // 1. Tell active SW to purge its caches
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'PURGE_CACHES' });
      }

      // 2. Unregister ALL service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // 3. Purge ALL client-side caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // 4. Clear ALL nuke flags so the bootstrap re-registers a fresh SW
      localStorage.removeItem('pocketpost_sw_nuked');
      localStorage.removeItem('pocketpost_sw_nuked_v2');
      localStorage.removeItem('pocketpost_sw_nuked_v3');
    } catch (err) {
      console.error('[VersionChecker] Cleanup error:', err);
    }

    // 5. Hard reload — navigate with cache-buster to bypass all caches
    //    Using URL manipulation instead of reload() for stronger cache bypass
    const url = new URL(window.location.href);
    url.searchParams.set('_cb', Date.now().toString());
    window.location.replace(url.toString());
  };

  // ─── Monitor SW lifecycle for waiting workers ───────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWUpdate = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setSwWaiting(registration.waiting);
        setUpdateAvailable(true);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW installed but waiting — user needs to reload
            setSwWaiting(newWorker);
            setUpdateAvailable(true);
          }
        });
      });
    };

    navigator.serviceWorker.ready.then(handleSWUpdate);

    // Listen for controller change (means new SW took over)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  // ─── Periodic version check + visibility-based check ────────
  useEffect(() => {
    // Check on mount
    checkVersion();

    // Check periodically
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);

    // CRITICAL for mobile: re-check when tab/app comes back to foreground
    // Mobile browsers suspend JS when backgrounded; this catches version
    // changes the moment the user returns to the app.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('[VersionChecker] App became visible — checking version');
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkVersion]);

  // ─── Handle update action ───────────────────────────────────
  const handleUpdate = async () => {
    // Store new version
    if (remoteVersion) {
      localStorage.setItem(LOCAL_VERSION_KEY, remoteVersion.version);
      localStorage.setItem(LOCAL_BUILD_KEY, remoteVersion.buildTimestamp);
    }

    // Tell waiting SW to activate, then nuke and reload
    if (swWaiting) {
      swWaiting.postMessage({ type: 'SKIP_WAITING' });
      // Give the SW a moment to activate before nuking
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    await nukeAndReload();
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-24 left-4 right-4 z-[100] md:left-auto md:right-8 md:bottom-8 md:max-w-sm"
      >
        <div className="bg-white/95 backdrop-blur-2xl border border-blue-200 p-5 rounded-3xl shadow-2xl shadow-blue-500/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-blue-300/50">
              <Zap className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 text-base leading-tight">New Version Available</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {remoteVersion
                  ? `v${remoteVersion.version} — ${remoteVersion.changelog}`
                  : 'A new version of PocketPost is ready. Refresh to update.'}
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleUpdate}
              className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-200/50 hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Now
            </Button>
            <Button
              variant="outline"
              onClick={() => setDismissed(true)}
              className="rounded-2xl h-11 px-4 text-sm font-semibold"
            >
              Later
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
