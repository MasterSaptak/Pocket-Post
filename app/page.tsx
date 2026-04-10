'use client';

import { useEffect, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/footer';
import {
  Shield, Package, CheckCircle, Truck, ArrowRight,
  Lock, Zap, DollarSign, Eye, Users, Clock,
  FileText, MapPin, UserCheck, ShieldCheck, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

// ─── Animated Section Wrapper ─────────────────────────────────
function AnimatedSection({ children, className = '', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Animated Counter for Social Proof ─────────────────────────
function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}+</span>;
}

// ─── Use Case Chips Data ─────────────────────────────────────────
const useCaseChips = [
  { emoji: '💊', label: 'Send Medicines' },
  { emoji: '📄', label: 'Send Documents' },
  { emoji: '📦', label: 'Send Parcel' },
  { emoji: '🎁', label: 'Send Gifts' },
  { emoji: '⚡', label: 'Urgent Tasks' },
];

// ─── Steps Data ───────────────────────────────────────────────
const steps = [
  { id: 'requested', label: 'Request Posted', timestamp: 'Posted 2 mins ago', icon: Package, color: 'text-amber-500', bg: 'bg-amber-100' },
  { id: 'approved', label: 'Admin Approved', timestamp: 'Approved in 45 sec', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 'assigned', label: 'Carrier Matched', timestamp: 'Matched in 30 sec', icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  { id: 'delivered', label: 'Delivered Securely', timestamp: 'Completed', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100' },
];

const howItWorks = [
  {
    step: '01',
    title: 'Post a Task',
    description: 'Describe what you need done — a delivery, pickup, or any task. Set your location and deadline.',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
  },
  {
    step: '02',
    title: 'Get Applications',
    description: 'Verified carriers browse your task in the feed and apply. Review applicants and choose the best fit.',
    icon: UserCheck,
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    step: '03',
    title: 'Task Completed',
    description: 'Your chosen carrier completes the task. Track progress from assigned to completed — simple and secure.',
    icon: ShieldCheck,
    color: 'from-emerald-500 to-emerald-600',
  },
];

const whyPocketPost = [
  {
    icon: Lock,
    title: 'Privacy First',
    description: 'Your identity stays hidden. No public exposure — only admin-approved matches.',
    gradient: 'from-blue-500/10 to-blue-600/5',
    iconColor: 'text-blue-500',
  },
  {
    icon: Zap,
    title: 'Faster Than Shipping',
    description: 'No warehouses, no sorting centers, no delays. Leverage real travelers on real routes.',
    gradient: 'from-amber-500/10 to-amber-600/5',
    iconColor: 'text-amber-500',
  },
  {
    icon: DollarSign,
    title: 'Cost Efficient',
    description: 'Travelers are already going there. Share the journey cost — save up to 70% vs traditional shipping.',
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    iconColor: 'text-emerald-500',
  },
  {
    icon: ShieldCheck,
    title: 'Admin Verified',
    description: 'Every carrier is vetted. Every match is reviewed. Every delivery stage is tracked and confirmed.',
    gradient: 'from-indigo-500/10 to-indigo-600/5',
    iconColor: 'text-indigo-500',
  },
];

const trustFeatures = [
  { icon: Shield, label: 'Admin Approval System', desc: 'Every request and carrier goes through admin review' },
  { icon: UserCheck, label: 'Verified Carriers Only', desc: 'Identity verification + rating system' },
  { icon: Eye, label: 'Full Delivery Tracking', desc: 'See every stage: Posted → Approved → Assigned → Delivered' },
  { icon: Lock, label: 'Private by Design', desc: 'Requester identity never exposed to public' },
];

// ─── Main Component ──────────────────────────────────────────
export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden bg-transparent">

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: HERO — Redesigned for Conversion
          ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100dvh] lg:min-h-[100vh] flex flex-col items-center justify-center pt-20 pb-6 lg:pt-20 lg:pb-8">

        {/* Large Decorative Watermark Logo (Desktop only) */}
        <div className="hidden lg:block absolute -right-20 top-20 opacity-[0.03] pointer-events-none">
          <Image src="/LOGO.png" alt="" width={600} height={600} priority />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 w-full flex flex-col lg:flex-row items-center gap-6 lg:gap-12">

          {/* ─── Left: Copy & CTA ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex-1 text-center lg:text-left w-full"
          >
            {/* Massive Brand Headline */}
            <div className="mb-3 md:mb-5">
              <h1 className="text-[3.5rem] leading-none sm:text-6xl lg:text-[5.5rem] font-black tracking-tighter text-slate-900 drop-shadow-sm">
                Pocket<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Post</span><span className="text-amber-500">.</span>
              </h1>
            </div>

            {/* HEADLINE: Functional line BIG */}
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-slate-800 mb-2 w-full">
              From Request to Delivery{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 animate-gradient-shift">
                — In Real Time.
              </span>
            </h2>

            {/* SUBTITLE: Emotional line smaller */}
            <p className="text-base sm:text-lg lg:text-xl font-heading font-bold text-slate-700/80 mb-2 tracking-tight">
              Your Task. Someone&apos;s Mission.
            </p>

            {/* Descriptive subtext */}
            <p className="text-xs sm:text-sm text-slate-500 mb-4 max-w-md sm:max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              Real people. Real deliveries. No delays. PocketPost connects you to verified carriers instantly.
            </p>

            {/* ─── Use Case Chips ─── */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 mb-5">
              {useCaseChips.map((chip) => (
                <Link
                  key={chip.label}
                  href="/post"
                  className="group flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200/80 text-slate-600 text-[11px] sm:text-xs font-semibold shadow-sm hover:shadow-md hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-600 transition-all duration-200 active:scale-95"
                >
                  <span className="text-sm">{chip.emoji}</span>
                  {chip.label}
                </Link>
              ))}
            </div>

            {/* ─── CTA Buttons ─── */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Button asChild size="lg" className="w-full sm:w-auto group h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl text-sm font-bold animate-glow-pulse px-6">
                <Link href="/post">
                  <Zap className="mr-1.5 w-4 h-4" />
                  Post a Task Now
                  <ArrowRight className="ml-1.5 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-12 rounded-2xl border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-sm font-bold shadow-sm transition-all duration-300 px-6">
                <Link href="/feed">
                  <Package className="mr-1.5 w-4 h-4" />
                  Get It Delivered
                </Link>
              </Button>
            </div>

            {/* ─── Hook + Social Proof (merged single row) ─── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1.5 mt-4 text-xs text-slate-500 font-semibold"
            >
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Matched in <strong className="text-slate-700">60s</strong></span>
              </div>
              <div className="w-0.5 h-3 bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-700 tabular-nums"><AnimatedCounter target={1200} /></span> tasks
              </div>
              <div className="w-0.5 h-3 bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-slate-700 tabular-nums"><AnimatedCounter target={300} duration={1500} /></span> carriers
              </div>
            </motion.div>

            {/* ─── Trust Badges ─── */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-2 mt-3 text-[10px] sm:text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              <div className="group flex items-center gap-1 bg-white/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all duration-300 cursor-default">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="group-hover:text-emerald-700 transition-colors">Verified</span>
              </div>
              <div className="group flex items-center gap-1 bg-white/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-300 cursor-default">
                <Lock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="group-hover:text-blue-700 transition-colors">Private</span>
              </div>
              <div className="group flex items-center gap-1 bg-white/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all duration-300 cursor-default">
                <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="group-hover:text-amber-700 transition-colors">Instant</span>
              </div>
            </div>
          </motion.div>

          {/* ─── Right: Live Delivery Flow Card ─── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 w-full max-w-sm sm:max-w-md relative lg:mt-0"
          >
            <div className="bg-white/70 backdrop-blur-2xl p-5 sm:p-6 rounded-[28px] shadow-2xl shadow-blue-900/10 border border-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-slate-50/20 pointer-events-none" />
              <div className="relative z-10 w-full">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400">Live Right Now</p>
                </div>
                <div className="flex flex-col gap-3.5 sm:gap-4">
                  {steps.map((step, index) => {
                    const isActive = index === currentStep;
                    const isPast = index < currentStep;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className="flex items-center gap-3 sm:gap-4 relative">
                        {index !== steps.length - 1 && (
                          <div className="absolute left-[1.125rem] sm:left-5 top-10 bottom-[-0.875rem] w-0.5 bg-slate-100 rounded-full">
                            <motion.div
                              className="w-full bg-blue-500 origin-top rounded-full"
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: isPast ? 1 : 0 }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        )}

                        <motion.div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center z-10 transition-colors duration-500 flex-shrink-0 shadow-sm ${
                            isActive || isPast ? step.bg : 'bg-slate-100 border border-slate-200'
                          }`}
                          animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                          transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
                        >
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive || isPast ? step.color : 'text-slate-400'}`} />
                        </motion.div>

                        <div className={`flex-1 transition-all duration-500 w-full ${isActive || isPast ? 'opacity-100 translate-x-0' : 'opacity-40 -translate-x-2'}`}>
                          <div className={`relative py-3 sm:py-4 px-4 sm:px-5 rounded-2xl flex flex-col border transition-all duration-500 ${
                            isActive 
                              ? 'bg-white shadow-lg shadow-blue-500/10 border-blue-100 scale-[1.02]' 
                              : isPast 
                                ? 'bg-white shadow-sm border-slate-100' 
                                : 'bg-transparent border-transparent'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-bold text-sm sm:text-base transition-colors duration-500 ${isActive ? 'text-blue-600' : 'text-slate-700'}`}>{step.label}</span>
                              
                              <AnimatePresence>
                                {isActive && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    className="flex items-center gap-2"
                                  >
                                    <motion.div
                                      className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                                      animate={{ 
                                        opacity: [1, 0.4, 1],
                                        scale: [1, 1.3, 1]
                                      }}
                                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {isPast && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                >
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                </motion.div>
                              )}
                            </div>
                            {/* Timestamp */}
                            <AnimatePresence>
                              {(isActive || isPast) && (
                                <motion.span
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className={`text-[10px] sm:text-[11px] mt-0.5 font-medium ${isActive ? 'text-blue-400' : 'text-slate-400'}`}
                                >
                                  {step.timestamp}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── Motto + Scroll Indicator ─── */}
        <div className="absolute bottom-8 left-0 right-0 z-10 flex flex-col items-center gap-4">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="text-xs sm:text-sm font-heading font-semibold text-slate-400 tracking-wider italic"
          >
            &ldquo;Logistics, Powered by People.&rdquo;
          </motion.p>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <div className="w-6 h-10 rounded-full border-2 border-slate-300 flex justify-center pt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: WHAT IS POCKETPOST?
          ═══════════════════════════════════════════════════════ */}
      <section id="what-is" className="py-20 lg:py-24 bg-transparent relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: Visual */}
            <AnimatedSection className="flex-1 relative">
              <div className="relative w-full max-w-sm mx-auto">
                <div className="absolute -inset-4 bg-gradient-to-br from-blue-100/60 to-emerald-100/60 rounded-3xl blur-2xl" />
                <div className="relative glass-panel rounded-3xl p-8 shadow-lg border border-white/30">
                  <Image
                    src="/LOGO.png"
                    alt="PocketPost Logo"
                    width={220}
                    height={220}
                    className="w-full max-w-[220px] mx-auto object-contain"
                  />
                </div>
              </div>
            </AnimatedSection>

            {/* Right: Copy */}
            <AnimatedSection className="flex-1" delay={0.2}>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-4">
                <Package className="w-3 h-3" />
                Intelligence
              </div>
              <h2 className="text-3xl lg:text-4xl font-heading font-black text-slate-900 mb-5 leading-tight tracking-tight">
                What is PocketPost?
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-6 font-medium">
                PocketPost connects people who need to send items across borders with <strong className="text-slate-900">verified travelers already going that way</strong> — making delivery faster, cheaper, and more private.
              </p>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                Think of it as logistics, but for people. No warehouses, no sorting facilities, no weeks of waiting. Just real people carrying real items on real journeys — all verified by admin review.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <span>Peer-to-Peer</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span>Cross-Border</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span>Verified</span>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: HOW IT WORKS
          ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 lg:py-24 bg-transparent relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
              <Zap className="w-3 h-3" />
              Operations
            </div>
            <h2 className="text-3xl lg:text-4xl font-heading font-black text-slate-900 mb-3 tracking-tight">
              How It Works
            </h2>
            <p className="text-base text-slate-500 max-w-xl mx-auto font-medium">
              Three simple steps from posting your task to getting it delivered.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {howItWorks.map((item, index) => (
              <AnimatedSection key={item.step} delay={index * 0.15}>
                <div className="relative group h-full">
                  <div className="relative z-10 bg-white rounded-2xl p-7 h-full shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-100 transition-all duration-300">
                    {/* Step Number */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-md`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>

                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">
                      Step {item.step}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      {item.description}
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4: WHY POCKETPOST?
          ═══════════════════════════════════════════════════════ */}
      <section id="why" className="py-20 lg:py-24 bg-transparent relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-4">
              <CheckCircle className="w-3 h-3" />
              Advantages
            </div>
            <h2 className="text-3xl lg:text-4xl font-heading font-black text-slate-900 mb-3 tracking-tight">
              Why PocketPost?
            </h2>
            <p className="text-base text-slate-500 max-w-xl mx-auto font-medium">
              Traditional shipping is slow and expensive. We built a better way.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {whyPocketPost.map((item, index) => (
              <AnimatedSection key={item.title} delay={index * 0.1}>
                <div className={`relative rounded-2xl p-6 bg-gradient-to-br ${item.gradient} border border-slate-100 hover:shadow-md transition-all duration-300 h-full`}>
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-5">
                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5: TRUST & SAFETY
          ═══════════════════════════════════════════════════════ */}
      <section id="trust" className="py-20 lg:py-24 bg-transparent relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-slate-900" />
        <div className="absolute inset-0 opacity-5">
          <Image src="/BACKGROUND.png" alt="" fill className="object-cover" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection className="mb-12">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              Protocol
            </div>
            <h2 className="text-3xl lg:text-4xl font-heading font-black text-white mb-3 tracking-tight">
              Built for Trust
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">
              Every layer of the platform is designed with security at its core.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {trustFeatures.map((feature, index) => (
              <AnimatedSection key={feature.label} delay={index * 0.1}>
                <div className="flex gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white mb-1 uppercase tracking-wide">{feature.label}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{feature.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6: FINAL CTA
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-transparent relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none" />
        
        <AnimatedSection className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-heading font-black text-slate-900 mb-4 tracking-tight">
            Start Your Mission.
          </h2>
          <p className="text-base text-slate-500 mb-8 font-medium">
            Join the platform where tasks get done. Post, discover, apply — powered by a trusted community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" variant="signature" className="w-full sm:w-auto h-12 rounded-xl text-xs font-black uppercase tracking-[0.15em] px-8">
              <Link href="/post">
                Post a Task
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-12 rounded-xl text-xs font-black uppercase tracking-[0.15em] px-8">
              <Link href="/feed">
                Browse Feed
              </Link>
            </Button>
          </div>
        </AnimatedSection>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <Footer />
    </div>
  );
}
