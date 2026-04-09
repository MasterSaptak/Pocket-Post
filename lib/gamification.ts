import { User, Zap, CheckCircle, Clock, Shield, AlertTriangle } from 'lucide-react';
import type { UserProfile } from '@/lib/auth-context';

export const TIER_CONFIG = {
  ELITE: { rank: 4, bgImage: '/Elite.png', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Elite', icon: Zap, feeRate: 0.02, payoutSpeed: 'Instant' },
  TRUSTED: { rank: 3, bgImage: '/Trusted.png', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Trusted', icon: CheckCircle, feeRate: 0.035, payoutSpeed: '6 Hours' },
  ACTIVE: { rank: 2, bgImage: '/Active.png', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Active', icon: Zap, feeRate: 0.045, payoutSpeed: '12 Hours' },
  STARTER: { rank: 1, bgImage: '/Starter.png', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200', label: 'Starter', icon: Clock, feeRate: 0.05, payoutSpeed: '24 Hours' },
  NEW_USER: { rank: 0, bgImage: '/New User.png', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200', label: 'New User', icon: User, feeRate: 0.05, payoutSpeed: '48 Hours' },
  BANNED: { rank: -1, bgImage: '/New User.png', badgeClass: 'bg-red-50 text-red-700 border-red-200', label: 'Restricted', icon: AlertTriangle, feeRate: 1.0, payoutSpeed: 'Blocked' },
};

export function computeAccuracyScore(profile: UserProfile): number {
  if (!profile.acceptedTasks || profile.acceptedTasks === 0) return 0;
  
  const accepted = profile.acceptedTasks;
  const completed = profile.completedTasks || 0;
  const cancelled = profile.cancelledTasks || 0;
  const late = profile.lateTasks || 0;
  const lowRating = profile.lowRatingTasks || 0; // rating < 3 stars
  
  let rawScore = (completed / accepted) * 100;
  rawScore -= (cancelled * 10);
  rawScore -= (late * 5);
  rawScore -= (lowRating * 3);
  
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

export function calculateSystemTier(completed: number, score: number): string {
  if (completed === 0) return 'NEW_USER';
  if (score >= 90) return 'ELITE';
  if (score >= 75) return 'TRUSTED';
  if (score >= 50) return 'ACTIVE';
  return 'STARTER';
}

export function determineFinalTier(profile: UserProfile): string {
  // 1. Highest Priority: BAN State
  if (profile.ban && profile.ban.status !== 'NONE') {
    const isBanExpired = profile.ban.expiresAt ? new Date(profile.ban.expiresAt).getTime() < Date.now() : false;
    if (!isBanExpired) return 'BANNED';
  }
  
  // 2. Admin Override / Statuses
  if (profile.role === 'admin' || profile.role === 'PRIME_ADMIN') return 'ELITE';
  if (profile.adminOverride && profile.adminOverride.tier) {
    const isOverrideExpired = profile.adminOverride.expiresAt ? new Date(profile.adminOverride.expiresAt).getTime() < Date.now() : false;
    if (!isOverrideExpired) return profile.adminOverride.tier;
  }
  
  // 3. Fallback: Mathematical System Tier
  const score = computeAccuracyScore(profile);
  return calculateSystemTier(profile.completedTasks || 0, score);
}

export function getTrustScoreConfig(profile: UserProfile | null) {
  if (!profile) return { level: 'NEW_USER', score: 0, ...TIER_CONFIG.NEW_USER };
  
  const score = computeAccuracyScore(profile);
  const finalTierName = determineFinalTier(profile);
  
  const config = TIER_CONFIG[finalTierName as keyof typeof TIER_CONFIG] || TIER_CONFIG.STARTER;
  
  return {
     level: finalTierName,
     score,
     ...config
  };
}

export function computeFinalUserProfilePayload(profile: UserProfile): Partial<UserProfile> {
   const score = computeAccuracyScore(profile);
   const systemTier = calculateSystemTier(profile.completedTasks || 0, score);
   const finalTier = determineFinalTier(profile);
   
   return {
     accuracyScore: score,
     systemTier,
     finalTier,
     level: finalTier // Legacy compat sync
   };
}
