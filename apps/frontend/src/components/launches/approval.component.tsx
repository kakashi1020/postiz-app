'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';

const FUNNEL_BADGE: Record<string, string> = {
  TOFU: 'bg-blue-500',
  MOFU: 'bg-yellow-500',
  BOFU: 'bg-green-500',
};

const MARKET_BADGE: Record<string, string> = {
  PH: 'bg-blue-500',
  KR: 'bg-green-500',
  SG: 'bg-orange-500',
  MY: 'bg-purple-500',
};

const MARKETS = ['PH', 'KR', 'SG', 'MY'] as const;
const FUNNEL_STAGES = ['TOFU', 'MOFU', 'BOFU'] as const;

interface PendingPost {
  id: string;
  content: string;
  publishDate: string;
  group: string;
  state: string;
  funnelStage: string | null;
  market: string | null;
  approvalStatus?: string | null;
  updatedAt: string;
  integration: {
    id: string;
    name: string;
    providerIdentifier: string;
    picture: string;
  };
}

export const useApprovalPosts = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch('/posts?approvalStatus=PENDING&startDate=2000-01-01T00:00:00Z&endDate=2099-12-31T23:59:59Z')).json();
  }, []);
  return useSWR<{ posts: PendingPost[] }>('approval-pending', load, {
    revalidateOnFocus: true,
    revalidateIfStale: true,
    refreshInterval: 30000,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });
};

const ReasonModal: FC<{
  title: string;
  buttonLabel: string;
  onSubmit: (reason: string) => void;
}> = ({ title, buttonLabel, onSubmit }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="flex flex-col gap-[12px] p-[4px]">
      <div className="text-[14px] font-[500]">{title}</div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-[100px] px-[10px] py-[8px] text-[13px] bg-newBgColorInner border border-newTableBorder rounded-[8px] text-textColor outline-none resize-none"
        placeholder="Enter reason..."
      />
      <button
        disabled={!reason.trim()}
        onClick={() => onSubmit(reason.trim())}
        className="h-[36px] bg-[#612BD3] text-white rounded-[8px] text-[13px] font-[600] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {buttonLabel}
      </button>
    </div>
  );
};

