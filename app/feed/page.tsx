'use client';

import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useDataCache } from '@/lib/data-cache';
import { TaskCard, TaskData, PriorityLevel, ParcelType, parseDate, getTimeLeft } from '@/components/task-card';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, Search, Zap, Clock, Shield, CheckCircle2,
  ChevronRight, ChevronDown, MapPin, SlidersHorizontal, Package, ArrowUpDown,
  TrendingUp, DollarSign, Star, Timer, X, Weight, Calendar, Plus,
  Bookmark, BarChart3, Activity, Flame, Eye, Users, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { joinTaskQueue, leaveTaskQueue, dropTaskAndPromoteQueue } from '@/lib/services/queue-service';
import { toggleSaveTask, toggleFollowTask } from '@/lib/services/interaction-service';

// ─── Types ───────────────────────────────────────────────────────
type FeedSort = 'newest' | 'bounty' | 'ending_soon' | 'more_time' | 'top_rated' | 'trending';
type FeedTab = 'for_you' | 'nearby' | 'high_paying' | 'urgent' | 'new';
type LocationFilter = 'all' | 'near_me' | 'same_city' | 'custom';

interface FilterState {
  bountyMin: number; bountyMax: number; parcelTypes: ParcelType[];
  weightMin: number; weightMax: number; deadlineFrom: string;
  deadlineTo: string; priorityLevels: PriorityLevel[];
}

const DEFAULT_FILTERS: FilterState = {
  bountyMin: 0, bountyMax: 100000, parcelTypes: [], weightMin: 0,
  weightMax: 1000, deadlineFrom: '', deadlineTo: '', priorityLevels: [],
};

const SORT_OPTIONS: { id: FeedSort; label: string; icon: any }[] = [
  { id: 'newest', label: 'Newest First', icon: Clock },
  { id: 'bounty', label: 'Highest Bounty', icon: DollarSign },
  { id: 'ending_soon', label: 'Ending Soon', icon: Timer },
  { id: 'more_time', label: 'More Time', icon: Clock },
  { id: 'top_rated', label: 'Top Rated', icon: Star },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
];

const TABS: { id: FeedTab; label: string; icon: any }[] = [
  { id: 'for_you', label: 'For You', icon: Zap },
  { id: 'nearby', label: 'Nearby', icon: MapPin },
  { id: 'high_paying', label: 'High Paying', icon: DollarSign },
  { id: 'urgent', label: 'Urgent', icon: Flame },
  { id: 'new', label: 'New', icon: Clock },
];

const LOCATION_OPTIONS: { id: LocationFilter; label: string }[] = [
  { id: 'all', label: 'All Locations' }, { id: 'near_me', label: 'Near Me' },
  { id: 'same_city', label: 'Same City' }, { id: 'custom', label: 'Custom' },
];

