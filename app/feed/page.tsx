'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useDataCache } from '@/lib/data-cache';
import { TaskCard, TaskData } from '@/components/task-card';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Search, Zap, Flame, Clock, Heart, Shield, CheckCircle2, ChevronRight, MapPin, SlidersHorizontal, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

type FeedSort = 'priority' | 'newest' | 'likes';

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
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="popLayout">
        {tasks.map((task, index) => (
          <motion.div
            layout
            key={task.id}
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: Math.min(index * 0.05, 0.4) 
            }}
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
      </AnimatePresence>
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
  const [feedSort, setFeedSort] = useState<FeedSort>('priority');
  const [searchQuery, setSearchQuery] = useState('');

  const isVerifiedCarrier = profile?.isVerifiedCarrier === true;

  const filteredAndSortedTasks = useMemo(() => {
    // 1. Filter
    let filtered = feedTasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) || 
        (t.location && t.location.toLowerCase().includes(q))
      );
    }

    // 2. Sort
    return [...filtered].sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);

      switch (feedSort) {
        case 'newest': return timeB - timeA;
        case 'likes':  return (b.reactionCount || 0) - (a.reactionCount || 0);
        case 'priority':
        default:
          if (a.isEmergency && !b.isEmergency) return -1;
          if (!a.isEmergency && b.isEmergency) return 1;
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return timeB - timeA;
      }
    });
  }, [feedTasks, feedSort, searchQuery]);

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
      toast.error('Requires Level-1 Clearance (Verified Carrier) to intercept this intelligence.');
      return;
    }

    setApplyingId(taskId);
    try {
      const existingApps = await getDocs(
        query(
          collection(db, 'applications'),
          where('taskId', '==', taskId),
          where('userId', '==', user.uid)
        )
      );

      if (!existingApps.empty) {
        toast.error('You are already assigned to this intercept.');
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
      toast.success('Assignment application successfully generated. Awaiting approval. 📡');
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Communication error while securing task.');
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
      <div className="max-w-[1400px] mx-auto px-4 pt-24 pb-8 lg:pt-32 flex gap-8">
        <div className="hidden lg:block w-80 shrink-0">
          <div className="h-96 bg-slate-100/50 rounded-[32px] animate-pulse" />
        </div>
        <div className="flex-1 space-y-6">
          <div className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 pt-24 pb-8 lg:pt-32 lg:pb-12">
      
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* 🛡️ LEFT SIDEBAR: OPERATIVE PROFILE & FILTERS */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6 lg:sticky lg:top-32 z-10">
           
           {/* Primary User Card */}
           <div className="bg-slate-900 rounded-[32px] p-6 lg:p-8 shadow-2xl shadow-blue-900/10 overflow-hidden relative">
             <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 blur-3xl rounded-full" />
             
             {user ? (
               <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-6">
                   <div className="relative">
                     {profile?.photoURL ? (
                       <img src={profile.photoURL} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/30" />
                     ) : (
                       <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-black ring-2 ring-blue-500/30">
                         {profile?.displayName?.[0] || 'O'}
                       </div>
                     )}
                     {isVerifiedCarrier && (
                       <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full p-1 ring-4 ring-slate-900">
                         <CheckCircle2 className="w-4 h-4" />
                       </div>
                     )}
                   </div>
                   <div>
                     <p className="font-bold text-white text-lg leading-tight truncate max-w-[140px]">{profile?.displayName}</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                       {profile?.role === 'admin' ? 'Prime Admin' : profile?.role === 'moderator' ? 'Moderator' : 'Operative'}
                     </p>
                   </div>
                 </div>

                 <div className="space-y-3">
                   <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex justify-between items-center backdrop-blur-sm hover:bg-white/10 transition-colors">
                     <span className="text-xs font-semibold text-slate-400">Clearance Level</span>
                     <span className="text-xs font-black text-white">{isVerifiedCarrier ? 'VERIFIED' : 'STANDARD'}</span>
                   </div>
                   <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex justify-between items-center backdrop-blur-sm hover:bg-white/10 transition-colors">
                     <span className="text-xs font-semibold text-slate-400">Network Sync</span>
                     <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> ONLINE</span>
                   </div>
                 </div>
               </div>
             ) : (
               <div className="relative z-10 text-center py-4">
                 <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                 <h3 className="text-white font-bold mb-2">Guest Access</h3>
                 <p className="text-slate-400 text-xs mb-6 max-w-[200px] mx-auto">You are viewing the global intel feed securely.</p>
                 <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold">Authenticate</Button>
               </div>
             )}
           </div>

           {/* Sorting & Filters Control Matrix */}
           <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-100/50 border border-slate-100 hidden lg:block">
              <div className="flex items-center gap-2 mb-6 text-slate-900 border-b border-slate-100 pb-4">
                 <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                 <h3 className="font-heading font-black text-lg">Matrix Sorting</h3>
              </div>
              
              <div className="space-y-2">
                {[
                  { id: 'priority', title: 'Critical Intel', desc: 'Urgent & pinned tasks first', icon: Flame, color: 'text-amber-500', bg: 'bg-amber-50 group-hover:bg-amber-100', border: 'border-amber-200' },
                  { id: 'newest', title: 'Chronological', desc: 'Most recently detected', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50 group-hover:bg-emerald-100', border: 'border-emerald-200' },
                  { id: 'likes', title: 'Highest Rated', desc: 'Community prioritized', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 group-hover:bg-rose-100', border: 'border-rose-200' },
                ].map((sortOption) => (
                  <button
                    key={sortOption.id}
                    onClick={() => setFeedSort(sortOption.id as FeedSort)}
                    className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all border ${
                      feedSort === sortOption.id
                        ? `bg-white shadow-md ${sortOption.border}`
                        : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                    } group text-left`}
                  >
                    <div className={`p-2.5 rounded-xl transition-colors ${sortOption.color} ${
                      feedSort === sortOption.id ? 'bg-slate-100' : sortOption.bg
                    }`}>
                      <sortOption.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${feedSort === sortOption.id ? 'text-slate-900' : 'text-slate-600'}`}>
                        {sortOption.title}
                      </p>
                      <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                        {sortOption.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
           </div>

        </div>

        {/* 🌐 MAIN FEED COLUMN */}
        <div className="flex-1 w-full min-w-0">
          
          {/* Action Header bar */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-2 rounded-3xl shadow-lg shadow-slate-100/50 border border-slate-100 mb-8 sticky top-20 lg:top-32 z-30">
            
            <div className="flex-1 w-full font-medium relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search global intelligence protocols..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-6 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-2xl border-none text-slate-900 placeholder-slate-400 focus:ring-0 text-[15px] transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 pr-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
               {/* Mobile/Tablet Sorting Overrides (hidden on large screens to rely on sidebar) */}
               <div className="lg:hidden flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                 <button onClick={() => setFeedSort('priority')} className={`p-2.5 rounded-lg transition-colors ${feedSort === 'priority' ? 'bg-white shadow-sm text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}><Flame className="w-4 h-4" /></button>
                 <button onClick={() => setFeedSort('newest')} className={`p-2.5 rounded-lg transition-colors ${feedSort === 'newest' ? 'bg-white shadow-sm text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}><Clock className="w-4 h-4" /></button>
                 <button onClick={() => setFeedSort('likes')} className={`p-2.5 rounded-lg transition-colors ${feedSort === 'likes' ? 'bg-white shadow-sm text-rose-500' : 'text-slate-400 hover:text-slate-600'}`}><Heart className="w-4 h-4" /></button>
               </div>

               <div className="h-8 w-px bg-slate-200 hidden sm:block mx-2" />
               
               <Button 
                 variant="signature" 
                 size="icon" 
                 onClick={handleRefresh} 
                 disabled={refreshing}
                 className="h-12 w-12 shrink-0 rounded-[14px] shadow-lg shadow-blue-100"
               >
                 <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
               </Button>
            </div>
          </div>

          {/* Validation Banner if unverified */}
          {user && !isVerifiedCarrier && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-6 rounded-[24px] bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 shadow-inner flex flex-col sm:flex-row items-center gap-6"
            >
              <div className="w-12 h-12 bg-amber-100 text-amber-600 flex items-center justify-center rounded-2xl shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-amber-900 font-bold text-lg mb-1">Clearance Restricted</h4>
                <p className="text-amber-700/80 text-sm">You must achieve Verified Carrier status to deploy on missions within the network.</p>
              </div>
              <Button onClick={() => window.location.href='/profile'} variant="outline" className="shrink-0 bg-white border-amber-200 text-amber-700 hover:bg-amber-100 rounded-xl px-6 h-12">
                Start Verification
              </Button>
            </motion.div>
          )}

          {/* Active Feed */}
          {filteredAndSortedTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 bg-white rounded-[40px] border border-slate-100 shadow-sm"
            >
              <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6 relative">
                 <div className="absolute inset-0 border border-slate-200 rounded-full animate-[spin_10s_linear_infinite] border-dashed" />
                 <Package className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-2xl font-heading font-black text-slate-900 mb-2 tracking-tight">Zero Intel Found</h2>
              <p className="text-slate-500 max-w-sm mx-auto text-sm">
                No missions match your current search parameters. Try adjusting the query or frequency filters.
              </p>
            </motion.div>
          ) : (
            <div className="pb-20">
              <TaskList
                tasks={filteredAndSortedTasks}
                showApply={!!user && isVerifiedCarrier}
                showFollow={!!user}
                onLike={handleLike}
                onApply={handleApply}
                applyingId={applyingId}
                appliedIds={appliedIds}
              />

              {/* Load More Button */}
              {feedHasMore && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="mt-12 text-center"
                >
                  <Button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    variant="outline"
                    className="h-14 px-8 rounded-2xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 text-slate-500 font-bold transition-all shadow-sm"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin text-blue-500" />
                        Decrypting More Data...
                      </>
                    ) : (
                      <>
                        Explore Further <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
