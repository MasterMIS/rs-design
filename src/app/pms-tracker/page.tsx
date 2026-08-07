'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, Settings,
  Building, CheckSquare, X,
  Calendar, User, Grid, LayoutTemplate, Loader2
} from 'lucide-react';
import styles from './pms-tracker.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { filterProjectsForUser } from '@/lib/project-access';
import { findTrackerPlannedDates } from '@/lib/schedule-merge';
import Link from 'next/link';

interface TrackerTemplate {
  id: string;
  rowIndex: number;
  trackerId: string;
  areaName: string;
  taskName: string;
  resourceName: string;
  doerName: string;
  category: string;
  tat: string;
}

interface TaskPlannedDate {
  id: string;
  rowIndex?: number;
  project: string;
  category: string;
  trackerId: string;
  startDate: string;
  endDate: string;
}

interface PlanDateDraft {
  startDate: string;
  endDate: string;
}

interface TrackerScheduleItem {
  id: string;
  rowIndex?: number;
  project: string;
  trackerId: string;
  actualStartDate: string;
  actualEndDate: string;
  tplId?: string;
  isSaving?: boolean;
}

const getCategoryIcon = (name: string, size = 16) => {
  const style = { marginRight: '8px', flexShrink: 0 };
  return <LayoutTemplate size={size} style={style} />;
};

