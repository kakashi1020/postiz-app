export const dynamic = 'force-dynamic';
import { SeriesTracker } from '@gitroom/frontend/components/series/series-tracker';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Series Tracker',
  description: '',
};

export default async function Index() {
  return <SeriesTracker />;
}