const ApprovalCard: FC<{
  post: PendingPost;
  selected: boolean;
  onToggle: () => void;
  onAction: () => void;
}> = ({ post, selected, onToggle, onAction }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const modal = useModals();
  const [loading, setLoading] = useState(false);

  const handleApprove = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/posts/${post.group}/approve`, {
        method: 'POST',
        body: JSON.stringify({ expectedUpdatedAt: post.updatedAt }),
      });
      if (!res.ok) {
        const data = await res.json();
        toaster.show(data.message || 'Failed to approve', 'warning');
      } else {
        toaster.show('Post approved');
        onAction();
      }
    } catch {
      toaster.show('Failed to approve', 'warning');
    } finally {
      setLoading(false);
    }
  }, [post]);

  const handleReject = useCallback(() => {
    modal.openModal({
      title: 'Reject Post',
      children: (
        <ReasonModal
          title="Why are you rejecting this post?"
          buttonLabel="Reject"
          onSubmit={async (reason) => {
            const res = await fetch(`/posts/${post.group}/reject`, {
              method: 'POST',
              body: JSON.stringify({ reason }),
            });
            if (!res.ok) {
              const data = await res.json();
              toaster.show(data.message || 'Failed to reject', 'warning');
            } else {
              toaster.show('Post rejected');
              onAction();
            }
            modal.closeAll();
          }}
        />
      ),
    });
  }, [post]);

  const handleRequestChanges = useCallback(() => {
    modal.openModal({
      title: 'Request Changes',
      children: (
        <ReasonModal
          title="What changes are needed?"
          buttonLabel="Request Changes"
          onSubmit={async (reason) => {
            const res = await fetch(`/posts/${post.group}/request-changes`, {
              method: 'POST',
              body: JSON.stringify({ reason }),
            });
            if (!res.ok) {
              const data = await res.json();
              toaster.show(data.message || 'Failed to request changes', 'warning');
            } else {
              toaster.show('Changes requested');
              onAction();
            }
            modal.closeAll();
          }}
        />
      ),
    });
  }, [post]);

  const contentPreview = stripHtmlValidation('none', post.content, false, true, false) || 'No content';

  return (
    <div className={clsx(
      'bg-newBgColorInner rounded-[12px] p-[16px] flex flex-col gap-[12px] border',
      selected ? 'border-btnPrimary' : 'border-newBorder'
    )}>
      <div className="flex items-center gap-[10px]">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-[16px] h-[16px] rounded-[4px] accent-btnPrimary cursor-pointer"
        />
        <div className="relative min-w-[36px]">
          <img
            className="w-[36px] h-[36px] rounded-[8px]"
            src={post.integration.picture || '/no-picture.jpg'}
            alt={post.integration.name}
          />
          <img
            className="w-[16px] h-[16px] rounded-[4px] absolute z-10 bottom-[-2px] end-[-2px] border border-fifth"
            src={`/icons/platforms/${post.integration.providerIdentifier}.png`}
            alt={post.integration.providerIdentifier}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-[600] truncate">{post.integration.name}</div>
          <div className="text-[12px] text-textItemBlur">
            {newDayjs(post.publishDate).local().format('MMM D, YYYY [at] HH:mm')}
          </div>
        </div>
        <div className="flex gap-[4px] flex-wrap">
          {post.funnelStage && (
            <span className={clsx('text-[10px] text-white px-[6px] py-[2px] rounded-[4px]', FUNNEL_BADGE[post.funnelStage] || 'bg-gray-500')}>
              {post.funnelStage}
            </span>
          )}
          {post.market && (
            <span className={clsx('text-[10px] text-white px-[6px] py-[2px] rounded-[4px]', MARKET_BADGE[post.market] || 'bg-gray-500')}>
              {post.market}
            </span>
          )}
        </div>
      </div>
      <div className="text-[13px] text-textColor line-clamp-3 break-words">
        {contentPreview}
      </div>
      <div className="flex gap-[8px] justify-end">
        <button
          onClick={handleRequestChanges}
          disabled={loading}
          className="px-[12px] h-[32px] text-[12px] font-[600] rounded-[6px] border border-orange-500 text-orange-500 hover:bg-orange-500/10 disabled:opacity-50"
        >
          Request Changes
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="px-[12px] h-[32px] text-[12px] font-[600] rounded-[6px] border border-red-500 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="px-[12px] h-[32px] text-[12px] font-[600] rounded-[6px] bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Approving...' : 'Approve'}
        </button>
      </div>
    </div>
  );
};

export const ApprovalComponent: FC = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const modal = useModals();
  const { data, isLoading, mutate } = useApprovalPosts();
  const allPosts = data?.posts || [];

  // Filters
  const [filterMarket, setFilterMarket] = useState<string>('');
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [filterFunnel, setFilterFunnel] = useState<string>('');

  // Selection
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Derived platform list
  const platforms = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPosts) {
      if (p.integration.providerIdentifier) set.add(p.integration.providerIdentifier.split('-')[0]);
    }
    return Array.from(set).sort();
  }, [allPosts]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return allPosts.filter((p) => {
      if (filterMarket && p.market !== filterMarket) return false;
      if (filterPlatform && !p.integration.providerIdentifier.startsWith(filterPlatform)) return false;
      if (filterFunnel && p.funnelStage !== filterFunnel) return false;
      return true;
    });
  }, [allPosts, filterMarket, filterPlatform, filterFunnel]);

  // Market breakdown
  const marketBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPosts) {
      const m = p.market || 'None';
      counts.set(m, (counts.get(m) || 0) + 1);
    }
    return counts;
  }, [allPosts]);

  const toggleSelect = useCallback((group: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedGroups.size === filteredPosts.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredPosts.map((p) => p.group)));
    }
  }, [filteredPosts, selectedGroups]);

  const bulkApprove = useCallback(async () => {
    if (selectedGroups.size === 0) return;
    setBulkLoading(true);
    let succeeded = 0;
    for (const group of selectedGroups) {
      try {
        const res = await fetch(`/posts/${group}/approve`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        if (res.ok) succeeded++;
      } catch { /* continue */ }
    }
    toaster.show(`${succeeded} post${succeeded !== 1 ? 's' : ''} approved`);
    setSelectedGroups(new Set());
    setBulkLoading(false);
    mutate();
  }, [selectedGroups]);

  const bulkReject = useCallback(() => {
    if (selectedGroups.size === 0) return;
    modal.openModal({
      title: 'Reject Selected Posts',
      children: (
        <ReasonModal
          title={`Rejecting ${selectedGroups.size} post${selectedGroups.size !== 1 ? 's' : ''}. Provide a shared reason:`}
          buttonLabel="Reject All Selected"
          onSubmit={async (reason) => {
            setBulkLoading(true);
            let succeeded = 0;
            for (const group of selectedGroups) {
              try {
                const res = await fetch(`/posts/${group}/reject`, {
                  method: 'POST',
                  body: JSON.stringify({ reason }),
                });
                if (res.ok) succeeded++;
              } catch { /* continue */ }
            }
            toaster.show(`${succeeded} post${succeeded !== 1 ? 's' : ''} rejected`);
            setSelectedGroups(new Set());
            setBulkLoading(false);
            mutate();
            modal.closeAll();
          }}
        />
      ),
    });
  }, [selectedGroups]);

  if (isLoading) {
    return (
      <div className="bg-newBgColorInner p-[20px] flex flex-1 items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div className="bg-newBgColorInner flex-1 p-[20px] flex flex-col gap-[12px] overflow-y-auto">
      {/* Summary Bar */}
      <div className="flex items-center gap-[12px] flex-wrap">
        <h2 className="text-[20px] font-[600]">Approval Queue</h2>
        <div className="flex-1" />
        <div className="flex items-center gap-[8px] text-[12px]">
          <span className="font-[600]">{allPosts.length} pending</span>
          {Array.from(marketBreakdown.entries()).map(([m, count]) => (
            <span key={m} className={clsx('px-[6px] py-[2px] rounded-[4px] text-white text-[10px]', MARKET_BADGE[m] || 'bg-gray-500')}>
              {m}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-[8px] flex-wrap">
        <select
          value={filterMarket}
          onChange={(e) => setFilterMarket(e.target.value)}
          className="h-[32px] px-[8px] text-[12px] bg-newBgColorInner border border-newTableBorder rounded-[6px] text-textColor outline-none"
        >
          <option value="">All Markets</option>
          {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="h-[32px] px-[8px] text-[12px] bg-newBgColorInner border border-newTableBorder rounded-[6px] text-textColor outline-none"
        >
          <option value="">All Platforms</option>
          {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filterFunnel}
          onChange={(e) => setFilterFunnel(e.target.value)}
          className="h-[32px] px-[8px] text-[12px] bg-newBgColorInner border border-newTableBorder rounded-[6px] text-textColor outline-none"
        >
          <option value="">All Funnels</option>
          {FUNNEL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex-1" />

        {/* Bulk Actions */}
        <label className="flex items-center gap-[4px] text-[12px] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filteredPosts.length > 0 && selectedGroups.size === filteredPosts.length}
            onChange={toggleSelectAll}
            className="w-[14px] h-[14px] accent-btnPrimary"
          />
          Select all
        </label>
        {selectedGroups.size > 0 && (
          <>
            <span className="text-[11px] text-textItemBlur">{selectedGroups.size} selected</span>
            <button
              onClick={bulkApprove}
              disabled={bulkLoading}
              className="h-[32px] px-[12px] text-[12px] font-[600] rounded-[6px] bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve Selected
            </button>
            <button
              onClick={bulkReject}
              disabled={bulkLoading}
              className="h-[32px] px-[12px] text-[12px] font-[600] rounded-[6px] border border-red-500 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
            >
              Reject Selected
            </button>
          </>
        )}
      </div>

      {/* Post List */}
      {filteredPosts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-textItemBlur text-[14px]">
          {allPosts.length === 0 ? 'No posts pending approval' : 'No posts match the current filters'}
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {filteredPosts.map((post: PendingPost) => (
            <ApprovalCard
              key={post.id}
              post={post}
              selected={selectedGroups.has(post.group)}
              onToggle={() => toggleSelect(post.group)}
              onAction={() => mutate()}
            />
          ))}
        </div>
      )}
    </div>
  );
};
