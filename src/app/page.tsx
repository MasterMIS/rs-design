'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { filterProjectsForUser } from '@/lib/project-access';
import {
  buildDrawingDoerTasksFromProjects,
  buildTrackerDoerTasksFromProjects,
  type DrawingProjectBundle,
  type TrackerProjectBundle,
} from '@/lib/schedule-merge';
import {
  buildCategorySummaryRowsFromDrawingTasks,
  buildCategorySummaryRowsFromTrackerTasks,
  buildDashboardKpis,
  buildNeedsAttentionRows,
  buildProjectHealthRows,
  buildProjectSummaryRowsFromDrawingTasks,
  buildProjectSummaryRowsFromTrackerTasks,
  buildTeamWorkloadRows,
  buildTodayPlanCounts,
  buildUpcoming7DayCounts,
  buildZoneSummaryRowsFromDrawingTasks,
  buildZoneSummaryRowsFromTrackerTasks,
  type MomRecord,
  type QuotationRecord,
  type SiteVisitRecord,
} from '@/lib/dashboard-analytics';
import {
  buildPcDashboardTasks,
  filterPcTasksForUser,
  type EmDesignTask,
  type EmExecutionTask,
  type HrmsCandidate,
  type SalesLead,
} from '@/lib/pc-dashboard';
import GlobalLoading from '@/components/GlobalLoading';
import SearchableSelect from '@/components/SearchableSelect';
import { DashboardKpiGrid } from '@/components/dashboard/DashboardKpiGrid';
import { DrawingTrackerSummaryGrid } from '@/components/dashboard/DrawingTrackerSummaryGrid';
import { NeedsAttentionTable } from '@/components/dashboard/NeedsAttentionTable';
import { ProjectHealthTable } from '@/components/dashboard/ProjectHealthTable';
import { TodayPlanCard } from '@/components/dashboard/TodayPlanCard';
import { UpcomingCard } from '@/components/dashboard/UpcomingCard';
import { TeamWorkloadTable } from '@/components/dashboard/TeamWorkloadTable';
import DashboardNavSidebar from '@/components/AppNavSidebar';
import dashboardStyles from '@/components/dashboard/dashboard.module.css';
import styles from './page.module.css';

const ALL_PROJECTS = 'All Projects';

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

function filterByProjectNames<T extends { project?: string }>(
  items: T[],
  projectNames: string[]
): T[] {
  const allow = new Set(projectNames.map((n) => n.trim().toLowerCase()));
  return items.filter((item) => {
    const project = item.project?.trim().toLowerCase();
    return project ? allow.has(project) : false;
  });
}

