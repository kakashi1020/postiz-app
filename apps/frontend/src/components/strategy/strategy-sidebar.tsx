'use client';

import { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { useToaster } from '@gitroom/react/toaster/toaster';

interface Hook {
  id: string;
  text: string;
  hookType: string;
  pillar: string;
  isStarred: boolean;
}

interface StrategyData {
  id: string;
  pillarBreakdown: { pillars: { name: string; percentage: number }[] };
  hooks: Hook[];
}

const HOOK_TYPE_COLORS: Record<string, string> = {
  question: 'bg-blue-500',
  statistic: 'bg-green-500',
  story: 'bg-purple-500',
  bold_claim: 'bg-red-500',
  contrarian: 'bg-orange-500',
};

export const useStrategyForPost = (projectId: string | null, market: string | null, platform: string | null) => {
  const fetch = useFetch();
  const key = projectId && market && platform ? `/strategy/${projectId}/${market}/${platform}` : null;
  const load = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  }, []);
  return useSWR<StrategyData | null>(key, load, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });
};

export const StrategySidebar: FC<{
  projectId: string | null;
  market: string | null;
  platform: string | null;
  onInsertHook: (text: string) => void;
}> = ({ projectId, market, platform, onInsertHook }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const { data: strategy, isLoading } = useStrategyForPost(projectId, market, platform);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);

  const generateCaption = useCallback(async () => {
    if (!market || !platform) return;
    setCaptionLoading(true);
    try {
      const res = await fetch('/strategy/caption', {
        method: 'POST',
        body: JSON.stringify({
          market,
          platform,
          pillar: strategy?.pillarBreakdown?.pillars?.[0]?.name || 'general',
          postContent: 'Generate an engaging caption for this post.',
        }),
      });
      const data = await res.json();
      setCaption(data.caption || 'No caption generated');
    } catch {
      toaster.show('Failed to generate caption', 'warning');
    } finally {
      setCaptionLoading(false);
    }
  }, [market, platform, strategy]);

  if (!market || !projectId) return null;

  if (isLoading) {
    return (
      <div className="border-s border-newBorder w-[240px] p-[12px] flex items-center justify-center">
        <div className="animate-spin h-[16px] w-[16px] border-2 border-textItemBlur border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="border-s border-newBorder w-[240px] p-[12px] flex flex-col gap-[8px]">
        <div className="text-[12px] font-[600]">Strategy</div>
        <div className="text-[11px] text-textItemBlur">No strategy found for {market}/{platform}. Generate one from the Strategy page.</div>
      </div>
    );
  }

  const pillars = strategy.pillarBreakdown?.pillars || [];
  const starredHooks = (strategy.hooks || []).filter((h) => h.isStarred);
  const recentHooks = (strategy.hooks || []).slice(0, 8);
  const displayHooks = starredHooks.length > 0 ? starredHooks : recentHooks;

  return (
    <div className="border-s border-newBorder w-[240px] flex flex-col overflow-hidden">
      <div className="p-[12px] border-b border-newBorder">
        <div className="text-[12px] font-[600] mb-[8px]">Pillar Balance</div>
        <div className="flex flex-col gap-[4px]">
          {pillars.map((p) => (
            <div key={p.name} className="flex items-center gap-[6px]">
              <div className="flex-1 text-[10px] truncate">{p.name}</div>
              <div className="w-[60px] h-[4px] bg-newBgColor rounded-full overflow-hidden">
                <div className="h-full bg-btnPrimary rounded-full" style={{ width: `${p.percentage}%` }} />
              </div>
              <div className="text-[9px] text-textItemBlur w-[24px] text-end">{p.percentage}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-[12px] flex flex-col gap-[6px]">
        <div className="text-[12px] font-[600] mb-[2px]">
          {starredHooks.length > 0 ? 'Starred Hooks' : 'Recent Hooks'}
        </div>
        {displayHooks.map((hook) => (
          <div
            key={hook.id}
            onClick={() => onInsertHook(hook.text)}
            className="text-[11px] p-[6px] rounded-[6px] bg-newBgColor hover:bg-boxHover cursor-pointer border border-transparent hover:border-newBorder"
          >
            <div className="flex items-center gap-[4px] mb-[2px]">
              <span className={clsx('text-[8px] text-white px-[3px] py-[0.5px] rounded-[2px]', HOOK_TYPE_COLORS[hook.hookType] || 'bg-gray-500')}>
                {hook.hookType}
              </span>
              {hook.isStarred && <span className="text-[10px]">{'\u2605'}</span>}
            </div>
            <div className="line-clamp-2">{hook.text}</div>
          </div>
        ))}
        {displayHooks.length === 0 && (
          <div className="text-[10px] text-textItemBlur">No hooks available</div>
        )}
      </div>

      <div className="p-[12px] border-t border-newBorder flex flex-col gap-[6px]">
        <button
          onClick={generateCaption}
          disabled={captionLoading}
          className="w-full h-[28px] text-[11px] font-[600] rounded-[6px] bg-[#612BD3] text-white disabled:opacity-50"
        >
          {captionLoading ? 'Generating...' : 'Generate Caption'}
        </button>
        {caption && (
          <div
            onClick={() => onInsertHook(caption)}
            className="text-[10px] p-[6px] rounded-[6px] bg-newBgColor cursor-pointer hover:bg-boxHover"
          >
            {caption}
            <div className="text-[9px] text-textItemBlur mt-[2px]">Click to insert</div>
          </div>
        )}
      </div>
    </div>
  );
};
