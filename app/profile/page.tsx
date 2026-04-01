'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogIn, LogOut, User, Shield, Truck, Package, Camera, Mail, Star } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();
  const [updating, setUpdating] = useState(false);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full text-center"
        >
          <div className="glass-panel rounded-3xl p-10 shadow-xl border border-white/20">
            <div className="w-20 h-20 bg-gradient-signature text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <User className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-slate-900 mb-3">
              Welcome to PocketPost
            </h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Sign in to post requests, become a carrier, or manage your deliveries.
            </p>

            {/* Google Sign-in */}
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-[15px] transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-xs text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-blue-600 font-medium hover:text-blue-700">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const requestCarrierRole = async () => {
    if (!user || !profile) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'carrier',
        status: 'pending',
      });
      toast.success('Requested carrier status! Waiting for admin verification.');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to request carrier status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-6 md:p-8 shadow-lg border border-white/20 mb-8"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Profile'}
                className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-signature flex items-center justify-center text-white text-2xl font-bold shadow-md">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-heading font-bold text-slate-900">
              {user.displayName || 'Anonymous User'}
            </h1>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-slate-500 text-sm">
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
              <Badge variant="outline" className="capitalize">
                {profile?.role || 'Requester'}
              </Badge>
              <Badge variant={profile?.status === 'verified' ? 'approved' : 'pending'} className="capitalize">
                {profile?.status || 'Pending'}
              </Badge>
            </div>
          </div>

          {/* Sign Out */}
          <Button variant="outline" onClick={signOut} className="shrink-0">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Status Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">User ID</span>
                <span className="font-mono text-xs text-slate-400">{user.uid.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Role</span>
                <Badge variant="outline" className="capitalize">{profile?.role || 'Requester'}</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Verification</span>
                <Badge variant={profile?.status === 'verified' ? 'approved' : 'pending'} className="capitalize">
                  {profile?.status || 'Pending'}
                </Badge>
              </div>
              {profile?.role === 'carrier' && profile?.carrierId && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Carrier ID</span>
                  <span className="font-mono font-medium text-slate-900">{profile.carrierId}</span>
                </div>
              )}
              {profile?.role === 'carrier' && profile?.rating !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Rating</span>
                  <span className="font-medium text-amber-500 flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-500" />
                    {profile.rating.toFixed(1)}
                  </span>
                </div>
              )}
              {profile?.completedDeliveries !== undefined && profile.completedDeliveries > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Deliveries</span>
                  <span className="font-medium text-emerald-600">{profile.completedDeliveries} completed</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Card — Become Carrier or Admin Link */}
        {profile?.role === 'requester' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-500" />
                  Become a Carrier
                </CardTitle>
                <CardDescription>Earn money by delivering items securely.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-6">
                  Apply to become a verified carrier. You will need to provide proof of travel and identity to admins.
                </p>
                <Button
                  onClick={requestCarrierRole}
                  className="w-full"
                  variant="secondary"
                  disabled={updating || profile.status === 'pending'}
                >
                  {updating ? 'Processing...' : profile.status === 'pending' ? 'Verification Pending' : 'Apply Now'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {profile?.role === 'admin' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  Admin Controls
                </CardTitle>
                <CardDescription>Manage platform requests and users.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="signature">
                  <Link href="/admin">Go to Admin Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-12"
      >
        <h2 className="text-xl font-heading font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Package className="w-5 h-5 text-slate-400" />
          Recent Activity
        </h2>
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500">No recent activity to show.</p>
        </div>
      </motion.div>
    </div>
  );
}
