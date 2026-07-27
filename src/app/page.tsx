'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  Layers,
  BarChart3,
  Users as UsersIcon,
  Activity,
  PenTool,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { filterProjectsForUser } from '@/lib/project-access';
import {
  buildDrawingProgressItems,
  buildTrackerProgressItems,
  getDrawingProgressForProjects,
  getTrackerProgressForProjects,
} from '@/lib/schedule-merge';
import {
  computeAverageProjectPercent,
} from '@/lib/progressStats';
import GlobalLoading from '@/components/GlobalLoading';
import SearchableSelect from '@/components/SearchableSelect';
import { ProgressCharts } from '@/components/ProgressCharts';
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

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(ALL_PROJECTS);
  const [projectsList, setProjectsList] = useState<
    Array<{ basicInfo?: { name?: string } }>
  >([]);
  const [drawingTemplates, setDrawingTemplates] = useState<
    Array<{ drawingNo: string; category: string }>
  >([]);
  const [drawingSchedule, setDrawingSchedule] = useState<
    Array<{
      project?: string;
      drawingNo: string;
      actualDate?: string;
      clientStatus?: string;
    }>
  >([]);
  const [trackerTemplates, setTrackerTemplates] = useState<
    Array<{ trackerId: string; category: string }>
  >([]);
  const [trackerSchedule, setTrackerSchedule] = useState<
    Array<{ project?: string; trackerId: string; actualDate?: string }>
  >([]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        const [
          projectsRaw,
          drawingTpl,
          drawingSched,
          trackerTpl,
          trackerSched,
        ] = await Promise.all([
          fetchJson<{ basicInfo?: { name?: string } }>('/api/projects'),
          fetchJson<{ drawingNo: string; category: string }>(
            '/api/drawings/templates'
          ),
          fetchJson<{
            project?: string;
            drawingNo: string;
            actualDate?: string;
            clientStatus?: string;
          }>('/api/drawings'),
          fetchJson<{ trackerId: string; category: string }>(
            '/api/pms-tracker/templates'
          ),
          fetchJson<{ project?: string; trackerId: string; actualDate?: string }>(
            '/api/pms-tracker'
          ),
        ]);

        setProjectsList(filterProjectsForUser(projectsRaw, user));
        setDrawingTemplates(drawingTpl);
        setDrawingSchedule(drawingSched);
        setTrackerTemplates(trackerTpl);
        setTrackerSchedule(trackerSched);
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

  const trackerProgress = useMemo(
    () =>
      getTrackerProgressForProjects(
        activeProjectNames,
        trackerTemplates,
        trackerSchedule
      ),
    [activeProjectNames, trackerTemplates, trackerSchedule]
  );

  const drawingProgress = useMemo(
    () =>
      getDrawingProgressForProjects(
        activeProjectNames,
        drawingTemplates,
        drawingSchedule
      ),
    [activeProjectNames, drawingTemplates, drawingSchedule]
  );

  const trackerAveragePercent = useMemo(() => {
    if (selectedProject !== ALL_PROJECTS) return trackerProgress.percent;
    return computeAverageProjectPercent(projectNames, (projectName) =>
      buildTrackerProgressItems([projectName], trackerTemplates, trackerSchedule)
    );
  }, [
    selectedProject,
    trackerProgress.percent,
    projectNames,
    trackerTemplates,
    trackerSchedule,
  ]);

  const drawingAveragePercent = useMemo(() => {
    if (selectedProject !== ALL_PROJECTS) return drawingProgress.percent;
    return computeAverageProjectPercent(projectNames, (projectName) =>
      buildDrawingProgressItems([projectName], drawingTemplates, drawingSchedule)
    );
  }, [
    selectedProject,
    drawingProgress.percent,
    projectNames,
    drawingTemplates,
    drawingSchedule,
  ]);

  const scopeLabel =
    selectedProject === ALL_PROJECTS
      ? `All Projects — Cumulative (${projectNames.length} projects)`
      : selectedProject;

  if (loading) {
    return <GlobalLoading show text="Loading dashboard..." />;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Dashboard</h2>
        </div>
        <div className={styles.actionButtons}>
          <Link
            href="/sales"
            className={styles.usersBtn}
            style={{
              background: 'linear-gradient(to right, #ff9966, #ff5e62)',
              color: 'white',
              marginRight: '10px',
              border: 'none',
            }}
          >
            <BarChart3 size={18} />
            Sales
          </Link>
          <Link
            href="/em"
            className={styles.usersBtn}
            style={{
              background: 'linear-gradient(to right, #8a2387, #e94057, #f27121)',
              color: 'white',
              marginRight: '10px',
              border: 'none',
            }}
          >
            <Layers size={18} />
            EM
          </Link>
          <Link
            href="/hrms"
            className={styles.usersBtn}
            style={{
              background: 'linear-gradient(to right, #00c6ff, #0072ff)',
              color: 'white',
              marginRight: '10px',
              border: 'none',
            }}
          >
            <UsersIcon size={18} />
            HRMS
          </Link>
          {user?.role === 'Admin' && (
            <Link
              href="/users"
              className={styles.usersBtn}
              style={{
                background: 'linear-gradient(to right, #11998e, #38ef7d)',
                color: 'white',
                marginRight: '10px',
                border: 'none',
              }}
            >
              <UsersIcon size={18} />
              Users
            </Link>
          )}
          <Link
            href="/projects"
            className={styles.portfolioBtn}
            style={{
              background: 'linear-gradient(to right, #4b6cb7, #182848)',
              color: 'white',
              border: 'none',
            }}
          >
            <BriefcaseBusiness size={18} />
            Go to Project Portfolio
          </Link>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterLabel}>
          <Filter size={16} />
          <span>Project Filter</span>
        </div>
        <div className={styles.filterSelect}>
          <SearchableSelect
            options={projectOptions}
            value={selectedProject}
            onChange={setSelectedProject}
            placeholder="Select project"
            icon={<BriefcaseBusiness size={16} />}
          />
        </div>
        <span className={styles.filterScope}>{scopeLabel}</span>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>PROJECT TRACKER</span>
            <div
              className={styles.statIconBg}
              style={{ backgroundColor: '#3bafda15', color: '#3bafda' }}
            >
              <Activity size={20} />
            </div>
          </div>
          <div className={styles.statBody}>
            <h3>{trackerProgress.percent}%</h3>
            <span className={`${styles.statChange} ${styles.neutral}`}>
              Cumulative completion
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>TRACKER AVG / PROJECT</span>
            <div
              className={styles.statIconBg}
              style={{ backgroundColor: '#1abc9c15', color: '#1abc9c' }}
            >
              <Activity size={20} />
            </div>
          </div>
          <div className={styles.statBody}>
            <h3>{trackerAveragePercent}%</h3>
            <span className={`${styles.statChange} ${styles.up}`}>
              {trackerProgress.completed} / {trackerProgress.total} items done
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>DRAWING SCHEDULE</span>
            <div
              className={styles.statIconBg}
              style={{ backgroundColor: '#8a2be215', color: '#8a2be2' }}
            >
              <PenTool size={20} />
            </div>
          </div>
          <div className={styles.statBody}>
            <h3>{drawingProgress.percent}%</h3>
            <span className={`${styles.statChange} ${styles.neutral}`}>
              Cumulative completion
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>DRAWINGS AVG / PROJECT</span>
            <div
              className={styles.statIconBg}
              style={{ backgroundColor: '#f7b84b15', color: '#f7b84b' }}
            >
              <PenTool size={20} />
            </div>
          </div>
          <div className={styles.statBody}>
            <h3>{drawingAveragePercent}%</h3>
            <span className={`${styles.statChange} ${styles.up}`}>
              {drawingProgress.completed} / {drawingProgress.total} items done
            </span>
          </div>
        </div>
      </div>

      <div className={styles.moduleSection}>
        <div className={styles.moduleSectionHeader}>
          <Activity size={20} color="#3bafda" />
          <h4>Project Tracker</h4>
        </div>
        <ProgressCharts title="Project Tracker" stats={trackerProgress} barColor="#3bafda" />
      </div>

      <div className={styles.moduleSection}>
        <div className={styles.moduleSectionHeader}>
          <PenTool size={20} color="#8a2be2" />
          <h4>Drawing Schedule</h4>
        </div>
        <ProgressCharts
          title="Drawing Schedule"
          stats={drawingProgress}
          barColor="#8a2be2"
        />
      </div>
    </div>
  );
}
