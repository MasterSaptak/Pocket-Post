'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, addDoc, collection, serverTimestamp, deleteDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useDataCache } from '@/lib/data-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskCard, TaskData } from '@/components/task-card';
import { UserMatrix } from '@/components/admin/user-matrix';
import { UserProfile, UserRole } from '@/lib/auth-context';
import { 
  Shield, Check, Users, Package, Loader2, UserCheck, X, Zap, 
  ClipboardList, MoreVertical, Trash2, Pin, Flame, MapPin,
  Ban, ShieldAlert, ShieldCheck, UserMinus, UserPlus, 
  TrendingUp, Activity, MessageSquare, Plus, AlertCircle, ChevronRight
} from 'lucide-react';
import { logAdminAction } from '@/lib/services/audit-service';

type TabKey = 'verification' | 'tasks' | 'applications' | 'users';
type TaskSubTab = 'pending' | 'active' | 'pinned' | 'emergency' | 'all';
type TaskSort = 'priority' | 'newest' | 'oldest' | 'likes' | 'bounty' | 'closing_soon' | 'most_activity';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, profile, loading, isAuthorized } = useProtectedRoute({
    requiredRoles: ['admin', 'moderator'],
    unauthorizedRedirect: '/',
  });

  const {
    allTasks = [],
    applications = [],
    allUsers = [],
    adminDataLoading,
    subscribeToAdminData,
    isAdminSubscribed,
  } = useDataCache();

  const [activeTab, setActiveTab] = useState<TabKey>('tasks');
  const [taskSubTab, setTaskSubTab] = useState<TaskSubTab>('active');
  const [taskSort, setTaskSort] = useState<TaskSort>('priority');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'PRIME_ADMIN';
  const isModerator = profile?.role === 'moderator' || isAdmin;

  // Subscribe to admin data on mount
  useEffect(() => {
    if (isAuthorized && !isAdminSubscribed) {
      subscribeToAdminData();
    }
  }, [isAuthorized, isAdminSubscribed, subscribeToAdminData]);

  // Memoize filtered lists
  const pendingVerifications = useMemo(
    () => allUsers.filter((u: any) => u.verification?.status === 'pending'),
    [allUsers]
  );
  const openTasks = useMemo(
    () => allTasks.filter((t) => t.status === 'open'),
    [allTasks]
  );
  const pendingApplications = useMemo(
    () => applications.filter((a: any) => a.status === 'pending'),
    [applications]
  );
  const pendingTasks = useMemo(
    () => allTasks.filter((t) => t.status === 'pending'),
    [allTasks]
  );

  // ─── Actions ──────────────────────────────────────────────────
  const approveVerification = useCallback(async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerifiedCarrier: true,
        'verification.status': 'approved',
        'verification.reviewedAt': new Date(),
      });
      await logAdminAction(user!.uid, user!.email!, 'USER_PROMOTE', `Approved carrier verification for ${userId}`, { id: userId, type: 'user' });
      toast.success('Carrier verified successfully!');
    } catch (error) {
      toast.error('Failed to approve verification.');
    }
  }, []);

  const rejectVerification = useCallback(async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerifiedCarrier: false,
        'verification.status': 'rejected',
        'verification.reviewedAt': new Date(),
      });
      await logAdminAction(user!.uid, user!.email!, 'USER_DEMOTE', `Rejected carrier verification for ${userId}`, { id: userId, type: 'user' });
      toast.success('Verification rejected.');
    } catch (error) {
      toast.error('Failed to reject verification.');
    }
  }, []);

  const acceptApplication = useCallback(async (appId: string, taskId: string, userId: string) => {
    try {
      await updateDoc(doc(db, 'applications', appId), { status: 'accepted' });
      await updateDoc(doc(db, 'tasks', taskId), {
        status: 'assigned',
        assignedTo: userId,
      });
      // Directly increment the carrier's accepted task counter
      await updateDoc(doc(db, 'users', userId), {
        acceptedTasks: increment(1)
      });
      toast.success('Application accepted — task assigned!');
    } catch (error) {
      toast.error('Failed to accept application.');
    }
  }, []);

  const rejectApplication = useCallback(async (appId: string) => {
    try {
      await updateDoc(doc(db, 'applications', appId), { status: 'rejected' });
      toast.success('Application rejected.');
    } catch (error) {
      toast.error('Failed to reject application.');
    }
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    try {
      const taskSnap = await getDoc(doc(db, 'tasks', taskId));
      const taskData = taskSnap.exists() ? taskSnap.data() : null;

      await updateDoc(doc(db, 'tasks', taskId), { status: 'completed' });
      
      // Directly increment the carrier's completed task counter if assigned
      if (taskData?.assignedTo) {
         await updateDoc(doc(db, 'users', taskData.assignedTo), {
            completedTasks: increment(1)
         });
      }
      toast.success('Task marked as completed!');
    } catch (error) {
      toast.error('Failed to complete task.');
    }
  }, []);

  const approveTask = useCallback(async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status: 'open' });
      toast.success('Task approved and live!');
    } catch (error) {
      toast.error('Failed to approve task.');
    }
  }, []);

  const rejectTask = useCallback(async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status: 'rejected' });
      toast.success('Task rejected.');
    } catch (error) {
      toast.error('Failed to reject task.');
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      await logAdminAction(user!.uid, user!.email!, 'TASK_DELETE', `Hard deleted task: ${taskId}`, { id: taskId, type: 'task' });
      toast.success('Task deleted successfully.');
    } catch (error) {
      toast.error('Failed to delete task.');
    }
  }, []);

  const togglePin = useCallback(async (taskId: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { isPinned: !current });
      toast.success(current ? 'Task unpinned.' : 'Task pinned to top!');
    } catch (error) {
      toast.error('Failed to update pin.');
    }
  }, []);

  const toggleEmergency = useCallback(async (taskId: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { isEmergency: !current });
      toast.success(current ? 'Emergency status removed.' : 'MARK AS URGENT: Notifying nearest users...');
    } catch (error) {
      toast.error('Failed to update emergency status.');
    }
  }, []);

  // ─── Task Actions Registry ──────────────────────────────────────
  const handleTaskAction = useCallback(async (action: string, task: TaskData) => {
    switch (action) {
      case 'approve': await approveTask(task.id); break;
      case 'reject': await rejectTask(task.id); break;
      case 'pin': await togglePin(task.id, !!task.isPinned); break;
      case 'emergency': await toggleEmergency(task.id, !!task.isEmergency); break;
      case 'delete': await deleteTask(task.id); break;
      case 'edit': router.push(`/post/edit/${task.id}`); break;
    }
  }, [approveTask, rejectTask, togglePin, toggleEmergency, deleteTask]);

  if (loading || (isAuthorized && adminDataLoading)) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-heading font-bold text-slate-900 mb-4">Access Denied</h1>
        <p className="text-slate-500">You must be an administrator or manager to view this page.</p>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; count: number; icon: any; adminOnly?: boolean }[] = [
    { key: 'tasks', label: 'Command Posts', count: pendingTasks.length, icon: Package },
    { key: 'verification', label: 'Verifications', count: pendingVerifications.length, icon: UserCheck, adminOnly: true },
    { key: 'applications', label: 'Applications', count: pendingApplications.length, icon: Zap },
    { key: 'users', label: 'User Control', count: allUsers.length, icon: Users, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);
  const currentTab = visibleTabs.find((t) => t.key === activeTab) ? activeTab : visibleTabs[0]?.key || 'tasks';

  // ─── Sub-Filtering for Tasks ────────────────────────────────────
  const getSubTabTasks = () => {
    let filtered: TaskData[] = [];
    switch (taskSubTab) {
      case 'pending': filtered = allTasks.filter(t => t.status === 'pending'); break;
      case 'active': filtered = allTasks.filter(t => t.status === 'open'); break;
      case 'pinned': filtered = allTasks.filter(t => t.isPinned); break;
      case 'emergency': filtered = allTasks.filter(t => t.isEmergency); break;
      case 'all': filtered = allTasks; break;
      default: filtered = []; break;
    }

    return [...filtered].sort((a, b) => {
      // Safe fallback for timestamp comparison
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);

      switch (taskSort) {
        case 'newest': return timeB - timeA;
        case 'oldest': return timeA - timeB;
        case 'likes':  return (b.reactionCount || 0) - (a.reactionCount || 0);
        case 'bounty': return (b.bounty || 0) - (a.bounty || 0);
        case 'closing_soon': {
          const dA = a.deadline?.toDate ? a.deadline.toDate().getTime() : a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const dB = b.deadline?.toDate ? b.deadline.toDate().getTime() : b.deadline ? new Date(b.deadline).getTime() : Infinity;
          return dA - dB;
        }
        case 'most_activity': {
          const actA = (a.bidsCount || 0) + (a.followsCount || 0) + (a.viewsCount || 0);
          const actB = (b.bidsCount || 0) + (b.followsCount || 0) + (b.viewsCount || 0);
          return actB - actA;
        }
        case 'priority':
        default:
          if (a.isEmergency && !b.isEmergency) return -1;
          if (!a.isEmergency && b.isEmergency) return 1;
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return timeB - timeA;
      }
    });
  };
  const filteredTasks = getSubTabTasks();

  return (
    <div className="max-w-5xl mx-auto px-4 pt-20 pb-24 lg:pt-28 lg:pb-12">
      {/* 🟢 HEADER & GLOBAL ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-heading font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Shield className="w-5 h-5" />
            </div>
            {isAdmin ? 'Command Center' : 'Moderator Panel'}
          </h1>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1.5">Operational Status: <span className="text-emerald-500">Synchronized</span></p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCreateModal(true)}
            variant="signature" 
            className="rounded-xl px-5 h-10 shadow-lg shadow-blue-100 text-xs font-black uppercase tracking-widest"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Admin Post
          </Button>
          <Button variant="outline" className="rounded-xl h-10 px-3.5">
            <Activity className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 🟠 ANALYTICS SNAPSHOT */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Base', value: allUsers.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%' },
          { label: 'Active Ops', value: openTasks.length, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Live' },
          { label: 'Awaiting Intel', value: pendingTasks.length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', trend: 'Critical' },
          { label: 'Vetting', value: pendingVerifications.length, icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: 'Pending' },
        ].map((stat) => (
          <motion.div 
            whileHover={{ y: -4 }}
            key={stat.label} 
            className="bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">{stat.trend}</span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{stat.value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 🔵 PRIMARY NAVIGATION (COMMANDS) */}
      <div className="flex flex-wrap gap-1.5 mb-6 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/40 shadow-inner">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
              currentTab === tab.key
                ? 'bg-white text-blue-600 shadow-md shadow-blue-100/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <tab.icon className={`w-3.5 h-3.5 ${currentTab === tab.key ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                currentTab === tab.key ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ⚡ COMMAND CENTER CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
           key={currentTab}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.2 }}
           className="min-h-[500px]"
        >
          {/* 📬 TASK CONTROL SYSTEM */}
          {currentTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-2 p-1 bg-slate-100/50 rounded-xl w-fit overflow-x-auto">
                  {(['active', 'pending', 'pinned', 'emergency', 'all'] as TaskSubTab[]).map(sub => (
                    <button
                      key={sub}
                      onClick={() => setTaskSubTab(sub)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        taskSubTab === sub ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-1 py-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-3">Sort By</span>
                  <select 
                    value={taskSort}
                    onChange={(e) => setTaskSort(e.target.value as TaskSort)}
                    className="text-sm font-semibold text-slate-700 bg-white border-none rounded-lg py-1.5 pl-3 pr-8 shadow-sm focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
                  >
                    <option value="priority">🔥 Priority</option>
                    <option value="newest">🕒 Newest First</option>
                    <option value="oldest">⏳ Oldest First</option>
                    <option value="likes">❤️ Most Liked</option>
                    <option value="bounty">💰 Highest Bounty</option>
                    <option value="closing_soon">⏱️ Closing Soon</option>
                    <option value="most_activity">📈 Most Activity</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.length === 0 ? (
                  <div className="col-span-full py-20 text-center glass-panel rounded-3xl border-dashed">
                    <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">No active intel for this frequency.</p>
                  </div>
                ) : (
                  filteredTasks.map(task => {
                    let adminTask = { ...task };
                    if (task.assignedTo && allUsers.length > 0) {
                      const au = allUsers.find((u: any) => u.uid === task.assignedTo || u.id === task.assignedTo);
                      if (au) {
                        adminTask.assignedToUser = {
                          name: au.displayName || 'Unknown',
                          email: au.email || '',
                          avatar: au.photoURL || null,
                        };
                      }
                    }
                    return (
                      <TaskCard 
                        key={adminTask.id} 
                        task={adminTask} 
                        isAdminView 
                        onAction={handleTaskAction}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 👥 USER CONTROL GRID */}
          {currentTab === 'users' && (
            <UserMatrix 
              users={allUsers} 
              isAdmin={isAdmin} 
              currentUser={profile}
              onRefresh={subscribeToAdminData} 
            />
          )}

          {/* Verification Tab Content (Re-using old logic but with new UI) */}
          {currentTab === 'verification' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingVerifications.map(u => (
                <Card key={u.id} className="rounded-3xl border-slate-100 overflow-hidden relative group">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                         {u.displayName[0]}
                       </div>
                       <div>
                         <p className="font-bold text-slate-900">{u.displayName}</p>
                         <p className="text-xs text-slate-400 leading-none">{u.email}</p>
                       </div>
                    </div>
                    <Badge variant="pending">Awaiting Review</Badge>
                  </CardHeader>
                  <CardFooter className="bg-slate-50/50 gap-2 p-4">
                    <Button variant="signature" className="flex-1 rounded-xl" onClick={() => approveVerification(u.id)}>Approve</Button>
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => rejectVerification(u.id)}>Reject</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Applications Tab — Full Identity Resolution */}
          {currentTab === 'applications' && (
            <div className="space-y-4">
               {pendingApplications.length === 0 && (
                 <div className="py-20 text-center glass-panel rounded-3xl border-dashed">
                   <Zap className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                   <p className="text-slate-400 font-bold">No pending applications.</p>
                 </div>
               )}
               {pendingApplications.map(app => {
                 // Resolve applicant identity
                 const applicant = allUsers.find((u: any) => u.uid === app.userId || u.id === app.userId);
                 const applicantName = applicant?.displayName || 'Unknown User';
                 const applicantEmail = applicant?.email || 'No email';
                 const applicantPhoto = applicant?.photoURL || null;
                 const applicantInitial = applicantName[0]?.toUpperCase() || '?';
                 const isApplicantVerified = applicant?.isVerifiedCarrier === true;
                 const applicantRole = applicant?.role || 'user';

                 // Resolve target task
                 const task = allTasks.find((t: any) => t.id === app.taskId);
                 const taskTitle = task?.title || 'Unknown Task';
                 const taskBounty = task?.bounty || 0;
                 const taskPriority = task?.priorityLevel || 'standard';
                 const taskLocation = task?.location || null;

                 // Applied date
                 const appliedAt = app.createdAt?.toDate ? app.createdAt.toDate() : null;

                 return (
                  <div key={app.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden hover:border-blue-200 transition-all shadow-sm hover:shadow-md">
                    {/* Applicant Header */}
                    <div className="p-5 flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {/* Applicant Avatar */}
                        {applicantPhoto ? (
                          <img src={applicantPhoto} alt={applicantName}
                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg shrink-0">
                            {applicantInitial}
                          </div>
                        )}

                        <div className="min-w-0">
                          {/* Name + Badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h4 className="font-black text-slate-900 text-base leading-tight">{applicantName}</h4>
                            {isApplicantVerified && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-black uppercase">
                                <Check className="w-2.5 h-2.5" /> Verified
                              </span>
                            )}
                            {applicantRole !== 'user' && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase">
                                {applicantRole}
                              </span>
                            )}
                          </div>

                          {/* Email */}
                          <p className="text-xs text-slate-400 mb-2">{applicantEmail}</p>

                          {/* Target Task Info */}
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Applying For</p>
                            <p className="font-bold text-slate-800 text-sm leading-tight mb-1">{taskTitle}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {taskBounty > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                  ₹{taskBounty.toLocaleString()}
                                </span>
                              )}
                              {taskPriority !== 'standard' && (
                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md border ${
                                  taskPriority === 'critical' ? 'bg-red-50 text-red-600 border-red-200'
                                  : taskPriority === 'urgent' ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : 'bg-blue-50 text-blue-600 border-blue-200'
                                }`}>
                                  {taskPriority}
                                </span>
                              )}
                              {taskLocation && (
                                <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" /> {taskLocation}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Applied timestamp */}
                          {appliedAt && (
                            <p className="text-[10px] text-slate-400 mt-2">
                              Applied {appliedAt.toLocaleDateString()} at {appliedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex sm:flex-col gap-2 shrink-0 sm:items-end sm:justify-center">
                        <Button size="sm" variant="signature" className="rounded-xl px-6 shadow-md shadow-blue-100"
                          onClick={() => acceptApplication(app.id, app.taskId, app.userId)}>
                          <Check className="w-4 h-4 mr-1.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-xl px-4"
                          onClick={() => rejectApplication(app.id)}>
                          <X className="w-4 h-4 mr-1.5" /> Deny
                        </Button>
                      </div>
                    </div>
                  </div>
                 );
               })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 🛡️ ADMIN CREATE TASK MODAL (BASIC SHRUCTURE) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl relative z-10"
            >
              <div className="bg-blue-600 p-8 text-white relative">
                <Shield className="absolute right-8 top-8 w-16 h-16 opacity-10 rotate-12" />
                <h2 className="text-3xl font-black tracking-tighter">Command Entry</h2>
                <p className="text-blue-100 font-medium">Inject a new operation directly into the feed.</p>
              </div>
              <div className="p-8 space-y-6">
                <p className="text-sm text-slate-500 text-center py-10">Direct task injection system is syncing. Use standard /post route for now or await v2 patch.</p>
                <Button className="w-full h-14 rounded-2xl text-lg font-bold" variant="signature" onClick={() => setShowCreateModal(false)}>Close Uplink</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
