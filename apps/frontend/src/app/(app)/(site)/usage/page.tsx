export const dynamic = 'force-dynamic';
import { UsageDashboard } from '@gitroom/frontend/components/usage/usage-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Usage & Costs',
  description: '',
};

export default async function Index() {
  return <UsageDashboard />;
}