export default function PMSTrackerPage() {
  const { activeProject } = useProject();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TrackerTemplate[]>([]);
  const [schedules, setSchedules] = useState<TrackerScheduleItem[]>([]);
  const [plannedDates, setPlannedDates] = useState<TaskPlannedDate[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'templates'>('schedule');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchItemName, setSearchItemName] = useState('');

  // Modals
  const [isTplModalOpen, setIsTplModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<TrackerTemplate | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Forms
  const [tplForm, setTplForm] = useState<Partial<TrackerTemplate>>({
    trackerId: '', areaName: '', taskName: '', resourceName: '', doerName: '', category: 'General', tat: '0'
  });
  
  // State for project schedule
  const [localSchedule, setLocalSchedule] = useState<Record<string, TrackerScheduleItem>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localPlanDrafts, setLocalPlanDrafts] = useState<Record<string, PlanDateDraft>>({});
  const [savingPlanKey, setSavingPlanKey] = useState<string | null>(null);

  const activeProjectName = activeProject?.name || '';

  const getPlanDraftKey = (category: string, trackerId: string) =>
    `${activeProjectName}|${category}|${trackerId}`;

  const findTaskSpecificPlan = (category: string, trackerId: string, taskName?: string) => {
    const byTrackerId = plannedDates.find(
      (p) =>
        p.project === activeProjectName &&
        p.category === category &&
        p.trackerId?.trim() &&
        p.trackerId.trim().toLowerCase() === trackerId.trim().toLowerCase()
    );
    if (byTrackerId) return byTrackerId;

    if (taskName?.trim()) {
      return plannedDates.find(
        (p) =>
          p.project === activeProjectName &&
          p.category === category &&
          p.trackerId?.trim() &&
          p.trackerId.trim().toLowerCase() === taskName.trim().toLowerCase()
      );
    }

    return undefined;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'short' });
    const year = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
  };

  const displayDate = (dateStr?: string) =>
    !dateStr?.trim() || formatDate(dateStr) === 'N/A' ? '—' : formatDate(dateStr);

  const isDoerMissing = (doerName?: string) => {
    const value = doerName?.trim().toLowerCase() || '';
    return !value || value === 'unassigned';
  };

  const getTodayIsoDate = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    setLocalPlanDrafts({});
  }, [activeProjectName]);

  useEffect(() => {
    if (!activeProjectName || templates.length === 0) {
      setLocalSchedule({});
      return;
    }

    const projectSchedules = schedules.filter(s => s.project === activeProjectName);
    const merged: Record<string, TrackerScheduleItem> = {};

    templates.forEach(tpl => {
      const existingEntry = projectSchedules.find(s => s.trackerId === tpl.trackerId);
      
      if (existingEntry) {
        merged[tpl.id] = { 
          ...existingEntry,
          id: existingEntry.id,
          tplId: tpl.id
        };
      } else {
        merged[tpl.id] = {
          id: `new-${tpl.id}`,
          tplId: tpl.id,
          project: activeProjectName,
          trackerId: tpl.trackerId,
          actualStartDate: '',
          actualEndDate: '',
        };
      }
    });

    setLocalSchedule(merged);
    setHasUnsavedChanges(false);
  }, [templates, schedules, activeProjectName, projects, plannedDates]);

  async function fetchData() {
    setLoading(true);
    try {
      const [tplRes, schRes, usersRes, projRes, planRes] = await Promise.all([
        fetch('/api/pms-tracker/templates'),
        fetch('/api/pms-tracker'),
        fetch('/api/users'),
        fetch('/api/projects'),
        fetch('/api/pms-tracker/planned')
      ]);

      if (tplRes.ok) setTemplates(await tplRes.json());
      if (schRes.ok) setSchedules(await schRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(filterProjectsForUser(data, user));
      }
      if (planRes.ok) setPlannedDates(await planRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Derived Category Data
  const groupedByCategory = templates.reduce((acc, curr) => {
    const cat = curr.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, TrackerTemplate[]>);

  const predefinedOrder = [
    'Phase-1', 'Phase-2', 'Phase-3', 'Phase-4', 
    'VENDOR APPOINTMENT', 'ORDER MATERIALS', 'SELECTION'
  ];

  const uniqueCategories = Object.keys(groupedByCategory).sort((a, b) => {
    const indexA = predefinedOrder.indexOf(a);
    const indexB = predefinedOrder.indexOf(b);
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const activeCategory = (selectedCategory && uniqueCategories.includes(selectedCategory))
    ? selectedCategory
    : uniqueCategories[0] || null;

  const getTaskPlan = (category: string, trackerId: string, taskName?: string) =>
    findTrackerPlannedDates(plannedDates, activeProjectName, category, trackerId, taskName);

  const categoryHasPlanDates = (category: string) => {
    if (!activeProjectName) return true;
    const tasks = groupedByCategory[category] || [];
    if (tasks.length === 0) return true;
    return tasks.every((task) => {
      const plan = getTaskPlan(category, task.trackerId, task.taskName);
      return !!(plan.startDate?.trim() && plan.endDate?.trim());
    });
  };

  // ---- SCHEDULE HANDLERS ----
  const handleMarkWorkStep = async (tplId: string, trackerId: string) => {
    if (!activeProjectName) return;

    const existing = localSchedule[tplId];
    const today = getTodayIsoDate();
    let actualStartDate = existing?.actualStartDate || '';
    let actualEndDate = existing?.actualEndDate || '';

    if (!actualStartDate) {
      actualStartDate = today;
    } else if (!actualEndDate) {
      actualEndDate = today;
    } else {
      return;
    }

    try {
      setLocalSchedule((prev) => ({
        ...prev,
        [tplId]: { ...prev[tplId], isSaving: true },
      }));

      const payload = {
        trackerId,
        project: activeProjectName,
        actualStartDate,
        actualEndDate,
      };

      const url = existing?.rowIndex
        ? `/api/pms-tracker?rowIndex=${existing.rowIndex}`
        : '/api/pms-tracker';
      const method = existing?.rowIndex ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          existing?.rowIndex ? payload : { project: activeProjectName, items: [payload] }
        ),
      });

      if (res.ok) {
        await fetchData();
      } else {
        alert('Failed to save work dates.');
        setLocalSchedule((prev) => ({
          ...prev,
          [tplId]: { ...prev[tplId], isSaving: false },
        }));
      }
    } catch (err) {
      console.error(err);
      alert('Error saving work dates.');
      setLocalSchedule((prev) => ({
        ...prev,
        [tplId]: { ...prev[tplId], isSaving: false },
      }));
    }
  };

  const updatePlanDraft = (
    category: string,
    trackerId: string,
    taskName: string,
    field: 'startDate' | 'endDate',
    value: string
  ) => {
    const key = getPlanDraftKey(category, trackerId);
    setLocalPlanDrafts((prev) => {
      const saved = getTaskPlan(category, trackerId, taskName);
      const current = prev[key] ?? { startDate: saved.startDate, endDate: saved.endDate };
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const submitTaskPlan = async (category: string, trackerId: string, taskName: string) => {
    if (!activeProjectName || !trackerId) return;

    const key = getPlanDraftKey(category, trackerId);
    const draft = localPlanDrafts[key];
    if (!draft?.startDate?.trim() || !draft?.endDate?.trim()) return;

    setSavingPlanKey(key);
    try {
      const existingPlan = findTaskSpecificPlan(category, trackerId, taskName);
      const payload = {
        project: activeProjectName,
        category,
        trackerId,
        startDate: draft.startDate,
        endDate: draft.endDate,
      };

      const url = existingPlan?.rowIndex
        ? `/api/pms-tracker/planned?rowIndex=${existingPlan.rowIndex}`
        : '/api/pms-tracker/planned';
      const method = existingPlan?.rowIndex ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const planRes = await fetch('/api/pms-tracker/planned');
        if (planRes.ok) {
          setPlannedDates(await planRes.json());
        }
        setLocalPlanDrafts((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else {
        alert('Failed to save planned dates for task.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save planned dates for task.');
    } finally {
      setSavingPlanKey(null);
    }
  };

  const saveScheduleProgress = async () => {
    if (!activeProjectName) {
      alert("No active project selected.");
      return;
    }

    try {
      setSubmitting(true);
      
      const itemsToPost: TrackerScheduleItem[] = [];
      const itemsToPut: TrackerScheduleItem[] = [];

      Object.values(localSchedule).forEach(item => {
        if (item.rowIndex) {
          itemsToPut.push(item);
        } else {
          if (item.actualStartDate || item.actualEndDate) {
            itemsToPost.push(item);
          }
        }
      });

      if (itemsToPost.length > 0) {
        await fetch('/api/pms-tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project: activeProjectName, items: itemsToPost }),
        });
      }

      for (const item of itemsToPut) {
         await fetch(`/api/pms-tracker?rowIndex=${item.rowIndex}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(item),
         });
      }

      setHasUnsavedChanges(false);
      await fetchData(); 
    } catch (err) {
      console.error(err);
      alert('Failed to save tracker progress.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- TEMPLATE HANDLERS ----
  const handleAddTemplate = () => {
    setEditingTpl(null);
    setTplForm({ trackerId: '', areaName: '', taskName: '', resourceName: '', doerName: '', category: uniqueCategories[0] || 'General', tat: '0' });
    setIsTplModalOpen(true);
  };

  const handleEditTemplate = (item: TrackerTemplate) => {
    setEditingTpl(item);
    setTplForm({ ...item });
    setIsTplModalOpen(true);
  };

  const submitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tplForm.taskName || !tplForm.category) {
      alert('Task Name and Category are required.');
      return;
    }

    const submissionForm = { ...tplForm };
    if (!submissionForm.trackerId) {
      submissionForm.trackerId = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    try {
      setSubmitting(true);
      const url = editingTpl ? `/api/pms-tracker/templates?rowIndex=${editingTpl.rowIndex}` : '/api/pms-tracker/templates';
      const method = editingTpl ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionForm)
      });

      if (res.ok) {
        setIsTplModalOpen(false);
        await fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save template.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!itemToDelete) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/pms-tracker/templates?rowIndex=${itemToDelete.rowIndex}`, { method: 'DELETE' });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>PMS Tracker</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <Link href="/projects">Project Portfolio</Link>
            {activeProjectName && (
              <>
                <span className="separator">&gt;</span>
                <button
                  className="project-breadcrumb"
                  style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                  onClick={() => {
                    localStorage.setItem('pending_view_project_id', activeProject?.id || '');
                    window.location.href = '/projects';
                  }}
                >{activeProjectName}</button>
              </>
            )}
            <span className="separator">&gt;</span>
            <span className="current">PMS Tracker</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchItemName}
              onChange={(e) => setSearchItemName(e.target.value)}
            />
          </div>
          <button className={styles.secondaryButton} onClick={() => setActiveTab(activeTab === 'schedule' ? 'templates' : 'schedule')}>
            {activeTab === 'schedule' ? <><Settings size={18} /> Manage Templates</> : <><CheckSquare size={18} /> View Tracker</>}
          </button>
          {activeTab === 'templates' && (
            <button className={styles.addButton} onClick={handleAddTemplate}>
              <Plus size={18} /> Add Task Template
            </button>
          )}
          {activeTab === 'schedule' && hasUnsavedChanges && (
            <button className={`${styles.secondaryButton} ${styles.unsavedSaveButton}`} onClick={saveScheduleProgress} disabled={submitting}>
              {submitting ? 'Saving...' : 'Apply Changes'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.templateLayout}>
            {/* Sidebar */}
            <div className={styles.templateSidebar}>
              <h3 className={styles.sidebarTitle}>Categories</h3>
              <div className={styles.sidebarList}>
                {uniqueCategories.map(cat => {
                  const missingPlanDates =
                    activeProjectName &&
                    !categoryHasPlanDates(cat);

                  return (
                  <button
                    key={cat}
                    className={`${styles.sidebarItem} ${activeCategory === cat ? styles.active : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                    title={missingPlanDates ? 'Start or end date not set for this category' : undefined}
                  >
                    {getCategoryIcon(cat)}
                    <span className={styles.sidebarItemLabel}>{cat}</span>
                    {missingPlanDates && (
                      <span className={styles.missingDateDot} aria-label="Planned dates not set" />
                    )}
                  </button>
                  );
                })}
                {uniqueCategories.length === 0 && (
                  <p className={styles.emptySidebar}>No categories found.</p>
                )}
              </div>
            </div>

            {/* Content */}
            <div className={styles.templateContent}>
              {activeCategory ? (() => {
                const allItemsForCategory = groupedByCategory[activeCategory] || [];
                const items = allItemsForCategory.filter(item => 
                  item.taskName.toLowerCase().includes(searchItemName.toLowerCase()) || 
                  item.trackerId.toLowerCase().includes(searchItemName.toLowerCase())
                );

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeTab === 'templates' && activeProjectName && (
                      <div className={styles.templatePlanHint}>
                        <Calendar size={16} />
                        <span>
                          Set planned start and end dates for each task below for <strong>{activeProjectName}</strong>.
                        </span>
                      </div>
                    )}
                    {activeTab === 'templates' && !activeProjectName && (
                      <div className={styles.templatePlanHint}>
                        <Calendar size={16} />
                        <span>Select a project from the portfolio to set task-wise planned dates.</span>
                      </div>
                    )}

                    {items.length > 0 ? (
                      <div className={styles.tableContainer}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {items.map(item => {
                          const scheduleItem = localSchedule[item.id];
                          const savedPlan = getTaskPlan(activeCategory, item.trackerId, item.taskName);
                          const planDraftKey = getPlanDraftKey(activeCategory, item.trackerId);
                          const planDraft = localPlanDrafts[planDraftKey];
                          const displayPlan = planDraft ?? savedPlan;
                          const isSavingPlan = savingPlanKey === planDraftKey;
                          const showSavePlanBtn = Boolean(planDraft?.startDate?.trim());
                          const canSavePlan =
                            Boolean(planDraft?.startDate?.trim() && planDraft?.endDate?.trim()) &&
                            !isSavingPlan;
                          const missingTaskPlan =
                            activeProjectName &&
                            (!savedPlan.startDate?.trim() || !savedPlan.endDate?.trim());

                          return (
                            <div key={item.rowIndex} style={{
                              display: 'flex',
                              width: '100%',
                              background: activeTab === 'schedule' ? 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(246,248,255,1) 100%)' : 'var(--bg-card)',
                              borderLeft: activeTab === 'schedule' ? '4px solid var(--primary-color)' : 'none',
                              boxShadow: activeTab === 'schedule' ? '0 6px 16px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.06)',
                              borderRadius: activeTab === 'schedule' ? '20px' : '100px',
                              padding: '14px 20px',
                              gap: '16px',
                              alignItems: 'center'
                            }}>
                              {/* Task info: name row + meta row */}
                              <div className={styles.taskInfoCol}>
                                <div className={styles.taskTitleRow}>
                                  <span className={styles.trackerIdBadge}>{item.trackerId || 'N/A'}</span>
                                  <strong className={styles.taskName}>{item.taskName}</strong>
                                  {isDoerMissing(item.doerName) && (
                                    <span className={styles.missingDoerDot} title="Doer not assigned" aria-label="Doer not assigned" />
                                  )}
                                  {missingTaskPlan && (
                                    <span className={styles.missingDateDot} title="Planned dates not set" aria-label="Planned dates not set" />
                                  )}
                                </div>
                                <div className={styles.taskMetaRow}>
                                  <span className={styles.metaTag}>
                                    <Grid size={14} /> {item.areaName || 'No Area'}
                                  </span>
                                  <span className={styles.metaTag}>
                                    <User size={14} /> {item.resourceName || 'Unassigned'}
                                  </span>
                                  <span className={styles.metaTag}>
                                    Doer: {item.doerName || 'Unassigned'}
                                  </span>
                                </div>
                              </div>

                              {/* Right Section: Controls */}
                              {activeTab === 'schedule' ? (
                                <div className={styles.scheduleRightCol}>
                                  <div className={styles.datesCol}>
                                    <div className={`${styles.dateRow} ${styles.dateRowPlan}`}>
                                      <span className={styles.datePart}>
                                        <strong>Plan Start:</strong> {displayDate(savedPlan.startDate)}
                                      </span>
                                      <span className={styles.dateDivider}>|</span>
                                      <span className={`${styles.datePart} ${styles.datePartEnd}`}>
                                        <strong>Plan End:</strong> {displayDate(savedPlan.endDate)}
                                      </span>
                                    </div>
                                    <div className={`${styles.dateRow} ${styles.dateRowActual}`}>
                                      <span className={styles.datePart}>
                                        <strong>Actual Start:</strong> {displayDate(scheduleItem?.actualStartDate)}
                                      </span>
                                      <span className={styles.dateDivider}>|</span>
                                      <span className={`${styles.datePart} ${styles.datePartEnd}`}>
                                        <strong>Actual End:</strong> {displayDate(scheduleItem?.actualEndDate)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className={styles.trackerActionCol}>
                                    {!scheduleItem?.actualStartDate?.trim() ? (
                                      <button
                                        type="button"
                                        disabled={scheduleItem?.isSaving}
                                        onClick={() => handleMarkWorkStep(item.id, item.trackerId)}
                                        className={styles.workStartBtn}
                                      >
                                        {scheduleItem?.isSaving ? (
                                          <Loader2 size={14} className={styles.spinIcon} />
                                        ) : (
                                          <CheckSquare size={14} />
                                        )}
                                        {scheduleItem?.isSaving ? 'Saving...' : 'Start'}
                                      </button>
                                    ) : !scheduleItem?.actualEndDate?.trim() ? (
                                      <button
                                        type="button"
                                        disabled={scheduleItem?.isSaving}
                                        onClick={() => handleMarkWorkStep(item.id, item.trackerId)}
                                        className={styles.workEndBtn}
                                      >
                                        {scheduleItem?.isSaving ? (
                                          <Loader2 size={14} className={styles.spinIcon} />
                                        ) : (
                                          <CheckSquare size={14} />
                                        )}
                                        {scheduleItem?.isSaving ? 'Saving...' : 'Work End'}
                                      </button>
                                    ) : (
                                      <span className={styles.workDoneBadge}>
                                        <CheckSquare size={14} /> Done
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className={styles.templateRightCol}>
                                  {activeProjectName ? (
                                    <div className={styles.templatePlanDates}>
                                      <div className={styles.templatePlanField}>
                                        <span>Plan Start</span>
                                        <input
                                          type="date"
                                          className={styles.customDateInput}
                                          value={displayPlan.startDate}
                                          onChange={(e) =>
                                            updatePlanDraft(activeCategory, item.trackerId, item.taskName, 'startDate', e.target.value)
                                          }
                                          disabled={isSavingPlan}
                                        />
                                      </div>
                                      <div className={styles.templatePlanField}>
                                        <span>Plan End</span>
                                        <input
                                          type="date"
                                          className={styles.customDateInput}
                                          value={displayPlan.endDate}
                                          onChange={(e) =>
                                            updatePlanDraft(activeCategory, item.trackerId, item.taskName, 'endDate', e.target.value)
                                          }
                                          disabled={isSavingPlan}
                                        />
                                      </div>
                                      {showSavePlanBtn && (
                                        <button
                                          type="button"
                                          className={styles.savePlanBtn}
                                          disabled={!canSavePlan}
                                          onClick={() => submitTaskPlan(activeCategory, item.trackerId, item.taskName)}
                                        >
                                          {isSavingPlan ? (
                                            <>
                                              <Loader2 size={14} className={styles.spinIcon} />
                                              Saving...
                                            </>
                                          ) : (
                                            <>
                                              <CheckSquare size={14} />
                                              Save Dates
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  ) : null}
                                  <div className={styles.templateActions}>
                                    <button className={styles.controlBtn} onClick={() => handleEditTemplate(item)}><Edit2 size={13} /></button>
                                    <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setItemToDelete(item); setIsDeleteModalOpen(true); }}><Trash2 size={13} /></button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-light)', padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                        No tasks found matching your search.
                      </p>
                    )}
                  </div>
                );
              })() : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '200px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <p style={{ color: 'var(--text-light)' }}>Please create a template first.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="Confirm Deletion"
        type="danger"
        width="450px"
      >
        <div className={styles.modalBody}>
          <p>Are you sure you want to delete <strong>{itemToDelete?.taskName}</strong>?</p>
          <div className={styles.modalActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
            <button className={styles.confirmDeleteBtn} onClick={handleDeleteTemplate} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Template Edit/Create Modal */}
      <Modal
        isOpen={isTplModalOpen}
        onClose={() => setIsTplModalOpen(false)}
        title={editingTpl ? 'Edit Task Template' : 'Add Task Template'}
        width="500px"
      >
        <form onSubmit={submitTemplate} className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Category <span style={{color: 'red'}}>*</span></label>
            <input 
              list="category-list"
              required 
              value={tplForm.category} 
              onChange={e => setTplForm({...tplForm, category: e.target.value})} 
              placeholder="Select or type a category..."
            />
            <datalist id="category-list">
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </datalist>
          </div>
          <div className={styles.formGroup}>
            <label>Task Name <span style={{color: 'red'}}>*</span></label>
            <input 
              type="text" 
              required 
              value={tplForm.taskName} 
              onChange={e => setTplForm({...tplForm, taskName: e.target.value})} 
            />
          </div>
          <div className={styles.formGroup}>
            <label>Area Name</label>
            <input 
              type="text" 
              value={tplForm.areaName} 
              onChange={e => setTplForm({...tplForm, areaName: e.target.value})} 
            />
          </div>
          <div className={styles.formGroup}>
            <label>Resource Name</label>
            <input 
              type="text" 
              value={tplForm.resourceName} 
              onChange={e => setTplForm({...tplForm, resourceName: e.target.value})} 
            />
          </div>
          <div className={styles.formGroup}>
            <label>Doer Name</label>
            <input 
              list="users-list"
              value={tplForm.doerName || ''} 
              onChange={e => setTplForm({...tplForm, doerName: e.target.value})}
              placeholder="Select or type a user..."
            />
            <datalist id="users-list">
              {users.map(u => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </datalist>
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsTplModalOpen(false)}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
