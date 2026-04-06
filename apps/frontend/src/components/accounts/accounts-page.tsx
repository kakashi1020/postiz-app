'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import clsx from 'clsx';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import Link from 'next/link';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';

const MARKET_CONFIG: {
  key: string;
  label: string;
  fullName: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  { key: 'PH', label: 'PH', fullName: 'Philippines', color: 'text-blue-600', bg: 'bg-blue-500', border: 'border-blue-500/30' },
  { key: 'KR', label: 'KR', fullName: 'South Korea', color: 'text-green-600', bg: 'bg-green-500', border: 'border-green-500/30' },
  { key: 'SG', label: 'SG', fullName: 'Singapore', color: 'text-orange-600', bg: 'bg-orange-500', border: 'border-orange-500/30' },
  { key: 'MY', label: 'MY', fullName: 'Malaysia', color: 'text-purple-600', bg: 'bg-purple-500', border: 'border-purple-500/30' },
];

interface Integration {
  id: string;
  name: string;
  picture: string;
  identifier: string;
  providerIdentifier: string;
  disabled: boolean;
  inBetweenSteps: boolean;
  refreshNeeded?: boolean;
  type: string;
  market?: string;
  customer?: { id?: string; name?: string };
  time?: { time: number }[];
}

const AccountCard: FC<{
  integration: Integration;
  onReconnect: () => void;
  onDisconnect: () => void;
}> = ({ integration, onReconnect, onDisconnect }) => {
  const lastPostTime = integration.time?.[0]?.time;

  return (
    <div className={clsx(
      'flex items-center gap-[12px] p-[12px] rounded-[10px] bg-newBgColorInner',
      integration.disabled && 'opacity-60',
      integration.refreshNeeded && 'ring-1 ring-red-500/50'
    )}>
      <div className="relative min-w-[40px]">
        <ImageWithFallback
          fallbackSrc="/no-picture.jpg"
          src={integration.picture || '/no-picture.jpg'}
          className="rounded-[8px]"
          alt={integration.name}
          width={40}
          height={40}
        />
        <img
          src={`/icons/platforms/${integration.providerIdentifier || integration.identifier}.png`}
          className="w-[16px] h-[16px] rounded-[4px] absolute z-10 bottom-[-2px] end-[-2px] border border-fifth"
          alt={integration.identifier}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-[600] truncate">{integration.name}</div>
        <div className="text-[11px] text-textItemBlur flex items-center gap-[6px]">
          <span className="capitalize">{integration.identifier?.split('-')[0]}</span>
          {integration.disabled && <span className="text-red-400">Disabled</span>}
          {integration.refreshNeeded && <span className="text-red-400">Disconnected</span>}
          {lastPostTime && (
            <span>Last post: {newDayjs(lastPostTime).local().format('MMM D')}</span>
          )}
        </div>
      </div>
      <div className="flex gap-[6px]">
        {integration.refreshNeeded && (
          <button
            onClick={onReconnect}
            className="h-[28px] px-[10px] text-[11px] font-[600] rounded-[6px] bg-orange-500 text-white hover:bg-orange-600"
          >
            Reconnect
          </button>
        )}
        <button
          onClick={onDisconnect}
          className="h-[28px] px-[10px] text-[11px] font-[600] rounded-[6px] border border-red-500/50 text-red-500 hover:bg-red-500/10"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};

const MarketAccordion: FC<{
  config: typeof MARKET_CONFIG[number];
  integrations: Integration[];
  onReconnect: (integration: Integration) => void;
  onDisconnect: (integration: Integration) => void;
}> = ({ config, integrations, onReconnect, onDisconnect }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className={clsx('rounded-[12px] border overflow-hidden', config.border)}>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center gap-[10px] p-[14px] cursor-pointer hover:bg-boxHover select-none"
      >
        <div className={clsx('w-[32px] h-[32px] rounded-[8px] flex items-center justify-center text-white text-[12px] font-[700]', config.bg)}>
          {config.label}
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-[600]">{config.fullName}</div>
          <div className="text-[12px] text-textItemBlur">{integrations.length} account{integrations.length !== 1 ? 's' : ''}</div>
        </div>
        <span className={clsx('text-[14px] transition-transform', open && 'rotate-180')}>{'\u25BC'}</span>
      </div>
      {open && (
        <div className="px-[14px] pb-[14px] flex flex-col gap-[8px]">
          {integrations.map((integration) => (
            <AccountCard
              key={integration.id}
              integration={integration}
              onReconnect={() => onReconnect(integration)}
              onDisconnect={() => onDisconnect(integration)}
            />
          ))}
          {integrations.length === 0 && (
            <div className="text-[13px] text-textItemBlur text-center py-[12px]">
              No accounts connected for this market
            </div>
          )}
          <Link
            href="/launches"
            className="flex items-center justify-center gap-[6px] h-[36px] text-[12px] font-[600] rounded-[8px] border border-dashed border-newBorder hover:bg-boxHover"
          >
            <span className="text-[16px]">+</span> Add Account
          </Link>
        </div>
      )}
    </div>
  );
};

