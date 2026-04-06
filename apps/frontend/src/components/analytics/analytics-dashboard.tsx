'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { useProjectStore } from '@gitroom/frontend/components/projects/project.store';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';

const MARKET_TABS = ['All', 'PH', 'KR', 'SG', 'MY'] as const;
const MARKET_COLORS: Record<string, string> = {
  PH: 'bg-blue-500',
  KR: 'bg-green-500',
  SG: 'bg-orange-500',
  MY: 'bg-purple-500',
};

interface OutlierPost {
  id: string;
  postId: string;
  viewCount: number;
  followerCountAtTime: number;
  multiplier: number;
  status: string;
  market: string | null;
  platform: string | null;
  analysisResult: any;
  doubleDownDrafts: any[];
  post: {
    id: string;
    content: string;
    publishDate: string;
    market: string | null;
  };
}

interface ReviewResult {
  summary: string;
  topPatterns: string[];
  bottomPatterns: string[];
  recommendations: string[];
  contentMixSuggestion: Record<string, number>;
}

// -- Hooks --

const useOutliers = (projectId: string | null) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const pid = projectId || 'all';
    return await (await fetch(`/analytics/outliers/${pid}`)).json();
  }, [projectId]);
  return useSWR<OutlierPost[]>(
    projectId ? `outliers-${projectId}` : 'outliers-all',
    load,
    { revalidateOnFocus: false }
  );
};

// -- Post Card --

const PostCard: FC<{
  rank: number;
  content: string;
  market: string | null;
  views: number;
  publishDate?: string;
  variant: 'top' | 'bottom';
}> = ({ rank, content, market, views, publishDate, variant }) => {
  const preview = stripHtmlValidation('none', content, false, true, false) || 'No content';
  return (
    <div className="flex items-start gap-[10px] p-[10px] rounded-[8px] bg-newBgColorInner border border-newBorder">
      <div className={clsx(
        'w-[24px] h-[24px] rounded-full flex items-center justify-center text-white text-[11px] font-[700] shrink-0',
        variant === 'top' ? 'bg-green-500' : 'bg-red-400'
      )}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] line-clamp-2 break-words mb-[4px]">{preview}</div>
        <div className="flex items-center gap-[6px] text-[10px] text-textItemBlur">
          {market && (
            <span className={clsx('text-white px-[4px] py-[1px] rounded-[3px]', MARKET_COLORS[market] || 'bg-gray-500')}>
              {market}
            </span>
          )}
          <span>{views.toLocaleString()} views</span>
          {publishDate && <span>{newDayjs(publishDate).local().format('MMM D')}</span>}
        </div>
      </div>
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
            <div className="w-[90px] text-[11px] text-end truncate">{d.label}</div>
            <div className="flex-1 h-[16px] bg-newBgColorInner rounded-[4px] overflow-hidden">
              <div className={clsx('h-full rounded-[4px]', d.color)} style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <div className="w-[40px] text-[11px]">{d.value}</div>
          </div>
        ))}
        {data.length === 0 && <div className="text-[12px] text-textItemBlur text-center py-[8px]">No data</div>}
      </div>
    </div>
  );
};

// -- Outlier Card --

