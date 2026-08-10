'use client';

import { useState, useEffect, useMemo } from 'react';
import { filterProjectsForUser } from '@/lib/project-access';
import { mergeDrawingScheduleEntries } from '@/lib/schedule-merge';
import { filterByProject } from '../utils/filterByProject';
import {
  computeDrawingProgress,
  computeTrackerProgress,
} from '../utils/progressStats';
import type {
  Audit,
  ClientPortalData,
  DirectoryEntry,
  DrawingPlannedDate,
  DrawingScheduleItem,
  DrawingTemplate,
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
  drawingTemplates: [],
  drawingSchedule: [],
  drawingPlanned: [],
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
          drawingTemplates,
          drawingSchedule,
          drawingPlanned,
        ] = await Promise.all([
          fetchJson<Project>('/api/projects'),
          fetchJson<Requirement>('/api/requirements'),
          fetchJson<Selection>('/api/selections'),
          fetchJson<MOMEntry>('/api/mom'),
          fetchJson<DirectoryEntry>('/api/directory'),
          fetchJson<Quotation>('/api/quotations'),
          fetchJson<Audit>('/api/audits'),
          fetchJson<DrawingTemplate>('/api/drawings/templates'),
          fetchJson<DrawingScheduleItem>('/api/drawings'),
          fetchJson<DrawingPlannedDate>('/api/drawings/planned'),
        ]);

        const projectsList = filterProjectsForUser(projectsRaw, user);

        let initialProject = '';
        if (user?.role === 'Client') {
          initialProject = user.projectName || '';
        } else if (projectsList.length > 0) {
          initialProject = projectsList[0].basicInfo?.name || '';
        }

        let trackerTasks: TrackerProjectTask[] = [];
        if (initialProject) {
          const trackerRes = await fetch(
            `/api/pms-tracker?project=${encodeURIComponent(initialProject)}`
          );
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
          drawingTemplates,
          drawingSchedule,
          drawingPlanned,
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
      setData((prev) => ({ ...prev, trackerTasks: [] }));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const trackerRes = await fetch(
          `/api/pms-tracker?project=${encodeURIComponent(selectedProjectName)}`
        );
        if (cancelled) return;
        if (trackerRes.ok) {
          const trackerData = await trackerRes.json();
          setData((prev) => ({
            ...prev,
            trackerTasks: Array.isArray(trackerData.tasks) ? trackerData.tasks : [],
          }));
        } else {
          setData((prev) => ({ ...prev, trackerTasks: [] }));
        }
      } catch {
        if (!cancelled) {
          setData((prev) => ({ ...prev, trackerTasks: [] }));
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
      requirements: filterByProject(data.requirements, selectedProjectName),
      selections: filterByProject(data.selections, selectedProjectName),
      momList: filterByProject(data.momList, selectedProjectName),
      directory: filterByProject(data.directory, selectedProjectName),
      quotations: filterByProject(data.quotations, selectedProjectName),
      audits: filterByProject(data.audits, selectedProjectName),
      drawingSchedule: filterByProject(data.drawingSchedule, selectedProjectName),
      drawingPlanned: filterByProject(data.drawingPlanned, selectedProjectName),
      trackerTasks: data.trackerTasks,
    }),
    [data, selectedProjectName]
  );

  const mergedDrawings = useMemo((): MergedDrawingRow[] => {
    return data.drawingTemplates.map((tpl) => {
      const entries = filtered.drawingSchedule.filter(
        (s) => s.drawingNo === tpl.drawingNo
      );
      const schedule = mergeDrawingScheduleEntries(entries);
      const catPlan = filtered.drawingPlanned.find(
        (p) => p.category === tpl.category
      );
      return {
        id: tpl.id,
        drawingNo: tpl.drawingNo,
        drawingName: tpl.drawingName,
        areaName: tpl.areaName,
        category: tpl.category,
        planStartDate: catPlan?.planStartDate || '',
        planEndDate: catPlan?.planEndDate || '',
        actualStartDate: schedule?.actualStartDate || '',
        actualEndDate: schedule?.actualEndDate || '',
        rsDesignStatus: schedule?.rsDesignStatus || 'Pending',
        clientStatus: schedule?.clientStatus || 'Pending',
        drawingImage: schedule?.drawingImage || '',
      };
    });
  }, [data.drawingTemplates, filtered.drawingSchedule, filtered.drawingPlanned]);

  const mergedTracker = useMemo((): MergedTrackerRow[] => {
    return filtered.trackerTasks.map((task) => ({
      id: task.id,
      trackerId: task.trackerId,
      taskName: task.taskName,
      zone: task.zone,
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
