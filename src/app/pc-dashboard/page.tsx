'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Search,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import GlobalLoading from '@/components/GlobalLoading';
import {
  buildPcDashboardTasks,
  DELAYED_RANGE_OPTIONS,
  filterPcTasksForUser,
  formatDelayedBadge,
  formatOverdueDays,
  getDelayedRangeCounts,
  getPcTaskStats,
  matchesDelayedRange,
  PC_MODULE_LABELS,
  type DelayedRangeFilter,
  type EmDesignTask,
  type EmExecutionTask,
  type HrmsCandidate,
  type PcTask,
  type PcTaskPriority,
  type PcTaskSource,
  type SalesLead,
} from '@/lib/pc-dashboard';
import type { DrawingProjectBundle, TrackerProjectBundle } from '@/lib/schedule-merge';
import styles from './pc-dashboard.module.css';

const MODULE_COLORS: Record<PcTaskSource, string> = {
  drawing: 'linear-gradient(to right, #7c3aed, #a855f7)',
  tracker: 'linear-gradient(to right, #059669, #10b981)',
  em_design: 'linear-gradient(to right, #8a2387, #e94057)',
  em_execution: 'linear-gradient(to right, #f27121, #e94057)',
  sales: 'linear-gradient(to right, #ff9966, #ff5e62)',
  hrms: 'linear-gradient(to right, #00c6ff, #0072ff)',
};

const MODULE_ACCENT_COLORS: Record<PcTaskSource, string> = {
  drawing: '#7c3aed',
  tracker: '#059669',
  em_design: '#c026d3',
  em_execution: '#ea580c',
  sales: '#f97316',
  hrms: '#0284c7',
};

const DOER_COLORS = [
  '#0891b2',
  '#7c3aed',
  '#059669',
  '#ea580c',
  '#db2777',
  '#4338ca',
  '#0d9488',
  '#c026d3',
  '#2563eb',
  '#d97706',
];

const MODULE_OPTIONS = Object.entries(PC_MODULE_LABELS).map(([value, label]) => ({
  value: value as PcTaskSource,
  label,
}));

const ITEMS_PER_PAGE = 20;

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

function formatTodayLabel(date: Date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function countByDoer(tasks: PcTask[]): Record<string, number> {
  return tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.doer] = (acc[task.doer] || 0) + 1;
    return acc;
  }, {});
}

