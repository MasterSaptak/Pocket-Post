'use client';

import { memo } from 'react';
import { format } from 'date-fns';
import { Package, MapPin, Calendar, DollarSign, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface RequestData {
  id: string;
  requesterId: string;
  itemCategory: string;
  pickupLocation: string;
  dropLocation: string;
  deadline: any; // Firestore timestamp
  reward: number;
  status: 'requested' | 'approved' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  assignedCarrierId?: string;
  createdAt: any;
}

interface RequestCardProps {
  request: RequestData;
  onApply?: (id: string) => void;
  showApplyButton?: boolean;
  isApplying?: boolean;
}

export const RequestCard = memo(function RequestCard({ request, onApply, showApplyButton = false, isApplying = false }: RequestCardProps) {
  const deadlineDate = request.deadline?.toDate ? request.deadline.toDate() : new Date(request.deadline);
  
  return (
    <Card className="overflow-hidden group hover:border-blue-200 transition-colors">
      <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-slate-900">{request.itemCategory}</h3>
            <div className="flex items-center text-xs text-slate-500 mt-1 gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Admin Verified</span>
            </div>
          </div>
        </div>
        <Badge variant={request.status as any} className="capitalize shadow-sm">
          {request.status.replace('_', ' ')}
        </Badge>
      </CardHeader>
      
      <CardContent className="pt-6 pb-4 grid gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{request.pickupLocation}</span>
            <span className="text-slate-300 mx-1">→</span>
            <span className="font-medium">{request.dropLocation}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>By {format(deadlineDate, 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1 font-heading font-bold text-lg text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
            <DollarSign className="w-5 h-5" />
            {request.reward}
          </div>
        </div>
      </CardContent>

      {showApplyButton && request.status === 'approved' && (
        <CardFooter className="pt-2 pb-6 bg-slate-50/30">
          <Button 
            className="w-full" 
            variant="signature" 
            onClick={() => onApply?.(request.id)}
            disabled={isApplying}
          >
            {isApplying ? 'Applying...' : 'Apply to Deliver'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
});
