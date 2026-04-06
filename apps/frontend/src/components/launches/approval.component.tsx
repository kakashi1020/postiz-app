'use client';

import { FC, useCallback, useState } from 'react';
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

interface PendingPost {
  id: string;
  content: string;
  publishDate: string;
  group: string;
  state: string;
  funnelStage: string | null;
  market: string | null;
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
  onAction: () => void;
}> = ({ post, onAction }) => {
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
    <div className="bg-newBgColorInner rounded-[12px] p-[16px] flex flex-col gap-[12px] border border-newBorder">
      <div className="flex items-center gap-[10px]">
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
  const { data, isLoading, mutate } = useApprovalPosts();
  const posts = data?.posts || [];

  if (isLoading) {
    return (
      <div className="bg-newBgColorInner p-[20px] flex flex-1 items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div className="bg-newBgColorInner flex-1 p-[20px] flex flex-col gap-[16px]">
      <h2 className="text-[20px] font-[600]">Approval Queue</h2>
      {posts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-textItemBlur text-[14px]">
          No posts pending approval
        </div>
      ) : (
        <div className="flex flex-col gap-[12px] overflow-y-auto">
          {posts.map((post: PendingPost) => (
            <ApprovalCard
              key={post.id}
              post={post}
              onAction={() => mutate()}
            />
          ))}
        </div>
      )}
    </div>
  );
};
