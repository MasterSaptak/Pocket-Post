import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Profile',
  description: 'Manage your PocketPost profile, track your delivery status, and view your active bids and followed tasks.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
