'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, SlidersHorizontal, ArrowUpDown, MapPin, 
  RefreshCw, ChevronDown, CheckCircle2, ChevronRight,
  Package, Loader2, Shield, Plus, Zap, Timer, 
  TrendingUp, DollarSign, Star, Weight, Calendar, Bookmark, BarChart3, Activity, Flame, Eye, Users, FileText, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { joinTaskQueue, leaveTaskQueue, dropTaskAndPromoteQueue } from '@/lib/services/queue-service';
import { toggleSaveTask, toggleFollowTask } from '@/lib/services/interaction-service';
import { useAuth } from '@/lib/auth-context';
import { useDataCache } from '@/lib/data-cache';
import { TaskCard, TaskData, PriorityLevel, ParcelType, parseDate } from '@/components/task-card';
import { TaskList } from '@/components/task-list';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

// ─── Constants ──────────────────────────────────────────────────
const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First', icon: Timer },
  { id: 'bounty', label: 'Highest Bounty', icon: DollarSign },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'top_rated', label: 'Top Rated', icon: Star },
  { id: 'ending_soon', label: 'Ending Soon', icon: Bookmark },
];

const LOCATION_OPTIONS = [
  { id: 'all', label: 'All Locations' },
  { id: 'near_me', label: 'Near Me (GPS)' },
  { id: 'same_city', label: 'My City' },
  { id: 'custom', label: 'Custom Search' },
];

function Clock(props: any) { return <Timer {...props} />; }

