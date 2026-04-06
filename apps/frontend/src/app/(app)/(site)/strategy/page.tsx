export const dynamic = 'force-dynamic';
import { StrategyPage } from '@gitroom/frontend/components/strategy/strategy-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Content Strategy',
  description: '',
};

export default async function Index() {
  return <StrategyPage />;
}
