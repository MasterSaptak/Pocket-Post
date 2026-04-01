'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Package, MapPin, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function PostRequestPage() {
  const { user, profile, loading, isAuthorized } = useProtectedRoute();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    itemCategory: '',
    pickupLocation: '',
    dropLocation: '',
    deadline: '',
    reward: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be signed in to post a request.');
      return;
    }

    if (profile?.role !== 'requester' && profile?.role !== 'admin') {
      toast.error('Only requesters can post delivery requests.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'requests'), {
        requesterId: user.uid,
        itemCategory: formData.itemCategory,
        pickupLocation: formData.pickupLocation,
        dropLocation: formData.dropLocation,
        deadline: new Date(formData.deadline),
        reward: Number(formData.reward),
        status: 'requested',
        createdAt: serverTimestamp(),
      });

      toast.success('Request posted successfully! Waiting for admin approval.');
      router.push('/profile');
    } catch (error) {
      console.error('Error posting request:', error);
      toast.error('Failed to post request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-slate-900">Post a Delivery Request</h1>
        <p className="text-slate-500 mt-2">Your request will be reviewed by an admin before being assigned to a verified carrier.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Details</CardTitle>
          <CardDescription>All fields are required for admin review.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Category</label>
                <div className="relative">
                  <Package className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <select
                    name="itemCategory"
                    required
                    value={formData.itemCategory}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="" disabled>Select category</option>
                    <option value="Documents">Documents</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="pickupLocation"
                      required
                      placeholder="City, Country"
                      value={formData.pickupLocation}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Drop-off Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="dropLocation"
                      required
                      placeholder="City, Country"
                      value={formData.dropLocation}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      name="deadline"
                      required
                      value={formData.deadline}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reward (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      name="reward"
                      min="10"
                      required
                      placeholder="50"
                      value={formData.reward}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" variant="signature" size="lg" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting...</>
              ) : (
                'Submit Request'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
