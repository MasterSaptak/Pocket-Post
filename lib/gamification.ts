import { User, Zap, CheckCircle, Clock, Shield } from 'lucide-react';
import type { UserProfile } from '@/lib/auth-context';

export function getTrustScoreConfig(profile: UserProfile | null) {
  const isNew = !profile || (profile.acceptedTasks || 0) === 0;
  const isAdmin = profile?.role === 'admin';
  
  if (isNew) {
    return {
      level: 'NEW',
      score: 0,
      gradient: 'from-violet-600 via-indigo-600 to-blue-600',
      badgeClass: isAdmin ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200',
      label: 'New User',
      icon: User
    };
  }

  const accepted = profile.acceptedTasks || 1;
  const completed = profile.completedTasks || 0;
  const cancelled = profile.cancelledTasks || 0;
  const late = profile.lateTasks || 0;
  
  let rawScore = (completed / accepted) * 100;
  rawScore -= (cancelled * 10); // Penalty
  rawScore -= (late * 5);       // Penalty
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  if (score >= 90) {
    return { level: 'ELITE', score, gradient: 'from-emerald-400 via-teal-500 to-emerald-600', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Elite Carrier', icon: Zap };
  } else if (score >= 75) {
    return { level: 'GOOD', score, gradient: 'from-cyan-500 via-blue-500 to-indigo-600', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Good Performer', icon: CheckCircle };
  } else if (score >= 50) {
    return { level: 'AVERAGE', score, gradient: 'from-orange-400 via-amber-500 to-yellow-500', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Average', icon: Clock };
  } else {
    return { level: 'POOR', score, gradient: 'from-rose-500 via-red-500 to-red-700', badgeClass: 'bg-red-50 text-red-700 border-red-200', label: 'Poor Reliability', icon: Shield };
  }
}
