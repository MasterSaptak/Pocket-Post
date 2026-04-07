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
    bounty: 500,
    priorityLevel: 'critical',
    parcelType: 'document',
    weight: 0.5,
    bidsCount: 4,
    followsCount: 12,
    viewsCount: 87,
  },
  {
    title: 'Pick up custom cake for a wedding',
    description: 'Looking for someone with a car to transport a delicate 3-tier wedding cake. The bakery is in Silver Lake and the venue is in Malibu. Extremely fragile!',
    location: 'Los Angeles, CA',
    deadlineDays: 3,
    bounty: 1200,
    priorityLevel: 'priority',
    parcelType: 'fragile',
    weight: 8,
    bidsCount: 2,
    followsCount: 8,
    viewsCount: 45,
  },
  {
    title: 'Drop off forgotten laptop at airport',
    description: 'I left my work laptop at a coffee shop near the terminal! Need someone already at JFK Airport (Terminal 4) to grab it from the lost and found and meet me at the security gate ASAP.',
    location: 'JFK Airport, Terminal 4',
    deadlineDays: 0,
    bounty: 300,
    priorityLevel: 'urgent',
    parcelType: 'other',
    weight: 2,
    bidsCount: 7,
    followsCount: 22,
    viewsCount: 156,
  },
  {
    title: 'Move 5 boxes of vintage records',
    description: 'Need help transporting 5 heavy boxes of vinyl records from my old apartment to my new house. No stairs involved, but a vehicle is required.',
    location: 'Austin, TX',
    deadlineDays: 7,
    bounty: 800,
    priorityLevel: 'standard',
    parcelType: 'other',
    weight: 25,
    bidsCount: 1,
    followsCount: 3,
    viewsCount: 19,
  },
  {
    title: 'Deliver medication to elderly parents',
    description: 'My parents ran out of their prescription and I am out of town. The pharmacy has it ready for pickup. Need someone trustworthy to deliver it directly to their door.',
    location: 'Chicago, IL',
    deadlineDays: 0,
    bounty: 250,
    priorityLevel: 'critical',
    parcelType: 'other',
    weight: 0.3,
    bidsCount: 9,
    followsCount: 31,
    viewsCount: 201,
  },
  {
    title: 'Fresh sushi platter for office party',
    description: 'Ordering a large sushi platter from our favorite restaurant. Need it delivered fresh and kept cold. The restaurant will have it ready by 11:30 AM.',
    location: 'San Francisco, CA',
    deadlineDays: 2,
    bounty: 450,
    priorityLevel: 'priority',
    parcelType: 'food',
    weight: 3,
    bidsCount: 3,
    followsCount: 6,
    viewsCount: 38,
  },
  {
    title: 'Fragile antique vase transport',
    description: 'A rare Ming dynasty replica vase needs to be moved from my gallery to an auction house. Must be bubble-wrapped and handled with extreme care. Insurance provided.',
    location: 'London, UK',
    deadlineDays: 5,
    bounty: 3000,
    priorityLevel: 'urgent',
    parcelType: 'fragile',
    weight: 4,
    bidsCount: 6,
    followsCount: 18,
    viewsCount: 112,
  },
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
          deadlineTimestamp: deadline.getTime(),
          createdBy: user.uid,
          createdByName: profile?.displayName || user.displayName || 'Demo User',
          status: 'pending',
          assignedTo: null,
          reactionCount: 0,
          bounty: task.bounty,
          priorityLevel: task.priorityLevel,
          parcelType: task.parcelType,
          weight: task.weight,
          bidsCount: task.bidsCount,
          followsCount: task.followsCount,
          viewsCount: task.viewsCount,
          createdAt: serverTimestamp(),
        });
        successCount++;
      } catch (error) {
        console.error('Failed to create task:', error);
      }
    }

    setSeeding(false);

    if (successCount === DEMO_TASKS.length) {
      toast.success(`Successfully added ${DEMO_TASKS.length} demo tasks!`);
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
            Instantly generate {DEMO_TASKS.length} realistic demo tasks with bounties, priorities, and parcel types.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl mb-6 text-sm text-slate-600">
            <p><strong>Note:</strong> You must be signed in. These tasks will be created under your current user account ({user?.email || 'Not logged in'}).</p>
            <ul className="mt-2 text-xs text-slate-500 space-y-1">
              <li>• Includes bounty amounts (₹250–₹3000)</li>
              <li>• All priority levels (Standard → Critical)</li>
              <li>• Parcel types: Documents, Fragile, Food, Other</li>
              <li>• Simulated bids, follows, and view counts</li>
            </ul>
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
              `Simulate ${DEMO_TASKS.length} Demo Tasks`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
