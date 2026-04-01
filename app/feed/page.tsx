'use client';

import { useState, useCallback, memo } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useDataCache } from '@/lib/data-cache';
import { RequestCard, RequestData } from '@/components/request-card';
import { motion } from 'motion/react';
import { toast } from 'sonner';

// Memoized list to prevent re-renders when parent state changes
const RequestList = memo(function RequestList({
  requests,
  showApply,
  onApply,
  applyingId,
}: {
  requests: RequestData[];
  showApply: boolean;
  onApply: (id: string) => void;
  applyingId: string | null;
}) {
  return (
    <div className="grid gap-6">
      {requests.map((request, index) => (
        <motion.div
          key={request.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.05, 0.3) }}
        >
          <RequestCard
            request={request}
            showApplyButton={showApply}
            onApply={onApply}
            isApplying={applyingId === request.id}
          />
        </motion.div>
      ))}
    </div>
  );
});

export default function FeedPage() {
  const { user, profile } = useAuth();
  const { feedRequests, feedLoading } = useDataCache();
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleApply = useCallback(async (requestId: string) => {
    if (!user || profile?.role !== 'carrier') {
      toast.error('You must be a verified carrier to apply.');
      return;
    }

    setApplyingId(requestId);
    try {
      await addDoc(collection(db, 'applications'), {
        requestId,
        carrierId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Failed to submit application.');
    } finally {
      setApplyingId(null);
    }
  }, [user, profile?.role]);

  if (feedLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-8" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-slate-900">Available Deliveries</h1>
        <p className="text-slate-500 mt-2">Verified requests waiting for a carrier.</p>
      </div>

      {!user ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Sign in to view requests</h2>
          <p className="text-slate-500">You need an account to browse and apply for deliveries.</p>
        </div>
      ) : feedRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500">No approved requests available at the moment.</p>
        </div>
      ) : (
        <RequestList
          requests={feedRequests}
          showApply={profile?.role === 'carrier'}
          onApply={handleApply}
          applyingId={applyingId}
        />
      )}
    </div>
  );
}
