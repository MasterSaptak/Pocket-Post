'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, MapPin, Calendar, Loader2, AlignLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function PostTaskPage() {
  const { user, profile, loading, isAuthorized } = useProtectedRoute();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    deadline: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be signed in to post a task.');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim() || null,
        deadline: formData.deadline ? new Date(formData.deadline) : null,
        createdBy: user.uid,
        createdByName: profile?.displayName || user.displayName || 'Anonymous',
        status: 'pending',
        assignedTo: null,
        reactionCount: 0,
        createdAt: serverTimestamp(),
      });

      toast.success('Task posted successfully! 🎉');
      router.push('/feed');
    } catch (error) {
      console.error('Error posting task:', error);
      toast.error('Failed to post task.');
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
      className="max-w-2xl mx-auto px-4 pt-24 pb-24 lg:pt-32 lg:pb-12"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-slate-900">Create a Task</h1>
        <p className="text-slate-500 mt-2">Post a task for verified carriers to discover and apply.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
          <CardDescription>Provide clear details so carriers know what to expect.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g., Deliver package from NYC to LA"
                    value={formData.title}
                    onChange={handleChange}
                    maxLength={120}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <textarea
                    name="description"
                    required
                    placeholder="Describe the task, requirements, and any important details..."
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    maxLength={1000}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1 text-right">{formData.description.length}/1000</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Location <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="location"
                      placeholder="City, Country"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Deadline <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" variant="signature" size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting...
                </>
              ) : (
                'Post Task'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
