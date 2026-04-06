'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

interface Hook {
  id: string;
  text: string;
  hookType: string;
  pillar: string;
  isStarred: boolean;
  usageCount: number;
}

interface Script {
  id: string;
  title: string;
  scriptStructure: string;
  pillar: string;
  content: string;
  usageCount: number;
}

interface SeriesConcept {
  id: string;
  name: string;
  seriesType: string;
  episodePlan: { episode: number; topic: string }[];
  isActive: boolean;
}

interface MonthlyPlan {
  id: string;
  month: number;
  year: number;
  weekPlans: { week: number; posts: { day: string; pillar: string; format: string; topic: string }[] }[];
  contentMix: Record<string, number>;
}

interface Strategy {
  id: string;
  market: string;
  platform: string;
  funnelStage: string;
  pillarBreakdown: { pillars: { name: string; description: string; percentage: number }[] };
  hooks: Hook[];
  scripts: Script[];
  seriesConcepts: SeriesConcept[];
  monthlyPlans: MonthlyPlan[];
}

const TABS = ['Hooks', 'Scripts', 'Series', 'Monthly Plan'] as const;
type Tab = typeof TABS[number];

const HOOK_TYPE_COLORS: Record<string, string> = {
  question: 'bg-blue-500',
  statistic: 'bg-green-500',
  story: 'bg-purple-500',
  bold_claim: 'bg-red-500',
  contrarian: 'bg-orange-500',
};

const HookCard: FC<{ hook: Hook; onStar: () => void }> = ({ hook, onStar }) => (
  <div className="bg-newBgColor rounded-[8px] p-[12px] flex flex-col gap-[8px] border border-newBorder">
    <div className="flex items-center gap-[6px]">
      <span className={clsx('text-[9px] text-white px-[5px] py-[1px] rounded-[3px]', HOOK_TYPE_COLORS[hook.hookType] || 'bg-gray-500')}>
        {hook.hookType}
      </span>
      <span className="text-[10px] text-textItemBlur">{hook.pillar}</span>
      <div className="flex-1" />
      <span className="text-[10px] text-textItemBlur">Used {hook.usageCount}x</span>
      <button onClick={onStar} className="text-[14px]">
        {hook.isStarred ? '\u2605' : '\u2606'}
      </button>
    </div>
    <div className="text-[13px]">{hook.text}</div>
  </div>
);

const ScriptCard: FC<{ script: Script }> = ({ script }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-newBgColor rounded-[8px] border border-newBorder overflow-hidden">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-[12px] flex items-center gap-[8px] cursor-pointer hover:bg-boxHover"
      >
        <div className="flex-1 text-[14px] font-[600]">{script.title}</div>
        <span className="text-[10px] text-textItemBlur bg-newBgColorInner px-[6px] py-[2px] rounded-[4px]">{script.scriptStructure}</span>
        <span className="text-[10px] text-textItemBlur">{script.pillar}</span>
        <span className="text-[10px] text-textItemBlur">Used {script.usageCount}x</span>
        <span className={clsx('transition-transform', expanded && 'rotate-180')}>{'\u25BC'}</span>
      </div>
      {expanded && (
        <div className="px-[12px] pb-[12px] text-[13px] whitespace-pre-wrap border-t border-newBorder pt-[12px]">
          {script.content}
        </div>
      )}
    </div>
  );
};

export const StrategyDetail: FC<{ strategyId: string; onBack: () => void }> = ({ strategyId, onBack }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [tab, setTab] = useState<Tab>('Hooks');

  const loadStrategy = useCallback(async () => {
    const [hooksRes, scriptsRes] = await Promise.all([
      fetch(`/strategy/${strategyId}/hooks`),
      fetch(`/strategy/${strategyId}/scripts`),
    ]);
    return {
      hooks: await hooksRes.json(),
      scripts: await scriptsRes.json(),
    };
  }, [strategyId]);

  const loadFull = useCallback(async () => {
    // Use the scope endpoint by fetching strategy metadata first
    // For now, use hooks/scripts endpoints which return arrays
    return loadStrategy();
  }, [loadStrategy]);

  const { data, isLoading, mutate } = useSWR(`strategy-detail-${strategyId}`, loadFull, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  const starHook = useCallback(async (hookId: string) => {
    // Optimistic — just reload for now
    toaster.show('Starred!');
    mutate();
  }, [mutate]);

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-[16px]">
      <div className="flex items-center gap-[12px]">
        <button onClick={onBack} className="text-[13px] text-textItemBlur hover:text-newTextColor">{'\u2190'} Back</button>
        <h2 className="text-[20px] font-[600] flex-1">Strategy Detail</h2>
      </div>

      <div className="flex gap-[4px] border border-newTableBorder rounded-[8px] p-[4px] text-[14px] font-[500] w-fit">
        {TABS.map((t) => (
          <div
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-[14px] py-[6px] cursor-pointer rounded-[6px]',
              tab === t && 'text-textItemFocused bg-boxFocused'
            )}
          >
            {t}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-[8px]">
        {tab === 'Hooks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[8px]">
            {(data.hooks || []).map((hook: Hook) => (
              <HookCard key={hook.id} hook={hook} onStar={() => starHook(hook.id)} />
            ))}
            {(!data.hooks || data.hooks.length === 0) && (
              <div className="text-textItemBlur text-[14px] col-span-2 text-center py-[40px]">No hooks yet</div>
            )}
          </div>
        )}

        {tab === 'Scripts' && (
          <div className="flex flex-col gap-[8px]">
            {(data.scripts || []).map((script: Script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
            {(!data.scripts || data.scripts.length === 0) && (
              <div className="text-textItemBlur text-[14px] text-center py-[40px]">No scripts yet</div>
            )}
          </div>
        )}

        {tab === 'Series' && (
          <div className="flex flex-col gap-[12px]">
            <div className="text-textItemBlur text-[13px]">Series concepts are generated with the strategy. Use the strategy page to view them.</div>
          </div>
        )}

        {tab === 'Monthly Plan' && (
          <div className="flex flex-col gap-[12px]">
            <div className="text-textItemBlur text-[13px]">Monthly plans are generated with the strategy. Use the strategy page to view them.</div>
          </div>
        )}
      </div>
    </div>
  );
};