export default function PcDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<PcTask[]>([]);

  const [priorityFilter, setPriorityFilter] = useState<'all' | PcTaskPriority>('all');
  const [delayedRangeFilter, setDelayedRangeFilter] = useState<DelayedRangeFilter>('all');
  const [selectedModule, setSelectedModule] = useState<'all' | PcTaskSource>('all');
  const [selectedDoer, setSelectedDoer] = useState<'all' | string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [
          drawingBundles,
          trackerBundles,
          emDesignTasks,
          emExecutionTasks,
          salesLeads,
          hrmsCandidates,
        ] = await Promise.all([
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
          fetchJson<EmDesignTask>('/api/em/design'),
          fetchJson<EmExecutionTask>('/api/em/execution'),
          fetchJson<SalesLead>('/api/sales'),
          fetchJson<HrmsCandidate>('/api/hrms'),
        ]);

        const tasks = buildPcDashboardTasks({
          drawingBundles,
          trackerBundles,
          emDesignTasks,
          emExecutionTasks,
          salesLeads,
          hrmsCandidates,
        });

        setAllTasks(filterPcTasksForUser(tasks, user));
      } catch (err) {
        console.error('Failed to load PC dashboard', err);
        setAllTasks([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const stats = useMemo(() => getPcTaskStats(allTasks), [allTasks]);
  const delayedRangeCounts = useMemo(() => getDelayedRangeCounts(allTasks), [allTasks]);
  const doerCounts = useMemo(() => countByDoer(allTasks), [allTasks]);

  const doerTabs = useMemo(
    () =>
      Object.entries(doerCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([doer, count]) => ({ doer, count })),
    [doerCounts]
  );

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (
        delayedRangeFilter !== 'all' &&
        task.priority === 'delayed' &&
        !matchesDelayedRange(task.daysOverdue, delayedRangeFilter)
      ) {
        return false;
      }
      if (selectedModule !== 'all' && task.source !== selectedModule) return false;
      if (selectedDoer !== 'all' && task.doer !== selectedDoer) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const haystack = [
          task.project,
          task.taskName,
          task.doer,
          task.moduleLabel,
          task.statusLabel,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [allTasks, priorityFilter, delayedRangeFilter, selectedModule, selectedDoer, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [priorityFilter, delayedRangeFilter, selectedModule, selectedDoer, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTasks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTasks, currentPage]);

  const pageStart = filteredTasks.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length);

  const today = new Date();

  return (
    <div className={styles.container}>
      <GlobalLoading show={loading} text="Loading PC follow-up tasks..." />

      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>PC Dashboard</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <span className="current">PC Dashboard</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className={styles.todayBadge}>
            <CalendarDays size={16} />
            {formatTodayLabel(today)}
          </div>
          <Link href="/" className={styles.backButton}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.summaryRow}>
          <div className={styles.leftColumn}>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Delayed</div>
                <div className={`${styles.kpiValue} ${styles.kpiDelayed}`}>{stats.delayed}</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Due Today</div>
                <div className={`${styles.kpiValue} ${styles.kpiToday}`}>{stats.dueToday}</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Total</div>
                <div className={`${styles.kpiValue} ${styles.kpiTotal}`}>{stats.total}</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Modules</div>
                <div className={`${styles.kpiValue} ${styles.kpiModules}`}>
                  {Object.values(stats.byModule).filter((count) => count > 0).length}
                </div>
              </div>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search project, task, doer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className={styles.priorityTabs}>
                {(['all', 'delayed', 'dueToday'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.priorityTab} ${
                      priorityFilter === key ? styles.priorityTabActive : ''
                    }`}
                    onClick={() => {
                      setPriorityFilter(key);
                      if (key === 'dueToday') setDelayedRangeFilter('all');
                    }}
                  >
                    {key === 'all' ? 'All' : key === 'delayed' ? 'Delayed' : 'Due Today'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.filterPanel}>
            <div className={styles.filterTableWrap}>
              <div className={`${styles.filterTableTitle} ${styles.filterTableTitleSection}`}>
                Section
              </div>
              <div className={styles.filterTableScroll}>
                <table className={styles.filterTable}>
                  <tbody>
                    <tr
                      className={
                        selectedModule === 'all' ? styles.filterRowActive : styles.filterRow
                      }
                      onClick={() => setSelectedModule('all')}
                    >
                      <td>
                        <span className={styles.filterDot} style={{ background: '#0f766e' }} />
                        <span className={styles.filterLabel}>All Sections</span>
                      </td>
                      <td>
                        <span className={styles.filterCount}>{stats.total}</span>
                      </td>
                    </tr>
                    {MODULE_OPTIONS.map(({ value, label }) => {
                      const count = stats.byModule[value] || 0;
                      const isActive = selectedModule === value;
                      const accent = MODULE_ACCENT_COLORS[value];
                      return (
                        <tr
                          key={value}
                          className={
                            count === 0
                              ? styles.filterRowDisabled
                              : isActive
                                ? styles.filterRowActive
                                : styles.filterRow
                          }
                          onClick={() => {
                            if (count === 0) return;
                            setSelectedModule(isActive ? 'all' : value);
                          }}
                          title={count === 0 ? 'No tasks' : `Filter ${label}`}
                        >
                          <td>
                            <span
                              className={styles.filterDot}
                              style={{ background: accent }}
                            />
                            <span className={styles.filterLabel} style={{ color: accent }}>
                              {label}
                            </span>
                          </td>
                          <td>
                            <span className={styles.filterCount} style={{ color: accent }}>
                              {count}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.filterTableWrap}>
              <div className={`${styles.filterTableTitle} ${styles.filterTableTitleDoer}`}>
                Doer
              </div>
              <div className={styles.filterTableScroll}>
                <table className={styles.filterTable}>
                  <tbody>
                    <tr
                      className={selectedDoer === 'all' ? styles.filterRowActive : styles.filterRow}
                      onClick={() => setSelectedDoer('all')}
                    >
                      <td>
                        <span className={styles.filterDot} style={{ background: '#0891b2' }} />
                        <span className={styles.filterLabel}>All Doers</span>
                      </td>
                      <td>
                        <span className={styles.filterCount}>{stats.total}</span>
                      </td>
                    </tr>
                    {doerTabs.map(({ doer, count }, index) => {
                      const isActive = selectedDoer === doer;
                      const accent = DOER_COLORS[index % DOER_COLORS.length];
                      return (
                        <tr
                          key={doer}
                          className={isActive ? styles.filterRowActive : styles.filterRow}
                          onClick={() => setSelectedDoer(isActive ? 'all' : doer)}
                          title={`Filter ${doer}`}
                        >
                          <td>
                            <span className={styles.filterDot} style={{ background: accent }} />
                            <span className={styles.filterLabel} style={{ color: accent }}>
                              {doer}
                            </span>
                          </td>
                          <td>
                            <span className={styles.filterCount} style={{ color: accent }}>
                              {count}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.filterTableWrap}>
              <div className={`${styles.filterTableTitle} ${styles.filterTableTitleDelayed}`}>
                Delayed By
              </div>
              <div className={styles.filterTableScroll}>
                <table className={styles.filterTable}>
                  <tbody>
                    {DELAYED_RANGE_OPTIONS.map(({ value, label, color }) => {
                      const count = delayedRangeCounts[value];
                      const isActive = delayedRangeFilter === value;
                      const disabled = count === 0 || priorityFilter === 'dueToday';
                      return (
                        <tr
                          key={value}
                          className={
                            disabled
                              ? styles.filterRowDisabled
                              : isActive
                                ? styles.filterRowDelayedActive
                                : styles.filterRow
                          }
                          onClick={() => {
                            if (disabled) return;
                            setDelayedRangeFilter(value);
                          }}
                          title={
                            priorityFilter === 'dueToday'
                              ? 'Not applicable for due today'
                              : count === 0
                                ? 'No tasks in this range'
                                : `Delayed ${label.toLowerCase()}`
                          }
                        >
                          <td>
                            <span className={styles.filterDot} style={{ background: color }} />
                            <span
                              className={styles.filterLabel}
                              style={disabled ? undefined : { color }}
                            >
                              {label}
                            </span>
                          </td>
                          <td>
                            <span
                              className={styles.filterCount}
                              style={disabled ? undefined : { color }}
                            >
                              {count}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.tableCard}>
          {filteredTasks.length === 0 ? (
            <div className={styles.emptyState}>
              <ClipboardList size={40} style={{ marginBottom: 12, opacity: 0.45 }} />
              <p className={styles.emptyTitle}>No follow-up tasks right now</p>
              <p>Delayed and due-today items from all modules will appear here.</p>
            </div>
          ) : (
            <>
              <div className={styles.paginationBar}>
                <span className={styles.paginationInfo}>
                  Showing {pageStart}–{pageEnd} of {filteredTasks.length} tasks
                </span>
                <div className={styles.paginationControls}>
                  <span className={styles.paginationPage}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className={styles.tableScroll}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Module</th>
                      <th>Project / Lead</th>
                      <th>Task</th>
                      <th>Doer</th>
                      <th>Due</th>
                      <th>Overdue</th>
                      <th>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <span
                          className={
                            task.priority === 'delayed'
                              ? styles.badgeDelayed
                              : styles.badgeToday
                          }
                        >
                          {task.priority === 'delayed' ? (
                            <>
                              <AlertTriangle size={12} style={{ marginRight: 4 }} />
                              {formatDelayedBadge(task.daysOverdue)}
                            </>
                          ) : (
                            'Due Today'
                          )}
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.moduleBadge}
                          style={{ background: MODULE_COLORS[task.source] }}
                        >
                          {task.moduleLabel}
                        </span>
                      </td>
                      <td>{task.project}</td>
                      <td>
                        <span className={styles.taskName}>{task.taskName}</span>
                        <span className={styles.taskSub}>{task.statusLabel}</span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <User size={14} color="#0891b2" />
                          {task.doer}
                        </span>
                      </td>
                      <td>{task.dueDateLabel}</td>
                      <td>{formatOverdueDays(task.daysOverdue)}</td>
                      <td>
                        <Link href={task.linkHref} className={styles.openLink}>
                          <ExternalLink size={14} />
                          Open
                        </Link>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
