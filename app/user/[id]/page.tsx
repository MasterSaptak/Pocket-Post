'use client';

import { useState, useEffect, use } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTrustScoreConfig } from '@/lib/gamification';
import { motion } from 'motion/react';
import { Loader2, Shield, Mail, BadgeCheck, Zap, Package, Clock, CheckCircle, ArrowLeft, Lock } from 'lucide-react';
import type { UserProfile } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUser() {
      try {
        const snap = await getDoc(doc(db, 'users', resolvedParams.id));
        if (snap.exists()) {
          setProfile({ id: snap.id, ...snap.data() } as unknown as UserProfile);
        } else {
          setError('User not found.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen pt-32 px-4 text-center">
        <h1 className="text-2xl font-bold text-slate-800">{error}</h1>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/feed">Return to Tasks</Link>
        </Button>
      </div>
    );
  }

  const isVerified = profile.isVerifiedCarrier === true;
  const trustConfig = getTrustScoreConfig(profile);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-24 lg:pt-32 lg:pb-12">
      <Link href="/feed" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>
        
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2.5rem] mb-6 shadow-xl ${
          profile.role === 'PRIME_ADMIN'
            ? 'border-[3px] border-amber-400 shadow-[0_0_40px_-5px_rgba(251,191,36,0.6),inset_0_0_20px_rgba(251,191,36,0.2)]'
            : profile.role === 'admin' 
              ? 'border-[3px] border-amber-400 shadow-[0_0_40px_-5px_rgba(251,191,36,0.6),inset_0_0_20px_rgba(251,191,36,0.2)]' 
              : 'border border-slate-100'
        }`}>
        
        {/* Banner */}
        <div 
          className="h-36 sm:h-48 relative overflow-hidden bg-slate-900"
          style={{
            backgroundImage: `url('${encodeURI(trustConfig.bgImage || '')}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Subtle top edge vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />
          
          {isVerified && (
            <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] animate-[shimmer_4s_ease-in-out_infinite] pointer-events-none" />
          )}

          {/* Special Admin Ribbon */}
          {profile.role === 'PRIME_ADMIN' ? (
             <div className="absolute top-4 right-4 bg-amber-500/90 backdrop-blur-md border border-amber-300 px-3 py-1.5 rounded-full flex items-center text-xs font-black text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] z-10">
               👑 PRIME ADMIN
             </div>
          ) : profile.role === 'admin' ? (
             <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full flex items-center text-xs font-bold text-white shadow-sm z-10">
               <Shield className="w-3.5 h-3.5 mr-1" /> Core Staff
             </div>
          ) : null}
        </div>

        <div className="px-6 pb-6 sm:px-10 sm:pb-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20 mb-8">
            {/* Avatar */}
            <div className="relative z-10 group">
              {profile.displayName || profile.email ? (
                <div className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900 border-4 shadow-2xl flex items-center justify-center text-white text-5xl font-black z-10 ${profile.role === 'admin' || profile.role === 'PRIME_ADMIN' ? 'border-amber-400' : 'border-white'}`}>
                   {/* In a real app, map photoURL if it exists. Reverting to initial fallback logic. */}
                  {(profile.displayName || profile.email || 'U')[0].toUpperCase()}
                </div>
              ) : null}
              {isVerified && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.6)] z-20 tooltip" title="Verified Carrier">
                  <BadgeCheck className="w-5 h-5 text-white drop-shadow-sm" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left pt-2 pb-2">
              <h1 className="text-3xl sm:text-5xl font-serif italic text-slate-900 tracking-tight leading-none mb-4 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                {profile.displayName || 'Anonymous User'}
              </h1>
              
              {profile.role === 'PRIME_ADMIN' && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#d97706] mb-3 mt-1.5">
                  <div className="flex items-center gap-1.5 bg-[#fef3c7] px-2 py-1 rounded-md ring-1 ring-[#fde68a]">
                    <Lock className="w-3 h-3" /> Protected Account
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-2 text-slate-500 font-medium text-sm">
                <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profile.email}</span>
                </div>

                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold capitalize shadow-sm transition-all ${trustConfig.badgeClass}`}>
                  <trustConfig.icon className="w-3.5 h-3.5" />
                  <span>{trustConfig.label}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 flex-wrap">
                {profile.role === 'PRIME_ADMIN' ? (
                  <span className="flex items-center gap-1.5 text-xs bg-slate-900 px-3 py-1.5 rounded-full font-serif tracking-[0.15em] uppercase text-amber-400 shadow-sm border border-amber-600/30">
                    <Shield className="w-3.5 h-3.5" /> PRIME ADMIN
                  </span>
                ) : (
                  <Badge variant="outline" className="capitalize bg-white shadow-sm border-slate-200">{profile.role || 'User'}</Badge>
                )}
                {isVerified && <Badge variant="approved" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">Verified Carrier</Badge>}
              </div>
            </div>
          </div>

          {/* Quick Real Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50/80 p-4 rounded-[1.5rem] border border-slate-100 shadow-inner mt-4">
            <div className="flex flex-col">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Completed</span>
               <div className="flex items-center text-xl font-black text-slate-800">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-2" />
                  {profile.completedTasks || 0}
               </div>
            </div>
            <div className="flex flex-col">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Accepted</span>
               <div className="flex items-center text-xl font-black text-slate-800">
                  <Package className="w-5 h-5 text-indigo-500 mr-2" />
                  {profile.acceptedTasks || 0}
               </div>
            </div>
            <div className="flex flex-col">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reliability Score</span>
               <div className="flex items-center text-xl font-black text-slate-800">
                  <Zap className="w-5 h-5 text-amber-500 mr-2" />
                  {trustConfig.score !== undefined ? `${trustConfig.score}%` : 'N/A'}
               </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
