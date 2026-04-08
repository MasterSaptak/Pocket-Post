import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Post a Task',
  description: 'Create a new task on PocketPost. Set your bounty, locations, and deadline to reach our network of verified carriers.',
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
