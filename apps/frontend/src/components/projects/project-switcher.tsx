'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { useProjectStore } from '@gitroom/frontend/components/projects/project.store';
import { useShallow } from 'zustand/react/shallow';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';

interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
}

const useProjects = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch('/projects')).json();
  }, []);
  return useSWR<Project[]>('projects', load, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnReconnect: false,
  });
};

const CreateProjectForm: FC<{
  onCreated: () => void;
}> = ({ onCreated }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !slug.trim()) {
      toaster.show('Name and slug are required', 'warning');
      return;
    }
    setLoading(true);
    try {
      await fetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, slug: slug.trim() }),
      });
      toaster.show('Project created successfully');
      onCreated();
    } catch {
      toaster.show('Failed to create project', 'warning');
    } finally {
      setLoading(false);
    }
  }, [name, description, slug, onCreated]);

  return (
    <div className="flex flex-col gap-[12px] p-[4px]">
      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] font-[500]">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-[36px] px-[10px] text-[13px] bg-newBgColorInner border border-newTableBorder rounded-[8px] text-textColor outline-none"
          placeholder="My Project"
        />
      </div>
      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] font-[500]">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-[36px] px-[10px] text-[13px] bg-newBgColorInner border border-newTableBorder rounded-[8px] text-textColor outline-none"
          placeholder="Optional description"
        />
      </div>
      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] font-[500]">Slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          className="h-[36px] px-[10px] text-[13px] bg-newBgColorInner border border-newTableBorder rounded-[8px] text-textColor outline-none"
          placeholder="my-project"
        />
      </div>
      <button
        disabled={loading || !name.trim() || !slug.trim()}
        onClick={handleSubmit}
        className="h-[36px] bg-[#612BD3] text-white rounded-[8px] text-[13px] font-[600] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Project'}
      </button>
    </div>
  );
};

export const ProjectSwitcher: FC = () => {
  const { selectedProjectId, setSelectedProjectId } = useProjectStore(
    useShallow((state) => ({
      selectedProjectId: state.selectedProjectId,
      setSelectedProjectId: state.setSelectedProjectId,
    }))
  );
  const { data: projects, mutate } = useProjects();
  const modal = useModals();

  const currentProject = useMemo(() => {
    return projects?.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const selectProject = useCallback(
    (id: string | null) => () => {
      setSelectedProjectId(id);
    },
    []
  );

  const openCreateModal = useCallback(() => {
    modal.openModal({
      title: 'Create Project',
      children: (
        <CreateProjectForm
          onCreated={() => {
            mutate();
            modal.closeAll();
          }}
        />
      ),
    });
  }, [modal, mutate]);

  if (!projects || projects.length === 0) {
    return (
      <div className="hover:text-newTextColor">
        <div className="group text-[12px] relative">
          <div className="flex items-center cursor-pointer gap-[4px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="hidden py-[8px] px-[8px] group-hover:flex absolute top-[100%] end-0 bg-third border-tableBorder border gap-[4px] cursor-pointer flex-col min-w-[180px] rounded-[8px] z-[500]">
            <div
              onClick={openCreateModal}
              className="px-[8px] py-[6px] hover:bg-boxHover rounded-[6px] text-[12px] font-[500]"
            >
              + Create Project
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hover:text-newTextColor">
        <div className="group text-[12px] relative">
          <div className="flex items-center cursor-pointer gap-[4px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="max-w-[100px] truncate">
              {currentProject?.name || 'All Projects'}
            </span>
          </div>
          <div className="hidden py-[8px] px-[8px] group-hover:flex absolute top-[100%] end-0 bg-third border-tableBorder border gap-[4px] cursor-pointer flex-col min-w-[180px] rounded-[8px] z-[500]">
            <div
              onClick={selectProject(null)}
              className={clsx(
                'px-[8px] py-[6px] hover:bg-boxHover rounded-[6px] text-[12px] font-[500]',
                !selectedProjectId && 'text-newTextColor bg-boxFocused'
              )}
            >
              All Projects
            </div>
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={selectProject(project.id)}
                className={clsx(
                  'px-[8px] py-[6px] hover:bg-boxHover rounded-[6px] text-[12px] font-[500]',
                  selectedProjectId === project.id && 'text-newTextColor bg-boxFocused'
                )}
              >
                {project.name}
              </div>
            ))}
            <div className="border-t border-blockSeparator my-[2px]" />
            <div
              onClick={openCreateModal}
              className="px-[8px] py-[6px] hover:bg-boxHover rounded-[6px] text-[12px] font-[500]"
            >
              + Create Project
            </div>
          </div>
        </div>
      </div>
      <div className="w-[1px] h-[20px] bg-blockSeparator" />
    </>
  );
};
