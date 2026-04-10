'use client';

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, ShieldCheck, MoreVertical, Ban, ShieldAlert,
  ChevronDown, CheckCircle, XCircle, AlertTriangle, ChevronUp, Lock, RotateCcw,
  Trash2, UserMinus
} from 'lucide-react';
import { TIER_CONFIG, computeAccuracyScore } from '@/lib/gamification';
import { logAdminAction } from '@/lib/services/audit-service';

interface UserMatrixProps {
  users: UserProfile[];
  isAdmin: boolean;
  currentUser: UserProfile | null;
  onRefresh: () => void;
}

export function UserMatrix({ users, isAdmin, currentUser, onRefresh }: UserMatrixProps) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // ─── Guard Utilities ─────────────────────────────────────────
  const getTarget = (id: string) => users.find(u => u.uid === id);

  const passesGuard = (targetId: string, isDestructive = false) => {
    const target = getTarget(targetId);
    if (!target) return false;
    
    if (target.role === 'PRIME_ADMIN' && currentUser?.role !== 'PRIME_ADMIN') {
      toast.error('Unauthorized: Cannot modify PRIME_ADMIN');
      return false;
    }
    
    if (isDestructive && currentUser?.uid === target.uid && currentUser?.role === 'PRIME_ADMIN') {
      toast.error('Action blocked: Cannot self-destruct or demote your own PRIME_ADMIN account.');
      return false;
    }
    
    return true;
  };

  // ─── Direct Admin Actions ──────────────────────────────
  const handleSetOverride = async (userId: string, tier: string, lockDays: number | null) => {
    if (!isAdmin) return toast.error('Only Admins can override tiers.');
    if (!passesGuard(userId)) return;

    try {
      const updates: any = {
         'adminOverride.tier': tier,
         'adminOverride.reason': 'Manual Admin Override'
      };
      if (lockDays) {
         const expiresAt = new Date();
         expiresAt.setDate(expiresAt.getDate() + lockDays);
         updates['adminOverride.expiresAt'] = expiresAt.toISOString();
      } else {
         updates['adminOverride.expiresAt'] = null; // Locked indefinitely
      }
      await updateDoc(doc(db, 'users', userId), updates);
      await logAdminAction(currentUser!.uid, currentUser!.email!, 'SYSTEM_CONFIG_CHANGE', `Set manual tier override: ${tier} for ${userId}`, { id: userId, type: 'user' }, { tier, lockDays });
      toast.success(`Override applied: ${tier}`);
      onRefresh();
    } catch (e) {
      toast.error('Failed to set override');
    }
  };

  const handleResetOverride = async (userId: string) => {
    if (!isAdmin) return;
    if (!passesGuard(userId)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { adminOverride: null });
      await logAdminAction(currentUser!.uid, currentUser!.email!, 'SYSTEM_CONFIG_CHANGE', `Reset manual tier override for ${userId}`, { id: userId, type: 'user' });
      toast.success('Reputation reset to pure System Tier');
      onRefresh();
    } catch (e) {
      toast.error('Failed to reset override');
    }
  };

  const handleSetBan = async (userId: string, type: 'NONE' | 'TEMP' | 'PERM', days?: number) => {
    if (!isAdmin) return toast.error('Only Admins can issue bans.');
    if (!passesGuard(userId, type !== 'NONE')) return;
    try {
      const updates: any = {
        'ban.status': type,
        'ban.reason': 'Administrative Sanction',
        isPermanentlyBanned: type === 'PERM'
      };
      if (type === 'TEMP' && days) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        updates['ban.expiresAt'] = expiresAt.toISOString();
        updates.bannedUntil = expiresAt; // legacy support
      } else {
        updates['ban.expiresAt'] = null;
        updates.bannedUntil = null;
      }
      await updateDoc(doc(db, 'users', userId), updates);
      await logAdminAction(currentUser!.uid, currentUser!.email!, type === 'NONE' ? 'USER_UNBAN' : 'USER_BAN', `${type} ban issued to ${userId}`, { id: userId, type: 'user' }, { type, days });
      toast.success(type === 'NONE' ? 'Ban lifted.' : type === 'PERM' ? 'User Permanently Banned.' : `User suspended for ${days} days.`);
      onRefresh();
    } catch (e) {
      toast.error('Failed to update ban status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) return toast.error('Only Prime Admins can delete users.');
    if (!passesGuard(userId, true)) return;
    if (!confirm('CRITICAL: Are you sure you want to PERMANENTLY delete this user data? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      await logAdminAction(currentUser!.uid, currentUser!.email!, 'SYSTEM_CONFIG_CHANGE', `Permanently deleted user record: ${userId}`, { id: userId, type: 'user' });
      toast.success('User record deleted from database.');
      onRefresh();
    } catch(e) { toast.error('Failed to delete user'); }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    if (currentUser?.role !== 'PRIME_ADMIN') return toast.error('Strict Clearance: Only Prime Admins can change hierarchy roles.');
    if (!passesGuard(userId, true)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role });
      await logAdminAction(currentUser!.uid, currentUser!.email!, 'USER_PROMOTE', `Updated user role to ${role} for ${userId}`, { id: userId, type: 'user' }, { role });
      toast.success(`User clearance updated to ${role}!`);
      onRefresh();
    } catch (e) { toast.error('Failed to change role'); }
  };

  const handleRevokeVerification = async (userId: string) => {
    if (!passesGuard(userId)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { 
        isVerifiedCarrier: false,
        'verification.status': 'rejected'
      });
      await logAdminAction(currentUser!.uid, currentUser!.email!, 'USER_DEMOTE', `Revoked verification status for ${userId}`, { id: userId, type: 'user' });
      toast.success('Verification removed.');
      onRefresh();
    } catch (e) { toast.error('Failed to remove verification'); }
  };

  const handleTransferAuthority = async (targetId: string) => {
    if (currentUser?.role !== 'PRIME_ADMIN') return;
    const target = getTarget(targetId);
    if (!target) return;

    const confirmation = prompt(`CRITICAL AUTHORITY TRANSFER: You are about to transfer GLOBAL CONTROL to ${target.displayName}. \n\nType "TRANSFER MANTLE" to confirm this irreversible action:`);
    
    if (confirmation !== 'TRANSFER MANTLE') {
      toast.error('Transfer aborted.');
      return;
    }

    try {
      // 1. Promote Target
      await updateDoc(doc(db, 'users', targetId), { role: 'PRIME_ADMIN' });
      // 2. Demote Self
      await updateDoc(doc(db, 'users', currentUser.uid), { role: 'admin' });
      
      await logAdminAction(currentUser.uid, currentUser.email!, 'SYSTEM_CONFIG_CHANGE', `TRANSFERRED PRIME AUTHORITY to ${targetId} (${target.email})`, { id: targetId, type: 'user' });
      
      toast.success('Mantle Transferred. You are now a System Admin.');
      onRefresh();
      window.location.reload(); // Force session refresh
    } catch (e) {
      toast.error('Critical Failure: Authority transfer interrupted.');
    }
  };

  return (
    <Card className="rounded-3xl border-slate-100 overflow-visible shadow-xl shadow-slate-100/50">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-black text-slate-900">User Matrix</CardTitle>
            <CardDescription>Reputation scores, overrides, and moderation tools.</CardDescription>
          </div>
          <Badge variant="outline" className="bg-white px-3 py-1 text-slate-500 font-bold border-slate-200">
            {users.length} Active Profiles
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-[2px] text-slate-400 bg-slate-50/20">
                <th className="px-6 py-4">Operative Identity</th>
                <th className="px-6 py-4">System Tier / Accuracy</th>
                <th className="px-6 py-4">Active Final Tier</th>
                <th className="px-6 py-4 whitespace-nowrap">Risk / Bans</th>
                <th className="px-6 py-4 text-right w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => {
                const isExpanded = expandedUser === u.uid;
                const accuracy = computeAccuracyScore(u);
                
                // Banner Configuration
                const tierKey = (u.finalTier || u.systemTier || 'NEW_USER') as keyof typeof TIER_CONFIG;
                const activeConfig = TIER_CONFIG[tierKey] || TIER_CONFIG.NEW_USER;
                
                // Indicators
                const hasActiveOverride = !!(u.adminOverride && u.adminOverride.tier);
                
                return (
                  <React.Fragment key={u.uid}>
                    {/* PRIMARY COMPACT ROW */}
                    <tr onClick={() => u.role !== 'PRIME_ADMIN' && setExpandedUser(isExpanded ? null : u.uid)} 
                        title={u.role === 'PRIME_ADMIN' ? 'This account is protected and cannot be modified' : ''}
                        className={`transition-colors group ${
                          u.role === 'PRIME_ADMIN' 
                            ? 'bg-gradient-to-r from-amber-50/50 to-white hover:from-amber-100/50 cursor-not-allowed' 
                            : 'cursor-pointer hover:bg-slate-50/50'
                        } ${isExpanded ? 'bg-slate-50/80 shadow-inner' : ''}`}>
                      {/* Identity */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-md shadow-slate-200 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black shadow-inner shrink-0 text-sm">
                              {u.displayName[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 text-sm leading-tight truncate">{u.displayName}</p>
                              {u.role === 'PRIME_ADMIN' && (
                                <div className="bg-gradient-to-r from-amber-200 to-amber-500 px-1.5 py-0.5 rounded-md text-[8px] font-black text-amber-950 border border-amber-300 shadow-sm flex items-center gap-1 uppercase tracking-tighter">👑 PRIME</div>
                              )}
                              {u.role === 'admin' && <Shield className="w-3.5 h-3.5 text-red-500" />}
                              {u.role === 'moderator' && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
                            </div>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate flex items-center gap-1.5">
                              {u.email}
                              {u.role === 'PRIME_ADMIN' && <span className="text-amber-600 font-bold flex items-center text-[9px]"><Lock className="w-2.5 h-2.5 mr-0.5" /> Protected</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Math Score */}
                      <td className="px-6 py-5 align-middle">
                        <div className="flex flex-col gap-1.5 w-32">
                           <div className="flex justify-between items-center text-[11px] font-bold">
                             <span className="text-slate-500">{u.systemTier || 'NEW_USER'}</span>
                             <span className={accuracy >= 75 ? 'text-emerald-600' : accuracy >= 50 ? 'text-amber-600' : 'text-slate-400'}>{accuracy}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div 
                               className={`h-full rounded-full transition-all duration-1000 ${accuracy >= 75 ? 'bg-emerald-500' : accuracy >= 50 ? 'bg-amber-500' : accuracy > 0 ? 'bg-blue-400' : 'bg-slate-300'}`}
                               style={{ width: `${accuracy}%` }}
                             />
                           </div>
                        </div>
                      </td>

                      {/* Final Active Tier */}
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-2">
                           <span className={`px-2.5 py-1 text-[11px] font-black uppercase rounded-lg border ${activeConfig.badgeClass} flex items-center gap-1.5`}>
                             <activeConfig.icon className="w-3 h-3" />
                             {activeConfig.label}
                           </span>
                           {hasActiveOverride && (
                             <div title="Manual Admin Override Active" className="p-1 bg-violet-100 text-violet-600 rounded-md ring-1 ring-violet-200">
                               <Lock className="w-3 h-3" />
                             </div>
                           )}
                        </div>
                      </td>

                      {/* Risk Level & Ban */}
                      <td className="px-6 py-5 align-middle">
                         {u.ban?.status === 'PERM' || u.isPermanentlyBanned ? (
                           <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 uppercase font-black text-[10px]">Perma-Banned</Badge>
                         ) : u.ban?.status === 'TEMP' && (!u.ban.expiresAt || new Date(u.ban.expiresAt) > new Date()) ? (
                           <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 uppercase font-black text-[10px] flex gap-1 items-center">
                             <AlertTriangle className="w-3 h-3" /> Suspended
                           </Badge>
                         ) : u.cancelledTasks && u.cancelledTasks > 5 ? (
                           <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase font-black text-[10px] flex gap-1 items-center">
                             <AlertTriangle className="w-3 h-3" /> High Risk
                           </Badge>
                         ) : (
                           <span className="text-slate-300 text-xs font-bold">—</span>
                         )}
                      </td>

                      {/* Chevron Action */}
                      <td className="px-6 py-4 align-middle text-right">
                        {u.role !== 'PRIME_ADMIN' ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" asChild className="h-7 text-[9px] font-black text-slate-500 border-slate-200 uppercase tracking-widest px-3">
                            <a href={`/user/${u.uid}`}>Intel</a>
                          </Button>
                        )}
                      </td>
                    </tr>

                    {/* EXPANDABLE DETAIL ROW */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={5} className="p-0 border-b border-slate-100">
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                                
                                {/* Raw Stats */}
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Raw Mission Stats</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm text-center">
                                      <p className="text-xs text-slate-500 font-semibold mb-1">Delivered</p>
                                      <p className="text-xl font-black text-emerald-600">{u.completedTasks || 0}</p>
                                    </div>
                                    <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm text-center">
                                      <p className="text-xs text-slate-500 font-semibold mb-1">Cancelled</p>
                                      <p className="text-xl font-black text-red-500">{u.cancelledTasks || 0}</p>
                                    </div>
                                    <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm text-center">
                                      <p className="text-xs text-slate-500 font-semibold mb-1">Late Arrivals</p>
                                      <p className="text-xl font-black text-amber-500">{u.lateTasks || 0}</p>
                                    </div>
                                    <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm text-center">
                                      <p className="text-xs text-slate-500 font-semibold mb-1">Low Ratings</p>
                                      <p className="text-xl font-black text-orange-500">{u.lowRatingTasks || 0}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Reputation Overrides */}
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Reputation Control</h4>
                                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                                     <p className="text-xs font-semibold text-slate-600 mb-2">Assign Manual Tier (Overrides Math)</p>
                                     <div className="flex gap-2 flex-wrap">
                                        <Button size="sm" onClick={() => handleSetOverride(u.uid, 'ELITE', null)} className="bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 text-[10px] h-7">Set Elite</Button>
                                        <Button size="sm" onClick={() => handleSetOverride(u.uid, 'TRUSTED', null)} className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[10px] h-7">Set Trusted</Button>
                                        <Button size="sm" onClick={() => handleSetOverride(u.uid, 'STARTER', null)} className="bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 text-[10px] h-7">Set Starter</Button>
                                     </div>
                                     {hasActiveOverride && (
                                       <Button size="sm" onClick={() => handleResetOverride(u.uid)} variant="outline" className="mt-2 text-violet-600 border-violet-200 hover:bg-violet-50 text-[10px] h-8 w-full">
                                         <RotateCcw className="w-3 h-3 mr-1" /> Reset to Mathematical Tier
                                       </Button>
                                     )}
                                  </div>
                                </div>

                                {/* Discipline & Bans */}
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Disciplinary Actions</h4>
                                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex flex-col gap-2">
                                     {u.ban?.status !== 'NONE' && (u.ban?.status === 'PERM' || u.isPermanentlyBanned || u.ban?.status === 'TEMP') ? (
                                        <div className="text-center">
                                           <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                                           <p className="text-xs font-black text-red-600 mb-3 uppercase">Account Restricted</p>
                                           <Button onClick={() => handleSetBan(u.uid, 'NONE')} size="sm" variant="outline" className="w-full bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8">
                                             Lift Ban / Restore Access
                                           </Button>
                                        </div>
                                     ) : (
                                        <>
                                          <p className="text-xs font-semibold text-slate-600 mb-1">Issue Sanctions</p>
                                          <div className="grid grid-cols-2 gap-2">
                                            <Button size="sm" onClick={() => handleSetBan(u.uid, 'TEMP', 3)} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50 bg-white text-[10px] h-8">3 Day Ban</Button>
                                            <Button size="sm" onClick={() => handleSetBan(u.uid, 'TEMP', 7)} variant="outline" className="text-orange-700 border-orange-200 hover:bg-orange-50 bg-white text-[10px] h-8">7 Day Ban</Button>
                                            <Button size="sm" onClick={() => handleSetBan(u.uid, 'PERM')} variant="destructive" className="col-span-2 text-[10px] font-black h-8 bg-red-600 hover:bg-red-700">
                                              <Ban className="w-3 h-3 mr-1" /> CRITICAL: PERMA-BAN
                                            </Button>
                                          </div>
                                        </>
                                     )}
                                  </div>
                                </div>

                                {/* Access & Clearance */}
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Access & Clearance</h4>
                                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                                     <p className="text-xs font-semibold text-slate-600 mb-1">Clearance Controls</p>
                                     <div className="flex flex-col gap-2">
                                        {currentUser?.role === 'PRIME_ADMIN' && u.role !== 'PRIME_ADMIN' && (
                                          <>
                                            {u.role !== 'admin' && (
                                              <Button size="sm" onClick={() => handleChangeRole(u.uid, 'admin')} variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 bg-white text-[10px] h-8 justify-start">
                                                <ShieldCheck className="w-3 h-3 mr-1.5" /> Promote to Admin
                                              </Button>
                                            )}
                                            {u.role !== 'moderator' && u.role !== 'admin' && (
                                              <Button size="sm" onClick={() => handleChangeRole(u.uid, 'moderator')} variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-white text-[10px] h-8 justify-start">
                                                <ShieldAlert className="w-3 h-3 mr-1.5" /> Promote to Moderator
                                              </Button>
                                            )}
                                            {u.role === 'admin' && (
                                              <Button size="sm" onClick={() => handleChangeRole(u.uid, 'moderator')} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50 bg-white text-[10px] h-8 justify-start">
                                                <Shield className="w-3 h-3 mr-1.5" /> Demote to Moderator
                                              </Button>
                                            )}
                                            {(u.role === 'admin' || u.role === 'moderator') && (
                                              <Button size="sm" onClick={() => handleChangeRole(u.uid, 'user')} variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50 bg-white text-[10px] h-8 justify-start">
                                                <UserMinus className="w-3 h-3 mr-1.5" /> Demote to User
                                              </Button>
                                            )}
                                          </>
                                        )}
                                        {u.isVerifiedCarrier && (
                                          <Button size="sm" onClick={() => handleRevokeVerification(u.uid)} variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 bg-white text-[10px] h-8 justify-start">
                                            <UserMinus className="w-3 h-3 mr-1.5" /> Revoke Verification
                                          </Button>
                                        )}
                                          <Button size="sm" onClick={() => handleDeleteUser(u.uid)} variant="ghost" className="w-full text-slate-500 hover:text-red-600 hover:bg-red-50 text-[10px] font-bold h-8 justify-start">
                                            <Trash2 className="w-3 h-3 mr-1.5" /> Force Delete Record
                                          </Button>
                                          {currentUser?.role === 'PRIME_ADMIN' && u.role !== 'PRIME_ADMIN' && (
                                            <Button size="sm" onClick={() => handleTransferAuthority(u.uid)} variant="ghost" className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 text-[10px] font-black h-8 justify-start border-t border-slate-100 rounded-none mt-1">
                                              <Shield className="w-3 h-3 mr-1.5" /> Transfer Prime Authority
                                            </Button>
                                          )}
                                        </div>
                                     </div>
                                  </div>
                                </div>

                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium">
              No operative data found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
