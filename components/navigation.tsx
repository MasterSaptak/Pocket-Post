'use client';

import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Home, List, PlusCircle, User, Shield, LogIn, LayoutDashboard, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'motion/react';

export const Navigation = memo(function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Track scroll position to toggle navbar styles
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHomePage = pathname === '/';
  const showFrosted = scrolled || !isHomePage;

  const navItems = useMemo(() => {
    const items = [
      { name: 'Home', href: '/', icon: Home },
      { name: 'How it Works', href: '/#how-it-works', icon: List },
      { name: 'Feed', href: '/feed', icon: List },
    ];
    
    if (profile?.role === 'admin' || profile?.role === 'PRIME_ADMIN') {
      items.push({ name: 'Command', href: '/admin', icon: Shield });
    } else if (profile?.role === 'moderator') {
      items.push({ name: 'Dashboard', href: '/admin', icon: LayoutDashboard });
    }

    return items;
  }, [profile?.role]);

  const mobileNavItems = useMemo(() => {
    const items = [
      { name: 'Home', href: '/', icon: Home },
      { name: 'Feed', href: '/feed', icon: List },
      { name: 'Post', href: '/post', icon: PlusCircle },
      ...(user
        ? [{ name: 'Profile', href: '/profile', icon: User }]
        : [{ name: 'Sign In', href: '/auth/signin', icon: LogIn }]),
    ];

    if (profile?.role === 'admin' || profile?.role === 'PRIME_ADMIN') {
      items.push({ name: 'Admin', href: '/admin', icon: Shield });
    }

    return items;
  }, [user, profile?.role]);

  const handlePrefetch = useCallback((href: string) => {
    if (!href.startsWith('/#')) router.prefetch(href);
  }, [router]);

  if (pathname.startsWith('/auth/')) return null;

  return (
    <>
      {/* ✨ INNOVATIVE DESKTOP NAVIGATION (FLOATING PILL) */}
      <div className="hidden md:flex fixed top-0 inset-x-0 z-50 justify-center pointer-events-none p-6">
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className={cn(
            "pointer-events-auto flex items-center justify-between gap-6 px-4 py-2.5 rounded-full transition-all duration-500 will-change-transform",
            showFrosted 
              ? "bg-white/80 backdrop-blur-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.1)] border border-slate-200/50 scale-100" 
              : "bg-white/20 backdrop-blur-lg border border-white/20 shadow-sm scale-105"
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 px-2 group">
            <div className="relative flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all duration-300">
               <Sparkles className="w-4 h-4 text-blue-400 absolute -top-1 -right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
               <Image 
                 src="/LOGO.png" 
                 alt="PocketPost" 
                 width={32} 
                 height={32} 
                 className="w-8 h-8 object-contain drop-shadow-sm" 
                 priority 
               />
            </div>
            <span className={cn(
              "font-heading font-black tracking-tight text-lg transition-colors duration-300 hidden lg:block", 
               showFrosted ? "text-slate-900" : "text-slate-800"
            )}>
              PocketPost
            </span>
          </Link>

          {/* Nav Links with Magic Wand Hover */}
          <div 
            className="flex items-center space-x-1"
            onMouseLeave={() => setHoveredPath(null)}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('#')[0]) && item.href.split('#')[0] !== '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => {
                    handlePrefetch(item.href);
                    setHoveredPath(item.href);
                  }}
                  className={cn(
                    "relative px-4 py-2 text-sm font-bold transition-colors z-10 rounded-full",
                    isActive ? "text-blue-700" : showFrosted ? "text-slate-600 hover:text-slate-900" : "text-slate-700 hover:text-slate-900"
                  )}
                >
                  <span className="relative z-20 mix-blend-multiply flex items-center gap-2">
                    {item.name}
                  </span>
                  
                  {/* Hover Background */}
                  {hoveredPath === item.href && (
                    <motion.div
                      layoutId="nav-hover-pill"
                      className="absolute inset-0 bg-slate-100/80 backdrop-blur-md rounded-full -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  
                  {/* Active Indicator Line */}
                  {isActive && (
                    <motion.div
                       layoutId="nav-active-indicator"
                       className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-blue-600 rounded-full"
                       initial={false}
                       transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="w-px h-6 bg-slate-200/60 mx-1" />

          {/* Right Action Side */}
          <div className="flex items-center gap-3 pr-1">
            <Link 
              href="/post" 
              className="group relative px-5 py-2.5 bg-slate-900 text-white rounded-full overflow-hidden transition-all hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-slate-900/10 flex items-center gap-1"
            >
               <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
               <PlusCircle className="w-4 h-4 relative z-10" />
               <span className="relative z-10 font-bold text-sm tracking-wide flex items-center">
                 Post Task
               </span>
            </Link>

            {/* Profile Dropdown Trigger Equivalent */}
            {user ? (
              <Link href="/profile" className="ml-1 relative group cursor-pointer">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 group-hover:border-blue-500 shadow-sm transition-all" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-black shadow-sm group-hover:shadow-md transition-all">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                </motion.div>
              </Link>
            ) : (
              <Link href="/auth/signin" className="px-4 py-2 font-bold text-sm text-slate-700 hover:text-blue-600 transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </motion.nav>
      </div>

      {/* 📱 VERY CLEAN MOBILE TOP BRADING HEADER */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 transition-all duration-300 pointer-events-none">
        <div className={cn(
          "flex items-center justify-between px-5 h-16 pointer-events-auto transition-colors duration-300",
          showFrosted ? "bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm" : "bg-transparent"
        )}>
          <Link href="/" className="flex items-center gap-2.5">
             <Image 
                src="/LOGO.png" 
                alt="PocketPost" 
                width={28} 
                height={28} 
                className="w-7 h-7 object-contain drop-shadow-sm" 
                priority
             />
             <span className={cn(
               "font-heading font-black tracking-tight text-xl transition-colors",
               showFrosted ? "text-slate-900" : "text-slate-800"
             )}>
               PocketPost
             </span>
          </Link>

          {/* Post button on top right for mobile */}
          <Link 
            href="/post" 
            className={cn(
              "rounded-full p-2.5 transition-colors duration-300 shadow-sm border",
              showFrosted ? "bg-slate-900 text-white border-slate-900" : "bg-white/50 text-slate-800 border-slate-200/50 backdrop-blur-sm"
            )}
          >
            <PlusCircle className="w-5 h-5 flex-shrink-0" />
          </Link>
        </div>
      </div>

      {/* 📱 MODERN NATIVE-LIKE MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 pb-safe bg-white/90 backdrop-blur-2xl border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex justify-around items-center h-[68px] px-2 sm:px-6 relative max-w-md mx-auto">
            {mobileNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('#')[0]) && item.href.split('#')[0] !== '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onTouchStart={() => handlePrefetch(item.href)}
                  className="relative flex flex-col items-center justify-center w-full h-full space-y-[4px] group z-10"
                >
                  <div className={cn("relative p-1.5 rounded-2xl transition-all duration-300", isActive ? "text-blue-600 font-bold" : "text-slate-400 group-active:scale-95")}>
                     {isActive && (
                       <motion.div
                          layoutId="mobile-nav-blob"
                          className="absolute inset-0 bg-blue-100/50 rounded-2xl -z-10"
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                       />
                     )}
                     <Icon className={cn("w-6 h-6 flex-shrink-0 transition-colors duration-300", isActive ? "fill-blue-100/50 stroke-[2.2px]" : "stroke-[1.8px]")} />
                  </div>
                  <span className={cn(
                    "text-[10px] tracking-tight transition-all duration-300",
                    isActive ? "text-blue-700 font-black opacity-100" : "font-medium text-slate-500 opacity-80"
                  )}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
      </nav>
    </>
  );
});
