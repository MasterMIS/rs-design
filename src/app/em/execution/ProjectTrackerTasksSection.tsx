'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Briefcase,
  CheckCircle,
  Clock,
  ExternalLink,
  Search,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { filterProjectsForUser } from '@/lib/project-access';
import { canViewAllEmTasks, getDoerLabel, isTaskAssignedToUser, matchesPlanDateRange } from '@/lib/em-access';
import {
  buildTrackerDoerTasksFromProjects,
  type MergedTrackerDoerTask,
  type TrackerProjectBundle,
  type TrackerProjectTask,
} from '@/lib/schedule-merge';
import MultiSelectFilter from '@/components/MultiSelectFilter';
import styles from '../em.module.css';

interface ProjectTrackerTasksSectionProps {
  onToast: (message: string) => void;
  embedded?: boolean;
}

function formatDisplayDate(dateStr?: string) {
  if (!dateStr?.trim()) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB');
}

export function ProjectTrackerTasksSection({
  onToast,
  embedded = false,
}: ProjectTrackerTasksSectionProps) {
  const { user } = useAuth();
  const { setActiveProject } = useProject();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [bundles, setBundles] = useState<TrackerProjectBundle[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [doerFilter, setDoerFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchTrackerData = async () => {
    setLoading(true);
    try {
      const [allRes, projRes] = await Promise.all([
        fetch('/api/pms-tracker?all=1'),
        fetch('/api/projects'),
      ]);

      const allData = allRes.ok ? await allRes.json() : [];
      const projData = projRes.ok ? await projRes.json() : [];

      const accessible = filterProjectsForUser(Array.isArray(projData) ? projData : [], user);
      const names = accessible
        .map((p: { basicInfo?: { name?: string } }) => p.basicInfo?.name?.trim())
        .filter((name: string | undefined): name is string => !!name);
      setProjectNames(names);

      const parsed: TrackerProjectBundle[] = Array.isArray(allData)
        ? allData.map((b: { project: string; tasks: TrackerProjectTask[] }) => ({
            project: b.project,
            tasks: Array.isArray(b.tasks) ? b.tasks : [],
          }))
        : [];
      setBundles(parsed);
    } catch (err) {
      console.error('Failed to load project tracker tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, [user]);

  const allRows = useMemo(
    () => buildTrackerDoerTasksFromProjects(bundles, projectNames),
    [bundles, projectNames]
  );

  const roleFilteredRows = useMemo(() => {
    if (canViewAllEmTasks(user?.role)) return allRows;
    return allRows.filter((row) => isTaskAssignedToUser({ doerName: row.doerName }, user?.name));
  }, [allRows, user]);

  const filteredRows = useMemo(() => {
    return roleFilteredRows.filter((row) => {
      const matchesSearch =
        row.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.doerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.zone.toLowerCase().includes(searchTerm.toLowerCase());

      const status = row.completed
        ? 'Completed'
        : row.actualStartDate?.trim()
          ? 'In Progress'
          : 'Pending';

      const matchesProject =
        projectFilter.length === 0 || projectFilter.includes(row.project);
      const matchesDoer =
        doerFilter.length === 0 || doerFilter.includes(getDoerLabel(row.doerName));
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(status);
      const matchesDate = matchesPlanDateRange(
        row.planStartDate,
        row.planEndDate,
        startDateFilter,
        endDateFilter
      );

      return matchesSearch && matchesProject && matchesDoer && matchesStatus && matchesDate;
    });
  }, [roleFilteredRows, searchTerm, projectFilter, doerFilter, statusFilter, startDateFilter, endDateFilter]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

  const uniqueProjects = useMemo(
    () => Array.from(new Set(roleFilteredRows.map((r) => r.project))).sort(),
    [roleFilteredRows]
  );

  const uniqueDoers = useMemo(
    () =>
      Array.from(new Set(roleFilteredRows.map((r) => getDoerLabel(r.doerName)))).sort(),
    [roleFilteredRows]
  );

  const handleWorkAction = async (
    row: MergedTrackerDoerTask,
    action: 'start' | 'work_end'
  ) => {
    if (!row.rowIndex) {
      alert('Task row is missing. Open the project tracker to fix it.');
      return;
    }

    setSavingKey(row.key);
    try {
      const today = new Date().toISOString().split('T')[0];
      let actualStartDate = row.actualStartDate || '';
      let actualEndDate = row.actualEndDate || '';

      if (action === 'start' && !actualStartDate) {
        actualStartDate = today;
      } else if (action === 'work_end' && actualStartDate && !actualEndDate) {
        actualEndDate = today;
      } else {
        return;
      }

      const payload = {
        trackerId: row.trackerId,
        zone: row.zone,
        areaName: row.areaName,
        taskName: row.taskName,
        resourceName: row.resourceName,
        doerName: row.doerName,
        category: row.category,
        plannedStartDate: row.planStartDate,
        plannedEndDate: row.planEndDate,
        actualStartDate,
        actualEndDate,
      };

      const res = await fetch(
        `/api/pms-tracker?project=${encodeURIComponent(row.project)}&rowIndex=${row.rowIndex}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        onToast(
          action === 'start'
            ? 'Tracker work started.'
            : 'Tracker work marked complete.'
        );
        await fetchTrackerData();
      } else {
        alert('Failed to update project tracker.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating.');
    } finally {
      setSavingKey(null);
    }
  };

  const openInProject = (row: MergedTrackerDoerTask) => {
    setActiveProject({ id: row.project, name: row.project });
    router.push('/pms-tracker');
  };

  const content = (
    <>
      {!embedded && (
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>
              <Activity size={20} /> Project Tracker Tasks
            </h3>
            <p className={styles.sectionSubtitle}>
              Complete tracker milestones for all clients here or open the project tracker.
            </p>
          </div>
          <div className={styles.sectionSearchWrap}>
            <Search size={16} className={styles.sectionSearchIcon} />
            <input
              type="text"
              placeholder="Search tracker tasks..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.sectionSearchInput}
            />
          </div>
        </div>
      )}

      <div className={styles.sectionToolbar}>
        <div className={styles.sectionFilters}>
          {embedded && (
            <div className={styles.sectionSearchWrap}>
              <Search size={16} className={styles.sectionSearchIcon} />
              <input
                type="text"
                placeholder="Search tracker tasks..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.sectionSearchInput}
              />
            </div>
          )}
          <MultiSelectFilter
            label="Project"
            options={uniqueProjects}
            selectedValues={projectFilter}
            onChange={(values) => {
              setProjectFilter(values);
              setCurrentPage(1);
            }}
          />
          <MultiSelectFilter
            label="Doer"
            options={uniqueDoers}
            selectedValues={doerFilter}
            onChange={(values) => {
              setDoerFilter(values);
              setCurrentPage(1);
            }}
          />
          <MultiSelectFilter
            label="Status"
            options={['Pending', 'In Progress', 'Completed']}
            selectedValues={statusFilter}
            onChange={(values) => {
              setStatusFilter(values);
              setCurrentPage(1);
            }}
          />
          <div className={styles.sectionDateFilter}>
            <span className={styles.sectionDateFilterLabel}>Plan Date:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.sectionDateInput}
            />
            <span className={styles.sectionDateDivider}>to</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.sectionDateInput}
            />
            {(startDateFilter || endDateFilter) && (
              <button
                type="button"
                className={styles.sectionDateClear}
                onClick={() => {
                  setStartDateFilter('');
                  setEndDateFilter('');
                  setCurrentPage(1);
                }}
                title="Clear dates"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        <div className={styles.sectionPagination}>
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={styles.pageSelect}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>
            {filteredRows.length > 0
              ? `${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filteredRows.length)} of ${filteredRows.length}`
              : '0 entries'}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={styles.pageBtn}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={styles.pageBtn}
          >
            Next
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.sectionEmpty}>Loading project tracker tasks...</div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Project</th>
                <th>Task</th>
                <th>Zone</th>
                <th>Area</th>
                <th>Category</th>
                <th>Doer</th>
                <th>Plan Start</th>
                <th>Plan End</th>
                <th>Actual Start</th>
                <th>Actual End</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className={styles.sectionEmpty}>
                    No project tracker tasks found. Install tasks on each project sheet first.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const status = row.completed
                    ? 'Completed'
                    : row.actualStartDate?.trim()
                      ? 'In Progress'
                      : 'Pending';
                  const isSaving = savingKey === row.key;
                  const canStart = !row.actualStartDate?.trim() && !row.completed;
                  const canEnd =
                    !!row.actualStartDate?.trim() &&
                    !row.actualEndDate?.trim() &&
                    !row.completed;

                  return (
                    <tr
                      key={row.key}
                      className={row.completed ? styles.rowCompleted : undefined}
                    >
                      <td>
                        <span className={styles.cellWithIcon}>
                          <Briefcase size={15} color="#4b6cb7" /> {row.project}
                        </span>
                      </td>
                      <td>
                        <strong>{row.taskName}</strong>
                        <span className={styles.cellSub}>{row.trackerId}</span>
                      </td>
                      <td>{row.zone || '—'}</td>
                      <td>{row.areaName || '—'}</td>
                      <td>{row.category}</td>
                      <td>
                        <span className={styles.cellWithIcon}>
                          <User size={15} color="#3bafda" />
                          {row.doerName || 'Unassigned'}
                        </span>
                      </td>
                      <td>{formatDisplayDate(row.planStartDate)}</td>
                      <td>{formatDisplayDate(row.planEndDate)}</td>
                      <td>{formatDisplayDate(row.actualStartDate)}</td>
                      <td>{formatDisplayDate(row.actualEndDate)}</td>
                      <td>
                        <span
                          className={
                            status === 'Completed'
                              ? styles.statusCompleted
                              : status === 'In Progress'
                                ? styles.statusProgress
                                : styles.statusPending
                          }
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          {canStart && (
                            <button
                              type="button"
                              title="Start work"
                              disabled={isSaving}
                              onClick={() => handleWorkAction(row, 'start')}
                              className={styles.actionStart}
                            >
                              <Clock size={16} /> Start
                            </button>
                          )}
                          {canEnd && (
                            <button
                              type="button"
                              title="Mark work end"
                              disabled={isSaving}
                              onClick={() => handleWorkAction(row, 'work_end')}
                              className={styles.actionComplete}
                            >
                              <CheckCircle size={16} /> Work End
                            </button>
                          )}
                          <button
                            type="button"
                            title="Open in project tracker"
                            onClick={() => openInProject(row)}
                            className={styles.actionLink}
                          >
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.sectionFootnote}>
        Need full zone/category view?{' '}
        <Link href="/pms-tracker">Open Project Tracker</Link> in the project.
      </p>
    </>
  );

  if (embedded) {
    return content;
  }

  return <section className={styles.sectionCard}>{content}</section>;
}
