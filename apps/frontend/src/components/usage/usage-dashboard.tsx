'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { useProjectStore } from '@gitroom/frontend/components/projects/project.store';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';

const SERVICES = [
  { key: 'CLAUDE', label: 'Claude', color: 'bg-purple-500' },
  { key: 'NANO_BANANA', label: 'Nano Banana', color: 'bg-yellow-500' },
  { key: 'FAL_AI', label: 'fal.ai', color: 'bg-blue-500' },
  { key: 'FISH_AUDIO', label: 'Fish Audio', color: 'bg-green-500' },
  { key: 'OPENAI', label: 'OpenAI', color: 'bg-emerald-500' },
  { key: 'ELEVENLABS', label: 'ElevenLabs', color: 'bg-orange-500' },
] as const;

type BudgetStatus = 'OK' | 'WARNING' | 'BLOCKED';

interface ServiceReport {
  service: string;
  totalCost: number;
  totalUnits: number;
  count: number;
  budget: {
    status: BudgetStatus;
    used: number;
    cap: number;
    percentage: number;
  } | null;
}

interface MonthlyReport {
  month: number;
  year: number;
  services: ServiceReport[];
  totalCost: number;
}

interface UsageLogEntry {
  id: string;
  service: string;
  operation: string;
  market: string | null;
  platform: string | null;
  unitsUsed: number;
  estimatedCostUsd: number;
  createdAt: string;
}

interface GlobalProject {
  projectId: string;
  services: { service: string; cost: number; units: number; count: number }[];
  totalCost: number;
}

interface GlobalSummary {
  month: number;
  year: number;
  projects: GlobalProject[];
  totalCost: number;
}

const STATUS_BADGE: Record<BudgetStatus, { bg: string; text: string }> = {
  OK: { bg: 'bg-green-500/20 text-green-500', text: 'OK' },
  WARNING: { bg: 'bg-yellow-500/20 text-yellow-500', text: 'WARNING' },
  BLOCKED: { bg: 'bg-red-500/20 text-red-500', text: 'BLOCKED' },
};

const useMonthlyReport = (projectId: string | null) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch(`/usage/${projectId}/monthly`)).json();
  }, [projectId]);
  return useSWR<MonthlyReport>(
    projectId ? `usage-monthly-${projectId}` : null,
    load,
    { revalidateOnFocus: false, revalidateIfStale: true }
  );
};

const useUsageLog = (projectId: string | null, service: string) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch(`/usage/${projectId}/by-service?service=${service}`)).json();
  }, [projectId, service]);
  return useSWR<UsageLogEntry[]>(
    projectId && service ? `usage-log-${projectId}-${service}` : null,
    load,
    { revalidateOnFocus: false }
  );
};

const useGlobalSummary = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch('/usage/global')).json();
  }, []);
  return useSWR<GlobalSummary>('usage-global', load, {
    revalidateOnFocus: false,
    revalidateIfStale: true,
  });
};

