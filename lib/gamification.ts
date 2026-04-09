import { User, Zap, CheckCircle, Clock, Shield } from 'lucide-react';
import type { UserProfile } from '@/lib/auth-context';

export function getTrustScoreConfig(profile: UserProfile | null) {
  const isNew = !profile || (profile.acceptedTasks || 0) === 0;
  const isAdmin = profile?.role === 'admin';
  
  if (isAdmin) {
    return {
      level: 'ELITE',
      score: profile?.accuracyScore ?? 100,
      bgImage: '/Elite.png',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      label: 'Elite',
      icon: Zap
    };
  }

  if (isNew) {
    return {
      level: 'NEW_USER',
      score: 0,
      bgImage: '/New User.png',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      label: 'New User',
      icon: User
    };
  }

  const accepted = profile.acceptedTasks || 1;
  const completed = profile.completedTasks || 0;
  const cancelled = profile.cancelledTasks || 0;
  const late = profile.lateTasks || 0;
  
  let rawScore = (completed / accepted) * 100;
  rawScore -= (cancelled * 10);
  rawScore -= (late * 5);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  if (score >= 90) {
    return { level: 'ELITE', score, bgImage: '/Elite.png', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Elite', icon: Zap };
  } else if (score >= 75) {
    return { level: 'TRUSTED', score, bgImage: '/Trusted.png', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Trusted', icon: CheckCircle };
  } else if (score >= 50) {
    return { level: 'ACTIVE', score, bgImage: '/Active.png', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Active', icon: Zap };
  } else {
    // Treat score < 50 as Starter since we don't have a "Poor" banner based on the new spec
    return { level: 'STARTER', score, bgImage: '/Starter.png', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200', label: 'Starter', icon: Clock };
  }
}
