'use client';

import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Home, List, PlusCircle, User, Shield, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'motion/react';

export const Navigation = memo(function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  // Track scroll position to toggle navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide navigation on auth pages
  if (pathname.startsWith('/auth/')) return null;

  // Determine if we're on the home page (transparent nav at top)
  const isHomePage = pathname === '/';

  // Memoize nav items to prevent array recreation
  const navItems = useMemo(() => {
    const items = [
      { name: 'Home', href: '/', icon: Home },
      { name: 'How it Works', href: '/#how-it-works', icon: List },
      { name: 'Feed', href: '/feed', icon: List },
      { name: 'Post', href: '/post', icon: PlusCircle },
      ...(user
        ? [{ name: 'Profile', href: '/profile', icon: User }]
        : [{ name: 'Sign In', href: '/auth/signin', icon: LogIn }]),
    ];

    if (profile?.role === 'admin') {
      items.push({ name: 'Admin', href: '/admin', icon: Shield });
    }

    return items;
  }, [user, profile?.role]);

  // Mobile nav items (shorter set for bottom bar)
  const mobileNavItems = useMemo(() => {
    const items = [
      { name: 'Home', href: '/', icon: Home },
      { name: 'Feed', href: '/feed', icon: List },
      { name: 'Post', href: '/post', icon: PlusCircle },
      ...(user
        ? [{ name: 'Profile', href: '/profile', icon: User }]
        : [{ name: 'Sign In', href: '/auth/signin', icon: LogIn }]),
    ];

    if (profile?.role === 'admin') {
      items.push({ name: 'Admin', href: '/admin', icon: Shield });
    }

    return items;
  }, [user, profile?.role]);

  // Prefetch adjacent routes on hover for instant navigation
  const handlePrefetch = useCallback((href: string) => {
    if (!href.startsWith('/#')) {
      router.prefetch(href);
    }
  }, [router]);

  // Navbar style: transparent on home page top, frosted glass when scrolled or on other pages
  const showFrosted = scrolled || !isHomePage;

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className={cn(
          'hidden md:flex fixed top-0 w-full z-50 transition-all duration-300',
          showFrosted
            ? 'glass-panel border-b border-slate-200/50 shadow-sm'
            : 'bg-transparent border-b border-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center gap-2.5">
                <Image
                  src="/LOGO.png"
                  alt="PocketPost"
                  width={36}
                  height={36}
                  className="w-9 h-9 object-contain"
                  priority
                />
                <span className={cn(
                  "font-heading font-bold text-xl tracking-tight transition-colors duration-300",
                  showFrosted ? "text-slate-900" : "text-slate-800"
                )}>
                  PocketPost
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('#')[0]) && item.href.split('#')[0] !== '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onMouseEnter={() => handlePrefetch(item.href)}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors relative',
                      isActive
                        ? 'text-blue-600'
                        : showFrosted
                          ? 'text-slate-500 hover:text-slate-900'
                          : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="desktop-nav-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}

              {/* Primary CTA */}
              <Link
                href="/post"
                className="ml-2 inline-flex items-center px-5 py-2 rounded-xl bg-gradient-signature text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Post Request
              </Link>

              {/* Desktop avatar when logged in */}
              {user && (
                <Link href="/profile" className="ml-1">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border-2 border-slate-200 hover:border-blue-400 transition-colors"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-signature flex items-center justify-center text-white text-xs font-bold">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full glass-panel z-50 border-t border-slate-200/50 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onTouchStart={() => handlePrefetch(item.href)}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full space-y-1 relative',
                  isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute top-0 w-12 h-1 bg-blue-600 rounded-b-full"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className={cn("w-6 h-6", isActive && "fill-blue-100/50")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
});
