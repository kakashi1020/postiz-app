'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { useProjectStore } from '@gitroom/frontend/components/projects/project.store';
import { useToaster } from '@gitroom/react/toaster/toaster';

const MARKETS = ['PH', 'KR', 'SG', 'MY'] as const;
const PLATFORMS = ['LinkedIn', 'X', 'Facebook', 'Instagram', 'TikTok'] as const;
const FUNNEL_STAGES = ['TOFU', 'MOFU', 'BOFU'] as const;
const EST_COST_PER_STRATEGY = 0.15;

type CellKey = `${string}-${string}`;

const useFrameworkExists = (projectId: string | null) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const res = await fetch(`/framework/${projectId}/current`);
    return res.ok;
  }, [projectId]);
  return useSWR<boolean>(
    projectId ? `framework-exists-${projectId}` : null,
    load,
    { revalidateOnFocus: false }
  );
};

export const StrategyMatrix: FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const fetch = useFetch();
  const toaster = useToaster();
  const { data: frameworkExists, isLoading: checkingFramework } = useFrameworkExists(selectedProjectId);

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<Set<CellKey>>(new Set());
  const [funnelStage, setFunnelStage] = useState<string>('TOFU');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentLabel, setCurrentLabel] = useState('');

  const toggleCell = useCallback((market: string, platform: string) => {
    const key: CellKey = `${market}-${platform}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const all = new Set<CellKey>();
    for (const m of MARKETS) for (const p of PLATFORMS) all.add(`${m}-${p}`);
    setSelected(all);
  }, []);

  const clearAll = useCallback(() => setSelected(new Set()), []);

  const estimatedCost = useMemo(() => selected.size * EST_COST_PER_STRATEGY, [selected]);

  const runBulkGenerate = useCallback(async () => {
    if (!selectedProjectId || selected.size === 0) return;
    setGenerating(true);
    setProgress(0);
    setTotal(selected.size);
    let completed = 0;

    for (const key of selected) {
      const [market, platform] = key.split('-');
      setCurrentLabel(`${market} / ${platform}`);
      try {
        await fetch('/strategy/generate', {
          method: 'POST',
          body: JSON.stringify({ projectId: selectedProjectId, market, platform, funnelStage }),
        });
        completed++;
      } catch {
        toaster.show(`Failed: ${market}/${platform}`, 'warning');
      }
      setProgress(completed);
    }

    toaster.show(`${completed}/${selected.size} strategies generated`);
    setGenerating(false);
    onComplete();
  }, [selectedProjectId, selected, funnelStage]);

  if (!selectedProjectId) return null;

  return (
    <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px] flex flex-col gap-[16px]">
      <div className="text-[16px] font-[600]">Bulk Generate Strategies</div>

      {/* Step Indicators */}
      <div className="flex items-center gap-[8px] text-[12px]">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-[4px]">
            <div className={clsx(
              'w-[24px] h-[24px] rounded-full flex items-center justify-center text-[11px] font-[700]',
              step >= s ? 'bg-[#612BD3] text-white' : 'bg-newBgColorInner text-textItemBlur'
            )}>
              {s}
            </div>
            <span className={clsx(step >= s ? 'text-newTextColor' : 'text-textItemBlur')}>
              {s === 1 ? 'Check Framework' : s === 2 ? 'Select Grid' : 'Generate'}
            </span>
            {s < 3 && <div className="w-[20px] h-[1px] bg-newBorder" />}
          </div>
        ))}
      </div>

      {/* Step 1: Framework Check */}
      {step === 1 && (
        <div className="flex flex-col gap-[8px]">
          {checkingFramework ? (
            <div className="text-[13px] text-textItemBlur">Checking framework...</div>
          ) : frameworkExists ? (
            <div className="flex items-center gap-[8px]">
              <span className="text-green-500 text-[14px]">{'\u2713'}</span>
              <span className="text-[13px]">Framework document found</span>
            </div>
          ) : (
            <div className="flex items-center gap-[8px]">
              <span className="text-yellow-500 text-[14px]">!</span>
              <span className="text-[13px] text-yellow-500">No framework uploaded. Strategies will be generated without brand guidelines.</span>
            </div>
          )}
          <button
            onClick={() => setStep(2)}
            className="h-[32px] px-[12px] text-[12px] font-[600] rounded-[6px] bg-[#612BD3] text-white self-end"
          >
            Next
          </button>
        </div>
      )}

      {/* Step 2: Grid Selection */}
      {step === 2 && (
        <div className="flex flex-col gap-[12px]">
          <div className="flex items-center gap-[8px]">
            <select
              value={funnelStage}
              onChange={(e) => setFunnelStage(e.target.value)}
              className="h-[30px] px-[8px] text-[12px] bg-newBgColorInner border border-newTableBorder rounded-[6px] text-textColor outline-none"
            >
              {FUNNEL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex-1" />
            <button onClick={selectAll} className="text-[11px] text-btnPrimary hover:underline">Select All</button>
            <button onClick={clearAll} className="text-[11px] text-textItemBlur hover:underline">Clear</button>
          </div>

          <div className="overflow-x-auto">
            <table className="text-[12px] w-full">
              <thead>
                <tr>
                  <th className="text-start p-[6px] font-[500]" />
                  {PLATFORMS.map((p) => <th key={p} className="text-center p-[6px] font-[500]">{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {MARKETS.map((m) => (
                  <tr key={m}>
                    <td className="p-[6px] font-[600]">{m}</td>
                    {PLATFORMS.map((p) => {
                      const key: CellKey = `${m}-${p}`;
                      return (
                        <td key={key} className="p-[4px] text-center">
                          <div
                            onClick={() => toggleCell(m, p)}
                            className={clsx(
                              'w-[32px] h-[32px] rounded-[6px] mx-auto flex items-center justify-center cursor-pointer border',
                              selected.has(key)
                                ? 'bg-[#612BD3] border-[#612BD3] text-white'
                                : 'bg-newBgColorInner border-newTableBorder hover:bg-boxHover'
                            )}
                          >
                            {selected.has(key) && '\u2713'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-[12px]">
            <button onClick={() => setStep(1)} className="text-[12px] text-textItemBlur hover:underline">Back</button>
            <div className="flex-1 text-[12px] text-textItemBlur">
              {selected.size} selected — est. ${estimatedCost.toFixed(2)}
            </div>
            <button
              onClick={() => setStep(3)}
              disabled={selected.size === 0}
              className="h-[32px] px-[12px] text-[12px] font-[600] rounded-[6px] bg-[#612BD3] text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generate */}
      {step === 3 && (
        <div className="flex flex-col gap-[12px]">
          {!generating && progress === 0 && (
            <>
              <div className="text-[13px]">
                Ready to generate <span className="font-[600]">{selected.size}</span> strategies
                at <span className="font-[600]">{funnelStage}</span> stage.
                Estimated cost: <span className="font-[600]">${estimatedCost.toFixed(2)}</span>.
              </div>
              <div className="flex items-center gap-[8px]">
                <button onClick={() => setStep(2)} className="text-[12px] text-textItemBlur hover:underline">Back</button>
                <div className="flex-1" />
                <button
                  onClick={runBulkGenerate}
                  className="h-[36px] px-[16px] text-[13px] font-[600] rounded-[8px] bg-[#612BD3] text-white"
                >
                  Start Generation
                </button>
              </div>
            </>
          )}

          {(generating || progress > 0) && (
            <>
              <div className="text-[13px]">
                {generating ? `Generating: ${currentLabel}` : 'Complete!'}
              </div>
              <div className="w-full h-[8px] bg-newBgColorInner rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#612BD3] rounded-full transition-all"
                  style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
                />
              </div>
              <div className="text-[11px] text-textItemBlur">{progress} / {total}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
