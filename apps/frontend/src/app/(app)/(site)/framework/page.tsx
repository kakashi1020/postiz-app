export const dynamic = 'force-dynamic';
import { FrameworkPage } from '@gitroom/frontend/components/framework/framework-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Framework Library',
  description: '',
};

export default async function Index() {
  return <FrameworkPage />;
}
