'use client';

import { memo, useState, useMemo, useEffect } from 'react';
import { format, differenceInHours, differenceInDays, differenceInMinutes, isPast } from 'date-fns';
import {
  MapPin, ThumbsUp, Zap, UserPlus, Clock, Trash2, DollarSign,
  Package, Weight, Eye, Users, TrendingUp, Bookmark, ExternalLink,
  Timer, ChevronRight, X
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';

// ─── Types ──────────────────────────────────────────────────────
export type PriorityLevel = 'standard' | 'priority' | 'urgent' | 'critical';
export type ParcelType = 'document' | 'fragile' | 'food' | 'other';

export interface TaskData {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdByName?: string;
  location?: string;
  deadline?: any;
  status: 'pending' | 'open' | 'rejected' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  assignedTo?: string;
  assignedToUser?: { name: string; email: string; avatar: string | null; phone?: string; };
  reactionCount: number;
  createdAt: any;
  isEmergency?: boolean;
  isPinned?: boolean;
  bounty?: number;
  priorityLevel?: PriorityLevel;
  parcelType?: ParcelType;
  weight?: number;
  bidsCount?: number;
  followsCount?: number;
  viewsCount?: number;
  queueCount?: number;
  locationCoords?: { lat: number; lng: number };
  deadlineTimestamp?: any;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupTime?: any;
  dropoffTime?: any;
  currency?: string;
  size?: 'small' | 'medium' | 'large';
  pricingType?: 'fixed' | 'bidding';
  isFragile?: boolean;
  isBoosted?: boolean;
  imageUrl?: string;
}

// ─── Config ─────────────────────────────────────────────────────
const priorityConfig: Record<PriorityLevel, { label: string; color: string; bg: string; border: string; accent: string; dot: string }> = {
  standard: { label: 'Standard', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', accent: '', dot: 'bg-slate-400' },
  priority: { label: 'Priority', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', accent: 'border-l-blue-500', dot: 'bg-blue-500' },
  urgent: { label: 'Urgent', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', accent: 'border-l-amber-500', dot: 'bg-amber-500' },
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-400', accent: 'border-l-red-500', dot: 'bg-red-500' },
};

const parcelConfig: Record<ParcelType, { label: string; emoji: string }> = {
  document: { label: 'Document', emoji: '📄' },
  fragile: { label: 'Fragile', emoji: '🫧' },
  food: { label: 'Food', emoji: '🍱' },
  other: { label: 'Other', emoji: '📦' },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  open: { label: 'Open', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  assigned: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  in_progress: { label: 'In Progress', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  completed: { label: 'Completed', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  expired: { label: 'Expired', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

// ─── Helpers ────────────────────────────────────────────────────
export function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return null;
}

export function getTimeLeft(deadline: Date): { text: string; urgency: 'expired' | 'critical' | 'soon' | 'normal'; hours: number } {
  if (isPast(deadline)) {
    return { text: 'Expired', urgency: 'expired', hours: 0 };
  }
  const hoursLeft = differenceInHours(deadline, new Date());
  const daysLeft = differenceInDays(deadline, new Date());
  const minsLeft = differenceInMinutes(deadline, new Date());

  if (minsLeft < 60) return { text: `${minsLeft}m left`, urgency: 'critical', hours: hoursLeft };
  if (hoursLeft < 6) return { text: `${hoursLeft}h left`, urgency: 'critical', hours: hoursLeft };
  if (hoursLeft < 24) return { text: 'Ends today', urgency: 'critical', hours: hoursLeft };
  if (daysLeft === 1) return { text: 'Ends tomorrow', urgency: 'soon', hours: hoursLeft };
  if (daysLeft <= 3) return { text: `${daysLeft} days left`, urgency: 'soon', hours: hoursLeft };
  return { text: `${daysLeft} days left`, urgency: 'normal', hours: hoursLeft };
}

const timeLeftColors = {
  expired: 'text-red-600 bg-red-50 border-red-200',
  critical: 'text-red-600 bg-red-50 border-red-200',
  soon: 'text-amber-600 bg-amber-50 border-amber-200',
  normal: 'text-slate-500 bg-slate-50 border-slate-200',
};

// ─── Props ──────────────────────────────────────────────────────
interface TaskCardProps {
  task: TaskData;
  onLike?: (id: string) => void;
  onApply?: (id: string) => void;
  showApplyButton?: boolean;
  showFollowButton?: boolean;
  isApplying?: boolean;
  hasApplied?: boolean;
  isAdminView?: boolean;
  onAction?: (action: string, task: TaskData) => void;
  variant?: 'default' | 'featured';
}

// ─── Live Countdown Hook ────────────────────────────────────────
function useLiveCountdown(deadline: Date | null) {
  const deadlineMs = deadline ? deadline.getTime() : 0;
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft> | null>(
    () => deadline ? getTimeLeft(deadline) : null
  );
  useEffect(() => {
    if (!deadlineMs) { setTimeLeft(null); return; }
    const dl = new Date(deadlineMs);
    const update = () => {
      const next = getTimeLeft(dl);
      setTimeLeft(prev => (prev && prev.text === next.text) ? prev : next);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [deadlineMs]);
  return timeLeft;
}

// ─── Component ──────────────────────────────────────────────────
export const TaskCard = memo(function TaskCard({
  task,
  onLike,
  onApply,
  showApplyButton = false,
  showFollowButton = false,
  isApplying = false,
  hasApplied = false,
  isAdminView = false,
  onAction,
  variant = 'default',
}: TaskCardProps) {
  const { user } = useAuth();
  // Sync core logic with real-time backend updates
  const [liveTask, setLiveTask] = useState<TaskData>(task);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [userQueueEntry, setUserQueueEntry] = useState<{ position: number; status: string } | null>(null);

  useEffect(() => {
    // 1. Task real-time stream (broad read access)
    const unsubTask = onSnapshot(doc(db, 'tasks', task.id), (docSnap) => {
      if (docSnap.exists()) {
        setLiveTask({ id: docSnap.id, ...docSnap.data() } as TaskData);
      }
    }, (err) => { /* silent: task may be hidden/deleted */ });

    // 2. User-specific state: one-time check (avoids permission-denied on missing docs)
    if (user) {
      getDoc(doc(db, 'follows', `${task.id}_${user.uid}`))
        .then(s => setFollowing(s.exists()))
        .catch(() => setFollowing(false));
      
      getDoc(doc(db, 'savedTasks', `${task.id}_${user.uid}`))
        .then(s => setSaved(s.exists()))
        .catch(() => setSaved(false));
      
      getDoc(doc(db, 'queue', `${task.id}_${user.uid}`))
        .then(s => {
          if (s.exists()) setUserQueueEntry(s.data() as any);
          else setUserQueueEntry(null);
        })
        .catch(() => setUserQueueEntry(null));
    }

    return () => { unsubTask(); };
  }, [task.id, user?.uid]);

  const [liked, setLiked] = useState(false);
  const [localReactionCount, setLocalReactionCount] = useState(task.reactionCount || 0);

  const deadlineDate = parseDate(liveTask.deadline || task.deadline);
  const createdDate = parseDate(liveTask.createdAt || task.createdAt);
  const timeLeft = useLiveCountdown(deadlineDate);

  const status = statusConfig[liveTask.status] || statusConfig.open;
  const priority = liveTask.priorityLevel ? priorityConfig[liveTask.priorityLevel] : priorityConfig.standard;
  const parcel = liveTask.parcelType ? parcelConfig[liveTask.parcelType] : null;

  const isCritical = liveTask.isEmergency || liveTask.priorityLevel === 'critical';
  const isUrgent = liveTask.priorityLevel === 'urgent';
  const isFeatured = variant === 'featured';
  const isAssignee = user?.uid === liveTask.assignedTo;

  const accentBorder = isCritical ? 'border-l-red-500' : isUrgent ? 'border-l-amber-500' : priority.accent;

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    setLocalReactionCount((c) => c + 1);
    onLike?.(task.id);
  };

  const handleSave = () => {
    setSaved(!saved);
    onAction?.('save', liveTask);
  };

  const handleFollow = () => {
    setFollowing(!following);
    onAction?.('follow', liveTask);
  };

  const trendingScore = (liveTask.bidsCount || 0) + (liveTask.followsCount || 0) + (liveTask.viewsCount || 0);

  return (
    <Card
      className={`overflow-hidden group transition-all duration-300 relative border-l-4 ${accentBorder || 'border-l-transparent'}
        ${isCritical ? 'ring-2 ring-red-400/20 border-red-300' : ''}
        ${isUrgent ? 'ring-1 ring-amber-300/20 border-amber-200' : ''}
        ${isFeatured ? 'shadow-lg shadow-blue-100/50 hover:shadow-xl' : 'hover:shadow-md'}
        ${!isCritical && !isUrgent ? 'hover:border-blue-200' : ''}
      `}
    >
      {/* Critical pulsing glow */}
      {isCritical && (
        <motion.div
          animate={{ opacity: [0.02, 0.08, 0.02] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute inset-0 bg-red-500 pointer-events-none"
        />
      )}

      {/* ═══ TOP ROW: Bounty + Priority + Status ═══ */}
      <CardHeader className="pb-2 relative z-10">
        <div className="flex items-center justify-between gap-3 mb-2">
          {/* Left: Bounty prominent display */}
          <div className="flex items-center gap-2 flex-wrap">
            {liveTask.bounty != null && liveTask.bounty > 0 ? (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black ${
                liveTask.bounty >= 1000 ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/50'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                <span>{liveTask.currency === 'USD' ? '$' : liveTask.currency === 'BDT' ? '৳' : liveTask.currency === 'EUR' ? '€' : liveTask.currency === 'GBP' ? '£' : '₹'}{liveTask.bounty.toLocaleString()}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 text-xs border border-slate-100">
                <DollarSign className="w-3.5 h-3.5" />
                <span>No bounty</span>
              </div>
            )}

            {/* Parcel type chip */}
            {parcel && (
              <span className="px-2 py-1 rounded-lg bg-violet-50/80 border border-violet-100 text-violet-600 text-[11px] font-semibold">
                {parcel.emoji} {parcel.label}
              </span>
            )}
          </div>

          {/* Right: Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {liveTask.priorityLevel && liveTask.priorityLevel !== 'standard' && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight border ${priority.bg} ${priority.color} ${priority.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priority.dot} ${isCritical ? 'animate-pulse' : ''}`} />
                {priority.label}
              </span>
            )}
            {liveTask.isEmergency && (
              <motion.span
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-600 text-white uppercase tracking-tight"
              >
                URGENT
              </motion.span>
            )}
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* ═══ TITLE + META ═══ */}
        <div>
          <h3 className={`font-heading font-bold leading-tight text-slate-900 mb-1 ${isFeatured ? 'text-lg' : 'text-[15px]'}`}>
            {liveTask.isPinned && <Clock className="w-3.5 h-3.5 text-amber-500 fill-amber-500 inline mr-1.5 -mt-0.5" />}
            {liveTask.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            {liveTask.createdByName && <span className="font-medium text-slate-500">{liveTask.createdByName}</span>}
            {createdDate && (
              <>
                <span>·</span>
                <span>{format(createdDate, 'MMM d')}</span>
              </>
            )}
            {task.weight != null && task.weight > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Weight className="w-3 h-3" />{task.weight}kg</span>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      {/* ═══ BODY ═══ */}
      <CardContent className="pt-0 pb-3 space-y-2.5 relative z-10">
        <p className={`text-sm text-slate-600 leading-relaxed ${isFeatured ? 'line-clamp-3' : 'line-clamp-2'}`}>
          {liveTask.description}
        </p>

        {/* ═══ META CHIPS: Locations + Time Left ═══ */}
        <div className="flex flex-col gap-1.5 w-full">
          {liveTask.pickupLocation && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium w-fit max-w-[90%]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Pick up: {liveTask.pickupLocation}</span>
            </div>
          )}
          {liveTask.dropoffLocation && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium w-fit max-w-[90%]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Drop off: {liveTask.dropoffLocation}</span>
            </div>
          )}
          {liveTask.location && !liveTask.pickupLocation && !liveTask.dropoffLocation && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-slate-500 text-xs w-fit">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[140px]">{liveTask.location}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {timeLeft && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold ${timeLeftColors[timeLeft.urgency]}
                ${timeLeft.urgency === 'critical' ? 'animate-pulse' : ''}
              `}>
                <Timer className="w-3 h-3" />
                <span>{timeLeft.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ ACTIVITY BAR ═══ */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {(liveTask.status === 'assigned' || liveTask.status === 'in_progress') && (
              <span className="flex items-center gap-1 font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-md border border-violet-200">
                <Users className="w-3 h-3" />
                {liveTask.queueCount || 0} in queue
              </span>
            )}
            {liveTask.bidsCount != null && liveTask.bidsCount > 0 && liveTask.status === 'open' && (
              <span className="flex items-center gap-1 font-medium">
                <Users className="w-3 h-3 text-blue-400" />
                {liveTask.bidsCount} bid{liveTask.bidsCount !== 1 ? 's' : ''}
              </span>
            )}
            {liveTask.followsCount != null && liveTask.followsCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-violet-400" />
                {liveTask.followsCount}
              </span>
            )}
            {liveTask.viewsCount != null && liveTask.viewsCount > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                {liveTask.viewsCount}
              </span>
            )}
          </div>

          {/* Trending indicator */}
          {trendingScore > 10 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-200">
              🔥 Hot
            </span>
          )}
        </div>
      </CardContent>

      {/* ═══ ACTIONS BAR ═══ */}
      <CardFooter className="pt-0 pb-3 px-5 relative z-10">
        {!isAdminView ? (
          <div className="flex items-center gap-1.5 w-full">
            {/* Like */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleLike}
              disabled={liked}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                liked
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-slate-50 text-slate-500 border border-slate-150 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
              }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-blue-500' : ''}`} />
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={localReactionCount}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  {localReactionCount}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            {/* Save */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSave}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                saved
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-slate-50 text-slate-500 border border-slate-150 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-amber-500' : ''}`} />
              <span className="hidden sm:inline">Save</span>
            </motion.button>

            {/* Follow */}
            {showFollowButton && liveTask.status !== 'completed' && liveTask.status !== 'expired' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  following 
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                    : 'bg-slate-50 text-slate-500 border border-slate-150 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                }`}
                onClick={handleFollow}
              >
                <UserPlus className={`w-3.5 h-3.5 ${following ? 'fill-indigo-500 text-indigo-500' : ''}`} />
                <span className="hidden sm:inline">{following ? 'Following' : 'Follow'}</span>
              </motion.button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Quick Bid / Queue / Track — Dynamic CTA based on state */}
            {showApplyButton && liveTask.status === 'open' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onApply?.(liveTask.id)}
                disabled={isApplying || hasApplied}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  hasApplied
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-200/50 hover:shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                {hasApplied ? 'Applied' : isApplying ? 'Bidding...' : 'Quick Bid'}
                {!hasApplied && !isApplying && <ChevronRight className="w-3 h-3 -mr-1" />}
              </motion.button>
            )}

            {showApplyButton && liveTask.status === 'assigned' && !isAssignee && !userQueueEntry && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onAction?.('join_queue', liveTask)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200/50 hover:shadow-md"
              >
                <Users className="w-3.5 h-3.5" />
                Join Queue
              </motion.button>
            )}

            {showApplyButton && liveTask.status === 'assigned' && !isAssignee && userQueueEntry && userQueueEntry.status === 'waiting' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onAction?.('leave_queue', liveTask)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
              >
                <X className="w-3 h-3" />
                Leave Queue (#{userQueueEntry.position})
              </motion.button>
            )}

            {showApplyButton && liveTask.status === 'assigned' && isAssignee && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (confirm('Are you sure you want to drop this task? This may affect your rating.')) {
                    onAction?.('drop_task', liveTask);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Drop Task
              </motion.button>
            )}

            {showApplyButton && liveTask.status === 'in_progress' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onAction?.('track', liveTask)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200/50 hover:shadow-md"
              >
                <MapPin className="w-3.5 h-3.5" />
                Live Track
              </motion.button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 w-full">
            {liveTask.status === 'pending' && (
              <>
                <Button size="sm" variant="signature" onClick={() => onAction?.('approve', liveTask)} className="flex-1">
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onAction?.('reject', liveTask)} className="flex-1 text-white">
                  Decline
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => onAction?.('edit', liveTask)} className="px-3">Edit</Button>
            <Button size="sm" variant="outline" onClick={() => onAction?.('pin', liveTask)}
              className={`px-3 ${liveTask.isPinned ? 'bg-amber-100 border-amber-300 text-amber-700' : ''}`}
            >
              {liveTask.isPinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAction?.('emergency', liveTask)}
              className={`px-3 ${liveTask.isEmergency ? 'bg-red-100 border-red-300 text-red-700 pulse-red' : ''}`}
            >
              Urgent
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAction?.('delete', liveTask)}
              className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" title="Delete"
            >
              <Trash2 className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        )}
        
        {/* ASSIGNED USER INTEL (Visible when status is assigned and data is attached) */}
        {liveTask.status === 'assigned' && liveTask.assignedToUser && (
          <div className="w-full mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
             {liveTask.assignedToUser.avatar ? (
                <img src={liveTask.assignedToUser.avatar} className="w-9 h-9 rounded-lg object-cover ring-2 ring-white shadow-sm" />
             ) : (
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                   {liveTask.assignedToUser.name[0]?.toUpperCase() || '?'}
                </div>
             )}
             <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">Assigned Operative</p>
                <div className="flex items-center gap-2">
                   <p className="text-sm font-bold text-slate-900 truncate leading-tight">{liveTask.assignedToUser.name}</p>
                   <span className="shrink-0 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Carrier</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">{liveTask.assignedToUser.email}</p>
             </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
});