// ─── Dropdown ────────────────────────────────────────────────────
function Dropdown({ trigger, children, isOpen, onToggle, onClose }: {
  trigger: React.ReactNode; children: React.ReactNode;
  isOpen: boolean; onToggle: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={onToggle}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-2 z-50 min-w-[240px]">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Memoized Task List ──────────────────────────────────────────
const TaskList = memo(function TaskList({ tasks, showApply, showFollow, onLike, onApply, onAction, applyingId, appliedIds }: {
  tasks: TaskData[]; showApply: boolean; showFollow: boolean;
  onLike: (id: string) => void; onApply: (id: string) => void;
  onAction?: (action: string, task: TaskData) => void;
  applyingId: string | null; appliedIds: Set<string>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="popLayout">
        {tasks.map((task, i) => (
          <motion.div layout key={task.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: Math.min(i * 0.04, 0.3) }}>
            <TaskCard task={task} showApplyButton={showApply} showFollowButton={showFollow}
              onLike={onLike} onApply={onApply} onAction={onAction} isApplying={applyingId === task.id}
              hasApplied={appliedIds.has(task.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════
// MAIN FEED PAGE
// ═════════════════════════════════════════════════════════════════
export default function FeedPage() {
  const { user, profile } = useAuth();
  const { feedTasks, feedLoading, feedHasMore, loadMoreTasks, refreshFeed } = useDataCache();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [feedSort, setFeedSort] = useState<FeedSort>('newest');
  const [activeTab, setActiveTab] = useState<FeedTab>('for_you');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [customLocation, setCustomLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // User Stats state for sidebar
  const [userStats, setUserStats] = useState({
    bids: 0,
    completed: 0,
    following: 0,
    saved: 0
  });

  const isVerifiedCarrier = profile?.isVerifiedCarrier === true;

  // ─── Fetch Sidebar Stats (Real-Time) ─────────────────────────
  useEffect(() => {
    if (!user) return;
    
    // We instantiate individual listeners to track user stats in real-time
    const qApps = query(collection(db, 'applications'), where('userId', '==', user.uid));
    const unsubApps = onSnapshot(qApps, (snap) => {
      setUserStats(prev => ({ ...prev, bids: snap.docs.filter(d => d.data().status === 'pending').length }));
    });

    const qTasks = query(collection(db, 'tasks'), where('createdBy', '==', user.uid));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setUserStats(prev => ({ ...prev, completed: snap.docs.filter(d => d.data().status === 'completed').length }));
    });

    const qFollows = query(collection(db, 'follows'), where('userId', '==', user.uid));
    const unsubFollows = onSnapshot(qFollows, (snap) => {
      setUserStats(prev => ({ ...prev, following: snap.size }));
    });

    const qSaved = query(collection(db, 'savedTasks'), where('userId', '==', user.uid));
    const unsubSaved = onSnapshot(qSaved, (snap) => {
      setUserStats(prev => ({ ...prev, saved: snap.size }));
    });

    return () => {
      unsubApps();
      unsubTasks();
      unsubFollows();
      unsubSaved();
    };
  }, [user]);

  // ─── Derived Data ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let totalBounty = 0, urgentCount = 0, todayCount = 0;
    feedTasks.forEach(t => {
      totalBounty += t.bounty || 0;
      if (t.priorityLevel === 'urgent' || t.priorityLevel === 'critical' || t.isEmergency) urgentCount++;
      const created = parseDate(t.createdAt);
      if (created && created >= today) todayCount++;
    });
    return { totalBounty, urgentCount, todayCount, totalTasks: feedTasks.length };
  }, [feedTasks]);

  const hotOpportunities = useMemo(() => {
    return [...feedTasks]
      .filter(t => t.isPinned)
      .map(t => ({ ...t, score: (t.bounty || 0) * 2 + (t.bidsCount || 0) * 10 + (t.followsCount || 0) * 5 +
        ((t.priorityLevel === 'critical' || t.isEmergency) ? 500 : t.priorityLevel === 'urgent' ? 200 : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Showing up to 8 pinned tasks in the carousel
  }, [feedTasks]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.bountyMin > 0 || filters.bountyMax < 100000) c++;
    if (filters.parcelTypes.length > 0) c++;
    if (filters.weightMin > 0 || filters.weightMax < 1000) c++;
    if (filters.deadlineFrom || filters.deadlineTo) c++;
    if (filters.priorityLevels.length > 0) c++;
    return c;
  }, [filters]);

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = feedTasks;
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.location && t.location.toLowerCase().includes(q)));
    }
    // Location
    if (locationFilter === 'custom' && customLocation.trim()) {
      filtered = filtered.filter(t => t.location && t.location.toLowerCase().includes(customLocation.toLowerCase()));
    }
    // Advanced filters
    if (filters.bountyMin > 0 || filters.bountyMax < 100000) filtered = filtered.filter(t => { const b = t.bounty || 0; return b >= filters.bountyMin && b <= filters.bountyMax; });
    if (filters.parcelTypes.length > 0) filtered = filtered.filter(t => t.parcelType && filters.parcelTypes.includes(t.parcelType));
    if (filters.weightMin > 0 || filters.weightMax < 1000) filtered = filtered.filter(t => { const w = t.weight || 0; return w >= filters.weightMin && w <= filters.weightMax; });
    if (filters.priorityLevels.length > 0) filtered = filtered.filter(t => t.priorityLevel && filters.priorityLevels.includes(t.priorityLevel));
    if (filters.deadlineFrom) { const from = new Date(filters.deadlineFrom).getTime(); filtered = filtered.filter(t => { const d = parseDate(t.deadline); return d && d.getTime() >= from; }); }
    if (filters.deadlineTo) { const to = new Date(filters.deadlineTo).getTime(); filtered = filtered.filter(t => { const d = parseDate(t.deadline); return d && d.getTime() <= to; }); }

    // Tab-based pre-filter
    switch (activeTab) {
      case 'high_paying': filtered = [...filtered].sort((a, b) => (b.bounty || 0) - (a.bounty || 0)); break;
      case 'urgent': filtered = filtered.filter(t => t.priorityLevel === 'urgent' || t.priorityLevel === 'critical' || t.isEmergency); break;
      case 'new': filtered = [...filtered].sort((a, b) => { const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0; const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0; return tB - tA; }); break;
      case 'nearby': if (locationFilter === 'all') filtered = filtered.filter(t => !!t.location); break;
      case 'for_you': default: break;
    }

    // Sort (for_you and tabs that don't override)
    if (activeTab === 'for_you' || activeTab === 'nearby') {
      return [...filtered].sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        switch (feedSort) {
          case 'newest': return tB - tA;
          case 'bounty': return (b.bounty || 0) - (a.bounty || 0);
          case 'ending_soon': { const dA = parseDate(a.deadline)?.getTime() || Infinity; const dB = parseDate(b.deadline)?.getTime() || Infinity; return dA - dB; }
          case 'more_time': { const dA = parseDate(a.deadline)?.getTime() || 0; const dB = parseDate(b.deadline)?.getTime() || 0; return dB - dA; }
          case 'top_rated': return (b.reactionCount || 0) - (a.reactionCount || 0);
          case 'trending': return ((b.bidsCount||0)+(b.followsCount||0)+(b.viewsCount||0)) - ((a.bidsCount||0)+(a.followsCount||0)+(a.viewsCount||0));
          default: return tB - tA;
        }
      });
    }
    return filtered;
  }, [feedTasks, feedSort, searchQuery, locationFilter, customLocation, filters, activeTab]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleLike = useCallback(async (taskId: string) => {
    try { await updateDoc(doc(db, 'tasks', taskId), { reactionCount: increment(1) }); } catch (e) { console.error(e); }
  }, []);

  const handleApply = useCallback(async (taskId: string) => {
    if (!user) { toast.error('You must be signed in to apply.'); return; }
    if (!isVerifiedCarrier) { toast.error('Verified Carrier status required to bid.'); return; }
    setApplyingId(taskId);
    try {
      const existing = await getDocs(query(collection(db, 'applications'), where('taskId', '==', taskId), where('userId', '==', user.uid)));
      if (!existing.empty) { toast.error('Already applied.'); setAppliedIds(p => new Set(p).add(taskId)); return; }
      await addDoc(collection(db, 'applications'), { taskId, userId: user.uid, status: 'pending', createdAt: serverTimestamp() });
      setAppliedIds(p => new Set(p).add(taskId));
      toast.success('Bid submitted! Awaiting approval. 📡');
    } catch (e) { toast.error('Error submitting bid.'); } finally { setApplyingId(null); }
  }, [user, isVerifiedCarrier]);

  const handleAction = useCallback(async (action: string, task: TaskData) => {
    if (!user) { toast.error('Sign in required.'); return; }
    if (action === 'join_queue') {
      if (!isVerifiedCarrier) { toast.error('Verified Carrier status required to join backup queue.'); return; }
      setApplyingId(task.id);
      const res = await joinTaskQueue(task.id, user.uid);
      setApplyingId(null);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } else if (action === 'leave_queue') {
      const res = await leaveTaskQueue(task.id, user.uid);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    } else if (action === 'drop_task') {
      const res = await dropTaskAndPromoteQueue(task.id, user.uid);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    } else if (action === 'save') {
      const res = await toggleSaveTask(task.id, user.uid);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    } else if (action === 'follow') {
      const res = await toggleFollowTask(task.id, user.uid);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    }
  }, [user, isVerifiedCarrier]);

  const handleLoadMore = useCallback(async () => { setLoadingMore(true); await loadMoreTasks(); setLoadingMore(false); }, [loadMoreTasks]);
  const handleRefresh = useCallback(async () => { setRefreshing(true); await refreshFeed(); setRefreshing(false); }, [refreshFeed]);
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); toast.success('Filters cleared'); };
  const toggleParcelType = (t: ParcelType) => setFilters(p => ({ ...p, parcelTypes: p.parcelTypes.includes(t) ? p.parcelTypes.filter(x => x !== t) : [...p.parcelTypes, t] }));
  const togglePriority = (l: PriorityLevel) => setFilters(p => ({ ...p, priorityLevels: p.priorityLevels.includes(l) ? p.priorityLevels.filter(x => x !== l) : [...p.priorityLevels, l] }));

  const currentSort = SORT_OPTIONS.find(s => s.id === feedSort) || SORT_OPTIONS[0];

  // ─── Loading ───────────────────────────────────────────────────
  if (feedLoading && feedTasks.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 pt-24 pb-8 lg:pt-28">
        <div className="grid grid-cols-3 gap-3 mb-6">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
        <div className="h-14 bg-slate-100 rounded-2xl animate-pulse mb-4" />
        {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse mb-4" />)}
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 pt-24 pb-8 lg:pt-28 lg:pb-12">

      {/* ══════════ ACTIVITY STRIP ══════════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3 mb-5">
        {[
          { label: 'Tasks Today', value: stats.todayCount, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Total Bounty', value: `₹${stats.totalBounty.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Urgent Tasks', value: stats.urgentCount, icon: Flame, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
          { label: 'Live Tasks', value: stats.totalTasks, icon: Activity, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
        ].map((s, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 lg:p-4 rounded-2xl border ${s.bg} ${i === 3 ? 'hidden lg:flex' : ''}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color} bg-white/80 shadow-sm shrink-0`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg lg:text-xl font-black text-slate-900 leading-none truncate">{s.value}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ══════════ MAIN LAYOUT: Feed + Right Panel ══════════ */}
      <div className="flex gap-6 items-start">
        {/* LEFT: Feed Column */}
        <div className="flex-1 min-w-0">

          {/* ══════════ CONTROL BAR ══════════ */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-md shadow-slate-100/50 border border-slate-100 mb-4 sticky top-20 lg:top-24 z-40">
            <div className="flex items-center gap-1.5 p-2 flex-wrap">
              {/* Sort */}
              <Dropdown isOpen={sortOpen} onToggle={() => { setSortOpen(!sortOpen); setLocationOpen(false); setActionsOpen(false); }} onClose={() => setSortOpen(false)}
                trigger={
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition-all whitespace-nowrap">
                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />
                    <span className="hidden sm:inline">{currentSort.label}</span><span className="sm:hidden">Sort</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                  </button>
                }>
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                  <div className="p-2.5 border-b border-slate-100"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sort By</p></div>
                  <div className="p-1">
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt.id} onClick={() => { setFeedSort(opt.id); setSortOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition-all ${feedSort === opt.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <opt.icon className={`w-3.5 h-3.5 ${feedSort === opt.id ? 'text-blue-500' : 'text-slate-400'}`} />
                        {opt.label}
                        {feedSort === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              </Dropdown>

              {/* Location */}
              <Dropdown isOpen={locationOpen} onToggle={() => { setLocationOpen(!locationOpen); setSortOpen(false); setActionsOpen(false); }} onClose={() => setLocationOpen(false)}
                trigger={
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition-all whitespace-nowrap">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="hidden sm:inline">{LOCATION_OPTIONS.find(l => l.id === locationFilter)?.label}</span><span className="sm:hidden">Location</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${locationOpen ? 'rotate-180' : ''}`} />
                  </button>
                }>
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                  <div className="p-1">
                    {LOCATION_OPTIONS.map(opt => (
                      <button key={opt.id} onClick={() => { setLocationFilter(opt.id); if (opt.id !== 'custom') setLocationOpen(false); if (opt.id === 'near_me' || opt.id === 'same_city') toast.info('Coming soon!'); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition-all ${locationFilter === opt.id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <MapPin className={`w-3.5 h-3.5 ${locationFilter === opt.id ? 'text-emerald-500' : 'text-slate-400'}`} />
                        {opt.label}
                      </button>
                    ))}
                    {locationFilter === 'custom' && (
                      <div className="px-3 py-2">
                        <input type="text" placeholder="Search location..." value={customLocation} onChange={e => setCustomLocation(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" autoFocus />
                      </div>
                    )}
                  </div>
                </div>
              </Dropdown>

              {/* Filters */}
              <button onClick={() => { setShowFilters(true); setSortOpen(false); setLocationOpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap ${activeFilterCount > 0 ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && <span className="bg-violet-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
              </button>

              <div className="flex-1" />

              {/* Quick Actions */}
              <Dropdown isOpen={actionsOpen} onToggle={() => { setActionsOpen(!actionsOpen); setSortOpen(false); setLocationOpen(false); }} onClose={() => setActionsOpen(false)}
                trigger={
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-md">
                    <Plus className="w-3.5 h-3.5" /> Actions <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                }>
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden min-w-[200px] right-0 left-auto" style={{ right: 0, left: 'auto' }}>
                  <div className="p-1">
                    {[
                      { label: 'Post Task', icon: Plus, href: '/post', color: 'text-blue-600' },
                      { label: 'My Bids', icon: Zap, href: '/profile', color: 'text-emerald-600' },
                      { label: 'Saved Tasks', icon: Bookmark, href: '#', color: 'text-amber-600' },
                    ].map(a => (
                      <a key={a.label} href={a.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-all">
                        <a.icon className={`w-4 h-4 ${a.color}`} /> {a.label}
                      </a>
                    ))}
                  </div>
                </div>
              </Dropdown>

              {/* Refresh */}
              <Button variant="signature" size="icon" onClick={handleRefresh} disabled={refreshing}
                className="h-9 w-9 shrink-0 rounded-xl shadow-md shadow-blue-100">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Search */}
            <div className="px-2 pb-2">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <input type="text" placeholder="Search tasks, locations, keywords..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl border border-transparent focus:border-blue-200 text-slate-900 placeholder-slate-400 text-xs transition-all outline-none" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          </div>

          {/* ══════════ HOT OPPORTUNITIES ══════════ */}
          {hotOpportunities.length > 0 && activeTab === 'for_you' && !searchQuery && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center"><Flame className="w-3.5 h-3.5 text-white" /></span>
                  Hot Opportunities
                </h2>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top picks</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hotOpportunities.map((task) => (
                  <TaskCard key={task.id} task={task} variant="featured" showApplyButton={!!user && isVerifiedCarrier}
                    showFollowButton={!!user} onLike={handleLike} onApply={handleApply} onAction={handleAction}
                    isApplying={applyingId === task.id} hasApplied={appliedIds.has(task.id)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ══════════ TAB BAR ══════════ */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══════════ RESULTS HEADER ══════════ */}
          <div className="flex items-center justify-between mb-3 px-0.5">
            <p className="text-[11px] font-semibold text-slate-400">
              {filteredAndSortedTasks.length} result{filteredAndSortedTasks.length !== 1 ? 's' : ''}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="text-[11px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>

          {/* ══════════ FEED ══════════ */}
          {filteredAndSortedTasks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 relative">
                <div className="absolute inset-0 border border-slate-200 rounded-full animate-spin border-dashed" style={{ animationDuration: '10s' }} />
                <Package className="w-7 h-7 text-slate-300" />
              </div>
              <h2 className="text-lg font-heading font-black text-slate-900 mb-1">No Tasks Found</h2>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Try adjusting your filters or search query.</p>
              {activeFilterCount > 0 && <Button onClick={resetFilters} variant="outline" className="mt-4 rounded-xl text-sm">Clear Filters</Button>}
            </motion.div>
          ) : (
            <div className="pb-20">
              <TaskList tasks={filteredAndSortedTasks} showApply={!!user && isVerifiedCarrier} showFollow={!!user}
                onLike={handleLike} onApply={handleApply} onAction={handleAction} applyingId={applyingId} appliedIds={appliedIds} />
              {feedHasMore && (
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-8 text-center">
                  <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline"
                    className="h-12 px-6 rounded-xl border-slate-200 text-slate-500 font-bold text-sm">
                    {loadingMore ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</> : <>Load More <ChevronRight className="w-4 h-4 ml-1" /></>}
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* ══════════ RIGHT PANEL (Desktop) ══════════ */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-28 space-y-4">
          {/* User Stats Card */}
          {user ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/20" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                    {profile?.displayName?.[0] || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{profile?.displayName}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {isVerifiedCarrier ? '✓ Verified Carrier' : 'Standard'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Active Bids', value: userStats.bids, icon: Zap, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Completed', value: userStats.completed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Following', value: userStats.following, icon: Eye, color: 'text-violet-600 bg-violet-50' },
                  { label: 'Saved', value: userStats.saved, icon: Bookmark, color: 'text-amber-600 bg-amber-50' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.color} shrink-0`}>
                      <s.icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-none">{s.value}</p>
                      <p className="text-[9px] text-slate-400 font-semibold">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href="/post" className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md">
                <Plus className="w-3.5 h-3.5" /> Post a Task
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-sm text-slate-900 mb-1">Sign in to bid</p>
              <p className="text-xs text-slate-400 mb-4">Access the full marketplace experience</p>
              <a href="/auth/signin" className="block py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all text-center">Sign In</a>
            </div>
          )}

          {/* Live Activity */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>
              Live Activity
            </h3>
            <div className="space-y-2.5">
              {feedTasks.slice(0, 4).map((t, i) => (
                <div key={t.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    {i === 0 ? '🔥' : i === 1 ? '⚡' : i === 2 ? '📦' : '🎯'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-700 font-medium truncate">{t.title}</p>
                    <p className="text-slate-400 text-[10px]">{t.bidsCount || 0} bids · {t.bounty ? `₹${t.bounty}` : 'No bounty'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification CTA */}
          {user && !isVerifiedCarrier && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-amber-900">Get Verified</h3>
              </div>
              <p className="text-[11px] text-amber-700/80 mb-3">Unlock bidding and earn trust from task posters.</p>
              <a href="/profile" className="block py-2 bg-white hover:bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold transition-all text-center">
                Start Verification
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ══════════ FILTERS DRAWER ══════════ */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white z-50 shadow-2xl overflow-y-auto
                         max-sm:top-auto max-sm:bottom-0 max-sm:h-[85vh] max-sm:rounded-t-3xl">
              <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full" /></div>
              <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-violet-100 text-violet-600 flex items-center justify-center rounded-lg"><SlidersHorizontal className="w-4 h-4" /></div>
                  <h2 className="font-heading font-bold text-base text-slate-900">Filters</h2>
                </div>
                <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <div className="p-4 space-y-6">
                {/* Bounty */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" />Bounty Range</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div><label className="text-[10px] text-slate-400 mb-1 block">Min (₹)</label>
                      <input type="number" min="0" value={filters.bountyMin} onChange={e => setFilters(p => ({ ...p, bountyMin: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div><label className="text-[10px] text-slate-400 mb-1 block">Max (₹)</label>
                      <input type="number" min="0" value={filters.bountyMax} onChange={e => setFilters(p => ({ ...p, bountyMax: parseInt(e.target.value) || 100000 }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                </div>
                {/* Priority */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" />Priority</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {(['standard','priority','urgent','critical'] as PriorityLevel[]).map(l => {
                      const sel = filters.priorityLevels.includes(l);
                      const cm: Record<string,string> = { standard:'border-slate-200 bg-slate-50 text-slate-600', priority:'border-blue-200 bg-blue-50 text-blue-700', urgent:'border-amber-300 bg-amber-50 text-amber-700', critical:'border-red-400 bg-red-50 text-red-700' };
                      return <button key={l} onClick={() => togglePriority(l)} className={`px-3 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${sel ? `${cm[l]} ring-2 ring-offset-1 ring-current` : 'border-slate-200 bg-white text-slate-500'}`}>{l}</button>;
                    })}
                  </div>
                </div>
                {/* Parcel */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-violet-500" />Parcel Type</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {(['document','fragile','food','other'] as ParcelType[]).map(t => {
                      const sel = filters.parcelTypes.includes(t); const em: Record<string,string> = { document:'📄',fragile:'🫧',food:'🍱',other:'📦' };
                      return <button key={t} onClick={() => toggleParcelType(t)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${sel ? 'border-violet-300 bg-violet-50 text-violet-700 ring-2 ring-offset-1 ring-violet-300' : 'border-slate-200 bg-white text-slate-500'}`}>{em[t]} {t}</button>;
                    })}
                  </div>
                </div>
                {/* Weight */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Weight className="w-4 h-4 text-slate-500" />Weight (kg)</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div><label className="text-[10px] text-slate-400 mb-1 block">Min</label><input type="number" min="0" step="0.5" value={filters.weightMin} onChange={e => setFilters(p => ({ ...p, weightMin: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" /></div>
                    <div><label className="text-[10px] text-slate-400 mb-1 block">Max</label><input type="number" min="0" step="0.5" value={filters.weightMax} onChange={e => setFilters(p => ({ ...p, weightMax: parseFloat(e.target.value) || 1000 }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" /></div>
                  </div>
                </div>
                {/* Deadline */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" />Deadline</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div><label className="text-[10px] text-slate-400 mb-1 block">From</label><input type="date" value={filters.deadlineFrom} onChange={e => setFilters(p => ({ ...p, deadlineFrom: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" /></div>
                    <div><label className="text-[10px] text-slate-400 mb-1 block">To</label><input type="date" value={filters.deadlineTo} onChange={e => setFilters(p => ({ ...p, deadlineTo: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" /></div>
                  </div>
                </div>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3">
                <Button variant="outline" onClick={resetFilters} className="flex-1 h-11 rounded-xl text-sm font-semibold">Reset</Button>
                <Button variant="signature" onClick={() => setShowFilters(false)} className="flex-1 h-11 rounded-xl text-sm font-semibold">
                  Apply {activeFilterCount > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{activeFilterCount}</span>}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
