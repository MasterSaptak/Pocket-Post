'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useDataCache } from '@/lib/data-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Check, Users, Package, Loader2, UserCheck, X, Zap, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';

type TabKey = 'verification' | 'tasks' | 'applications' | 'users';

export default function AdminDashboard() {
  const { user, profile, loading, isAuthorized } = useProtectedRoute({
    requiredRoles: ['admin', 'manager'],
    unauthorizedRedirect: '/',
  });

  const {
    allTasks,
    applications,
    allUsers,
    adminDataLoading,
    subscribeToAdminData,
    isAdminSubscribed,
  } = useDataCache();

  const [activeTab, setActiveTab] = useState<TabKey>('verification');
  const isAdmin = profile?.role === 'admin';

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

  // ─── Actions ──────────────────────────────────────────────────
  const approveVerification = useCallback(async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerifiedCarrier: true,
        'verification.status': 'approved',
        'verification.reviewedAt': new Date(),
      });
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
      await updateDoc(doc(db, 'tasks', taskId), { status: 'completed' });
      toast.success('Task marked as completed!');
    } catch (error) {
      toast.error('Failed to complete task.');
    }
  }, []);

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
    { key: 'verification', label: 'Verification', count: pendingVerifications.length, icon: UserCheck, adminOnly: true },
    { key: 'tasks', label: 'Tasks', count: allTasks.length, icon: Package },
    { key: 'applications', label: 'Applications', count: pendingApplications.length, icon: Zap },
    { key: 'users', label: 'Users', count: allUsers.length, icon: Users, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  // Default to first visible tab if current tab isn't visible
  const currentTab = visibleTabs.find((t) => t.key === activeTab) ? activeTab : visibleTabs[0]?.key || 'tasks';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-4 py-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          {isAdmin ? 'Admin Dashboard' : 'Manager Dashboard'}
        </h1>
        <p className="text-slate-500 mt-2">Manage tasks, applications, and users.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: allUsers.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Open Tasks', value: openTasks.length, icon: Package, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Verifications', value: pendingVerifications.length, icon: UserCheck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Applications', value: pendingApplications.length, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel rounded-2xl p-4 border border-white/20">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-heading font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              currentTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                currentTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">

        {/* ─── Verification Tab ────────────────────────────────── */}
        {currentTab === 'verification' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-500" />
                Pending Carrier Verifications ({pendingVerifications.length})
              </CardTitle>
              <CardDescription>Review and approve carrier verification requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingVerifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No pending verifications.</p>
              ) : (
                pendingVerifications.map((u: any) => (
                  <div key={u.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-900">{u.displayName || `UID: ${u.id.slice(0, 8)}...`}</p>
                        <p className="text-xs text-slate-500">{u.email || 'No email'}</p>
                      </div>
                      <Badge variant="pending">Pending</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="signature" onClick={() => approveVerification(u.id)} className="flex-1">
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectVerification(u.id)} className="flex-1">
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Tasks Tab ───────────────────────────────────────── */}
        {currentTab === 'tasks' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                All Tasks ({allTasks.length})
              </CardTitle>
              <CardDescription>View and manage all tasks on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allTasks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No tasks yet.</p>
              ) : (
                allTasks.slice(0, 20).map((task) => (
                  <div key={task.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{task.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                      </div>
                      <Badge variant={task.status as any} className="capitalize shrink-0 ml-2">
                        {task.status}
                      </Badge>
                    </div>
                    {task.status === 'assigned' && (
                      <Button size="sm" onClick={() => completeTask(task.id)} className="w-full">
                        <Check className="w-4 h-4 mr-2" /> Mark Completed
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Applications Tab ────────────────────────────────── */}
        {currentTab === 'applications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-500" />
                Pending Applications ({pendingApplications.length})
              </CardTitle>
              <CardDescription>Accept or reject carrier applications for tasks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingApplications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No pending applications.</p>
              ) : (
                pendingApplications.map((app: any) => {
                  const task = allTasks.find((t) => t.id === app.taskId);
                  const applicant = allUsers.find((u: any) => u.id === app.userId);
                  if (!task || !applicant) return null;

                  return (
                    <div key={app.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="font-medium text-slate-900 text-sm">Task: {task.title}</p>
                        <p className="text-xs text-slate-500">
                          Applicant: {applicant.displayName || 'Unknown'} · {applicant.isVerifiedCarrier ? '✓ Verified' : 'Unverified'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => acceptApplication(app.id, task.id, applicant.id)}
                          className="flex-1"
                          disabled={!applicant.isVerifiedCarrier}
                        >
                          <Check className="w-4 h-4 mr-1" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectApplication(app.id)}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Users Tab ───────────────────────────────────────── */}
        {currentTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                All Users ({allUsers.length})
              </CardTitle>
              <CardDescription>View all registered users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {allUsers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No users yet.</p>
              ) : (
                allUsers.slice(0, 30).map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {(u.displayName || u.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{u.displayName || 'Anonymous'}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className="capitalize text-xs">{u.role || 'user'}</Badge>
                      {u.isVerifiedCarrier && (
                        <Badge variant="approved" className="text-xs">Verified</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
