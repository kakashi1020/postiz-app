export const dynamic = 'force-dynamic';
import { AnalyticsDashboard } from '@gitroom/frontend/components/analytics/analytics-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Content Insights',
  description: '',
};

export default async function Index() {
  return <AnalyticsDashboard />;
}
