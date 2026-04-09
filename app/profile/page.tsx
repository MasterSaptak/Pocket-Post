'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LogOut, User, Shield, UserCheck, Package, Mail, Zap, Loader2, CheckCircle,
  Bookmark, Eye, Users, TrendingUp, ChevronRight, Plus, Clock, MapPin, Star, DollarSign
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { TaskCard, TaskData } from '@/components/task-card';
import { updateDoc } from 'firebase/firestore';
import { leaveTaskQueue, dropTaskAndPromoteQueue } from '@/lib/services/queue-service';
import { toggleSaveTask, toggleFollowTask } from '@/lib/services/interaction-service';
import type { UserProfile } from '@/lib/auth-context';
import { getTrustScoreConfig } from '@/lib/gamification';

// ─── Types ───────────────────────────────────────────────────────
type ProfileTab = 'tasks' | 'bids' | 'queue' | 'saved' | 'following';

interface MyApplication {
  id: string;
  taskId: string;
  taskTitle?: string;
  status: string;
  createdAt: any;
}

interface QueueEntry {
  id: string;
  taskId: string;
  position: number;
  status: string;
  createdAt: any;
}

// ─── Tab Config ──────────────────────────────────────────────────
const TABS: { key: ProfileTab; label: string; icon: any; emptyMsg: string; emptyCTA: string; emptyCTALink: string }[] = [
  { key: 'tasks', label: 'My Tasks', icon: Package, emptyMsg: "You haven't created any tasks yet.", emptyCTA: 'Create your first task →', emptyCTALink: '/post' },
  { key: 'bids', label: 'My Bids', icon: Zap, emptyMsg: "You haven't placed any bids yet.", emptyCTA: 'Browse the feed →', emptyCTALink: '/feed' },
  { key: 'queue', label: 'Queue', icon: Users, emptyMsg: "You're not in any backup queues.", emptyCTA: 'Find tasks →', emptyCTALink: '/feed' },
  { key: 'saved', label: 'Saved', icon: Bookmark, emptyMsg: 'No saved tasks yet.', emptyCTA: 'Browse the feed →', emptyCTALink: '/feed' },
  { key: 'following', label: 'Following', icon: Eye, emptyMsg: "You're not following any tasks.", emptyCTA: 'Browse the feed →', emptyCTALink: '/feed' },
];