const OutlierCard: FC<{
  outlier: OutlierPost;
  onAnalyze: () => void;
  onDismiss: () => void;
  analyzing: boolean;
}> = ({ outlier, onAnalyze, onDismiss, analyzing }) => {
  const preview = stripHtmlValidation('none', outlier.post.content, false, true, false) || 'No content';
  const isAnalyzed = outlier.status === 'ANALYZED';

  return (
    <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px] flex flex-col gap-[12px]">
      <div className="flex items-start gap-[10px]">
        <div className="bg-yellow-500 text-white text-[11px] font-[700] px-[6px] py-[2px] rounded-[4px] shrink-0">
          {outlier.multiplier.toFixed(1)}x
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] line-clamp-2 break-words mb-[4px]">{preview}</div>
          <div className="flex items-center gap-[6px] text-[10px] text-textItemBlur">
            {outlier.market && (
              <span className={clsx('text-white px-[4px] py-[1px] rounded-[3px]', MARKET_COLORS[outlier.market] || 'bg-gray-500')}>
                {outlier.market}
              </span>
            )}
            <span>{outlier.viewCount.toLocaleString()} views</span>
            <span>{outlier.followerCountAtTime.toLocaleString()} followers</span>
          </div>
        </div>
        <div className="flex gap-[6px] shrink-0">
          {!isAnalyzed && (
            <button
              onClick={onAnalyze}
              disabled={analyzing}
              className="h-[28px] px-[10px] text-[11px] font-[600] rounded-[6px] bg-[#612BD3] text-white disabled:opacity-50"
            >
              {analyzing ? 'Analyzing...' : 'Analyze & Double Down'}
            </button>
          )}
          {outlier.status === 'DETECTED' && (
            <button
              onClick={onDismiss}
              className="h-[28px] px-[10px] text-[11px] font-[600] rounded-[6px] border border-newTableBorder hover:bg-boxHover"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {isAnalyzed && outlier.analysisResult && (
        <div className="border-t border-newBorder pt-[12px]">
          <div className="text-[12px] font-[600] mb-[8px]">Viral Breakdown</div>
          <div className="grid grid-cols-2 gap-[8px] text-[11px]">
            {Object.entries(outlier.analysisResult).map(([key, value]) => (
              <div key={key} className="bg-newBgColorInner rounded-[6px] p-[8px]">
                <div className="text-textItemBlur capitalize mb-[2px]">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div>{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAnalyzed && outlier.doubleDownDrafts && (outlier.doubleDownDrafts as any[]).length > 0 && (
        <div className="border-t border-newBorder pt-[12px]">
          <div className="text-[12px] font-[600] mb-[8px]">Double-Down Drafts</div>
          <div className="flex flex-col gap-[8px]">
            {(outlier.doubleDownDrafts as any[]).map((draft: any, i: number) => (
              <div key={i} className="bg-newBgColorInner rounded-[8px] p-[10px]">
                <div className="text-[10px] text-textItemBlur mb-[4px]">{draft.angle}</div>
                <div className="text-[12px] whitespace-pre-wrap">{draft.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// -- Monthly Review Section --

const ReviewSection: FC<{ projectId: string }> = ({ projectId }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewResult | null>(null);

  const runReview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/analytics/review/${projectId}`, { method: 'POST' });
      const data = await res.json();
      setReview(data);
    } catch {
      toaster.show('Failed to run review', 'warning');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return (
    <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px]">
      <div className="flex items-center gap-[12px] mb-[12px]">
        <div className="text-[14px] font-[600] flex-1">Monthly Strategy Review</div>
        <button
          onClick={runReview}
          disabled={loading}
          className="h-[32px] px-[14px] text-[12px] font-[600] rounded-[6px] bg-[#612BD3] text-white disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Run Review'}
        </button>
      </div>

      {!review && !loading && (
        <div className="text-[13px] text-textItemBlur text-center py-[20px]">
          Click "Run Review" to get AI-powered insights on your last 30 days of content performance.
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-[20px]"><LoadingComponent /></div>
      )}

      {review && (
        <div className="flex flex-col gap-[16px]">
          <div className="text-[13px]">{review.summary}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
            <div>
              <div className="text-[12px] font-[600] text-green-500 mb-[6px]">Top Post Patterns</div>
              <ul className="flex flex-col gap-[4px]">
                {(review.topPatterns || []).map((p, i) => (
                  <li key={i} className="text-[12px] flex items-start gap-[6px]">
                    <span className="text-green-500 shrink-0">+</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[12px] font-[600] text-red-400 mb-[6px]">Bottom Post Patterns</div>
              <ul className="flex flex-col gap-[4px]">
                {(review.bottomPatterns || []).map((p, i) => (
                  <li key={i} className="text-[12px] flex items-start gap-[6px]">
                    <span className="text-red-400 shrink-0">-</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="text-[12px] font-[600] mb-[6px]">Recommendations</div>
            <ul className="flex flex-col gap-[4px]">
              {(review.recommendations || []).map((r, i) => (
                <li key={i} className="text-[12px] flex items-start gap-[6px]">
                  <span className="text-btnPrimary shrink-0">{'\u2192'}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {review.contentMixSuggestion && Object.keys(review.contentMixSuggestion).length > 0 && (
            <div>
              <div className="text-[12px] font-[600] mb-[6px]">Suggested Content Mix</div>
              <div className="flex gap-[8px] flex-wrap">
                {Object.entries(review.contentMixSuggestion).map(([type, pct]) => (
                  <div key={type} className="bg-newBgColorInner rounded-[6px] px-[10px] py-[6px] text-center">
                    <div className="text-[16px] font-[700]">{pct}%</div>
                    <div className="text-[10px] text-textItemBlur capitalize">{type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// -- Main Dashboard --

export const AnalyticsDashboard: FC = () => {
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const fetch = useFetch();
  const toaster = useToaster();
  const { data: outliers, isLoading: outliersLoading, mutate: mutateOutliers } = useOutliers(selectedProjectId);
  const [marketTab, setMarketTab] = useState<string>('All');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const filteredOutliers = useMemo(() => {
    if (!outliers) return [];
    if (marketTab === 'All') return outliers;
    return outliers.filter((o) => o.market === marketTab || o.post?.market === marketTab);
  }, [outliers, marketTab]);

  // Separate top outliers (highest multiplier) and all others
  const topOutliers = useMemo(() => {
    return [...filteredOutliers].sort((a, b) => b.multiplier - a.multiplier);
  }, [filteredOutliers]);

  // Derive pillar/engagement data from outliers for the bar chart
  const marketEngagement = useMemo(() => {
    const byMarket = new Map<string, number>();
    for (const o of outliers || []) {
      const m = o.market || o.post?.market || 'Unknown';
      byMarket.set(m, (byMarket.get(m) || 0) + o.viewCount);
    }
    return Array.from(byMarket.entries())
      .map(([label, value]) => ({ label, value, color: MARKET_COLORS[label] || 'bg-gray-500' }))
      .sort((a, b) => b.value - a.value);
  }, [outliers]);

  const handleAnalyze = useCallback(async (id: string) => {
    setAnalyzingId(id);
    try {
      const res = await fetch(`/analytics/outliers/${id}/analyze`, { method: 'POST' });
      if (!res.ok) {
        toaster.show('Analysis failed', 'warning');
      } else {
        toaster.show('Outlier analyzed');
        mutateOutliers();
      }
    } catch {
      toaster.show('Analysis failed', 'warning');
    } finally {
      setAnalyzingId(null);
    }
  }, []);

  const handleDismiss = useCallback(async (id: string) => {
    await fetch(`/analytics/outliers/${id}/dismiss`, { method: 'POST' });
    toaster.show('Outlier dismissed');
    mutateOutliers();
  }, []);

  if (!selectedProjectId) {
    return (
      <div className="bg-newBgColorInner flex-1 p-[20px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[18px] font-[600] mb-[8px]">Select a Project</div>
          <div className="text-[14px] text-textItemBlur">Use the project switcher in the top bar to view analytics insights.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-newBgColorInner flex-1 p-[20px] flex flex-col gap-[20px] overflow-y-auto">
      {/* Header + Market Tabs */}
      <div className="flex items-center gap-[12px] flex-wrap">
        <h2 className="text-[20px] font-[600] flex-1">Content Insights</h2>
        <div className="flex gap-[4px] border border-newTableBorder rounded-[8px] p-[4px] text-[13px] font-[500]">
          {MARKET_TABS.map((m) => (
            <div
              key={m}
              onClick={() => setMarketTab(m)}
              className={clsx(
                'px-[10px] py-[4px] cursor-pointer rounded-[6px]',
                marketTab === m && 'text-textItemFocused bg-boxFocused'
              )}
            >
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* Top & Bottom Posts from Outliers */}
      {outliersLoading ? (
        <div className="flex justify-center py-[30px]"><LoadingComponent /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            <div>
              <div className="text-[14px] font-[600] mb-[8px] flex items-center gap-[6px]">
                <span className="w-[8px] h-[8px] rounded-full bg-green-500" /> Top Performing Posts
              </div>
              <div className="flex flex-col gap-[6px]">
                {topOutliers.slice(0, 5).map((o, i) => (
                  <PostCard
                    key={o.id}
                    rank={i + 1}
                    content={o.post.content}
                    market={o.market || o.post.market}
                    views={o.viewCount}
                    publishDate={o.post.publishDate}
                    variant="top"
                  />
                ))}
                {topOutliers.length === 0 && (
                  <div className="text-[12px] text-textItemBlur text-center py-[20px]">No outlier data yet. Posts with 5x+ engagement will appear here.</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-[14px] font-[600] mb-[8px] flex items-center gap-[6px]">
                <span className="w-[8px] h-[8px] rounded-full bg-red-400" /> Lowest Multiplier Outliers
              </div>
              <div className="flex flex-col gap-[6px]">
                {[...topOutliers].reverse().slice(0, 5).map((o, i) => (
                  <PostCard
                    key={o.id}
                    rank={i + 1}
                    content={o.post.content}
                    market={o.market || o.post.market}
                    views={o.viewCount}
                    publishDate={o.post.publishDate}
                    variant="bottom"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Engagement Bar Chart */}
          <BarChart data={marketEngagement} title="Engagement by Market" />

          {/* Outlier Detection Section */}
          <div>
            <div className="text-[16px] font-[600] mb-[12px]">Outlier Detection ({topOutliers.length} detected)</div>
            {topOutliers.length === 0 ? (
              <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[20px] text-[13px] text-textItemBlur text-center">
                No outliers detected yet. Posts that get 5x+ their expected engagement will appear here automatically.
              </div>
            ) : (
              <div className="flex flex-col gap-[12px]">
                {topOutliers.map((o) => (
                  <OutlierCard
                    key={o.id}
                    outlier={o}
                    onAnalyze={() => handleAnalyze(o.id)}
                    onDismiss={() => handleDismiss(o.id)}
                    analyzing={analyzingId === o.id}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Monthly Strategy Review */}
      <ReviewSection projectId={selectedProjectId} />
    </div>
  );
};
