'use client';

import { FC, useCallback, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { useProjectStore } from '@gitroom/frontend/components/projects/project.store';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';

interface FrameworkDoc {
  id: string;
  version: number;
  fileName: string;
  fileContent?: string;
  diffSummary: string | null;
  isActive: boolean;
  uploadedAt: string;
}

const useCurrentFramework = (projectId: string | null) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const res = await fetch(`/framework/${projectId}/current`);
    if (!res.ok) return null;
    return await res.json();
  }, [projectId]);
  return useSWR<FrameworkDoc | null>(
    projectId ? `framework-current-${projectId}` : null,
    load,
    { revalidateOnFocus: false }
  );
};

const useVersionHistory = (projectId: string | null) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch(`/framework/${projectId}/versions`)).json();
  }, [projectId]);
  return useSWR<FrameworkDoc[]>(
    projectId ? `framework-versions-${projectId}` : null,
    load,
    { revalidateOnFocus: false }
  );
};

export const FrameworkPage: FC = () => {
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const fetch = useFetch();
  const toaster = useToaster();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: current, mutate: mutateCurrent } = useCurrentFramework(selectedProjectId);
  const { data: versions, mutate: mutateVersions } = useVersionHistory(selectedProjectId);

  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [versionContent, setVersionContent] = useState<string | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setContent(ev.target?.result as string || '');
    };
    reader.readAsText(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedProjectId || !content.trim()) return;
    setUploading(true);
    try {
      await fetch(`/framework/${selectedProjectId}/upload`, {
        method: 'POST',
        body: JSON.stringify({ fileName: fileName || 'framework.txt', content: content.trim() }),
      });
      toaster.show('Framework uploaded');
      setContent('');
      setFileName('');
      setShowUpload(false);
      mutateCurrent();
      mutateVersions();
    } catch {
      toaster.show('Upload failed', 'warning');
    } finally {
      setUploading(false);
    }
  }, [selectedProjectId, content, fileName]);

  const loadVersion = useCallback(async (version: number) => {
    if (expandedVersion === version) {
      setExpandedVersion(null);
      setVersionContent(null);
      return;
    }
    setLoadingVersion(true);
    setExpandedVersion(version);
    try {
      const res = await fetch(`/framework/${selectedProjectId}/versions/${version}`);
      const data = await res.json();
      setVersionContent(data.fileContent || '');
    } catch {
      setVersionContent('Failed to load');
    } finally {
      setLoadingVersion(false);
    }
  }, [selectedProjectId, expandedVersion]);

  if (!selectedProjectId) {
    return (
      <div className="bg-newBgColorInner flex-1 p-[20px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[18px] font-[600] mb-[8px]">Select a Project</div>
          <div className="text-[14px] text-textItemBlur">Use the project switcher to manage framework documents.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-newBgColorInner flex-1 p-[20px] flex flex-col gap-[20px] overflow-y-auto">
      <div className="flex items-center gap-[12px]">
        <h2 className="text-[20px] font-[600] flex-1">Framework Library</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="h-[36px] px-[14px] text-[13px] font-[600] rounded-[8px] bg-[#612BD3] text-white"
        >
          {showUpload ? 'Cancel' : 'Upload New Version'}
        </button>
      </div>

      {/* Current Version */}
      {current && (
        <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px]">
          <div className="flex items-center gap-[8px] mb-[8px]">
            <span className="text-[10px] font-[700] bg-green-500 text-white px-[6px] py-[2px] rounded-[4px]">ACTIVE</span>
            <div className="text-[14px] font-[600]">v{current.version} — {current.fileName}</div>
            <div className="flex-1" />
            <div className="text-[12px] text-textItemBlur">{newDayjs(current.uploadedAt).local().format('MMM D, YYYY HH:mm')}</div>
          </div>
          {current.fileContent && (
            <div className="text-[12px] bg-newBgColorInner rounded-[8px] p-[12px] max-h-[200px] overflow-y-auto whitespace-pre-wrap">
              {current.fileContent.substring(0, 2000)}
              {(current.fileContent?.length || 0) > 2000 && '...'}
            </div>
          )}
        </div>
      )}

      {!current && !showUpload && (
        <div className="bg-newBgColor rounded-[12px] border border-dashed border-newBorder p-[30px] text-center">
          <div className="text-[14px] text-textItemBlur mb-[8px]">No framework document uploaded yet</div>
          <button
            onClick={() => setShowUpload(true)}
            className="h-[32px] px-[12px] text-[12px] font-[600] rounded-[6px] bg-[#612BD3] text-white"
          >
            Upload First Version
          </button>
        </div>
      )}

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px] flex flex-col gap-[12px]">
          <div className="text-[14px] font-[600]">Upload Framework Document</div>
          <div className="flex gap-[8px]">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.doc,.docx,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-[32px] px-[12px] text-[12px] font-[600] rounded-[6px] border border-newTableBorder hover:bg-boxHover"
            >
              Choose File
            </button>
            {fileName && <span className="text-[12px] text-textItemBlur flex items-center">{fileName}</span>}
          </div>
          <div className="text-[11px] text-textItemBlur">Or paste content directly:</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your marketing framework document here..."
            className="h-[200px] px-[12px] py-[10px] text-[12px] bg-newBgColorInner border border-newTableBorder rounded-[8px] text-textColor outline-none resize-none"
          />
          <button
            onClick={handleUpload}
            disabled={uploading || !content.trim()}
            className="h-[36px] px-[14px] text-[13px] font-[600] rounded-[8px] bg-[#612BD3] text-white disabled:opacity-50 self-end"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      {/* Version History */}
      {versions && versions.length > 0 && (
        <div className="bg-newBgColor rounded-[12px] border border-newBorder p-[16px]">
          <div className="text-[14px] font-[600] mb-[12px]">Version History</div>
          <div className="flex flex-col gap-[6px]">
            {versions.map((v) => (
              <div key={v.id}>
                <div
                  onClick={() => loadVersion(v.version)}
                  className={clsx(
                    'flex items-center gap-[8px] p-[10px] rounded-[8px] cursor-pointer hover:bg-boxHover',
                    v.isActive && 'bg-green-500/5'
                  )}
                >
                  <div className="text-[13px] font-[600] w-[40px]">v{v.version}</div>
                  <div className="text-[12px] flex-1">{v.fileName}</div>
                  {v.isActive && <span className="text-[10px] text-green-500 font-[600]">Active</span>}
                  <div className="text-[11px] text-textItemBlur">{newDayjs(v.uploadedAt).local().format('MMM D HH:mm')}</div>
                  <span className={clsx('text-[12px] transition-transform', expandedVersion === v.version && 'rotate-180')}>{'\u25BC'}</span>
                </div>
                {expandedVersion === v.version && (
                  <div className="px-[10px] pb-[10px]">
                    {v.diffSummary && (
                      <div className="text-[11px] bg-yellow-500/10 border border-yellow-500/20 rounded-[6px] p-[8px] mb-[8px]">
                        <span className="font-[600]">Changes: </span>{v.diffSummary}
                      </div>
                    )}
                    {loadingVersion ? (
                      <div className="text-center py-[8px]"><LoadingComponent /></div>
                    ) : (
                      <div className="text-[11px] bg-newBgColorInner rounded-[6px] p-[10px] max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                        {versionContent?.substring(0, 1500)}
                        {(versionContent?.length || 0) > 1500 && '...'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
