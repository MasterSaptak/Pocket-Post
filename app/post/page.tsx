'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  FileText, MapPin, Loader2, AlignLeft, DollarSign, Package, Weight,
  ChevronDown, CheckCircle2, Clock, Send, ShieldAlert, Sparkles, Navigation,
  Image as ImageIcon, Box, AlertTriangle, Zap, Check, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCard, type PriorityLevel, type ParcelType, type TaskData } from '@/components/task-card';
import { addDays, format, startOfToday, setHours, setMinutes } from 'date-fns';

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string; desc: string; color: string; bg: string }[] = [
  { value: 'standard', label: 'Standard', desc: 'Normal processing', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
  { value: 'priority', label: 'Priority', desc: 'Faster pickup', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  { value: 'urgent', label: 'Urgent', desc: 'Same-day delivery', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-300' },
  { value: 'critical', label: 'Critical', desc: 'Immediate action', color: 'text-red-700', bg: 'bg-red-50 border-red-400' },
];

const PARCEL_SIZES = [
  { value: 'small', label: 'Small', desc: 'Hand-held (e.g., keys, docs)', icon: '📱' },
  { value: 'medium', label: 'Medium', desc: 'Standard box (e.g., clothes)', icon: '📦' },
  { value: 'large', label: 'Large', desc: 'Bulky item (e.g., furniture)', icon: '🚚' },
];

const CURRENCIES = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'BDT', label: 'BDT (৳)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

export default function PostTaskPage() {
  const { user, profile, loading, isAuthorized } = useProtectedRoute();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupTime: '',
    dropoffTime: '',
    bounty: '',
    currency: 'INR',
    weight: '0.5',
    priorityLevel: 'standard' as PriorityLevel,
    parcelType: 'other' as ParcelType,
    size: 'medium' as 'small' | 'medium' | 'large',
    pricingType: 'fixed' as 'fixed' | 'bidding',
    isFragile: false,
    isBoosted: false,
  });

  // ─── Smart Estimation Logic ────────────────────────────────────
  const suggestedBounty = useMemo(() => {
    const base = formData.currency === 'INR' ? 100 : formData.currency === 'BDT' ? 150 : 5;
    const weightFactor = parseFloat(formData.weight || '0') * (formData.currency === 'INR' ? 20 : 1);
    const sizeFactor = formData.size === 'large' ? 1.5 : formData.size === 'medium' ? 1.2 : 1;
    const priorityFactor = formData.priorityLevel === 'critical' ? 2 : formData.priorityLevel === 'urgent' ? 1.5 : 1;
    
    const minVal = Math.floor(base * sizeFactor * priorityFactor + weightFactor);
    return { min: minVal, max: Math.floor(minVal * 1.5) };
  }, [formData.weight, formData.size, formData.priorityLevel, formData.currency]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleQuickDeadline = (type: 'today' | 'tomorrow' | 'week') => {
    const now = new Date();
    let target = now;
    if (type === 'today') target = setHours(setMinutes(now,  59), 23);
    else if (type === 'tomorrow') target = addDays(now, 1);
    else if (type === 'week') target = addDays(now, 7);

    setFormData(prev => ({
      ...prev,
      dropoffTime: format(target, "yyyy-MM-dd'T'HH:mm"),
      pickupTime: prev.pickupTime || format(now, "yyyy-MM-dd'T'HH:mm")
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user) return toast.error('Sign in required');
    if (!formData.title || !formData.pickupLocation || !formData.dropoffLocation) {
      return toast.error('Basic task info is required');
    }

    setSubmitting(true);
    try {
      const pickupDate = formData.pickupTime ? new Date(formData.pickupTime) : null;
      const dropoffDate = formData.dropoffTime ? new Date(formData.dropoffTime) : null;

      await addDoc(collection(db, 'tasks'), {
        ...formData,
        bounty: parseFloat(formData.bounty || '0'),
        weight: parseFloat(formData.weight || '0.5'),
        pickupTime: pickupDate,
        dropoffTime: dropoffDate,
        deadline: dropoffDate,
        createdBy: user.uid,
        createdByName: profile?.displayName || user.displayName || 'Anonymous',
        status: 'pending',
        reactionCount: 0,
        bidsCount: 0,
        followsCount: 0,
        viewsCount: 0,
        createdAt: serverTimestamp(),
      });

      toast.success('Task deployed successfully! 🚀');
      router.push('/feed');
    } catch (err) {
      console.error(err);
      toast.error('Deployment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const dummyPreviewData: TaskData = {
    id: 'preview',
    ...formData,
    bounty: parseFloat(formData.bounty || '0'),
    weight: parseFloat(formData.weight || '0.5'),
    createdAt: new Date().toISOString(),
    status: 'pending',
    createdBy: user?.uid || '',
    createdByName: profile?.displayName || 'Your Profile',
    reactionCount: 0,
    deadline: formData.dropoffTime || null
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-32 overflow-x-hidden">
      
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 -right-20 w-[500px] h-[500px] bg-blue-100 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-emerald-100 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-wider mb-3">
              <Zap className="w-3.5 h-3.5" /> Premium Task Creator
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Create a <span className="text-blue-600">Task</span>
            </h1>
            <p className="text-slate-500 font-medium mt-2">Scale your needs to a network of professionals.</p>
          </div>
          
          <div className="flex gap-3">
             <button 
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-5 h-12 rounded-2xl font-bold transition-all ${
                  showPreview ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
             >
               <Eye className="w-5 h-5" /> {showPreview ? 'Hide Preview' : 'Show Preview'}
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Form Area */}
          <div className="lg:col-span-12 space-y-8">
            
            {/* 1. Task Basics */}
            <Section icon={<FileText className="text-blue-500" />} title="Task Details">
              <div className="grid gap-6">
                <InputGroup label="Task Title" required icon={<FileText className="text-slate-400" />}>
                   <input 
                      type="text" name="title" required value={formData.title} onChange={handleChange}
                      placeholder="What needs to be done? (e.g. Parcel delivery)"
                      className="input-base" style={{ paddingLeft: '3.2rem' }}
                    />
                </InputGroup>
                <InputGroup label="Instructions / Description" icon={<AlignLeft className="text-slate-400" />}>
                   <textarea 
                      name="description" value={formData.description} onChange={handleChange}
                      placeholder="Detailed requirements, pickup guidelines, etc..." rows={3}
                      className="input-base resize-none" style={{ paddingLeft: '3.2rem' }}
                    />
                </InputGroup>
              </div>
            </Section>

            {/* 2. Parcel Details */}
            <Section icon={<Package className="text-emerald-500" />} title="Parcel Specification">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup label="Parcel Size">
                    <div className="grid grid-cols-3 gap-2">
                       {PARCEL_SIZES.map(s => (
                         <button 
                            key={s.value} type="button"
                            onClick={() => setFormData(p => ({...p, size: s.value as any}))}
                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                              formData.size === s.value ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                            }`}
                         >
                           <span className="text-xl mb-1">{s.icon}</span>
                           <span className="text-[10px] font-black uppercase text-center">{s.label}</span>
                         </button>
                       ))}
                    </div>
                  </InputGroup>
                  <InputGroup label="Mass (kg)" icon={<Weight className="text-slate-400" />}>
                        <input 
                          type="number" name="weight" step="0.1" value={formData.weight} onChange={handleChange}
                          className="input-base" style={{ paddingLeft: '3.2rem' }}
                        />
                  </InputGroup>
               </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mt-6 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer group shrink-0">
                       <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          formData.isFragile ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-100' : 'border-slate-200 bg-white'
                       }`}>
                          <input type="checkbox" name="isFragile" checked={formData.isFragile} onChange={handleChange} className="hidden" />
                          {formData.isFragile && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                       </div>
                       <span className="text-sm font-bold text-slate-700 group-hover:text-red-600 transition-colors flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Items are Fragile
                       </span>
                    </label>
                    <div className="hidden sm:block h-6 w-px bg-slate-200" />
                    <button type="button" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors py-1 px-2 rounded-lg hover:bg-blue-50 w-fit">
                       <ImageIcon className="w-4 h-4" />
                       <span className="text-[11px] font-black uppercase tracking-wider">Add Item Photos</span>
                    </button>
                  </div>
            </Section>

            {/* 3. Logistics Intelligence */}
            <Section icon={<Navigation className="text-indigo-500" />} title="Locations & Schedule">
               <div className="grid md:grid-cols-2 gap-6">
                  <InputGroup label="Pickup Location" required icon={<MapPin className="text-emerald-500" />}>
                     <input 
                        type="text" name="pickupLocation" required value={formData.pickupLocation} onChange={handleChange}
                        placeholder="Search for pickup address..." className="input-base" style={{ paddingLeft: '3.2rem' }}
                      />
                  </InputGroup>
                  <InputGroup label="Drop-off Location" required icon={<MapPin className="text-blue-500" />}>
                     <input 
                        type="text" name="dropoffLocation" required value={formData.dropoffLocation} onChange={handleChange}
                        placeholder="Search for destination..." className="input-base" style={{ paddingLeft: '3.2rem' }}
                      />
                  </InputGroup>
               </div>
               <div className="mt-8 grid md:grid-cols-2 gap-8">
                  <InputGroup label="Handling Window" icon={<Clock className="text-emerald-500" />}>
                    <input type="datetime-local" name="pickupTime" value={formData.pickupTime} onChange={handleChange} className="input-base md:text-sm" style={{ paddingLeft: '3.2rem' }} />
                  </InputGroup>
                  
                  <div className="space-y-4">
                    <InputGroup label="Delivery Deadline" icon={<Clock className="text-blue-500" />}>
                      <input type="datetime-local" name="dropoffTime" value={formData.dropoffTime} onChange={handleChange} className="input-base md:text-sm" style={{ paddingLeft: '3.2rem' }} />
                    </InputGroup>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['today', 'tomorrow', 'week'].map(t => (
                        <button 
                          key={t} type="button" onClick={() => handleQuickDeadline(t as any)}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase hover:bg-slate-200 transition-all hover:scale-105 active:scale-95"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
               </div>
            </Section>

            {/* 4. Pricing & Urgency */}
            <Section icon={<DollarSign className="text-amber-500" />} title="Bounty & Priority">
               <div className="grid md:grid-cols-2 gap-8 items-start">
                  
                  <div className="space-y-6">
                     <div className="flex rounded-2xl bg-white border border-slate-200 p-1 mb-4 shadow-sm">
                        {['fixed', 'bidding'].map(type => (
                          <button 
                             key={type} type="button"
                             onClick={() => setFormData(p => ({...p, pricingType: type as any}))}
                             className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                               formData.pricingType === type ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                             }`}
                          >
                             {type === 'fixed' ? 'Fixed Price' : 'Open for Bids ⚡'}
                          </button>
                        ))}
                     </div>

                     <div className={`rounded-3xl p-6 transition-all duration-500 ${
                        formData.pricingType === 'bidding' ? 'bg-slate-900 border-slate-800' : 'bg-emerald-50 border-emerald-200 border'
                     }`}>
                        <div className="flex items-center justify-between mb-4">
                           <h4 className={`text-xs font-black uppercase ${formData.pricingType === 'bidding' ? 'text-slate-400' : 'text-emerald-700'}`}>
                             {formData.pricingType === 'bidding' ? 'Starting Bid' : 'Set Reward'}
                           </h4>
                           <select 
                            name="currency" value={formData.currency} onChange={handleChange}
                            className={`bg-transparent font-bold outline-none cursor-pointer text-sm ${formData.pricingType === 'bidding' ? 'text-white' : 'text-emerald-900'}`}
                            >
                              {CURRENCIES.map(c => <option key={c.value} value={c.value} className="bg-white text-slate-900">{c.label}</option>)}
                           </select>
                        </div>
                        <div className="flex items-baseline gap-2">
                           <span className={`text-2xl font-black ${formData.pricingType === 'bidding' ? 'text-white' : 'text-emerald-900'}`}>
                             {formData.currency === 'USD' ? '$' : formData.currency === 'BDT' ? '৳' : '₹'}
                           </span>
                           <input 
                              type="number" name="bounty" value={formData.bounty} onChange={handleChange}
                              placeholder="500"
                              className={`w-full text-5xl font-black bg-transparent outline-none placeholder:opacity-20 ${
                                 formData.pricingType === 'bidding' ? 'text-white' : 'text-emerald-900'
                              }`}
                           />
                        </div>
                        
                        <div className={`mt-6 pt-4 border-t flex items-center justify-between ${
                           formData.pricingType === 'bidding' ? 'border-slate-800' : 'border-emerald-100'
                        }`}>
                           <span className={`text-[10px] font-bold uppercase tracking-widest ${
                              formData.pricingType === 'bidding' ? 'text-slate-500' : 'text-emerald-600'
                           }`}>Recommended Range</span>
                           <span className={`text-sm font-black ${
                              formData.pricingType === 'bidding' ? 'text-blue-400' : 'text-emerald-700'
                           }`}>
                              {formData.currency} {suggestedBounty.min} - {suggestedBounty.max}
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase text-slate-400 mb-2 block">Operational Urgency</label>
                    <div className="grid grid-cols-2 gap-3">
                       {PRIORITY_OPTIONS.map(opt => (
                         <button 
                            key={opt.value} type="button"
                            onClick={() => setFormData(p => ({...p, priorityLevel: opt.value as any}))}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center ${
                              formData.priorityLevel === opt.value ? `${opt.bg} border-current ${opt.color}` : 'bg-white border-slate-100 text-slate-500'
                            }`}
                         >
                            <span className="text-xs font-black uppercase tracking-tight">{opt.label}</span>
                            <span className="text-[9px] mt-0.5 opacity-70 font-semibold">{opt.desc}</span>
                         </button>
                       ))}
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({...p, isBoosted: !p.isBoosted}))}
                      className={`w-full mt-4 p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                        formData.isBoosted ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-100 text-blue-600'
                      }`}
                    >
                       <div className="flex items-center gap-3">
                          <Zap className={`w-5 h-5 ${formData.isBoosted ? 'fill-white' : 'fill-blue-600'}`} />
                          <div className="text-left">
                             <p className="text-xs font-black uppercase tracking-wider">Visibility Boost</p>
                             <p className={`text-[10px] font-medium ${formData.isBoosted ? 'text-blue-100' : 'text-slate-500'}`}>Pin Mission to Global Top</p>
                          </div>
                       </div>
                       {formData.isBoosted && <CheckCircle2 className="w-5 h-5" />}
                    </button>
                  </div>
               </div>
            </Section>

            {/* PREVIEW MODAL / SECTION */}
            <AnimatePresence>
               {showPreview && (
                 <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    className="p-8 bg-slate-900 rounded-3xl overflow-hidden relative"
                 >
                    <div className="absolute top-0 right-0 p-8">
                       <Eye className="text-white/20 w-12 h-12" />
                    </div>
                    <div className="relative z-10">
                       <h3 className="text-white text-xl font-black uppercase tracking-widest mb-8">Feed Appearance Intel</h3>
                       <div className="max-w-md">
                          <TaskCard task={dummyPreviewData} variant="featured" />
                       </div>
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>

            {/* Final Submission Card */}
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="text-slate-400 font-bold">{user?.email?.[0].toUpperCase()}</div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{profile?.displayName || 'Anonymous Post'}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                       <Sparkles className="w-3 h-3" /> Mission Quality Verified
                    </div>
                  </div>
               </div>

               <Button 
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="h-16 px-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black tracking-wide shadow-lg shadow-blue-200 transition-all active:scale-95 text-lg"
               >
                  {submitting ? <Loader2 className="animate-spin mr-3" /> : <Send className="w-5 h-5 mr-3" />}
                  LAUNCH MISSION
               </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <ShieldAlert className="w-4 h-4" /> Operations monitored for authenticity & compliance
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component Parts ───────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-100 group hover:border-slate-200 transition-colors"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-xl">
           {icon}
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function InputGroup({ label, required, children, icon }: { label: string; required?: boolean; children: React.ReactNode; icon?: React.ReactNode }) {
  const isTextarea = (children as any)?.type === 'textarea';

  return (
    <div className="space-y-2 group">
      <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
         {icon && (
           <div className={`absolute left-4 z-20 pointer-events-none flex items-center justify-center opacity-60 group-focus-within:opacity-100 transition-opacity w-6 h-6 ${isTextarea ? 'top-4' : 'top-1/2 -translate-y-1/2'}`}>
             {icon}
           </div>
         )}
         {children}
      </div>
    </div>
  );
}
