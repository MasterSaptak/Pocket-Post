import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'Browse live tasks, discover local delivery opportunities, and find high-paying bounties in the PocketPost marketplace.',
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
