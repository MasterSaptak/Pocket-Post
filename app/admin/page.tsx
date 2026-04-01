'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useDataCache } from '@/lib/data-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Check, Truck, Package, Loader2, Users } from 'lucide-react';
import { motion } from 'motion/react';

const generateCarrierId = () => `PP-${Math.floor(100 + Math.random() * 900)}`;

export default function AdminDashboard() {
  const { user, profile, loading, isAuthorized } = useProtectedRoute({
    requiredRoles: ['admin'],
    unauthorizedRedirect: '/',
  });

  const {
    allRequests,
    applications,
    allUsers,
    adminDataLoading,
    subscribeToAdminData,
    isAdminSubscribed,
  } = useDataCache();

  // Subscribe to admin data on mount (only triggers once due to internal guard)
  useEffect(() => {
    if (isAuthorized && !isAdminSubscribed) {
      subscribeToAdminData();
    }
  }, [isAuthorized, isAdminSubscribed, subscribeToAdminData]);

  // Memoize filtered lists so they don't recompute on every render
  const pendingRequests = useMemo(
    () => allRequests.filter(r => r.status === 'requested'),
    [allRequests]
  );
  const pendingCarriers = useMemo(
    () => allUsers.filter((u: any) => u.role === 'carrier' && u.status === 'pending'),
    [allUsers]
  );
  const pendingApplications = useMemo(
    () => applications.filter((a: any) => a.status === 'pending'),
    [applications]
  );
  const totalUsers = allUsers.length;

  const approveRequest = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, 'requests', id), { status: 'approved' });
      toast.success('Request approved.');
    } catch (error) {
      toast.error('Failed to approve request.');
    }
  }, []);

  const verifyCarrier = useCallback(async (id: string) => {
    try {
      const carrierId = generateCarrierId();
      await updateDoc(doc(db, 'users', id), {
        status: 'verified',
        carrierId,
        rating: 5.0,
        completedDeliveries: 0
      });
      toast.success(`Carrier verified and assigned ID: ${carrierId}`);
    } catch (error) {
      toast.error('Failed to verify carrier.');
    }
  }, []);

  const assignCarrier = useCallback(async (appId: string, requestId: string, carrierId: string) => {
    try {
      await updateDoc(doc(db, 'applications', appId), { status: 'accepted' });
      await updateDoc(doc(db, 'requests', requestId), {
        status: 'assigned',
        assignedCarrierId: carrierId
      });
      toast.success('Carrier assigned to request.');
    } catch (error) {
      toast.error('Failed to assign carrier.');
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
        <p className="text-slate-500">You must be an administrator to view this page.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-4 py-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Admin Dashboard
        </h1>
        <p className="text-slate-500 mt-2">Manage the platform securely.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Pending Requests', value: pendingRequests.length, icon: Package, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Carrier Queue', value: pendingCarriers.length, icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Assignments', value: pendingApplications.length, icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-50' },
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

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

        {/* Pending Requests */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription>Review and approve new delivery requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No pending requests.</p>
            ) : (
              pendingRequests.map(req => (
                <div key={req.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-900">{req.itemCategory}</p>
                      <p className="text-xs text-slate-500">{req.pickupLocation} → {req.dropLocation}</p>
                    </div>
                    <Badge variant="pending">Pending</Badge>
                  </div>
                  <Button size="sm" onClick={() => approveRequest(req.id)} className="w-full">
                    <Check className="w-4 h-4 mr-2" /> Approve
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Carrier Verifications */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-500" />
              Carrier Verification ({pendingCarriers.length})
            </CardTitle>
            <CardDescription>Verify users applying to be carriers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingCarriers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No pending carriers.</p>
            ) : (
              pendingCarriers.map((u: any) => (
                <div key={u.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{u.displayName || `UID: ${u.id.slice(0, 8)}...`}</p>
                      <p className="text-xs text-slate-500">{u.email || 'Awaiting verification'}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="signature" onClick={() => verifyCarrier(u.id)} className="w-full">
                    <Shield className="w-4 h-4 mr-2" /> Verify Carrier
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Applications (Assignments) */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-500" />
              Assignments ({pendingApplications.length})
            </CardTitle>
            <CardDescription>Assign verified carriers to requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingApplications.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No pending applications.</p>
            ) : (
              pendingApplications.map((app: any) => {
                const req = allRequests.find(r => r.id === app.requestId);
                const carrier = allUsers.find((u: any) => u.id === app.carrierId);
                if (!req || !carrier) return null;

                return (
                  <div key={app.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-slate-900 text-sm">Req: {req.itemCategory}</p>
                      <p className="text-xs text-slate-500">Carrier: {carrier.displayName || carrier.carrierId || 'Unverified'}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => assignCarrier(app.id, req.id, carrier.id)}
                      className="w-full"
                      disabled={carrier.status !== 'verified'}
                    >
                      Assign Delivery
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

      </div>
    </motion.div>
  );
}
