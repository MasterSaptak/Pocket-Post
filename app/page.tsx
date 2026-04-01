'use client';

import { useEffect, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/footer';
import {
  Shield, Package, CheckCircle, Truck, ArrowRight,
  Lock, Zap, DollarSign, Eye, Users, Clock,
  FileText, MapPin, UserCheck, ShieldCheck,
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

// ─── Steps Data ───────────────────────────────────────────────
const steps = [
  { id: 'requested', label: 'Request Posted', icon: Package, color: 'text-amber-500', bg: 'bg-amber-100' },
  { id: 'approved', label: 'Admin Approved', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 'assigned', label: 'Carrier Assigned', icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  { id: 'delivered', label: 'Delivered Securely', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100' },
];

const howItWorks = [
  {
    step: '01',
    title: 'Post a Request',
    description: 'Tell us what you need delivered, from where, and to where. Set your budget and deadline.',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
  },
  {
    step: '02',
    title: 'Get Matched',
    description: 'Our admin team reviews your request and connects you with a verified traveler heading your way.',
    icon: UserCheck,
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    step: '03',
    title: 'Delivered Securely',
    description: 'Your item is delivered through a trusted, admin-controlled process with full tracking at every stage.',
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
    <div className="relative overflow-hidden bg-slate-50">

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: HERO
          ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/BACKGROUND.png"
            alt=""
            fill
            className="object-cover opacity-70"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/40 to-slate-50/95" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Left: Copy & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex-1 text-center lg:text-left pt-12 lg:pt-0"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/80 text-blue-600 text-sm font-medium mb-6 border border-blue-100/80 backdrop-blur-sm">
              <Shield className="w-4 h-4" />
              Delivery Powered by Real People
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold font-heading tracking-tight text-slate-900 mb-6 leading-[1.1]">
              Send Items Through{' '}
              <br className="hidden lg:block" />
              <span className="text-gradient-signature">Trusted Travelers.</span>
            </h1>

            <p className="text-lg lg:text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Skip shipping delays and sky-high costs. PocketPost connects you with verified travelers
              already heading your way — faster, cheaper, and completely private.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button asChild size="lg" variant="signature" className="w-full sm:w-auto group">
                <Link href="/post">
                  Post a Delivery Request
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/feed">
                  Become a Carrier
                </Link>
              </Button>
            </div>

            {/* Micro trust line */}
            <div className="flex items-center justify-center lg:justify-start gap-6 mt-8 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Admin Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-500" />
                <span>Privacy Protected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Same-Day Possible</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Animated Delivery Flow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 w-full max-w-md relative"
          >
            <div className="glass-panel p-8 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/20" />
              <div className="relative z-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-6">Live Delivery Flow</p>
                <div className="flex flex-col gap-6">
                  {steps.map((step, index) => {
                    const isActive = index === currentStep;
                    const isPast = index < currentStep;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className="flex items-center gap-4 relative">
                        {index !== steps.length - 1 && (
                          <div className="absolute left-[1.125rem] top-10 bottom-[-1.5rem] w-0.5 bg-slate-100">
                            <motion.div
                              className="w-full bg-blue-500 origin-top"
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: isPast ? 1 : 0 }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        )}

                        <motion.div
                          className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors duration-500 ${
                            isActive || isPast ? step.bg : 'bg-slate-100'
                          }`}
                          animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                          transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
                        >
                          <Icon className={`w-5 h-5 ${isActive || isPast ? step.color : 'text-slate-400'}`} />
                        </motion.div>

                        <div className={`flex-1 transition-opacity duration-500 ${isActive || isPast ? 'opacity-100' : 'opacity-40'}`}>
                          <div className="glass-panel px-4 py-3 rounded-xl flex items-center justify-between">
                            <span className="font-medium text-slate-900">{step.label}</span>
                            {isActive && (
                              <motion.div
                                layoutId="active-badge"
                                className="w-2 h-2 rounded-full bg-blue-500"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                              />
                            )}
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

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-slate-300 flex justify-center pt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: WHAT IS POCKETPOST?
          ═══════════════════════════════════════════════════════ */}
      <section id="what-is" className="py-24 lg:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: Visual */}
            <AnimatedSection className="flex-1 relative">
              <div className="relative w-full max-w-lg mx-auto">
                <div className="absolute -inset-4 bg-gradient-to-br from-blue-100/60 to-emerald-100/60 rounded-3xl blur-2xl" />
                <div className="relative glass-panel rounded-3xl p-10 shadow-lg border border-white/30">
                  <Image
                    src="/LOGO.png"
                    alt="PocketPost Logo"
                    width={280}
                    height={280}
                    className="w-full max-w-[280px] mx-auto object-contain"
                  />
                </div>
              </div>
            </AnimatedSection>

            {/* Right: Copy */}
            <AnimatedSection className="flex-1" delay={0.2}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-4">
                <Package className="w-3.5 h-3.5" />
                About
              </div>
              <h2 className="text-3xl lg:text-5xl font-heading font-bold text-slate-900 mb-6 leading-tight">
                What is PocketPost?
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                PocketPost connects people who need to send items across borders with <strong className="text-slate-900">verified travelers already going that way</strong> — making delivery faster, cheaper, and more private than traditional shipping.
              </p>
              <p className="text-slate-500 leading-relaxed mb-8">
                Think of it as ride-sharing, but for packages. No warehouses, no sorting facilities, no weeks of waiting. Just real people carrying real items on real journeys — all verified and controlled by admin review.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <span>Peer-to-peer delivery</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span>Cross-border capable</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span>Admin-controlled</span>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: HOW IT WORKS
          ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-4">
              <Zap className="w-3.5 h-3.5" />
              Simple Process
            </div>
            <h2 className="text-3xl lg:text-5xl font-heading font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Three simple steps from posting your request to receiving your item securely.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {howItWorks.map((item, index) => (
              <AnimatedSection key={item.step} delay={index * 0.15}>
                <div className="relative group">
                  {/* Connecting line between steps (desktop) */}
                  {index < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] right-[-40%] h-0.5 bg-slate-200 z-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-transparent opacity-30" />
                    </div>
                  )}

                  <div className="relative z-10 bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-100 transition-all duration-300 group-hover:-translate-y-1">
                    {/* Step Number */}
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg`}>
                      <item.icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Step label */}
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">
                      Step {item.step}
                    </div>

                    <h3 className="text-xl font-heading font-bold text-slate-900 mb-3">
                      {item.title}
                    </h3>
                    <p className="text-slate-500 leading-relaxed">
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
      <section id="why" className="py-24 lg:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-4">
              <CheckCircle className="w-3.5 h-3.5" />
              Advantages
            </div>
            <h2 className="text-3xl lg:text-5xl font-heading font-bold text-slate-900 mb-4">
              Why PocketPost?
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Traditional shipping is slow, expensive, and impersonal. Here&apos;s why people choose us.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyPocketPost.map((item, index) => (
              <AnimatedSection key={item.title} delay={index * 0.1}>
                <div className={`relative rounded-2xl p-6 bg-gradient-to-br ${item.gradient} border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full`}>
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-5">
                    <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
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
      <section id="trust" className="py-24 lg:py-32 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-slate-900" />
        <div className="absolute inset-0 opacity-10">
          <Image src="/BACKGROUND.png" alt="" fill className="object-cover" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Security
            </div>
            <h2 className="text-3xl lg:text-5xl font-heading font-bold text-white mb-4">
              Built for Trust
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Every layer of PocketPost is designed with security and privacy at its core. No shortcuts.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {trustFeatures.map((feature, index) => (
              <AnimatedSection key={feature.label} delay={index * 0.1}>
                <div className="flex gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center shrink-0">
                    <feature.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-white mb-1">{feature.label}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Delivery tracking visual */}
          <AnimatedSection className="mt-16 max-w-2xl mx-auto" delay={0.3}>
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6 text-center">Real-Time Delivery Stages</p>
              <div className="flex items-center justify-between">
                {['Posted', 'Approved', 'Assigned', 'In Transit', 'Delivered'].map((stage, i) => (
                  <div key={stage} className="flex flex-col items-center gap-2 relative">
                    {i < 4 && (
                      <div className="hidden sm:block absolute top-3 left-[60%] w-[calc(100%+2rem)] h-0.5 bg-slate-700" />
                    )}
                    <div className={`w-6 h-6 rounded-full relative z-10 flex items-center justify-center ${
                      i <= 3 ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}>
                      {i <= 3 && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium text-center">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6: FINAL CTA
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-emerald-400/10 blur-[100px] rounded-full pointer-events-none" />

        <AnimatedSection className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-5xl font-heading font-bold text-slate-900 mb-6">
            Start Sending Smarter
          </h2>
          <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Join the future of cross-border delivery. No warehouses, no delays — just trusted travelers and verified routes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" variant="signature" className="w-full sm:w-auto group">
              <Link href="/post">
                Post a Delivery Request
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/feed">
                Become a Carrier
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
