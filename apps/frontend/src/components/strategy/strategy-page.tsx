'use client';

import { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { useProjectStore } from '@gitroom/frontend/components/projects/project.store';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { StrategyDetail } from '@gitroom/frontend/components/strategy/strategy-detail';
import { StrategyMatrix } from '@gitroom/frontend/components/strategy/strategy-matrix';

const MARKETS = ['PH', 'KR', 'SG', 'MY'] as const;
const PLATFORMS = ['LinkedIn', 'X', 'Facebook', 'Instagram', 'TikTok'] as const;
const FUNNEL_STAGES = ['TOFU', 'MOFU', 'BOFU'] as const;

const MARKET_LABELS: Record<string, string> = {
  PH: 'Philippines',
  KR: 'South Korea',
  SG: 'Singapore',
  MY: 'Malaysia',
};

interface StrategyTile {
  market: string;
  platform: string;
  strategyId: string | null;
  funnelStage: string | null;
}

const useStrategies = (projectId: string | null) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    if (!projectId) return [];
    const tiles: StrategyTile[] = [];
    for (const market of MARKETS) {
      for (const platform of PLATFORMS) {
        try {
          const res = await fetch(`/strategy/${projectId}/${market}/${platform}`);
          if (res.ok) {
            const data = await res.json();
            tiles.push({ market, platform, strategyId: data.id, funnelStage: data.funnelStage });
          } else {
            tiles.push({ market, platform, strategyId: null, funnelStage: null });
          }
        } catch {
          tiles.push({ market, platform, strategyId: null, funnelStage: null });
        }
      }
    }
    return tiles;
  }, [projectId]);

  return useSWR<StrategyTile[]>(
    projectId ? `strategies-${projectId}` : null,
    load,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );
};

const GenerateButton: FC<{
  projectId: string;
  market: string;
  platform: string;
  onGenerated: () => void;
}> = ({ projectId, market, platform, onGenerated }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const [funnelStage, setFunnelStage] = useState<string>('TOFU');

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/strategy/generate', {
        method: 'POST',
        body: JSON.stringify({ projectId, market, platform, funnelStage }),
      });
      if (!res.ok) {
        const err = await res.json();
        toaster.show(err.message || 'Generation failed', 'warning');
      } else {
        toaster.show('Strategy generated!');
        onGenerated();
      }
    } catch {
      toaster.show('Generation failed', 'warning');
    } finally {
      setLoading(false);
    }
  }, [projectId, market, platform, funnelStage]);

  return (
    <div className="flex items-center gap-[6px]">
      <select
        value={funnelStage}
        onChange={(e) => setFunnelStage(e.target.value)}
        className="h-[28px] px-[6px] text-[11px] bg-newBgColorInner border border-newTableBorder rounded-[6px] text-textColor outline-none"
      >
        {FUNNEL_STAGES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button
        onClick={generate}
        disabled={loading}
        className="h-[28px] px-[10px] text-[11px] font-[600] rounded-[6px] bg-[#612BD3] text-white disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate'}
      </button>
    </div>
  );
};

export const StrategyPage: FC = () => {
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const { data: tiles, isLoading, mutate } = useStrategies(selectedProjectId);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [filterMarket, setFilterMarket] = useState<string | ''>('');
  const [showBulk, setShowBulk] = useState(false);

  if (!selectedProjectId) {
    return (
      <div className="bg-newBgColorInner flex-1 p-[20px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[18px] font-[600] mb-[8px]">Select a Project</div>
          <div className="text-[14px] text-textItemBlur">Use the project switcher in the top bar to select a project first.</div>
        </div>
      </div>
    );
  }

  if (selectedStrategyId) {
    return (
      <div className="bg-newBgColorInner flex-1 p-[20px] flex flex-col">
        <StrategyDetail strategyId={selectedStrategyId} onBack={() => setSelectedStrategyId(null)} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-newBgColorInner flex-1 p-[20px] flex items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  const filteredTiles = filterMarket ? (tiles || []).filter((t) => t.market === filterMarket) : tiles || [];

  return (
    <div className="bg-newBgColorInner flex-1 p-[20px] flex flex-col gap-[16px]">
      <div className="flex items-center gap-[12px]">
        <h2 className="text-[20px] font-[600] flex-1">Content Strategy</h2>
        <button
          onClick={() => setShowBulk(!showBulk)}
          className="h-[36px] px-[14px] text-[13px] font-[600] rounded-[8px] border border-newTableBorder hover:bg-boxHover"
        >
          {showBulk ? 'Close Wizard' : 'Bulk Generate'}
        </button>
        <div className="flex gap-[4px] border border-newTableBorder rounded-[8px] p-[4px] text-[13px] font-[500]">
          <div
            onClick={() => setFilterMarket('')}
            className={clsx(
              'px-[10px] py-[4px] cursor-pointer rounded-[6px]',
              !filterMarket && 'text-textItemFocused bg-boxFocused'
            )}
          >
            All
          </div>
          {MARKETS.map((m) => (
            <div
              key={m}
              onClick={() => setFilterMarket(m)}
              className={clsx(
                'px-[10px] py-[4px] cursor-pointer rounded-[6px]',
                filterMarket === m && 'text-textItemFocused bg-boxFocused'
              )}
            >
              {m}
            </div>
          ))}
        </div>
      </div>

      {showBulk && (
        <StrategyMatrix onComplete={() => { setShowBulk(false); mutate(); }} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[12px]">
        {filteredTiles.map((tile) => (
          <div
            key={`${tile.market}-${tile.platform}`}
            className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px] flex flex-col gap-[10px]"
          >
            <div className="flex items-center gap-[8px]">
              <span className="text-[12px] font-[700] bg-btnPrimary text-white px-[6px] py-[2px] rounded-[4px]">{tile.market}</span>
              <span className="text-[14px] font-[600] flex-1">{tile.platform}</span>
              {tile.strategyId ? (
                <span className="text-[10px] text-green-500 font-[600]">Generated</span>
              ) : (
                <span className="text-[10px] text-textItemBlur">Not Generated</span>
              )}
            </div>
            {tile.funnelStage && (
              <div className="text-[11px] text-textItemBlur">Funnel: {tile.funnelStage}</div>
            )}
            <div className="flex items-center gap-[6px]">
              {tile.strategyId ? (
                <button
                  onClick={() => setSelectedStrategyId(tile.strategyId!)}
                  className="h-[28px] px-[10px] text-[11px] font-[600] rounded-[6px] border border-newTableBorder hover:bg-boxHover"
                >
                  View
                </button>
              ) : (
                <GenerateButton
                  projectId={selectedProjectId}
                  market={tile.market}
                  platform={tile.platform}
                  onGenerated={() => mutate()}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
