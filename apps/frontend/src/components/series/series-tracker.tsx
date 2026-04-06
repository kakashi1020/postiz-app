'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { useProjectStore } from '@gitroom/frontend/components/projects/project.store';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

const MARKETS = ['PH', 'KR', 'SG', 'MY'] as const;
const MARKET_COLORS: Record<string, string> = {
  PH: 'bg-blue-500',
  KR: 'bg-green-500',
  SG: 'bg-orange-500',
  MY: 'bg-purple-500',
};

const TYPE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};

interface Episode {
  episode: number;
  topic: string;
}

interface SeriesConcept {
  id: string;
  strategyId: string;
  name: string;
  seriesType: string;
  episodePlan: Episode[];
  isActive: boolean;
  createdAt: string;
}

interface StrategyWithSeries {
  id: string;
  market: string;
  platform: string;
  funnelStage: string;
  seriesConcepts: SeriesConcept[];
}

const useStrategiesWithSeries = (projectId: string | null) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const results: StrategyWithSeries[] = [];
    for (const market of MARKETS) {
      for (const platform of ['LinkedIn', 'X', 'Facebook', 'Instagram', 'TikTok']) {
        try {
          const res = await fetch(`/strategy/${projectId}/${market}/${platform}`);
          if (res.ok) {
            const data = await res.json();
            if (data.seriesConcepts?.length > 0) {
              results.push(data);
            }
          }
        } catch { /* skip */ }
      }
    }
    return results;
  }, [projectId]);
  return useSWR<StrategyWithSeries[]>(
    projectId ? `series-all-${projectId}` : null,
    load,
    { revalidateOnFocus: false }
  );
};

const SeriesCard: FC<{
  series: SeriesConcept;
  market: string;
  platform: string;
}> = ({ series, market, platform }) => {
  const [expanded, setExpanded] = useState(false);
  const episodes = Array.isArray(series.episodePlan) ? series.episodePlan : [];

  return (
    <div className="bg-newBgColorInner rounded-[10px] border border-newBorder overflow-hidden">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-[14px] flex items-center gap-[10px] cursor-pointer hover:bg-boxHover"
      >
        <div className={clsx('w-[6px] h-[32px] rounded-full', series.isActive ? 'bg-green-500' : 'bg-gray-400')} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-[600] truncate">{series.name}</div>
          <div className="flex items-center gap-[6px] text-[11px] text-textItemBlur">
            <span className={clsx('text-white px-[4px] py-[1px] rounded-[3px] text-[9px]', MARKET_COLORS[market] || 'bg-gray-500')}>{market}</span>
            <span>{platform}</span>
            <span>{TYPE_LABELS[series.seriesType] || series.seriesType}</span>
            <span>{episodes.length} episodes</span>
          </div>
        </div>
        <div className="flex items-center gap-[6px]">
          <span className={clsx('text-[10px] font-[600]', series.isActive ? 'text-green-500' : 'text-textItemBlur')}>
            {series.isActive ? 'Active' : 'Paused'}
          </span>
          <span className={clsx('text-[12px] transition-transform', expanded && 'rotate-180')}>{'\u25BC'}</span>
        </div>
      </div>

      {expanded && episodes.length > 0 && (
        <div className="px-[14px] pb-[14px] border-t border-newBorder pt-[12px]">
          <div className="text-[12px] font-[600] mb-[8px]">Episode Timeline</div>
          <div className="flex flex-col gap-[6px]">
            {episodes.map((ep, i) => (
              <div key={i} className="flex items-center gap-[10px]">
                <div className="w-[28px] h-[28px] rounded-full bg-newBgColor border border-newBorder flex items-center justify-center text-[10px] font-[700] shrink-0">
                  {ep.episode || i + 1}
                </div>
                <div className="h-[1px] w-[12px] bg-newBorder shrink-0" />
                <div className="text-[12px] flex-1">{ep.topic}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SeriesTracker: FC = () => {
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const { data: strategies, isLoading } = useStrategiesWithSeries(selectedProjectId);
  const [filterMarket, setFilterMarket] = useState<string>('');

  const grouped = useMemo(() => {
    if (!strategies) return new Map<string, { market: string; platform: string; series: SeriesConcept }[]>();
    const map = new Map<string, { market: string; platform: string; series: SeriesConcept }[]>();
    for (const s of strategies) {
      for (const sc of s.seriesConcepts) {
        const key = s.market;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ market: s.market, platform: s.platform, series: sc });
      }
    }
    return map;
  }, [strategies]);

  const totalSeries = useMemo(() => {
    let count = 0;
    for (const entries of grouped.values()) count += entries.length;
    return count;
  }, [grouped]);

  if (!selectedProjectId) {
    return (
      <div className="bg-newBgColorInner flex-1 p-[20px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[18px] font-[600] mb-[8px]">Select a Project</div>
          <div className="text-[14px] text-textItemBlur">Use the project switcher to view series concepts.</div>
        </div>
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

  return (
    <div className="bg-newBgColorInner flex-1 p-[20px] flex flex-col gap-[16px] overflow-y-auto">
      <div className="flex items-center gap-[12px]">
        <h2 className="text-[20px] font-[600] flex-1">Series Tracker</h2>
        <div className="text-[13px] text-textItemBlur">{totalSeries} series across {grouped.size} market{grouped.size !== 1 ? 's' : ''}</div>
      </div>

      <div className="flex gap-[4px] border border-newTableBorder rounded-[8px] p-[4px] text-[13px] font-[500] w-fit">
        <div
          onClick={() => setFilterMarket('')}
          className={clsx('px-[10px] py-[4px] cursor-pointer rounded-[6px]', !filterMarket && 'text-textItemFocused bg-boxFocused')}
        >
          All
        </div>
        {MARKETS.map((m) => (
          <div
            key={m}
            onClick={() => setFilterMarket(m)}
            className={clsx('px-[10px] py-[4px] cursor-pointer rounded-[6px]', filterMarket === m && 'text-textItemFocused bg-boxFocused')}
          >
            {m}
          </div>
        ))}
      </div>

      {Array.from(grouped.entries())
        .filter(([market]) => !filterMarket || market === filterMarket)
        .map(([market, entries]) => (
          <div key={market}>
            <div className="flex items-center gap-[8px] mb-[8px]">
              <div className={clsx('w-[24px] h-[24px] rounded-[6px] flex items-center justify-center text-white text-[10px] font-[700]', MARKET_COLORS[market] || 'bg-gray-500')}>
                {market}
              </div>
              <div className="text-[15px] font-[600]">{market}</div>
              <div className="text-[12px] text-textItemBlur">{entries.length} series</div>
            </div>
            <div className="flex flex-col gap-[8px]">
              {entries.map((e) => (
                <SeriesCard key={e.series.id} series={e.series} market={e.market} platform={e.platform} />
              ))}
            </div>
          </div>
        ))}

      {totalSeries === 0 && (
        <div className="flex-1 flex items-center justify-center text-textItemBlur text-[14px]">
          No series concepts yet. Generate strategies from the Strategy page to create series.
        </div>
      )}
    </div>
  );
};
