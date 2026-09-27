'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
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
import { CircleCheck } from '../design/UltimateChecklistSection';

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
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'start' | 'work_end' | null>(null);
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

  const fetchTrackerData = async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
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
        row.category.toLowerCase().includes(searchTerm.toLowerCase());

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
  const canStartRow = (row: MergedTrackerDoerTask) => !row.actualStartDate?.trim() && !row.completed && !!row.rowIndex;
  const canEndRow = (row: MergedTrackerDoerTask) => !!row.actualStartDate?.trim() && !row.actualEndDate?.trim() && !row.completed && !!row.rowIndex;
  const selectableRows = filteredRows.filter((row) => canStartRow(row) || canEndRow(row));
  const selectedRows = selectableRows.filter((row) => selectedKeys.includes(row.key));
  const selectedStartRows = selectedRows.filter(canStartRow);
  const selectedEndRows = selectedRows.filter(canEndRow);
  const allSelectableSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedKeys.includes(row.key));

  const uniqueProjects = useMemo(
    () => Array.from(new Set(roleFilteredRows.map((r) => r.project))).sort(),
    [roleFilteredRows]
  );

  const uniqueDoers = useMemo(
    () =>
      Array.from(new Set(roleFilteredRows.map((r) => getDoerLabel(r.doerName)))).sort(),
    [roleFilteredRows]
  );

  const applyWorkAction = async (
    rows: MergedTrackerDoerTask[],
    action: 'start' | 'work_end'
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const eligible = rows.filter((row) => {
      if (!row.rowIndex) return false;
      if (action === 'start') return !row.actualStartDate?.trim() && !row.completed;
      return !!row.actualStartDate?.trim() && !row.actualEndDate?.trim() && !row.completed;
    });
    if (!eligible.length) return;

    setBulkAction(action);
    try {
      const results = await Promise.all(eligible.map(async (row) => {
        const actualStartDate = action === 'start' ? today : row.actualStartDate;
        const actualEndDate = action === 'work_end' ? today : row.actualEndDate;
        const res = await fetch(
          `/api/pms-tracker?project=${encodeURIComponent(row.project)}&rowIndex=${row.rowIndex}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trackerId: row.trackerId,
              areaName: row.areaName,
              taskName: row.taskName,
              resourceName: row.resourceName,
              doerName: row.doerName,
              category: row.category,
              plannedStartDate: row.planStartDate,
              plannedEndDate: row.planEndDate,
              actualStartDate,
              actualEndDate,
            }),
          }
        );
        return { row, ok: res.ok, actualStartDate, actualEndDate };
      }));

      const done = results.filter((result) => result.ok);
      if (results.some((result) => !result.ok)) {
        alert('Some tasks could not be updated.');
      }
      if (!done.length) return;

      const doneKeys = new Set(done.map((result) => result.row.key));
      setBundles((current) => current.map((bundle) => ({
        ...bundle,
        tasks: bundle.tasks.map((task) => {
          const match = done.find((result) => (
            result.row.project === bundle.project && result.row.rowIndex === task.rowIndex
          ));
          if (!match) return task;
          return {
            ...task,
            actualStartDate: match.actualStartDate,
            actualEndDate: match.actualEndDate,
          };
        }),
      })));
      setSelectedKeys((current) => current.filter((key) => !doneKeys.has(key)));
      onToast(
        action === 'start'
          ? (done.length > 1 ? `${done.length} tasks started.` : 'Tracker work started.')
          : (done.length > 1 ? `${done.length} tasks marked complete.` : 'Tracker work marked complete.')
      );
      void fetchTrackerData(true);
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating.');
    } finally {
      setBulkAction(null);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {(selectedStartRows.length > 0 || selectedEndRows.length > 0) && (
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {selectedStartRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => applyWorkAction(selectedStartRows, 'start')}
                  disabled={bulkAction !== null}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#3bafda', color: 'white', padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: bulkAction ? 'wait' : 'pointer', fontWeight: 600, opacity: bulkAction ? 0.85 : 1 }}
                >
                  {bulkAction === 'start' ? <Loader2 size={16} className={styles.spin} /> : <Clock size={16} />}
                  {bulkAction === 'start' ? 'Starting...' : `Start selected (${selectedStartRows.length})`}
                </button>
              )}
              {selectedEndRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => applyWorkAction(selectedEndRows, 'work_end')}
                  disabled={bulkAction !== null}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--primary)', color: 'white', padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: bulkAction ? 'wait' : 'pointer', fontWeight: 600, opacity: bulkAction ? 0.85 : 1 }}
                >
                  {bulkAction === 'work_end' ? <Loader2 size={16} className={styles.spin} /> : <CheckCircle2 size={16} />}
                  {bulkAction === 'work_end' ? 'Completing...' : `Work end selected (${selectedEndRows.length})`}
                </button>
              )}
            </div>
          )}
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
                <th>Area</th>
                <th>Category</th>
                <th>Doer</th>
                <th>Plan Start</th>
                <th>Plan End</th>
                <th>Actual Start</th>
                <th>Actual End</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', width: '96px' }}>
                  <CircleCheck
                    light
                    label="Select all open tasks"
                    checked={allSelectableSelected}
                    onToggle={() => {
                      setSelectedKeys(allSelectableSelected ? [] : selectableRows.map((row) => row.key));
                    }}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className={styles.sectionEmpty}>
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
                  const open = canStartRow(row) || canEndRow(row);
                  const toggleRow = () => {
                    setSelectedKeys((current) => (
                      current.includes(row.key) ? current.filter((key) => key !== row.key) : [...current, row.key]
                    ));
                  };

                  return (
                    <tr
                      key={row.key}
                      className={row.completed ? styles.rowCompleted : undefined}
                      onClick={open && !bulkAction ? toggleRow : undefined}
                      style={open ? { cursor: 'pointer' } : undefined}
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
                          {open && (
                            <CircleCheck
                              label={`Select ${row.taskName}`}
                              checked={selectedKeys.includes(row.key)}
                              onToggle={toggleRow}
                            />
                          )}
                          <button
                            type="button"
                            title="Open in project tracker"
                            onClick={(event) => {
                              event.stopPropagation();
                              openInProject(row);
                            }}
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
        Need the full category view?{' '}
        <Link href="/pms-tracker">Open Project Tracker</Link> in the project.
      </p>
    </>
  );

  if (embedded) {
    return content;
  }

  return <section className={styles.sectionCard}>{content}</section>;
}
