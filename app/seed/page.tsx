'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Database } from 'lucide-react';

const DEMO_TASKS = [
  {
    title: 'Deliver urgent documents to downtown office',
    description: 'Need a verified carrier to pick up a sealed envelope of legal documents from Brooklyn and deliver it to Manhattan before 5 PM today. Will hand directly to receptionist.',
    location: 'Brooklyn → Manhattan, NY',
    deadlineDays: 1,
  },
  {
    title: 'Pick up custom cake for a wedding',
    description: 'Looking for someone with a car to transport a delicate 3-tier wedding cake. The bakery is in Silver Lake and the venue is in Malibu. Extremely fragile!',
    location: 'Los Angeles, CA',
    deadlineDays: 3,
  },
  {
    title: 'Drop off forgotten laptop at airport',
    description: 'I left my work laptop at a coffee shop near the terminal! Need someone already at JFK Airport (Terminal 4) to grab it from the lost and found and meet me at the security gate ASAP.',
    location: 'JFK Airport, Terminal 4',
    deadlineDays: 0,
  },
  {
    title: 'Move 5 boxes of vintage records',
    description: 'Need help transporting 5 heavy boxes of vinyl records from my old apartment to my new house. No stairs involved, but a vehicle is required.',
    location: 'Austin, TX',
    deadlineDays: 7,
  },
  {
    title: 'Deliver medication to elderly parents',
    description: 'My parents ran out of their prescription and I am out of town. The pharmacy has it ready for pickup. Need someone trustworthy to deliver it directly to their door.',
    location: 'Chicago, IL',
    deadlineDays: 0,
  }
];

export default function SeedPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);

  const handleSeedDocs = async () => {
    if (!user) {
      toast.error('You must be logged in to create demo data.');
      return;
    }

    setSeeding(true);
    let successCount = 0;

    for (const task of DEMO_TASKS) {
      try {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + task.deadlineDays);

        await addDoc(collection(db, 'tasks'), {
          title: task.title,
          description: task.description,
          location: task.location,
          deadline: deadline,
          createdBy: user.uid,
          createdByName: profile?.displayName || user.displayName || 'Demo User',
          status: 'pending',
          assignedTo: null,
          reactionCount: 0, // Must be exactly 0 to pass Firestore rules!
          createdAt: serverTimestamp(),
        });
        successCount++;
      } catch (error) {
        console.error('Failed to create task:', error);
      }
    }

    setSeeding(false);
    
    if (successCount === DEMO_TASKS.length) {
      toast.success('Successfully added 5 demo tasks!');
      router.push('/feed');
    } else {
      toast.error(`Only added ${successCount} tasks due to an error.`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <Card className="max-w-md w-full border-blue-100 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Demo Data Seeder</CardTitle>
          <CardDescription>
            Instantly generate 5 realistic demo tasks for the PocketPost feed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl mb-6 text-sm text-slate-600">
            <p><strong>Note:</strong> You must be signed in. These tasks will be created under your current user account ({user?.email || 'Not logged in'}).</p>
          </div>
          <Button 
            onClick={handleSeedDocs} 
            disabled={seeding || !user}
            className="w-full h-12"
            variant="signature"
          >
            {seeding ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Data...
              </span>
            ) : (
              'Simulate 5 Demo Tasks'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