// ─── Dropdown Component ──────────────────────────────────────────
function Dropdown({ trigger, children, isOpen, onToggle, onClose, className = "" }: any) {
  useEffect(() => {
    if (!isOpen) return;
    const click = () => onClose();
    window.addEventListener('click', click);
    return () => window.removeEventListener('click', click);
  }, [isOpen, onClose]);

  return (
    <div className={`relative ${className}`} onClick={e => e.stopPropagation()}>
      <div onClick={onToggle}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 z-50 min-w-[220px]">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function FeedPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { feedTasks, pinnedTasks, feedLoading, feedHasMore, loadMoreTasks, refreshFeed } = useDataCache();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [activeTab, setActiveTab] = useState('for_you');
  const [feedSort, setFeedSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [customLocation, setCustomLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [sortOpen, setSortOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const [filters, setFilters] = useState({
    bountyMin: 0,
    bountyMax: 100000,
    priorityLevels: [] as PriorityLevel[],
    parcelTypes: [] as ParcelType[],
    weightMin: 0,
    weightMax: 1000,
    deadlineFrom: '',
    deadlineTo: '',
  });

  const isVerifiedCarrier = profile?.isVerifiedCarrier || profile?.role === 'admin' || profile?.role === 'PRIME_ADMIN';

  // Stats for Activity Strip
  const stats = useMemo(() => {
    let totalBounty = 0;
    let urgentCount = 0;
    let todayCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    feedTasks.forEach(t => {
      totalBounty += (t.bounty || 0);
      if (t.isEmergency || t.priorityLevel === 'urgent' || t.priorityLevel === 'critical') urgentCount++;
      const cDate = parseDate(t.createdAt);
      if (cDate && cDate >= today) todayCount++;
    });

    return { totalBounty, urgentCount, todayCount, totalTasks: feedTasks.length };
  }, [feedTasks]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.bountyMin > 0 || filters.bountyMax < 100000) c++;
    if (filters.priorityLevels.length > 0) c++;
    if (filters.parcelTypes.length > 0) c++;
    if (filters.weightMin > 0 || filters.weightMax < 1000) c++;
    if (filters.deadlineFrom || filters.deadlineTo) c++;
    return c;
  }, [filters]);

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...feedTasks];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q));
    }

    // Tab Filters
    if (activeTab === 'urgent') filtered = filtered.filter(t => t.priorityLevel === 'urgent' || t.priorityLevel === 'critical' || t.isEmergency);
    if (activeTab === 'high_paying') filtered = filtered.filter(t => (t.bounty || 0) >= 1000);
    if (activeTab === 'new') {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        filtered = filtered.filter(t => {
            const d = parseDate(t.createdAt);
            return d && d >= twoHoursAgo;
        });
    }

    // Sidebar/Advanced Filters
    if (filters.bountyMin > 0) filtered = filtered.filter(t => (t.bounty || 0) >= filters.bountyMin);
    if (filters.bountyMax < 100000) filtered = filtered.filter(t => (t.bounty || 0) <= filters.bountyMax);
    if (filters.priorityLevels.length > 0) filtered = filtered.filter(t => t.priorityLevel && filters.priorityLevels.includes(t.priorityLevel));
    if (filters.parcelTypes.length > 0) filtered = filtered.filter(t => t.parcelType && filters.parcelTypes.includes(t.parcelType));

    // Sort
    if (activeTab === 'for_you' || activeTab === 'nearby') {
      return [...filtered].sort((a, b) => {
        const isAHero = a.isEmergency || a.priorityLevel === 'critical';
        const isBHero = b.isEmergency || b.priorityLevel === 'critical';
        if (isAHero && !isBHero) return -1;
        if (!isAHero && isBHero) return 1;
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.priorityLevel === 'urgent' && b.priorityLevel !== 'urgent') return -1;
        if (a.priorityLevel !== 'urgent' && b.priorityLevel === 'urgent') return 1;

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
  }, [feedTasks, activeTab, feedSort, searchQuery, filters]);

  const userStats = useMemo(() => {
    if (!user || !profile) return { bids: 0, completed: 0, following: 0, saved: 0 };
    return {
      bids: profile.activeBidsCount || 0,
      completed: profile.completedTasksCount || 0,
      following: profile.followingCount || 0,
      saved: profile.savedCount || 0
    };
  }, [user, profile]);

  const handleLike = (id: string) => { /* already handled in taskcard */ };

  const handleApply = async (id: string) => {
    if (!user) { toast.error('Please sign in to bid'); return; }
    if (!isVerifiedCarrier) { toast.error('Verification required for bidding'); return; }
    setApplyingId(id);
    try {
      await joinTaskQueue(id, user.uid);
      setAppliedIds(prev => new Set(prev).add(id));
      toast.success('Bid placed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to place bid');
    } finally {
      setApplyingId(null);
    }
  };

  const handleAction = useCallback(async (action: string, task: TaskData) => {
    if (!user) { toast.error('Auth required'); return; }
    try {
      if (action === 'save') await toggleSaveTask(task.id, user.uid);
      else if (action === 'follow') await toggleFollowTask(task.id, user.uid);
      else if (action === 'join_queue') await joinTaskQueue(task.id, user.uid);
      else if (action === 'leave_queue') await leaveTaskQueue(task.id, user.uid);
      else if (action === 'drop_task') await dropTaskAndPromoteQueue(task.id, user.uid);
      else if (action === 'pin') await updateDoc(doc(db, 'tasks', task.id), { isPinned: !task.isPinned });
      else if (action === 'emergency') await updateDoc(doc(db, 'tasks', task.id), { priorityLevel: task.priorityLevel === 'critical' ? 'standard' : 'critical', isEmergency: !task.isEmergency });
      else if (action === 'delete') { if (confirm('Permanently delete this mission?')) await deleteDoc(doc(db, 'tasks', task.id)); }
      else if (action === 'edit') router.push(`/post/edit/${task.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  }, [user, router]);

  const handleLoadMore = useCallback(async () => { setLoadingMore(true); await loadMoreTasks(); setLoadingMore(false); }, [loadMoreTasks]);
  const handleRefresh = useCallback(async () => { setRefreshing(true); await refreshFeed(); setRefreshing(false); }, [refreshFeed]);

  const resetFilters = () => setFilters({ bountyMin:0, bountyMax:100000, priorityLevels:[], parcelTypes:[], weightMin:0, weightMax:1000, deadlineFrom:'', deadlineTo:'' });
  const togglePriority = (l: PriorityLevel) => setFilters(p => ({ ...p, priorityLevels: p.priorityLevels.includes(l) ? p.priorityLevels.filter(x=>x!==l) : [...p.priorityLevels, l] }));
  const toggleParcelType = (t: ParcelType) => setFilters(p => ({ ...p, parcelTypes: p.parcelTypes.includes(t) ? p.parcelTypes.filter(x=>x!==t) : [...p.parcelTypes, t] }));

  const currentSort = SORT_OPTIONS.find(o => o.id === feedSort) || SORT_OPTIONS[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[url('/BACKGROUND.png')] bg-fixed bg-cover bg-center">
      <div className="max-w-[1400px] mx-auto px-4 pt-[72px] pb-8 lg:pt-28 lg:pb-12 text-slate-900">
        <h1 className="sr-only">PocketPost Marketplace</h1>

        {/* ══════════ FIELD OPS HEADLINE ══════════ */}
        <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter leading-none">Marketplace Intel</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               Live Deployment Stream
            </p>
          </div>
          <button onClick={handleRefresh} className="flex h-10 px-4 bg-white border border-slate-100 rounded-xl shadow-sm items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-95 group">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
            <span className="hidden sm:inline">Refresh Intel</span>
          </button>
        </div>

        {/* ══════════ OPERATIONS PULSE ══════════ */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Ops Today', value: stats.todayCount, color: 'text-blue-600', bg: 'bg-blue-50/50' },
            { label: 'Active Pot', value: `₹${(stats.totalBounty/1000).toFixed(1)}k`, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
            { label: 'Critical', value: stats.urgentCount, color: 'text-red-600', bg: 'bg-red-50/50' },
            { label: 'Live Intel', value: stats.totalTasks, color: 'text-violet-600', bg: 'bg-violet-50/50' },
          ].map((s, i) => (
            <div key={i} className={`p-2.5 rounded-xl ${s.bg} border border-white/60 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:border-slate-200`}>
               <span className={`text-base font-black tracking-tight ${s.color}`}>{s.value}</span>
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</span>
            </div>
          ))}
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            {/* ══════════ CONTROL BAR ══════════ */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-100 mb-4 sticky top-20 lg:top-24 z-40">
              <div className="flex items-center gap-2 p-1.5 flex-wrap md:flex-nowrap">
                <div className="relative flex-1 group min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                  <input type="text" placeholder="Search operational intel..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 bg-slate-50 border border-transparent focus:border-blue-100 rounded-xl text-slate-900 font-bold placeholder-slate-400 text-xs outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-50/50" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-md transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <Dropdown isOpen={sortOpen} onToggle={() => { setSortOpen(!sortOpen); setLocationOpen(false); setActionsOpen(false); }} onClose={() => setSortOpen(false)}
                    trigger={<button className="flex items-center gap-2 h-10 px-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-[11px] font-black text-slate-600 transition-all active:scale-95 uppercase tracking-wide"><ArrowUpDown className="w-4 h-4 text-blue-500" /><span className="hidden sm:inline">{currentSort.label}</span></button>}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"><div className="p-3 border-b border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sort Matrix</p></div><div className="p-1.5">{SORT_OPTIONS.map(opt => (<button key={opt.id} onClick={() => { setFeedSort(opt.id); setSortOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition-all ${feedSort === opt.id ? 'bg-blue-50 text-blue-700 font-black' : 'text-slate-600 font-bold hover:bg-slate-50'}`}><opt.icon className={`w-4 h-4 ${feedSort === opt.id ? 'text-blue-500' : 'text-slate-400'}`} />{opt.label}</button>))}</div></div>
                  </Dropdown>

                  <Dropdown isOpen={locationOpen} onToggle={() => { setLocationOpen(!locationOpen); setSortOpen(false); setActionsOpen(false); }} onClose={() => setLocationOpen(false)}
                    trigger={<button className="flex items-center gap-2 h-10 px-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-[11px] font-black text-slate-600 transition-all active:scale-95 uppercase tracking-wide"><MapPin className="w-4 h-4 text-emerald-500" /><span className="hidden sm:inline">Deployment</span></button>}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden min-w-[200px]"><div className="p-3 border-b border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location Filter</p></div><div className="p-1.5">{LOCATION_OPTIONS.map(opt => (<button key={opt.id} onClick={() => { setLocationFilter(opt.id); if (opt.id !== 'custom') setLocationOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition-all ${locationFilter === opt.id ? 'bg-emerald-50 text-emerald-700 font-black' : 'text-slate-600 font-bold hover:bg-slate-50'}`}><MapPin className={`w-4 h-4 ${locationFilter === opt.id ? 'text-emerald-500' : 'text-slate-400'}`} />{opt.label}</button>))}</div></div>
                  </Dropdown>

                  <button onClick={() => setShowFilters(true)} className={`flex items-center gap-2 h-10 px-3.5 rounded-xl border text-[11px] font-black transition-all active:scale-95 uppercase tracking-wide ${activeFilterCount > 0 ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600'}`}>
                    <SlidersHorizontal className="w-4 h-4 text-violet-500" />
                    <span className="hidden sm:inline">Parameters</span>
                    {activeFilterCount > 0 && <span className="bg-violet-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1">{activeFilterCount}</span>}
                  </button>

                  <div className="w-px h-6 bg-slate-200/60 mx-1" />
                  <button onClick={handleRefresh} disabled={refreshing} className="h-10 w-10 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md active:scale-90 transition-all group">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* ══════════ MOBILE RESULTS COUNTER ══════════ */}
            <div className="flex items-center justify-between mb-3 px-1 md:hidden">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                {filteredAndSortedTasks.length} Operations Found
              </span>
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/50">
                Live Feed
              </span>
            </div>

            {/* ══════════ OPERATION TABS ══════════ */}
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-0.5 mt-0.5 px-0.5">
              {[
                { id: 'for_you', label: 'Intelligence', icon: Star },
                { id: 'nearby', label: 'Local', icon: MapPin },
                { id: 'high_paying', label: 'High Yield', icon: DollarSign },
                { id: 'urgent', label: 'Crisis', icon: Flame },
                { id: 'new', label: 'Latest', icon: Timer },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap shadow-sm active:scale-95 ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                  }`}>
                  <tab.icon className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${activeTab === tab.id ? 'fill-white/20' : ''}`} /> 
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ══════════ COMMAND INSIGHT: MISSION CAROUSEL ══════════ */}
            {pinnedTasks.length > 0 && activeTab === 'for_you' && !searchQuery && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Command Briefing</h2>
                  </div>
                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-widest">
                    {pinnedTasks.length} Active Missions
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                   {/* Main Feature */}
                   <TaskCard 
                      task={pinnedTasks[0]} 
                      variant="featured" 
                      showApplyButton={!!user && isVerifiedCarrier} 
                      showFollowButton={!!user} 
                      onLike={handleLike} 
                      onApply={handleApply} 
                      onAction={handleAction} 
                      isApplying={applyingId === pinnedTasks[0].id} 
                      hasApplied={appliedIds.has(pinnedTasks[0].id)} 
                   />

                   {/* Secondary Quick Briefs (Horizontal on Mobile) */}
                   {pinnedTasks.length > 1 && (
                     <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                       {pinnedTasks.slice(1, 6).map((task) => (
                         <div key={task.id} className="min-w-[280px] sm:min-w-0 sm:flex-1">
                           <TaskCard 
                             task={task} 
                             showApplyButton={!!user && isVerifiedCarrier} 
                             showFollowButton={!!user} 
                             onLike={handleLike} 
                             onApply={handleApply} 
                             onAction={handleAction} 
                             isApplying={applyingId === task.id} 
                             hasApplied={appliedIds.has(task.id)} 
                           />
                         </div>
                       ))}
                       {pinnedTasks.length > 6 && (
                         <button 
                           className="shrink-0 w-32 rounded-2xl bg-white/50 border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-white hover:text-blue-600 transition-all active:scale-95"
                           onClick={() => setFeedSort('newest')}
                         >
                           <ChevronRight className="w-5 h-5 text-blue-500" />
                           View All
                         </button>
                       )}
                     </div>
                   )}
                </div>
              </motion.div>
            )}

            {/* ══════════ FEED ══════════ */}
            {filteredAndSortedTasks.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h2 className="text-sm font-black text-slate-900 mb-1">No Missions Found</h2>
                <p className="text-xs text-slate-400">Try adjusting your filters or search query.</p>
              </motion.div>
            ) : (
              <div className="pb-20">
                <TaskList tasks={filteredAndSortedTasks} showApply={!!user && isVerifiedCarrier} showFollow={!!user} onLike={handleLike} onApply={handleApply} onAction={handleAction} applyingId={applyingId} appliedIds={appliedIds} />
                {feedHasMore && (
                  <div className="mt-8 text-center">
                    <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline" className="h-10 px-6 rounded-xl border-slate-200 text-slate-500 font-bold text-xs">{loadingMore ? 'Loading...' : 'Load More'}</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══════════ SIDEBAR: OPERATIVE HUB ══════════ */}
          <div className="hidden lg:block w-70 xl:w-80 shrink-0 sticky top-28 h-fit">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 p-5 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/5 blur-3xl rounded-full" />
              {user ? (
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                      {profile?.photoURL ? (<img src={profile.photoURL} alt="" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white shadow-md" />) : (<div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">{profile?.displayName?.[0] || '?'}</div>)}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 leading-tight truncate">{profile?.displayName}</p>
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{isVerifiedCarrier ? 'Verified Operative' : 'Standard User'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {[
                      { label: 'Active Bids', value: userStats.bids, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50/50' },
                      { label: 'Completed', value: userStats.completed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
                      { label: 'Watching', value: userStats.following, icon: Eye, color: 'text-violet-500', bg: 'bg-violet-50/50' },
                      { label: 'Saved', value: userStats.saved, icon: Bookmark, color: 'text-amber-500', bg: 'bg-amber-50/50' },
                    ].map((s, i) => (
                      <div key={i} className={`flex flex-col gap-1 p-2.5 rounded-2xl ${s.bg} border border-white/60 transition-all hover:scale-[1.02]`}>
                        <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                        <p className="text-base font-black text-slate-900 leading-none">{s.value}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity className="w-3 h-3 text-emerald-500" />Live Pulse</h3>
                    <div className="space-y-3">
                      {feedTasks.slice(0, 3).map(t => (
                        <div key={t.id} className="flex gap-3 group cursor-pointer"><div className="w-2 h-2 rounded-full bg-slate-200 mt-1.5 shrink-0 group-hover:bg-blue-400" /><div className="min-w-0"><p className="text-[11px] font-bold text-slate-700 truncate leading-tight group-hover:text-blue-600">{t.title}</p><p className="text-[9px] text-slate-400 font-medium mt-0.5">{t.bidsCount || 0} bids · ₹{t.bounty || 0}</p></div></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Shield className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                  <p className="font-black text-slate-900 mb-1">Authorization Required</p>
                  <a href="/auth/signin" className="block w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg mt-4">Sign In</a>
                </div>
              )}
            </div>
            {user && !isVerifiedCarrier && (
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2.5rem] p-4 text-white shadow-xl shadow-amber-200/50 relative overflow-hidden group mt-4">
                 <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150" />
                 <div className="relative z-10"><Shield className="w-5 h-5 mb-2 opacity-80" /><h3 className="text-sm font-black mb-1">Verification</h3><p className="text-[10px] text-white/80 leading-relaxed mb-3">Gain priority access to high-bounty missions.</p><a href="/profile" className="block w-full py-2 bg-white text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg">Start now</a></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFilters(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-white z-[110] shadow-2xl flex flex-col pt-safe pb-safe">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div><h2 className="text-lg font-black text-slate-900">Mission Parameters</h2><p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">Tune your feed</p></div>
                <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)} className="rounded-xl h-10 w-10 bg-slate-50 hover:bg-slate-100"><X className="w-5 h-5" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    Bounty Range (₹)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Minimum</label>
                      <input type="number" value={filters.bountyMin} onChange={e => setFilters(p => ({ ...p, bountyMin: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-200 transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Maximum</label>
                      <input type="number" value={filters.bountyMax} onChange={e => setFilters(p => ({ ...p, bountyMax: parseInt(e.target.value) || 100000 }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-200 transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Priority Level
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['standard','priority','urgent','critical'] as PriorityLevel[]).map(l => (
                      <button key={l} onClick={() => togglePriority(l)} className={`px-3 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${filters.priorityLevels.includes(l) ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-violet-500" />
                    Cargo Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['document','fragile','food','other'] as ParcelType[]).map(t => (
                      <button key={t} onClick={() => toggleParcelType(t)} className={`px-3 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${filters.parcelTypes.includes(t) ? 'border-violet-600 bg-violet-600 text-white shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" onClick={resetFilters} className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest">Reset</Button>
                <Button variant="signature" onClick={() => setShowFilters(false)} className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest">Apply Data</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
