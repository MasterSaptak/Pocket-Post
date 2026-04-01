'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, Trash2, Clock, MapPin, AlignLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { TaskData } from '@/components/task-card';

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params?.id as string;
  
  const { user, profile } = useAuth();
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Local state for editing
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!taskId) return;
    
    const fetchTask = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'tasks', taskId));
        if (docSnap.exists()) {
          const data = docSnap.data() as TaskData;
          
          // Permission check: Owner or Moderator+
          const isOwner = user?.uid === data.createdBy;
          const isMod = profile?.role === 'admin' || profile?.role === 'moderator';
          
          if (!isOwner && !isMod) {
            toast.error('You do not have permission to edit this mission.');
            router.push('/feed');
            return;
          }

          setTask({ id: docSnap.id, ...data });
          setTitle(data.title);
          setDescription(data.description);
          setLocation(data.location || '');
        } else {
          toast.error('Mission data not found on encrypted frequency.');
          router.push('/feed');
        }
      } catch (error) {
        toast.error('Connection to mission matrix failed.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [taskId, user, profile, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId) return;
    setSaving(true);
    
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        title,
        description,
        location,
        updatedAt: new Date(),
      });
      toast.success('Mission data updated successfully.');
      router.back();
    } catch (error) {
      toast.error('Failed to commit changes to the matrix.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Intel Matrix...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        onClick={() => router.back()} 
        className="mb-6 rounded-xl text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Base
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="rounded-3xl border-slate-100 shadow-xl shadow-blue-100/20 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <h1 className="text-3xl font-black tracking-tight">Modify Mission</h1>
            <p className="text-blue-100 opacity-80 text-sm">Target: #{taskId.slice(0, 8)}</p>
          </div>
          
          <CardContent className="p-8">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                   <Clock className="w-3.5 h-3.5" /> Mission Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                   <MapPin className="w-3.5 h-3.5" /> Operations Zone
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                   <AlignLeft className="w-3.5 h-3.5" /> Strategic Intel
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-900 min-h-[160px]"
                  required
                />
              </div>

              <div className="pt-4 space-y-4">
                <Button 
                   type="submit" 
                   disabled={saving} 
                   variant="signature" 
                   className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <>
                      <Save className="w-5 h-5 mr-2" /> Commit Changes
                    </>
                  )}
                </Button>
                
                <p className="text-center text-[10px] uppercase font-black text-slate-300 tracking-[0.2em]">
                  Authorised Operation Only
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
