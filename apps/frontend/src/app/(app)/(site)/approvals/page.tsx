export const dynamic = 'force-dynamic';
import { ApprovalComponent } from '@gitroom/frontend/components/launches/approval.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Approval Queue',
  description: '',
};

export default async function Index() {
  return <ApprovalComponent />;
}