function filterBundlesByProjects<T extends { project: string }>(
  bundles: T[],
  projectNames: string[]
): T[] {
  const allow = new Set(projectNames.map((n) => n.trim().toLowerCase()));
  return bundles.filter((b) => allow.has(b.project.trim().toLowerCase()));
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(ALL_PROJECTS);
  const [projectsList, setProjectsList] = useState<
    Array<{ basicInfo?: { name?: string } }>
  >([]);
  const [drawingBundles, setDrawingBundles] = useState<DrawingProjectBundle[]>([]);
  const [trackerBundles, setTrackerBundles] = useState<TrackerProjectBundle[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisitRecord[]>([]);
  const [momRecords, setMomRecords] = useState<MomRecord[]>([]);
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [emDesignTasks, setEmDesignTasks] = useState<EmDesignTask[]>([]);
  const [emExecutionTasks, setEmExecutionTasks] = useState<EmExecutionTask[]>([]);
  const [salesLeads, setSalesLeads] = useState<SalesLead[]>([]);
  const [hrmsCandidates, setHrmsCandidates] = useState<HrmsCandidate[]>([]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        const [
          projectsRaw,
          drawingAll,
          trackerAll,
          siteVisitsRaw,
          momRaw,
          quotationsRaw,
          emDesignRaw,
          emExecutionRaw,
          salesRaw,
          hrmsRaw,
        ] = await Promise.all([
          fetchJson<{ basicInfo?: { name?: string } }>('/api/projects'),
          fetch('/api/drawings?all=1').then(async (res) => {
            if (!res.ok) return [] as DrawingProjectBundle[];
            const data = await res.json();
            return Array.isArray(data) ? (data as DrawingProjectBundle[]) : [];
          }),
          fetch('/api/pms-tracker?all=1').then(async (res) => {
            if (!res.ok) return [] as TrackerProjectBundle[];
            const data = await res.json();
            return Array.isArray(data) ? (data as TrackerProjectBundle[]) : [];
          }),
          fetchJson<SiteVisitRecord>('/api/site-visits'),
          fetchJson<MomRecord>('/api/mom'),
          fetchJson<QuotationRecord>('/api/quotations'),
          fetchJson<EmDesignTask>('/api/em/design'),
          fetchJson<EmExecutionTask>('/api/em/execution'),
          fetchJson<SalesLead>('/api/sales'),
          fetchJson<HrmsCandidate>('/api/hrms'),
        ]);

        setProjectsList(filterProjectsForUser(projectsRaw, user));
        setDrawingBundles(drawingAll);
        setTrackerBundles(trackerAll);
        setSiteVisits(siteVisitsRaw);
        setMomRecords(momRaw);
        setQuotations(quotationsRaw);
        setEmDesignTasks(emDesignRaw);
        setEmExecutionTasks(emExecutionRaw);
        setSalesLeads(salesRaw);
        setHrmsCandidates(hrmsRaw);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const projectNames = useMemo(
    () =>
      projectsList
        .map((p) => p.basicInfo?.name?.trim())
        .filter((name): name is string => !!name),
    [projectsList]
  );

  const projectOptions = useMemo(
    () => [ALL_PROJECTS, ...projectNames],
    [projectNames]
  );

  const activeProjectNames = useMemo(() => {
    if (selectedProject === ALL_PROJECTS) return projectNames;
    return projectNames.filter(
      (name) => name.toLowerCase() === selectedProject.toLowerCase()
    );
  }, [selectedProject, projectNames]);

  const scopedDrawingBundles = useMemo(
    () => filterBundlesByProjects(drawingBundles, activeProjectNames),
    [drawingBundles, activeProjectNames]
  );

  const scopedTrackerBundles = useMemo(
    () => filterBundlesByProjects(trackerBundles, activeProjectNames),
    [trackerBundles, activeProjectNames]
  );

  const scopedQuotations = useMemo(
    () => filterByProjectNames(quotations, activeProjectNames),
    [quotations, activeProjectNames]
  );

  const scopedSiteVisits = useMemo(
    () => filterByProjectNames(siteVisits, activeProjectNames),
    [siteVisits, activeProjectNames]
  );

  const scopedMomRecords = useMemo(
    () => filterByProjectNames(momRecords, activeProjectNames),
    [momRecords, activeProjectNames]
  );

  const pcTasks = useMemo(() => {
    const tasks = buildPcDashboardTasks({
      drawingBundles: scopedDrawingBundles,
      trackerBundles: scopedTrackerBundles,
      emDesignTasks: emDesignTasks.filter((t) =>
        activeProjectNames.some(
          (name) =>
            t.project_name?.trim().toLowerCase() === name.trim().toLowerCase()
        )
      ),
      emExecutionTasks: emExecutionTasks.filter((t) =>
        activeProjectNames.some(
          (name) =>
            t.project_name?.trim().toLowerCase() === name.trim().toLowerCase()
        )
      ),
      salesLeads,
      hrmsCandidates,
    });
    return filterPcTasksForUser(tasks, user);
  }, [
    scopedDrawingBundles,
    scopedTrackerBundles,
    emDesignTasks,
    emExecutionTasks,
    salesLeads,
    hrmsCandidates,
    activeProjectNames,
    user,
  ]);

  const kpis = useMemo(
    () => buildDashboardKpis(activeProjectNames, pcTasks, scopedQuotations),
    [activeProjectNames, pcTasks, scopedQuotations]
  );

  const needsAttentionRows = useMemo(
    () => buildNeedsAttentionRows(pcTasks, 10),
    [pcTasks]
  );

  const healthRows = useMemo(
    () =>
      buildProjectHealthRows(
        activeProjectNames,
        scopedDrawingBundles,
        scopedTrackerBundles,
        scopedSiteVisits
      ),
    [activeProjectNames, scopedDrawingBundles, scopedTrackerBundles, scopedSiteVisits]
  );

  const drawingTasks = useMemo(
    () => buildDrawingDoerTasksFromProjects(scopedDrawingBundles, activeProjectNames),
    [scopedDrawingBundles, activeProjectNames]
  );

  const trackerTasks = useMemo(
    () => buildTrackerDoerTasksFromProjects(scopedTrackerBundles, activeProjectNames),
    [scopedTrackerBundles, activeProjectNames]
  );

  const todayPlanCounts = useMemo(
    () =>
      buildTodayPlanCounts(
        scopedSiteVisits,
        scopedMomRecords,
        activeProjectNames,
        drawingTasks,
        trackerTasks
      ),
    [scopedSiteVisits, scopedMomRecords, activeProjectNames, drawingTasks, trackerTasks]
  );

  const summaryData = useMemo(
    () => ({
      drawingByProject: buildProjectSummaryRowsFromDrawingTasks(drawingTasks),
      trackerByProject: buildProjectSummaryRowsFromTrackerTasks(trackerTasks),
      drawingByCategory: buildCategorySummaryRowsFromDrawingTasks(drawingTasks),
      trackerByCategory: buildCategorySummaryRowsFromTrackerTasks(trackerTasks),
      drawingByZone: buildZoneSummaryRowsFromDrawingTasks(drawingTasks),
      trackerByZone: buildZoneSummaryRowsFromTrackerTasks(trackerTasks),
    }),
    [drawingTasks, trackerTasks]
  );

  const teamWorkloadRows = useMemo(
    () => buildTeamWorkloadRows(drawingTasks, trackerTasks),
    [drawingTasks, trackerTasks]
  );

  const upcomingCounts = useMemo(
    () => buildUpcoming7DayCounts(drawingTasks, trackerTasks),
    [drawingTasks, trackerTasks]
  );

  const kpiItems = useMemo(
    () => [
      {
        label: 'Active Projects',
        value: kpis.activeProjects,
        icon: <FolderOpen size={18} />,
        iconBg: '#dbeafe',
        iconColor: '#2563eb',
        viewAllHref: '/projects',
      },
      {
        label: 'On Track',
        value: kpis.onTrack,
        icon: <CheckCircle2 size={18} />,
        iconBg: '#dcfce7',
        iconColor: '#16a34a',
      },
      {
        label: 'Delayed Projects',
        value: kpis.delayedProjects,
        icon: <Clock size={18} />,
        iconBg: '#fee2e2',
        iconColor: '#dc2626',
        viewAllHref: '/pc-dashboard',
      },
      {
        label: 'Overdue Tasks',
        value: kpis.overdueTasks,
        icon: <AlertTriangle size={18} />,
        iconBg: '#ffedd5',
        iconColor: '#ea580c',
        viewAllHref: '/pc-dashboard',
      },
      {
        label: 'Approvals Pending',
        value: kpis.approvalsPending,
        icon: <FileCheck size={18} />,
        iconBg: '#ede9fe',
        iconColor: '#7c3aed',
      },
      {
        label: 'Drawings Overdue',
        value: kpis.drawingsOverdue,
        icon: <FileText size={18} />,
        iconBg: '#ccfbf1',
        iconColor: '#0d9488',
        viewAllHref: '/drawings',
      },
    ],
    [kpis]
  );

  if (loading) {
    return <GlobalLoading show text="Loading dashboard..." />;
  }

  return (
    <div className={styles.dashboardShell}>
      <DashboardNavSidebar />
      <div className={styles.dashboardMain}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Dashboard</h2>
          <div className={styles.headerFilter}>
            <SearchableSelect
              options={projectOptions}
              value={selectedProject}
              onChange={setSelectedProject}
              placeholder="All Projects"
              icon={<BriefcaseBusiness size={16} />}
            />
          </div>
        </div>

        <DashboardKpiGrid items={kpiItems} />

        <div className={dashboardStyles.middleRow}>
          <NeedsAttentionTable rows={needsAttentionRows} />
          <ProjectHealthTable
            rows={healthRows}
            onSelectProject={setSelectedProject}
          />
        </div>

        <div className={dashboardStyles.bottomRow}>
          <TodayPlanCard counts={todayPlanCounts} />
          <UpcomingCard counts={upcomingCounts} />
          <TeamWorkloadTable rows={teamWorkloadRows} />
        </div>

        <DrawingTrackerSummaryGrid data={summaryData} />
      </div>
    </div>
  );
}