// -- Summary Card --
const ServiceCard: FC<{
  serviceKey: string;
  label: string;
  color: string;
  report: ServiceReport | undefined;
}> = ({ serviceKey, label, color, report }) => {
  const count = report?.count || 0;
  const cost = report?.totalCost || 0;
  const budget = report?.budget;
  const pct = budget ? Math.min(budget.percentage * 100, 100) : 0;
  const status = budget?.status || 'OK';

  return (
    <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px] flex flex-col gap-[10px]">
      <div className="flex items-center gap-[8px]">
        <div className={clsx('w-[8px] h-[8px] rounded-full', color)} />
        <div className="text-[14px] font-[600] flex-1">{label}</div>
        {budget && (
          <span className={clsx('text-[10px] font-[600] px-[6px] py-[2px] rounded-[4px]', STATUS_BADGE[status].bg)}>
            {STATUS_BADGE[status].text}
          </span>
        )}
      </div>
      <div className="flex gap-[16px] text-[12px]">
        <div>
          <div className="text-textItemBlur">Operations</div>
          <div className="font-[600]">{count}</div>
        </div>
        <div>
          <div className="text-textItemBlur">Cost</div>
          <div className="font-[600]">${cost.toFixed(4)}</div>
        </div>
      </div>
      {budget && budget.cap > 0 && (
        <div>
          <div className="flex items-center justify-between text-[10px] text-textItemBlur mb-[4px]">
            <span>${budget.used.toFixed(2)} / ${budget.cap.toFixed(2)}</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div className="w-full h-[6px] bg-newBgColorInner rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                status === 'BLOCKED' ? 'bg-red-500' : status === 'WARNING' ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// -- Budget Settings --
const BudgetSetting: FC<{
  projectId: string;
  serviceKey: string;
  label: string;
  currentCap: number;
  onSaved: () => void;
}> = ({ projectId, serviceKey, label, currentCap, onSaved }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [cap, setCap] = useState(currentCap.toString());
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/usage/${projectId}/budget`, {
        method: 'POST',
        body: JSON.stringify({ service: serviceKey, monthlyCapUsd: parseFloat(cap) || 0 }),
      });
      toaster.show(`Budget for ${label} updated`);
      onSaved();
    } catch {
      toaster.show('Failed to save', 'warning');
    } finally {
      setSaving(false);
    }
  }, [cap, projectId, serviceKey]);

  return (
    <div className="flex items-center gap-[8px]">
      <div className="w-[120px] text-[13px] font-[500]">{label}</div>
      <div className="text-[12px] text-textItemBlur">$</div>
      <input
        type="number"
        step="0.01"
        min="0"
        value={cap}
        onChange={(e) => setCap(e.target.value)}
        className="w-[100px] h-[30px] px-[8px] text-[12px] bg-newBgColorInner border border-newTableBorder rounded-[6px] text-textColor outline-none"
      />
      <div className="text-[11px] text-textItemBlur">/mo</div>
      <button
        onClick={save}
        disabled={saving}
        className="h-[30px] px-[10px] text-[11px] font-[600] rounded-[6px] bg-[#612BD3] text-white disabled:opacity-50"
      >
        {saving ? '...' : 'Save'}
      </button>
    </div>
  );
};

// -- Bar Chart --
const BarChart: FC<{ data: { label: string; value: number; color: string }[]; title: string }> = ({ data, title }) => {
  const max = Math.max(...data.map((d) => d.value), 0.01);
  return (
    <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px]">
      <div className="text-[14px] font-[600] mb-[12px]">{title}</div>
      <div className="flex flex-col gap-[8px]">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-[8px]">
            <div className="w-[80px] text-[11px] text-end truncate">{d.label}</div>
            <div className="flex-1 h-[16px] bg-newBgColorInner rounded-[4px] overflow-hidden">
              <div
                className={clsx('h-full rounded-[4px]', d.color)}
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
            <div className="w-[60px] text-[11px]">${d.value.toFixed(2)}</div>
          </div>
        ))}
        {data.length === 0 && <div className="text-[12px] text-textItemBlur text-center py-[8px]">No data</div>}
      </div>
    </div>
  );
};

// -- Global Summary --
const GlobalDashboard: FC = () => {
  const { data, isLoading } = useGlobalSummary();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  if (!data) {
    return <div className="text-textItemBlur text-[14px] text-center py-[40px]">No usage data</div>;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-center gap-[12px]">
        <h2 className="text-[20px] font-[600] flex-1">Global Usage Summary</h2>
        <div className="text-[14px] text-textItemBlur">{data.month}/{data.year}</div>
        <div className="text-[16px] font-[600]">Total: ${data.totalCost.toFixed(2)}</div>
      </div>
      {data.projects.map((p) => (
        <div key={p.projectId} className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px]">
          <div className="flex items-center gap-[8px] mb-[8px]">
            <div className="text-[13px] font-[600] flex-1 truncate">{p.projectId}</div>
            <div className="text-[13px] font-[600]">${p.totalCost.toFixed(4)}</div>
          </div>
          <div className="flex gap-[12px] flex-wrap">
            {p.services.map((s) => (
              <div key={s.service} className="text-[11px] bg-newBgColorInner rounded-[6px] px-[8px] py-[4px]">
                <span className="font-[600]">{s.service}</span>: {s.count} ops, ${s.cost.toFixed(4)}
              </div>
            ))}
          </div>
        </div>
      ))}
      {data.projects.length === 0 && (
        <div className="text-textItemBlur text-[14px] text-center py-[40px]">No usage recorded yet</div>
      )}
    </div>
  );
};

// -- Main Dashboard --
export const UsageDashboard: FC = () => {
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const { data: report, isLoading, mutate } = useMonthlyReport(selectedProjectId);
  const [logService, setLogService] = useState('CLAUDE');
  const { data: logEntries, isLoading: logLoading } = useUsageLog(selectedProjectId, logService);
  const [logPage, setLogPage] = useState(0);
  const LOG_PER_PAGE = 20;

  const serviceMap = useMemo(() => {
    const map = new Map<string, ServiceReport>();
    for (const s of report?.services || []) {
      map.set(s.service, s);
    }
    return map;
  }, [report]);

  const budgetCaps = useMemo(() => {
    const caps = new Map<string, number>();
    for (const s of report?.services || []) {
      caps.set(s.service, s.budget?.cap || 0);
    }
    return caps;
  }, [report]);

  // Bar charts
  const serviceChartData = useMemo(() => {
    return SERVICES.map((s) => ({
      label: s.label,
      value: serviceMap.get(s.key)?.totalCost || 0,
      color: s.color,
    })).filter((d) => d.value > 0);
  }, [serviceMap]);

  const marketChartData = useMemo(() => {
    if (!logEntries) return [];
    const byMarket = new Map<string, number>();
    for (const e of logEntries) {
      const m = e.market || 'Unknown';
      byMarket.set(m, (byMarket.get(m) || 0) + e.estimatedCostUsd);
    }
    return Array.from(byMarket.entries()).map(([label, value]) => ({
      label,
      value,
      color: 'bg-btnPrimary',
    }));
  }, [logEntries]);

  const paginatedLog = useMemo(() => {
    if (!logEntries) return [];
    return logEntries.slice(logPage * LOG_PER_PAGE, (logPage + 1) * LOG_PER_PAGE);
  }, [logEntries, logPage]);

  const totalLogPages = Math.ceil((logEntries?.length || 0) / LOG_PER_PAGE);

  if (!selectedProjectId) {
    return (
      <div className="bg-newBgColorInner flex-1 p-[20px] flex flex-col overflow-y-auto">
        <GlobalDashboard />
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
    <div className="bg-newBgColorInner flex-1 p-[20px] flex flex-col gap-[20px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-[12px]">
        <h2 className="text-[20px] font-[600] flex-1">Usage & Costs</h2>
        {report && (
          <div className="text-[14px] text-textItemBlur">
            {report.month}/{report.year} &mdash; Total: <span className="font-[600] text-newTextColor">${report.totalCost.toFixed(4)}</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[12px]">
        {SERVICES.map((s) => (
          <ServiceCard
            key={s.key}
            serviceKey={s.key}
            label={s.label}
            color={s.color}
            report={serviceMap.get(s.key)}
          />
        ))}
      </div>

      {/* Budget Settings */}
      <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px]">
        <div className="text-[14px] font-[600] mb-[12px]">Budget Settings</div>
        <div className="flex flex-col gap-[8px]">
          {SERVICES.map((s) => (
            <BudgetSetting
              key={s.key}
              projectId={selectedProjectId}
              serviceKey={s.key}
              label={s.label}
              currentCap={budgetCaps.get(s.key) || 0}
              onSaved={() => mutate()}
            />
          ))}
        </div>
      </div>

      {/* Usage Log */}
      <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px]">
        <div className="flex items-center gap-[12px] mb-[12px]">
          <div className="text-[14px] font-[600] flex-1">Usage Log</div>
          <select
            value={logService}
            onChange={(e) => { setLogService(e.target.value); setLogPage(0); }}
            className="h-[30px] px-[8px] text-[12px] bg-newBgColorInner border border-newTableBorder rounded-[6px] text-textColor outline-none"
          >
            {SERVICES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        {logLoading ? (
          <div className="text-center py-[20px]"><LoadingComponent /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-textItemBlur border-b border-newBorder">
                    <th className="text-start py-[6px] px-[4px] font-[500]">Timestamp</th>
                    <th className="text-start py-[6px] px-[4px] font-[500]">Service</th>
                    <th className="text-start py-[6px] px-[4px] font-[500]">Operation</th>
                    <th className="text-start py-[6px] px-[4px] font-[500]">Market</th>
                    <th className="text-start py-[6px] px-[4px] font-[500]">Platform</th>
                    <th className="text-end py-[6px] px-[4px] font-[500]">Units</th>
                    <th className="text-end py-[6px] px-[4px] font-[500]">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLog.map((e: UsageLogEntry) => (
                    <tr key={e.id} className="border-b border-newBorder/50 hover:bg-boxHover">
                      <td className="py-[6px] px-[4px]">{newDayjs(e.createdAt).local().format('MMM D HH:mm')}</td>
                      <td className="py-[6px] px-[4px]">{e.service}</td>
                      <td className="py-[6px] px-[4px]">{e.operation}</td>
                      <td className="py-[6px] px-[4px]">{e.market || '-'}</td>
                      <td className="py-[6px] px-[4px]">{e.platform || '-'}</td>
                      <td className="py-[6px] px-[4px] text-end">{e.unitsUsed}</td>
                      <td className="py-[6px] px-[4px] text-end">${e.estimatedCostUsd.toFixed(4)}</td>
                    </tr>
                  ))}
                  {paginatedLog.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-[20px] text-textItemBlur">No usage entries</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalLogPages > 1 && (
              <div className="flex items-center justify-center gap-[8px] mt-[12px]">
                <button
                  disabled={logPage === 0}
                  onClick={() => setLogPage(logPage - 1)}
                  className="h-[28px] px-[8px] text-[11px] rounded-[6px] border border-newTableBorder disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="text-[11px]">{logPage + 1} / {totalLogPages}</span>
                <button
                  disabled={logPage >= totalLogPages - 1}
                  onClick={() => setLogPage(logPage + 1)}
                  className="h-[28px] px-[8px] text-[11px] rounded-[6px] border border-newTableBorder disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
        <BarChart data={serviceChartData} title="Cost by Service" />
        <BarChart data={marketChartData} title="Cost by Market" />
      </div>
    </div>
  );
};
