'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useDataCache } from '@/lib/data-cache';
import { TaskCard, TaskData } from '@/components/task-card';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Memoized list to prevent re-renders when parent state changes
const TaskList = memo(function TaskList({
  tasks,
  showApply,
  showFollow,
  onLike,
  onApply,
  applyingId,
  appliedIds,
}: {
  tasks: TaskData[];
  showApply: boolean;
  showFollow: boolean;
  onLike: (id: string) => void;
  onApply: (id: string) => void;
  applyingId: string | null;
  appliedIds: Set<string>;
}) {
  return (
    <div className="grid gap-5">
      {tasks.map((task, index) => (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.04, 0.3) }}
        >
          <TaskCard
            task={task}
            showApplyButton={showApply}
            showFollowButton={showFollow}
            onLike={onLike}
            onApply={onApply}
            isApplying={applyingId === task.id}
            hasApplied={appliedIds.has(task.id)}
          />
        </motion.div>
      ))}
    </div>
  );
});

export default function FeedPage() {
  const { user, profile } = useAuth();
  const { feedTasks, feedLoading, feedHasMore, loadMoreTasks, refreshFeed } = useDataCache();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isVerifiedCarrier = profile?.isVerifiedCarrier === true;

  const handleLike = useCallback(async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        reactionCount: increment(1),
      });
    } catch (error) {
      console.error('Error liking task:', error);
    }
  }, []);

  const handleApply = useCallback(async (taskId: string) => {
    if (!user) {
      toast.error('You must be signed in to apply.');
      return;
    }
    if (!isVerifiedCarrier) {
      toast.error('Only verified carriers can apply. Complete verification first.');
      return;
    }

    setApplyingId(taskId);
    try {
      // Check for duplicate application
      const existingApps = await getDocs(
        query(
          collection(db, 'applications'),
          where('taskId', '==', taskId),
          where('userId', '==', user.uid)
        )
      );

      if (!existingApps.empty) {
        toast.error('You have already applied to this task.');
        setAppliedIds((prev) => new Set(prev).add(taskId));
        return;
      }

      await addDoc(collection(db, 'applications'), {
        taskId,
        userId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setAppliedIds((prev) => new Set(prev).add(taskId));
      toast.success('Application submitted! 🎉');
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Failed to submit application.');
    } finally {
      setApplyingId(null);
    }
  }, [user, isVerifiedCarrier]);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    await loadMoreTasks();
    setLoadingMore(false);
  }, [loadMoreTasks]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFeed();
    setRefreshing(false);
  }, [refreshFeed]);

  // Initial loading state
  if (feedLoading && feedTasks.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-8" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-52 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Task Feed</h1>
          <p className="text-slate-500 mt-1">Discover tasks and apply to work on them.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Feed */}
      {feedTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-2">No tasks yet</h2>
          <p className="text-slate-500 max-w-sm mx-auto">
            There are no open tasks at the moment. Check back later or post your own!
          </p>
        </motion.div>
      ) : (
        <>
          <TaskList
            tasks={feedTasks}
            showApply={!!user && isVerifiedCarrier}
            showFollow={!!user}
            onLike={handleLike}
            onApply={handleApply}
            applyingId={applyingId}
            appliedIds={appliedIds}
          />

          {/* Load More */}
          {feedHasMore && (
            <div className="mt-8 text-center">
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                variant="outline"
                size="lg"
                className="min-w-[200px]"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Tasks'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Carrier verification nudge */}
      {user && !isVerifiedCarrier && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100"
        >
          <p className="text-sm text-blue-900 font-medium mb-1">Want to apply for tasks?</p>
          <p className="text-sm text-blue-700/80">
            Complete your carrier verification in your{' '}
            <a href="/profile" className="font-semibold underline underline-offset-2 hover:text-blue-900">
              profile settings
            </a>{' '}
            to start applying.
          </p>
        </motion.div>
      )}
    </div>
  );
}
