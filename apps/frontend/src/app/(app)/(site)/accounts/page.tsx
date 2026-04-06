export const dynamic = 'force-dynamic';
import { AccountsPage } from '@gitroom/frontend/components/accounts/accounts-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Multi-Market Accounts',
  description: '',
};

export default async function Index() {
  return <AccountsPage />;
}
