'use client';

import { memo, useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, ThumbsUp, Zap, UserPlus, Clock, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export interface TaskData {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdByName?: string;
  location?: string;
  deadline?: any; // Firestore timestamp
  status: 'pending' | 'open' | 'rejected' | 'assigned' | 'completed' | 'cancelled';
  assignedTo?: string;
  reactionCount: number;
  createdAt: any;
  isEmergency?: boolean;
  isPinned?: boolean;
}

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
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending Approval', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  open: { label: 'Open', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  assigned: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  completed: { label: 'Completed', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

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
}: TaskCardProps) {
  const [liked, setLiked] = useState(false);
  const [localReactionCount, setLocalReactionCount] = useState(task.reactionCount || 0);

  const deadlineDate = task.deadline?.toDate
    ? task.deadline.toDate()
    : task.deadline
      ? new Date(task.deadline)
      : null;

  const createdDate = task.createdAt?.toDate
    ? task.createdAt.toDate()
    : task.createdAt
      ? new Date(task.createdAt)
      : null;

  const status = statusConfig[task.status] || statusConfig.open;

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    setLocalReactionCount((c) => c + 1);
    onLike?.(task.id);
  };

  return (
    <Card 
      className={`overflow-hidden group transition-all duration-300 hover:shadow-lg relative
        ${task.isPinned ? 'border-amber-200 bg-amber-50/30' : 'hover:border-blue-200/80'}
        ${task.isEmergency ? 'border-red-400 ring-4 ring-red-400/20' : ''}
      `}
    >
      {/* Emergency Pulsing Background */}
      {task.isEmergency && (
        <motion.div 
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-red-500 pointer-events-none"
        />
      )}

      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {task.isPinned && <Clock className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
            <h3 className="font-heading font-bold text-lg text-slate-900 leading-tight truncate">
              {task.title}
            </h3>
          </div>
          {createdDate && (
            <div className="flex items-center text-xs text-slate-400 gap-1">
              <Clock className="w-3 h-3" />
              <span>{format(createdDate, 'MMM d, yyyy')}</span>
              {task.createdByName && (
                <>
                  <span className="mx-1">·</span>
                  <span>{task.createdByName}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {task.isEmergency && (
            <motion.span 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter bg-red-600 text-white uppercase"
            >
              URGENT
            </motion.span>
          )}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.bg} ${status.color}`}>
            {status.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4 space-y-3 relative z-10">
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
          {task.description}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {task.location && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{task.location}</span>
            </div>
          )}
          {deadlineDate && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Due {format(deadlineDate, 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4 px-6 flex items-center gap-2 relative z-10">
        {!isAdminView ? (
          <>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleLike}
              disabled={liked}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                liked
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-blue-500' : ''}`} />
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={localReactionCount}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {localReactionCount}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            {showApplyButton && task.status === 'open' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onApply?.(task.id)}
                disabled={isApplying || hasApplied}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  hasApplied
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm hover:shadow-md hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50'
                }`}
              >
                <Zap className="w-4 h-4" />
                {hasApplied ? 'Applied' : isApplying ? 'Applying...' : 'Apply'}
              </motion.button>
            )}

            {showFollowButton && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-slate-50 text-slate-500 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all duration-200"
                onClick={() => toast?.('Follow feature coming soon!')}
              >
                <UserPlus className="w-4 h-4" />
                Follow
              </motion.button>
            )}
          </>
        ) : (
          <div className="flex flex-wrap gap-2 w-full">
            {task.status === 'pending' && (
              <>
                <Button size="sm" variant="signature" onClick={() => onAction?.('approve', task)} className="flex-1">
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onAction?.('reject', task)} className="flex-1 text-white">
                  Decline
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => onAction?.('edit', task)} className="px-3">
              Edit
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onAction?.('pin', task)} 
              className={`px-3 ${task.isPinned ? 'bg-amber-100 border-amber-300 text-amber-700' : ''}`}
            >
              {task.isPinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onAction?.('emergency', task)} 
              className={`px-3 ${task.isEmergency ? 'bg-red-100 border-red-300 text-red-700 pulse-red' : ''}`}
            >
              Urgent
            </Button>
            <Button 
               size="sm" 
               variant="outline" 
               onClick={() => onAction?.('delete', task)} 
               className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
               title="Delete Post"
            >
               <Trash2 className="w-4 h-4 sm:mr-1" />
               <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
});
