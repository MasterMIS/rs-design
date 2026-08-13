'use client';

import { useState, useEffect, useMemo } from 'react';
import { filterProjectsForUser } from '@/lib/project-access';
import {
  computeDrawingProgress,
  computeTrackerProgress,
} from '../utils/progressStats';
import type {
  Audit,
  ClientPortalData,
  DirectoryEntry,
  DrawingProjectTask,
  MergedDrawingRow,
  MergedTrackerRow,
  ModuleCounts,
  MOMEntry,
  Project,
  Quotation,
  Requirement,
  Selection,
  TrackerProjectTask,
} from '../types';

type AuthUser = {
  name: string;
  role: string;
  projectName?: string;
} | null;

async function fetchJson<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const emptyData: ClientPortalData = {
  projectsList: [],
  requirements: [],
  selections: [],
  momList: [],
  directory: [],
  quotations: [],
  audits: [],
  drawingTasks: [],
  trackerTasks: [],
};

export function useClientPortalData(user: AuthUser) {
  const [loading, setLoading] = useState(true);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [data, setData] = useState<ClientPortalData>(emptyData);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        const [
          projectsRaw,
          requirements,
          selections,
          momList,
          directory,
          quotations,
          audits,
        ] = await Promise.all([
          fetchJson<Project>('/api/projects'),
          fetchJson<Requirement>('/api/requirements'),
          fetchJson<Selection>('/api/selections'),
          fetchJson<MOMEntry>('/api/mom'),
          fetchJson<DirectoryEntry>('/api/directory'),
          fetchJson<Quotation>('/api/quotations'),
          fetchJson<Audit>('/api/audits'),
        ]);

        const projectsList = filterProjectsForUser(projectsRaw, user);

        let initialProject = '';
        if (user?.role === 'Client') {
          initialProject = user.projectName || '';
        } else if (projectsList.length > 0) {
          initialProject = projectsList[0].basicInfo?.name || '';
        }

        let drawingTasks: DrawingProjectTask[] = [];
        let trackerTasks: TrackerProjectTask[] = [];
        if (initialProject) {
          const [drawingRes, trackerRes] = await Promise.all([
            fetch(`/api/drawings?project=${encodeURIComponent(initialProject)}`),
            fetch(`/api/pms-tracker?project=${encodeURIComponent(initialProject)}`),
          ]);
          if (drawingRes.ok) {
            const drawingData = await drawingRes.json();
            drawingTasks = Array.isArray(drawingData.drawings) ? drawingData.drawings : [];
          }
          if (trackerRes.ok) {
            const trackerData = await trackerRes.json();
            trackerTasks = Array.isArray(trackerData.tasks) ? trackerData.tasks : [];
          }
        }

        setData({
          projectsList,
          requirements,
          selections,
          momList,
          directory,
          quotations,
          audits,
          drawingTasks,
          trackerTasks,
        });
        setSelectedProjectName(initialProject);
      } catch (err) {
        console.error('Error loading client portal:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  useEffect(() => {
    if (!selectedProjectName) {
      setData((prev) => ({ ...prev, drawingTasks: [], trackerTasks: [] }));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [drawingRes, trackerRes] = await Promise.all([
          fetch(`/api/drawings?project=${encodeURIComponent(selectedProjectName)}`),
          fetch(`/api/pms-tracker?project=${encodeURIComponent(selectedProjectName)}`),
        ]);
        if (cancelled) return;

        let drawingTasks: DrawingProjectTask[] = [];
        let trackerTasks: TrackerProjectTask[] = [];

        if (drawingRes.ok) {
          const drawingData = await drawingRes.json();
          drawingTasks = Array.isArray(drawingData.drawings) ? drawingData.drawings : [];
        }
        if (trackerRes.ok) {
          const trackerData = await trackerRes.json();
          trackerTasks = Array.isArray(trackerData.tasks) ? trackerData.tasks : [];
        }

        setData((prev) => ({ ...prev, drawingTasks, trackerTasks }));
      } catch {
        if (!cancelled) {
          setData((prev) => ({ ...prev, drawingTasks: [], trackerTasks: [] }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectName]);

  const currentProject = useMemo(
    () =>
      data.projectsList.find(
        (p) =>
          p.basicInfo?.name?.toLowerCase() === selectedProjectName.toLowerCase()
      ),
    [data.projectsList, selectedProjectName]
  );

  const filtered = useMemo(
    () => ({
      requirements: data.requirements.filter(
        (r) => r.project?.toLowerCase() === selectedProjectName.toLowerCase()
      ),
      selections: data.selections.filter(
        (s) => s.project?.toLowerCase() === selectedProjectName.toLowerCase()
      ),
      momList: data.momList.filter(
        (m) => m.project?.toLowerCase() === selectedProjectName.toLowerCase()
      ),
      directory: data.directory.filter(
        (d) => d.project?.toLowerCase() === selectedProjectName.toLowerCase()
      ),
      quotations: data.quotations.filter(
        (q) => q.project?.toLowerCase() === selectedProjectName.toLowerCase()
      ),
      audits: data.audits.filter(
        (a) => a.project?.toLowerCase() === selectedProjectName.toLowerCase()
      ),
      drawingTasks: data.drawingTasks,
      trackerTasks: data.trackerTasks,
    }),
    [data, selectedProjectName]
  );

  const mergedDrawings = useMemo((): MergedDrawingRow[] => {
    return filtered.drawingTasks.map((task) => ({
      id: task.id,
      drawingNo: task.drawingNo,
      drawingName: task.drawingName,
      areaName: task.areaName,
      category: task.category,
      planStartDate: task.plannedStartDate || '',
      planEndDate: task.plannedEndDate || '',
      actualStartDate: task.actualStartDate || '',
      actualEndDate: task.actualEndDate || '',
      drawingImage: task.drawingImage || '',
    }));
  }, [filtered.drawingTasks]);

  const mergedTracker = useMemo((): MergedTrackerRow[] => {
    return filtered.trackerTasks.map((task) => ({
      id: task.id,
      trackerId: task.trackerId,
      taskName: task.taskName,
      areaName: task.areaName,
      category: task.category,
      tat: '',
      planStartDate: task.plannedStartDate || '',
      planEndDate: task.plannedEndDate || '',
      actualStartDate: task.actualStartDate || '',
      actualEndDate: task.actualEndDate || '',
    }));
  }, [filtered.trackerTasks]);

  const moduleCounts = useMemo<ModuleCounts>(
    () => ({
      requirements: filtered.requirements.length,
      selections: filtered.selections.length,
      mom: filtered.momList.length,
      directory: filtered.directory.length,
      quotations: filtered.quotations.length,
      audits: filtered.audits.length,
      drawings: mergedDrawings.length,
      tracker: mergedTracker.length,
    }),
    [filtered, mergedDrawings.length, mergedTracker.length]
  );

  const progressPercent = (currentProject?.metadata?.completion as number) || 0;

  const trackerProgress = useMemo(
    () => computeTrackerProgress(mergedTracker),
    [mergedTracker]
  );

  const drawingProgress = useMemo(
    () => computeDrawingProgress(mergedDrawings),
    [mergedDrawings]
  );

  return {
    loading,
    selectedProjectName,
    setSelectedProjectName,
    projectsList: data.projectsList,
    currentProject,
    progressPercent,
    moduleCounts,
    filtered,
    mergedDrawings,
    mergedTracker,
    trackerProgress,
    drawingProgress,
  };
}