export default function ProfilePage() {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('tasks');
  const [dataLoading, setDataLoading] = useState(false);

  // Data states
  const [myTasks, setMyTasks] = useState<TaskData[]>([]);
  const [myBids, setMyBids] = useState<(MyApplication & { task?: TaskData })[]>([]);
  const [myQueue, setMyQueue] = useState<(QueueEntry & { task?: TaskData })[]>([]);
  const [savedTasks, setSavedTasks] = useState<TaskData[]>([]);
  const [followingTasks, setFollowingTasks] = useState<TaskData[]>([]);

  // Eagerly loaded stats (to prevent 0 counts on initial load before tab switch)
  const [eagerStats, setEagerStats] = useState({
    tasks: 0,
    completed: 0,
    bids: 0,
    queue: 0
  });

  // ─── Fetch helper: resolve task IDs to full TaskData ────────────
  const fetchTasksByIds = useCallback(async (taskIds: string[]): Promise<Record<string, TaskData>> => {
    const map: Record<string, TaskData> = {};
    // Batch fetch in chunks of 10
    for (let i = 0; i < taskIds.length; i += 10) {
      const chunk = taskIds.slice(i, i + 10);
      const promises = chunk.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'tasks', id));
          if (snap.exists()) {
            map[id] = { id: snap.id, ...snap.data() } as TaskData;
          }
        } catch { /* task may be deleted/hidden */ }
      });
      await Promise.all(promises);
    }
    return map;
  }, []);

  // ─── Data pipeline per tab ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);

    const fetchData = async () => {
      try {
        switch (activeTab) {
          case 'tasks': {
            const snap = await getDocs(
              query(collection(db, 'tasks'), where('createdBy', '==', user.uid))
            );
            const sortedTasks = snap.docs
              .map(d => ({ id: d.id, ...d.data() } as TaskData))
              .sort((a, b) => ((b.createdAt as any)?.toMillis?.() || 0) - ((a.createdAt as any)?.toMillis?.() || 0));
            setMyTasks(sortedTasks);
            break;
          }
          case 'bids': {
            const appsSnap = await getDocs(
              query(collection(db, 'applications'), where('userId', '==', user.uid))
            );
            let apps = appsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MyApplication));
            apps.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            const taskIds = [...new Set(apps.map(a => a.taskId))];
            const taskMap = await fetchTasksByIds(taskIds);
            setMyBids(apps.map(a => ({ ...a, task: taskMap[a.taskId] })));
            break;
          }
          case 'queue': {
            const qSnap = await getDocs(
              query(collection(db, 'queue'), where('userId', '==', user.uid))
            );
            let entries = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as QueueEntry));
            entries.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            const taskIds = [...new Set(entries.map(e => e.taskId))];
            const taskMap = await fetchTasksByIds(taskIds);
            setMyQueue(entries.map(e => ({ ...e, task: taskMap[e.taskId] })));
            break;
          }
          case 'saved': {
            const sSnap = await getDocs(
              query(collection(db, 'savedTasks'), where('userId', '==', user.uid))
            );
            const taskIds = sSnap.docs.map(d => d.data().taskId as string);
            const taskMap = await fetchTasksByIds(taskIds);
            setSavedTasks(Object.values(taskMap));
            break;
          }
          case 'following': {
            const fSnap = await getDocs(
              query(collection(db, 'follows'), where('userId', '==', user.uid))
            );
            const taskIds = fSnap.docs.map(d => d.data().taskId as string);
            const taskMap = await fetchTasksByIds(taskIds);
            setFollowingTasks(Object.values(taskMap));
            break;
          }
        }
      } catch (err) {
        console.error(`Error loading ${activeTab} data:`, err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [user, activeTab, fetchTasksByIds]);

  // ─── Eagerly load count stats ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      try {
        const [tasksSnap, bidsSnap, queueSnap] = await Promise.all([
          getDocs(query(collection(db, 'tasks'), where('createdBy', '==', user.uid))),
          getDocs(query(collection(db, 'applications'), where('userId', '==', user.uid))),
          getDocs(query(collection(db, 'queue'), where('userId', '==', user.uid))),
        ]);
        
        const tasks = tasksSnap.docs.map(d => d.data());
        const bids = bidsSnap.docs.map(d => d.data());
        const queue = queueSnap.docs.map(d => d.data());

        setEagerStats({
          tasks: tasks.length,
          completed: tasks.filter((t: any) => t.status === 'completed').length,
          bids: bids.filter((b: any) => b.status === 'pending').length,
          queue: queue.filter((q: any) => q.status === 'waiting').length,
        });
      } catch (err) {
        console.error("Error fetching eager stats", err);
      }
    };
    fetchCounts();
  }, [user]);

  // ─── Gamification & Stage DB Sync ──────────────────────────────
  useEffect(() => {
    if (!user || !profile) return;
    
    const correctConfig = getTrustScoreConfig(profile);
    
    // If the Firestore profile is out of sync with mathematically computed stage, fix it!
    if (profile.level !== correctConfig.level || profile.accuracyScore !== correctConfig.score) {
      updateDoc(doc(db, 'users', user.uid), {
        level: correctConfig.level,
        accuracyScore: correctConfig.score
      }).catch(console.error);
    }
  }, [user, profile]);

  // ─── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => [
    { label: 'Tasks', value: Math.max(myTasks.length, eagerStats.tasks), icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed', value: Math.max(myTasks.filter(t => t.status === 'completed').length, eagerStats.completed), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Bids', value: Math.max(myBids.filter(b => b.status === 'pending').length, eagerStats.bids), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'In Queue', value: Math.max(myQueue.filter(q => q.status === 'waiting').length, eagerStats.queue), icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
  ], [myTasks, myBids, myQueue, eagerStats]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleAction = useCallback(async (action: string, task: TaskData) => {
    if (!user) return;
    if (action === 'leave_queue') {
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
  }, [user]);

  // ─── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 flex justify-center pt-32">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // ─── Not authenticated ─────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-md w-full text-center">
          <div className="glass-panel rounded-3xl p-10 shadow-xl border border-white/20">
            <div className="w-20 h-20 bg-gradient-signature text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <User className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-slate-900 mb-3">Welcome to PocketPost</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">Sign in to post tasks, apply to work, or manage your activity.</p>
            <button onClick={signInWithGoogle} className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-[15px] transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] mb-4">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <p className="text-xs text-slate-400">Don&apos;t have an account?{' '}<Link href="/auth/signup" className="text-blue-600 font-medium hover:text-blue-700">Sign up</Link></p>
          </div>
        </motion.div>
      </div>
    );
  }

  const requestVerification = async () => {
    if (!user || !profile) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'verification.status': 'pending',
        'verification.submittedAt': new Date(),
      });
      toast.success('Verification requested! An admin will review your application.');
    } catch (error) {
      toast.error('Failed to request verification.');
    } finally {
      setUpdating(false);
    }
  };

  const verificationStatus = profile?.verification?.status;
  const isVerified = profile?.isVerifiedCarrier === true;
  const currentTabConfig = TABS.find(t => t.key === activeTab)!;
  const trustConfig = getTrustScoreConfig(profile);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-24 lg:pt-32 lg:pb-12">
      {/* ═══ REIMAGINED PROFILE HEADER ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2.5rem] mb-6 transition-all duration-500 ${
          profile?.role === 'admin' 
            ? 'border-[3px] border-amber-400 shadow-[0_0_40px_-5px_rgba(251,191,36,0.6),inset_0_0_20px_rgba(251,191,36,0.2)]' 
            : 'border border-white shadow-xl'
        }`}>
        
        {/* Gamified Rank Image Banner */}
        <div 
          className="h-36 sm:h-48 relative transition-all duration-1000 ease-out overflow-hidden bg-slate-900"
          style={{
            backgroundImage: `url('${encodeURI(trustConfig.bgImage || '')}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Subtle vignette to ensure top edge (where buttons live) is readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />
          
          {/* Verified Special Shimmer Pattern */}
          {isVerified && (
            <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] animate-[shimmer_4s_ease-in-out_infinite] pointer-events-none" />
          )}
          
          <div className="absolute top-4 right-4 flex gap-2 z-20">
            {profile?.role === 'admin' && (
              <Button asChild variant="secondary" size="sm" className="rounded-xl bg-black/30 hover:bg-black/40 text-white border border-white/10 backdrop-blur-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all">
                <Link href="/admin"><Shield className="w-4 h-4 mr-1.5" /> Admin</Link>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={signOut} className="rounded-xl bg-black/30 hover:bg-black/40 text-white border border-white/10 backdrop-blur-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all">
              <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
            </Button>
          </div>
        </div>

        <div className="px-6 pb-6 sm:px-10 sm:pb-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20 mb-8">
            {/* Avatar */}
            <div className="relative z-10 group">
              <div className="absolute -inset-2 bg-gradient-to-b from-white/30 to-white/0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Profile'} className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] object-cover shadow-2xl border-4 bg-white z-10 ${profile?.role === 'admin' ? 'border-amber-400' : 'border-white'}`} referrerPolicy="no-referrer" />
              ) : (
                <div className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900 border-4 shadow-2xl flex items-center justify-center text-white text-5xl font-black z-10 ${profile?.role === 'admin' ? 'border-amber-400' : 'border-white'}`}>
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              {isVerified && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.6)] z-20 tooltip" title="Verified Carrier">
                  <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left pt-2 pb-2">
              <h1 className="text-3xl sm:text-4xl font-heading font-black text-slate-900 tracking-tight leading-none mb-2">
                {user.displayName || 'Anonymous User'}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-2 text-slate-500 font-medium text-sm">
                {/* Email Chip */}
                <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{user.email}</span>
                </div>

                {/* Trust Score Badge */}
                <div title={trustConfig.score !== undefined ? `Accuracy Score: ${trustConfig.score}%` : 'No task history yet'} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold capitalize shadow-sm transition-all ${trustConfig.badgeClass}`}>
                  <trustConfig.icon className="w-3.5 h-3.5" />
                  <span>{trustConfig.label}</span>
                </div>
              </div>
              
              {/* Dynamic Metrics */}
              {isVerified && (
                <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                  <div className="flex items-center gap-1 text-amber-500 text-sm font-black bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-100/50">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 mb-0.5" />
                    <span>4.9</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-200" />
                  <div className="text-slate-600 text-sm font-bold">
                    {eagerStats.completed} <span className="font-semibold text-slate-400">Deliveries</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-200" />
                  <div className="text-emerald-600 text-sm font-bold flex items-center gap-0.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>0 <span className="font-semibold text-emerald-600/70">Earned</span></span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 flex-wrap">
                <Badge variant="outline" className="capitalize bg-white shadow-sm border-slate-200">{profile?.role || 'User'}</Badge>
                {isVerified && <Badge variant="approved" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">Verified Carrier</Badge>}
                {!isVerified && verificationStatus === 'pending' && <Badge variant="pending" className="font-bold">Review Pending</Badge>}
              </div>
            </div>
          </div>

          {/* Verification Callout (if not verified and not pending) */}
          {!isVerified && verificationStatus !== 'pending' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className="rounded-[1.25rem] bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100/50 p-1">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900 leading-none mb-1.5">Apply for Verified Status</h3>
                      <p className="text-xs text-slate-500 leading-snug">Unlock bidding capabilities and priority access to premium tasks on the marketplace.</p>
                    </div>
                  </div>
                  <Button onClick={requestVerification} disabled={updating || (verificationStatus as string) === 'pending'} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all h-11 px-6">
                    {updating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Get Verified'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Integrated Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/80 p-2.5 rounded-[1.5rem] border border-slate-100 shadow-inner">
            {stats.map((stat, i) => (
              <div key={stat.label} className="relative p-4 rounded-2xl bg-white shadow-sm border border-slate-100/50 hover:border-slate-200 hover:shadow-md transition-all group overflow-hidden">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 rounded-full bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className={`p-3 rounded-[1rem] transition-transform duration-300 group-hover:scale-[1.15] group-hover:rotate-3 shadow-sm ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══ ACTIVITY TABS ═══ */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-[1.25rem] border border-slate-200/60 mb-6 overflow-x-auto scrollbar-hide shadow-inner">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-sm font-bold transition-all whitespace-nowrap relative z-10 ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-md shadow-blue-100/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}>
            <tab.icon className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${activeTab === tab.key ? 'text-blue-500' : ''}`} />
            <span className="sm:text-sm">{tab.label.replace('My ', '')}</span>
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }} className="min-h-[300px]">

          {dataLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-slate-400 font-medium">Loading your {currentTabConfig.label.toLowerCase()}...</p>
            </div>
          ) : (
            <>
              {/* MY TASKS */}
              {activeTab === 'tasks' && (
                myTasks.length === 0 ? (
                  <EmptyState msg={currentTabConfig.emptyMsg} cta={currentTabConfig.emptyCTA} link={currentTabConfig.emptyCTALink} />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {myTasks.map(task => (
                      <TaskCard key={task.id} task={task} showApplyButton={false} showFollowButton={false} onAction={handleAction} />
                    ))}
                  </div>
                )
              )}

              {/* MY BIDS */}
              {activeTab === 'bids' && (
                myBids.length === 0 ? (
                  <EmptyState msg={currentTabConfig.emptyMsg} cta={currentTabConfig.emptyCTA} link={currentTabConfig.emptyCTALink} />
                ) : (
                  <div className="space-y-3">
                    {myBids.map(bid => (
                      <div key={bid.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between p-4 gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate text-sm">{bid.task?.title || 'Loading...'}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {bid.task?.bounty != null && bid.task.bounty > 0 && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                  ₹{bid.task.bounty.toLocaleString()}
                                </span>
                              )}
                              {bid.task?.priorityLevel && bid.task.priorityLevel !== 'standard' && (
                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md border ${
                                  bid.task.priorityLevel === 'critical' ? 'bg-red-50 text-red-600 border-red-200'
                                  : bid.task.priorityLevel === 'urgent' ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : 'bg-blue-50 text-blue-600 border-blue-200'
                                }`}>
                                  {bid.task.priorityLevel}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {bid.createdAt?.toDate ? bid.createdAt.toDate().toLocaleDateString() : ''}
                              </span>
                            </div>
                          </div>
                          <Badge variant={bid.status === 'accepted' ? 'approved' : bid.status === 'rejected' ? 'destructive' : 'pending'} className="capitalize shrink-0 rounded-lg">
                            {bid.status}
                          </Badge>
                        </div>
                        {bid.task && (
                          <div className="border-t border-slate-50 px-4 py-2 bg-slate-50/50 flex items-center gap-2 text-[10px] text-slate-400">
                            {bid.task.pickupLocation && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{bid.task.pickupLocation}</span>}
                            {bid.task.pickupLocation && bid.task.dropoffLocation && <span>→</span>}
                            {bid.task.dropoffLocation && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{bid.task.dropoffLocation}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* MY QUEUE */}
              {activeTab === 'queue' && (
                myQueue.length === 0 ? (
                  <EmptyState msg={currentTabConfig.emptyMsg} cta={currentTabConfig.emptyCTA} link={currentTabConfig.emptyCTALink} />
                ) : (
                  <div className="space-y-3">
                    {myQueue.map(entry => (
                      <div key={entry.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate text-sm">{entry.task?.title || 'Loading task...'}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {entry.task?.bounty != null && entry.task.bounty > 0 && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                  ₹{entry.task.bounty.toLocaleString()}
                                </span>
                              )}
                              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md border ${
                                entry.status === 'waiting' ? 'bg-violet-50 text-violet-600 border-violet-200'
                                : entry.status === 'promoted' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-red-50 text-red-600 border-red-200'
                              }`}>
                                {entry.status === 'waiting' ? `#${entry.position} in queue` : entry.status}
                              </span>
                              {entry.task?.status && (
                                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                                  Task: {entry.task.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                            entry.status === 'waiting' ? 'bg-violet-50 text-violet-600'
                            : entry.status === 'promoted' ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-600'
                          }`}>
                            #{entry.position}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* SAVED TASKS */}
              {activeTab === 'saved' && (
                savedTasks.length === 0 ? (
                  <EmptyState msg={currentTabConfig.emptyMsg} cta={currentTabConfig.emptyCTA} link={currentTabConfig.emptyCTALink} />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {savedTasks.map(task => (
                      <TaskCard key={task.id} task={task} showApplyButton={false} showFollowButton onAction={handleAction} />
                    ))}
                  </div>
                )
              )}

              {/* FOLLOWING */}
              {activeTab === 'following' && (
                followingTasks.length === 0 ? (
                  <EmptyState msg={currentTabConfig.emptyMsg} cta={currentTabConfig.emptyCTA} link={currentTabConfig.emptyCTALink} />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {followingTasks.map(task => (
                      <TaskCard key={task.id} task={task} showApplyButton={false} showFollowButton onAction={handleAction} />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Empty State Component ───────────────────────────────────────
function EmptyState({ msg, cta, link }: { msg: string; cta: string; link: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
      <div className="w-16 h-16 mx-auto mb-4 bg-slate-50 rounded-2xl flex items-center justify-center">
        <Package className="w-8 h-8 text-slate-200" />
      </div>
      <p className="text-slate-500 font-medium mb-3">{msg}</p>
      <Button asChild variant="link">
        <Link href={link}>{cta}</Link>
      </Button>
    </div>
  );
}