export const AccountsPage: FC = () => {
  const { isLoading, data: integrations, mutate } = useIntegrationList();
  const fetch = useFetch();
  const toaster = useToaster();

  const byMarket = useMemo(() => {
    const map = new Map<string, Integration[]>();
    for (const cfg of MARKET_CONFIG) {
      map.set(cfg.key, []);
    }
    for (const integration of integrations || []) {
      const market = (integration as any).market || '';
      if (map.has(market)) {
        map.get(market)!.push(integration);
      } else {
        // Integrations without a market — show under all sections? No, put in a separate bucket.
        // For now, skip — they show on the launches page.
      }
    }
    return map;
  }, [integrations]);

  const unassigned = useMemo(() => {
    const assignedMarkets = new Set(MARKET_CONFIG.map((c) => c.key));
    return (integrations || []).filter((i: any) => !i.market || !assignedMarkets.has(i.market));
  }, [integrations]);

  const handleReconnect = useCallback(async (integration: Integration) => {
    try {
      const { url } = await (
        await fetch(`/integrations/social/${integration.identifier}?refresh=${(integration as any).internalId}`)
      ).json();
      window.location.href = url;
    } catch {
      toaster.show('Failed to reconnect', 'warning');
    }
  }, []);

  const handleDisconnect = useCallback(async (integration: Integration) => {
    try {
      await fetch(`/integrations/${integration.id}`, { method: 'DELETE' });
      toaster.show('Account disconnected');
      mutate();
    } catch {
      toaster.show('Failed to disconnect', 'warning');
    }
  }, [mutate]);

  if (isLoading) {
    return (
      <div className="bg-newBgColorInner flex-1 p-[20px] flex items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  const totalAccounts = (integrations || []).length;

  return (
    <div className="bg-newBgColorInner flex-1 p-[20px] flex flex-col gap-[16px] overflow-y-auto">
      <div className="flex items-center gap-[12px]">
        <h2 className="text-[20px] font-[600] flex-1">Multi-Market Accounts</h2>
        <div className="text-[13px] text-textItemBlur">{totalAccounts} total account{totalAccounts !== 1 ? 's' : ''}</div>
      </div>

      <div className="flex flex-col gap-[12px]">
        {MARKET_CONFIG.map((cfg) => (
          <MarketAccordion
            key={cfg.key}
            config={cfg}
            integrations={byMarket.get(cfg.key) || []}
            onReconnect={handleReconnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-[12px] border border-newBorder overflow-hidden">
          <div className="p-[14px]">
            <div className="text-[15px] font-[600]">No Market Assigned</div>
            <div className="text-[12px] text-textItemBlur">{unassigned.length} account{unassigned.length !== 1 ? 's' : ''} — assign a market on the Launches page</div>
          </div>
          <div className="px-[14px] pb-[14px] flex flex-col gap-[8px]">
            {unassigned.map((integration: any) => (
              <AccountCard
                key={integration.id}
                integration={integration}
                onReconnect={() => handleReconnect(integration)}
                onDisconnect={() => handleDisconnect(integration)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
