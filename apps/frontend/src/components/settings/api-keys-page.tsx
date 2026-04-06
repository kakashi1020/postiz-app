'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';

interface CategoryConfig {
  label: string;
  keys: string[];
}

const CATEGORIES: Record<string, CategoryConfig> = {
  ai: {
    label: 'AI Services',
    keys: [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'FAL_KEY',
      'FISH_AUDIO_KEY',
      'VIDEO_MODEL',
    ],
  },
  social: {
    label: 'Social Platforms',
    keys: [
      'LINKEDIN_CLIENT_ID',
      'LINKEDIN_CLIENT_SECRET',
      'FACEBOOK_APP_ID',
      'FACEBOOK_APP_SECRET',
      'TIKTOK_CLIENT_ID',
      'TIKTOK_CLIENT_SECRET',
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
    ],
  },
  storage: {
    label: 'Storage',
    keys: [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_ACCESS_KEY',
      'CLOUDFLARE_SECRET_ACCESS_KEY',
      'CLOUDFLARE_BUCKETNAME',
      'CLOUDFLARE_BUCKET_URL',
    ],
  },
};

const useApiKeys = () => {
  const fetch = useFetch();
  const loader = useCallback(
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json();
    },
    [fetch]
  );
  return useSWR<Record<string, Record<string, string>>>('/config/keys', loader, {
    revalidateOnFocus: false,
  });
};

const KeyRow: FC<{
  keyName: string;
  maskedValue: string;
  editValue: string;
  isEditing: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onCancel: () => void;
}> = ({ keyName, maskedValue, editValue, isEditing, onEdit, onChange, onCancel }) => {
  return (
    <div className="flex items-center gap-[12px] py-[8px]">
      <div className="w-[260px] text-sm font-mono shrink-0">{keyName}</div>
      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-input border border-customColor6 rounded-[4px] px-[12px] py-[6px] text-sm font-mono"
            autoFocus
          />
        ) : (
          <div className="w-full bg-input border border-customColor6 rounded-[4px] px-[12px] py-[6px] text-sm font-mono text-gray-400 min-h-[34px]">
            {maskedValue || '—'}
          </div>
        )}
      </div>
      <div className="shrink-0">
        {isEditing ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-400 hover:text-white px-[8px]"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm text-blue-400 hover:text-blue-300 px-[8px]"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

export const ApiKeysPage: FC = () => {
  const fetch = useFetch();
  const toast = useToaster();
  const { data, mutate } = useApiKeys();
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return Object.keys(editingKeys).length > 0;
  }, [editingKeys]);

  const handleEdit = useCallback(
    (key: string, currentMasked: string) => {
      setEditingKeys((prev) => ({
        ...prev,
        [key]: '',
      }));
    },
    []
  );

  const handleChange = useCallback((key: string, value: string) => {
    setEditingKeys((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleCancel = useCallback((key: string) => {
    setEditingKeys((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const updates: Record<string, string> = {};
    for (const [key, value] of Object.entries(editingKeys)) {
      if (value) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      toast.show('No changes to save', 'warning');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/config/keys', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      toast.show('API keys updated successfully');
      setEditingKeys({});
      mutate();
    } catch {
      toast.show('Failed to update API keys', 'warning');
    } finally {
      setSaving(false);
    }
  }, [editingKeys, fetch, mutate, toast]);

  if (!data) {
    return (
      <div className="p-[24px] text-center text-gray-400">Loading...</div>
    );
  }

  return (
    <div className="flex flex-col gap-[24px] p-[24px] max-w-[900px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-gray-400 mt-[4px]">
            Configure API keys for external services. Keys set here override environment variables.
          </p>
        </div>
        {hasChanges && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-[16px] py-[8px] rounded-[4px] text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {Object.entries(CATEGORIES).map(([categoryKey, config]) => (
        <div
          key={categoryKey}
          className="bg-newBgColorInner border border-customColor6 rounded-[8px] p-[16px]"
        >
          <h2 className="text-lg font-semibold mb-[12px]">{config.label}</h2>
          <div className="flex flex-col divide-y divide-customColor6">
            {config.keys.map((keyName) => (
              <KeyRow
                key={keyName}
                keyName={keyName}
                maskedValue={data[categoryKey]?.[keyName] || ''}
                editValue={editingKeys[keyName] || ''}
                isEditing={keyName in editingKeys}
                onEdit={() =>
                  handleEdit(keyName, data[categoryKey]?.[keyName] || '')
                }
                onChange={(value) => handleChange(keyName, value)}
                onCancel={() => handleCancel(keyName)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
