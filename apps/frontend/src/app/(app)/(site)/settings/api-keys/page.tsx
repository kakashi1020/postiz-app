import { ApiKeysPage } from '@gitroom/frontend/components/settings/api-keys-page';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} API Keys`,
  description: '',
};

export default async function Index() {
  return <ApiKeysPage />;
}
