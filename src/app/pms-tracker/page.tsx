'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Settings,
  CheckSquare, Calendar, User, Grid, LayoutTemplate, Loader2, Download, 
  Sparkles, CheckCircle2, Circle, AlertCircle
} from 'lucide-react';
import styles from './pms-tracker.module.css';
import Modal from '@/components/Modal';
import MultiSelectFilter from '@/components/MultiSelectFilter';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const NO_AREA_LABEL = 'No Area';

function getAreaLabel(areaName?: string) {
  return areaName?.trim() || NO_AREA_LABEL;
}

interface InstallLog {
  id: string;
  text: string;
  tone: 'info' | 'ok' | 'warn' | 'run';
}

interface SourcePreview {
  label: string;
  taskCount: number;
  categories: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface PmsTask {
  id: string;
  rowIndex: number;
  trackerId: string;
  areaName: string;
  taskName: string;
  resourceName: string;
  doerName: string;
  category: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  isSaving?: boolean;
}

interface TaskForm {
  trackerId: string;
  areaName: string;
  taskName: string;
  resourceName: string;
  doerName: string;
  category: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
}

const emptyForm = (defaults?: Partial<TaskForm>): TaskForm => ({
  trackerId: '',
  areaName: '',
  taskName: '',
  resourceName: '',
  doerName: '',
  category: defaults?.category || 'Phase-1',
  plannedStartDate: '',
  plannedEndDate: '',
  actualStartDate: '',
  actualEndDate: '',
});

const CATEGORY_ORDER = [
  'Phase-1', 'Phase-2', 'Phase-3', 'Phase-4',
  'VENDOR APPOINTMENT', 'ORDER MATERIALS', 'SELECTION',
];

function sortCategories(cats: string[]) {
  return [...cats].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
}

export default function PMSTrackerPage() {
  const { activeProject } = useProject();
  const { user } = useAuth();
  const activeProjectName = activeProject?.name || '';

  const [activeMode, setActiveMode] = useState<'project' | 'template'>('project');
  const [projectTasks, setProjectTasks] = useState<PmsTask[]>([]);
  const [templates, setTemplates] = useState<PmsTask[]>([]);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [sourceProjects, setSourceProjects] = useState<string[]>([]);
  const [installSource, setInstallSource] = useState<'template' | string>('template');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installPercent, setInstallPercent] = useState(0);
  const [installLogs, setInstallLogs] = useState<InstallLog[]>([]);
  const [sourcePreview, setSourcePreview] = useState<SourcePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [searchItemName, setSearchItemName] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PmsTask | null>(null);
  const [itemToDelete, setItemToDelete] = useState<PmsTask | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm());
  const [planDrafts, setPlanDrafts] = useState<Record<string, { startDate: string; endDate: string }>>({});

  const workingItems = activeMode === 'template' ? templates : projectTasks;
  const isTemplateMode = activeMode === 'template';
  const isProjectMode = activeMode === 'project';

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

  async function fetchSources() {
    const res = await fetch('/api/pms-tracker/sources');
    if (!res.ok) return;
    const data = await res.json();
    setSourceProjects(data.projects || []);
  }

  async function fetchTemplates() {
    const res = await fetch('/api/pms-tracker/templates');
    if (!res.ok) return;
    setTemplates(await res.json());
  }

  async function fetchProjectTasks(projectName: string) {
    if (!projectName) {
      setInstalled(null);
      setProjectTasks([]);
      return;
    }

    const res = await fetch(`/api/pms-tracker?project=${encodeURIComponent(projectName)}`);
    if (res.status === 404) {
      setInstalled(false);
      setProjectTasks([]);
      return;
    }
    if (!res.ok) {
      setInstalled(false);
      setProjectTasks([]);
      return;
    }
    const data = await res.json();
    setInstalled(data.installed !== false);
    setProjectTasks(data.tasks || []);
  }

  async function fetchData() {
    setLoading(true);
    try {
      const [, usersRes] = await Promise.all([
        fetchTemplates(),
        fetch('/api/users'),
        fetchSources(),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (activeProjectName) {
        await fetchProjectTasks(activeProjectName);
      } else {
        setInstalled(null);
        setProjectTasks([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeProjectName]);

  useEffect(() => {
    setPlanDrafts({});
    setSelectedCategory(null);
    setAreaFilter([]);
  }, [activeProjectName, activeMode]);

  const categories = useMemo(() => {
    const set = new Set(workingItems.map((t) => t.category || 'Uncategorized'));
    return sortCategories(Array.from(set));
  }, [workingItems]);

  const areaOptions = useMemo(() => {
    const set = new Set(workingItems.map((t) => getAreaLabel(t.areaName)));
    return Array.from(set).sort((a, b) => {
      if (a === NO_AREA_LABEL) return 1;
      if (b === NO_AREA_LABEL) return -1;
      return a.localeCompare(b);
    });
  }, [workingItems]);

  const activeCategory = (selectedCategory && categories.includes(selectedCategory))
    ? selectedCategory
    : categories[0] || null;

  const visibleItems = useMemo(() => {
    if (!activeCategory) return [];
    return workingItems.filter((item) => {
      const category = item.category || 'Uncategorized';
      if (category !== activeCategory) return false;
      const areaLabel = getAreaLabel(item.areaName);
      if (areaFilter.length > 0 && !areaFilter.includes(areaLabel)) return false;
      const q = searchItemName.toLowerCase();
      if (!q) return true;
      return (
        item.taskName.toLowerCase().includes(q) ||
        item.trackerId.toLowerCase().includes(q) ||
        item.areaName.toLowerCase().includes(q)
      );
    });
  }, [workingItems, activeCategory, areaFilter, searchItemName]);

  const categoryHasPlanDates = (category: string) => {
    if (!isProjectMode || !activeProjectName) return true;
    const tasks = projectTasks.filter(
      (t) => (t.category || 'Uncategorized') === category
    );
    if (tasks.length === 0) return true;
    return tasks.every(
      (t) => t.plannedStartDate?.trim() && t.plannedEndDate?.trim()
    );
  };

  const sourceLabel =
    installSource === 'template' ? 'Template (master)' : `Project: ${installSource}`;

  const pushInstallLog = (text: string, tone: InstallLog['tone'] = 'info') => {
    setInstallLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, text, tone },
    ]);
  };

  const loadSourcePreview = async (source: string) => {
    setPreviewLoading(true);
    try {
      if (source === 'template') {
        const res = await fetch('/api/pms-tracker/templates');
        const tasks: PmsTask[] = res.ok ? await res.json() : [];
        const list = Array.isArray(tasks) ? tasks : [];
        setSourcePreview({
          label: 'Template (master)',
          taskCount: list.length,
          categories: new Set(list.map((t) => t.category || 'Uncategorized')).size,
        });
        return;
      }

      const res = await fetch(`/api/pms-tracker?project=${encodeURIComponent(source)}`);
      if (!res.ok) {
        setSourcePreview({ label: `Project: ${source}`, taskCount: 0, categories: 0 });
        return;
      }
      const data = await res.json();
      const list: PmsTask[] = Array.isArray(data.tasks) ? data.tasks : [];
      setSourcePreview({
        label: `Project: ${source}`,
        taskCount: list.length,
        categories: new Set(list.map((t) => t.category || 'Uncategorized')).size,
      });
    } catch {
      setSourcePreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (installed === false && activeProjectName) {
      loadSourcePreview(installSource);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installSource, installed, activeProjectName]);

  const handleInstall = async () => {
    if (!activeProjectName || installing) return;

    setInstalling(true);
    setInstallPercent(0);
    setInstallLogs([]);

    const source =
      installSource === 'template'
        ? 'template'
        : { project: installSource };

    let progressTimer: ReturnType<typeof setInterval> | null = null;

    try {
      pushInstallLog('Connecting to PMS workbook…', 'run');
      setInstallPercent(8);
      await sleep(350);

      pushInstallLog(`Scanning source · ${sourceLabel}`, 'run');
      setInstallPercent(18);
      await sleep(400);

      const preview =
        sourcePreview ||
        ({
          label: sourceLabel,
          taskCount: 0,
          categories: 0,
        } as SourcePreview);

      if (preview.taskCount > 0) {
        pushInstallLog(
          `Found ${preview.taskCount} tasks · ${preview.categories} categories`,
          'ok'
        );
      } else {
        pushInstallLog('Reading task structure from source…', 'info');
      }
      setInstallPercent(28);
      await sleep(300);

      pushInstallLog(`Creating project sheet · ${activeProjectName}`, 'run');
      setInstallPercent(40);

      progressTimer = setInterval(() => {
        setInstallPercent((p) => (p < 88 ? p + 2 : p));
      }, 220);

      pushInstallLog('Copying task structure (dates left empty)…', 'run');

      const res = await fetch('/api/pms-tracker/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: activeProjectName, source }),
      });
      const data = await res.json();

      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }

      if (!res.ok) {
        pushInstallLog(data.error || 'Install failed.', 'warn');
        setInstallPercent(0);
        alert(data.error || 'Failed to install tasks.');
        return;
      }

      const copied = data.taskCount || preview.taskCount || 0;
      setInstallPercent(94);
      pushInstallLog(`Wrote ${copied} tasks into “${data.project || activeProjectName}”`, 'ok');
      await sleep(280);

      setInstallPercent(100);
      pushInstallLog('Install complete — opening project tracker…', 'ok');
      await sleep(500);

      await fetchSources();
      await fetchProjectTasks(activeProjectName);
      setActiveMode('project');
    } catch (err) {
      console.error(err);
      pushInstallLog('Install interrupted. Please try again.', 'warn');
      setInstallPercent(0);
      alert('Failed to install tasks.');
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setInstalling(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm(
      emptyForm({
        category: activeCategory || 'Phase-1',
      })
    );
    setIsModalOpen(true);
  };

  const openEditModal = (item: PmsTask) => {
    setEditingItem(item);
    setForm({
      trackerId: item.trackerId,
      areaName: item.areaName,
      taskName: item.taskName,
      resourceName: item.resourceName,
      doerName: item.doerName,
      category: item.category,
      plannedStartDate: item.plannedStartDate,
      plannedEndDate: item.plannedEndDate,
      actualStartDate: item.actualStartDate,
      actualEndDate: item.actualEndDate,
    });
    setIsModalOpen(true);
  };

  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.taskName?.trim() || !form.category?.trim()) {
      alert('Task Name and Category are required.');
      return;
    }

    setSubmitting(true);
    try {
      let url: string;
      let method: string;
      let body: Record<string, string>;

      if (isTemplateMode) {
        url = editingItem
          ? `/api/pms-tracker/templates?rowIndex=${editingItem.rowIndex}`
          : '/api/pms-tracker/templates';
        method = editingItem ? 'PUT' : 'POST';
        body = { ...form };
      } else {
        if (!activeProjectName) {
          alert('Select a project first.');
          return;
        }
        url = editingItem
          ? `/api/pms-tracker?project=${encodeURIComponent(activeProjectName)}&rowIndex=${editingItem.rowIndex}`
          : '/api/pms-tracker';
        method = editingItem ? 'PUT' : 'POST';
        body = { ...form, project: activeProjectName };
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to save.');
        return;
      }
      setIsModalOpen(false);
      if (isTemplateMode) await fetchTemplates();
      else await fetchProjectTasks(activeProjectName);
    } catch (err) {
      console.error(err);
      alert('Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSubmitting(true);
    try {
      const url = isTemplateMode
        ? `/api/pms-tracker/templates?rowIndex=${itemToDelete.rowIndex}`
        : `/api/pms-tracker?project=${encodeURIComponent(activeProjectName)}&rowIndex=${itemToDelete.rowIndex}`;

      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
        if (isTemplateMode) await fetchTemplates();
        else await fetchProjectTasks(activeProjectName);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateTaskRow = async (item: PmsTask, patch: Partial<PmsTask>) => {
    if (!activeProjectName) return false;
    const payload = {
      trackerId: item.trackerId,
      areaName: item.areaName,
      taskName: item.taskName,
      resourceName: item.resourceName,
      doerName: item.doerName,
      category: item.category,
      plannedStartDate: item.plannedStartDate,
      plannedEndDate: item.plannedEndDate,
      actualStartDate: item.actualStartDate,
      actualEndDate: item.actualEndDate,
      ...patch,
    };

    const res = await fetch(
      `/api/pms-tracker?project=${encodeURIComponent(activeProjectName)}&rowIndex=${item.rowIndex}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    return res.ok;
  };

  const handleMarkWorkStep = async (item: PmsTask) => {
    if (!activeProjectName) return;
    const today = getTodayIsoDate();
    let actualStartDate = item.actualStartDate || '';
    let actualEndDate = item.actualEndDate || '';

    if (!actualStartDate) actualStartDate = today;
    else if (!actualEndDate) actualEndDate = today;
    else return;

    setSavingRowId(item.id);
    try {
      const ok = await updateTaskRow(item, { actualStartDate, actualEndDate });
      if (ok) await fetchProjectTasks(activeProjectName);
      else alert('Failed to save work dates.');
    } catch (err) {
      console.error(err);
      alert('Error saving work dates.');
    } finally {
      setSavingRowId(null);
    }
  };

  const updatePlanDraft = (item: PmsTask, field: 'startDate' | 'endDate', value: string) => {
    const key = String(item.rowIndex);
    setPlanDrafts((prev) => {
      const current = prev[key] ?? {
        startDate: item.plannedStartDate || '',
        endDate: item.plannedEndDate || '',
      };
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const savePlanDates = async (item: PmsTask) => {
    const key = String(item.rowIndex);
    const draft = planDrafts[key];
    if (!draft?.startDate?.trim() || !draft?.endDate?.trim()) return;

    setSavingRowId(item.id);
    try {
      const ok = await updateTaskRow(item, {
        plannedStartDate: draft.startDate,
        plannedEndDate: draft.endDate,
      });
      if (ok) {
        setPlanDrafts((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        await fetchProjectTasks(activeProjectName);
      } else {
        alert('Failed to save planned dates.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save planned dates.');
    } finally {
      setSavingRowId(null);
    }
  };

  const showInstallGate =
    isProjectMode &&
    Boolean(activeProjectName) &&
    installed === false;

  const showNoProject = isProjectMode && !activeProjectName;

  const allCategoryOptions = useMemo(() => {
    const set = new Set([
      ...templates.map((t) => t.category).filter(Boolean),
      ...projectTasks.map((t) => t.category).filter(Boolean),
      ...CATEGORY_ORDER,
    ]);
    return sortCategories(Array.from(set));
  }, [templates, projectTasks]);

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
                >
                  {activeProjectName}
                </button>
              </>
            )}
            <span className="separator">&gt;</span>
            <span className="current">PMS Tracker</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.modeSwitch} role="tablist" aria-label="PMS mode">
            <button
              type="button"
              role="tab"
              aria-selected={isProjectMode}
              className={`${styles.modeSwitchBtn} ${isProjectMode ? styles.modeSwitchActive : ''}`}
              onClick={() => setActiveMode('project')}
            >
              <CheckSquare size={16} />
              Project
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isTemplateMode}
              className={`${styles.modeSwitchBtn} ${isTemplateMode ? styles.modeSwitchActive : ''}`}
              onClick={() => setActiveMode('template')}
            >
              <Settings size={16} />
              Template
            </button>
          </div>
          {!showInstallGate && !showNoProject && (
            <>
              <MultiSelectFilter
                label="Area Name"
                options={areaOptions}
                selectedValues={areaFilter}
                onChange={setAreaFilter}
              />
              <div className={styles.searchBox}>
                <Search size={18} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchItemName}
                  onChange={(e) => setSearchItemName(e.target.value)}
                />
              </div>
            </>
          )}
          {(isTemplateMode || (isProjectMode && installed && activeProjectName)) && (
            <button className={styles.addButton} onClick={openAddModal}>
              <Plus size={18} />
              {isTemplateMode ? 'Add Template Task' : 'Add Project Task'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
          Loading...
        </div>
      ) : showNoProject ? (
        <div className={styles.installCard}>
          <BuildingPlaceholder />
          <h3>Select a project</h3>
          <p>Open a project from the portfolio, then install or view its PMS tracker tasks.</p>
          <Link href="/projects" className={styles.addButton} style={{ textDecoration: 'none' }}>
            Go to Portfolio
          </Link>
        </div>
      ) : showInstallGate ? (
        <div className={`${styles.installCard} ${styles.installCardRich}`}>
          <div className={styles.installHero}>
            <div className={styles.installHeroIcon}>
              {installing ? (
                <Loader2 size={28} className={styles.spinIcon} />
              ) : (
                <Sparkles size={28} />
              )}
            </div>
            <div className={styles.installHeroText}>
              <h3>{installing ? 'Installing tasks…' : 'Install Tasks'}</h3>
              <p>
                Set up the tracker sheet for <strong>{activeProjectName}</strong>.
                Copy structure from Template or another project — Planned & Actual dates start empty.
              </p>
            </div>
          </div>

          {!installing ? (
            <>
              <div className={`${styles.formGroup} ${styles.installField}`} data-has-value="true">
                <label className={styles.outlineLabel}>Copy from</label>
                <select
                  value={installSource}
                  onChange={(e) => setInstallSource(e.target.value)}
                  disabled={installing}
                >
                  <option value="template">Template (master)</option>
                  {sourceProjects
                    .filter((p) => p !== activeProjectName)
                    .map((p) => (
                      <option key={p} value={p}>
                        Project: {p}
                      </option>
                    ))}
                </select>
              </div>

              <div className={styles.installPreviewRow}>
                {previewLoading ? (
                  <span className={styles.installPreviewMuted}>
                    <Loader2 size={14} className={styles.spinIcon} /> Scanning source…
                  </span>
                ) : sourcePreview ? (
                  <>
                    <span className={styles.installStat}>
                      <strong>{sourcePreview.taskCount}</strong> tasks
                    </span>
                    <span className={styles.installStatDot} />
                    <span className={styles.installStat}>
                      <strong>{sourcePreview.categories}</strong> categories
                    </span>
                  </>
                ) : (
                  <span className={styles.installPreviewMuted}>Select a source to preview</span>
                )}
              </div>

              <button
                className={`${styles.addButton} ${styles.installPrimaryBtn}`}
                onClick={handleInstall}
                disabled={installing || previewLoading || (sourcePreview?.taskCount === 0)}
              >
                <Download size={18} /> Install Tasks
              </button>
            </>
          ) : (
            <div className={styles.installProgressPanel}>
              <div className={styles.installProgressHeader}>
                <span className={styles.installProgressLabel}>Progress</span>
                <span className={styles.installProgressPct}>{installPercent}%</span>
              </div>
              <div className={styles.installProgressTrack}>
                <div
                  className={styles.installProgressFill}
                  style={{ width: `${installPercent}%` }}
                />
              </div>
              <div className={styles.installProgressMeta}>
                <span>
                  {installPercent < 100
                    ? `${Math.max(0, 100 - installPercent)}% remaining`
                    : 'All done'}
                </span>
                <span>{sourceLabel}</span>
              </div>

              <div className={styles.installLogBox} aria-live="polite">
                {installLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`${styles.installLogRow} ${styles[`installLog_${log.tone}`]}`}
                  >
                    {log.tone === 'ok' ? (
                      <CheckCircle2 size={14} />
                    ) : log.tone === 'warn' ? (
                      <AlertCircle size={14} />
                    ) : log.tone === 'run' ? (
                      <Loader2 size={14} className={styles.spinIcon} />
                    ) : (
                      <Circle size={14} />
                    )}
                    <span>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.templateLayout}>
          <div className={styles.doubleSidebar}>
            <div className={styles.categorySidebar}>
              <h3 className={styles.sidebarTitle}>Categories</h3>
              <div className={styles.sidebarList}>
                {categories.map((cat) => {
                  const missing = isProjectMode && !categoryHasPlanDates(cat);
                  return (
                    <button
                      key={cat}
                      className={`${styles.sidebarItem} ${activeCategory === cat ? styles.active : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <LayoutTemplate size={16} style={{ marginRight: 8, flexShrink: 0 }} />
                      <span className={styles.sidebarItemLabel}>{cat}</span>
                      {missing && (
                        <span className={styles.missingDateDot} aria-label="Planned dates not set" />
                      )}
                    </button>
                  );
                })}
                {categories.length === 0 && (
                  <p className={styles.emptySidebar}>No categories found.</p>
                )}
              </div>
            </div>
          </div>

          <div className={styles.templateContent}>
            {isTemplateMode && (
              <div className={styles.templatePlanHint}>
                <Settings size={16} />
                <span>
                  Polishing <strong>Template</strong> — add, edit, or delete master tasks. Future installs copy this structure.
                </span>
              </div>
            )}
            {isProjectMode && activeProjectName && (
              <div className={styles.templatePlanHint}>
                <Calendar size={16} />
                <span>
                  Polishing project sheet for <strong>{activeProjectName}</strong> — edit tasks and set Planned / Actual dates.
                </span>
              </div>
            )}

            {activeCategory ? (
              visibleItems.length > 0 ? (
                <div className={styles.tableContainer}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {visibleItems.map((item) => {
                      const draftKey = String(item.rowIndex);
                      const planDraft = planDrafts[draftKey];
                      const displayPlan = planDraft ?? {
                        startDate: item.plannedStartDate,
                        endDate: item.plannedEndDate,
                      };
                      const isSaving = savingRowId === item.id;
                      const showSavePlan = Boolean(planDraft?.startDate?.trim());
                      const canSavePlan =
                        Boolean(planDraft?.startDate?.trim() && planDraft?.endDate?.trim()) &&
                        !isSaving;
                      const missingTaskPlan =
                        isProjectMode &&
                        (!item.plannedStartDate?.trim() || !item.plannedEndDate?.trim());

                      return (
                        <div
                          key={item.rowIndex}
                          style={{
                            display: 'flex',
                            width: '100%',
                            background:
                              isProjectMode
                                ? 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(246,248,255,1) 100%)'
                                : 'var(--bg-card)',
                            borderLeft:
                              isProjectMode
                                ? '4px solid var(--primary-color)'
                                : 'none',
                            boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                            borderRadius: '16px',
                            padding: '14px 20px',
                            gap: '16px',
                            alignItems: 'center',
                          }}
                        >
                          <div className={styles.taskInfoCol}>
                            <div className={styles.taskTitleRow}>
                              <span className={styles.trackerIdBadge}>
                                {item.trackerId || 'N/A'}
                              </span>
                              <strong className={styles.taskName}>{item.taskName}</strong>
                              {isDoerMissing(item.doerName) && (
                                <span
                                  className={styles.missingDoerDot}
                                  title="Doer not assigned"
                                />
                              )}
                              {missingTaskPlan && (
                                <span
                                  className={styles.missingDateDot}
                                  title="Planned dates not set"
                                />
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

                          {isProjectMode ? (
                            <div className={styles.scheduleRightCol}>
                              <div className={styles.datesCol}>
                                <div className={`${styles.dateRow} ${styles.dateRowPlan}`}>
                                  <span className={styles.datePart}>
                                    <strong>Plan Start:</strong>{' '}
                                    {displayDate(item.plannedStartDate)}
                                  </span>
                                  <span className={styles.dateDivider}>|</span>
                                  <span className={`${styles.datePart} ${styles.datePartEnd}`}>
                                    <strong>Plan End:</strong>{' '}
                                    {displayDate(item.plannedEndDate)}
                                  </span>
                                </div>
                                <div className={`${styles.dateRow} ${styles.dateRowActual}`}>
                                  <span className={styles.datePart}>
                                    <strong>Actual Start:</strong>{' '}
                                    {displayDate(item.actualStartDate)}
                                  </span>
                                  <span className={styles.dateDivider}>|</span>
                                  <span className={`${styles.datePart} ${styles.datePartEnd}`}>
                                    <strong>Actual End:</strong>{' '}
                                    {displayDate(item.actualEndDate)}
                                  </span>
                                </div>
                                {!(item.actualStartDate?.trim() && item.actualEndDate?.trim()) && (
                                  <div className={styles.inlinePlanEditors}>
                                    <input
                                      type="date"
                                      className={styles.smallDateInput}
                                      value={displayPlan.startDate || ''}
                                      onChange={(e) =>
                                        updatePlanDraft(item, 'startDate', e.target.value)
                                      }
                                      disabled={isSaving}
                                    />
                                    <input
                                      type="date"
                                      className={styles.smallDateInput}
                                      value={displayPlan.endDate || ''}
                                      onChange={(e) =>
                                        updatePlanDraft(item, 'endDate', e.target.value)
                                      }
                                      disabled={isSaving}
                                    />
                                    {showSavePlan && (
                                      <button
                                        type="button"
                                        className={styles.savePlanBtn}
                                        disabled={!canSavePlan}
                                        onClick={() => savePlanDates(item)}
                                      >
                                        {isSaving ? 'Saving...' : 'Save Plan'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className={styles.cardActionsStack}>
                                <div className={styles.trackerActionCol}>
                                  {!item.actualStartDate?.trim() ? (
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => handleMarkWorkStep(item)}
                                      className={styles.workStartBtn}
                                    >
                                      {isSaving ? (
                                        <Loader2 size={14} className={styles.spinIcon} />
                                      ) : (
                                        <CheckSquare size={14} />
                                      )}
                                      {isSaving ? 'Saving...' : 'Start'}
                                    </button>
                                  ) : !item.actualEndDate?.trim() ? (
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => handleMarkWorkStep(item)}
                                      className={styles.workEndBtn}
                                    >
                                      {isSaving ? (
                                        <Loader2 size={14} className={styles.spinIcon} />
                                      ) : (
                                        <CheckSquare size={14} />
                                      )}
                                      {isSaving ? 'Saving...' : 'Work End'}
                                    </button>
                                  ) : (
                                    <span className={styles.workDoneBadge}>
                                      <CheckSquare size={14} /> Done
                                    </span>
                                  )}
                                </div>

                                <div className={styles.templateActions}>
                                  <button
                                    className={styles.controlBtn}
                                    onClick={() => openEditModal(item)}
                                    title="Edit"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    className={`${styles.controlBtn} ${styles.delete}`}
                                    onClick={() => {
                                      setItemToDelete(item);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    title="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.templateRightCol}>
                              <div className={styles.templateActions}>
                                <button
                                  className={styles.controlBtn}
                                  onClick={() => openEditModal(item)}
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  className={`${styles.controlBtn} ${styles.delete}`}
                                  onClick={() => {
                                    setItemToDelete(item);
                                    setIsDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className={styles.emptyContent}>
                  No tasks found matching your filters.
                </p>
              )
            ) : (
              <div className={styles.emptyContentBox}>
                <p style={{ color: 'var(--text-light)' }}>
                  {isTemplateMode
                    ? 'Add tasks to the Template to get started.'
                    : 'No tasks in this project sheet yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        type="danger"
        width="450px"
      >
        <div className={styles.modalBody}>
          <p>
            Are you sure you want to delete <strong>{itemToDelete?.taskName}</strong>?
          </p>
          <div className={styles.modalActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </button>
            <button
              className={styles.confirmDeleteBtn}
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingItem
            ? isTemplateMode
              ? 'Edit Template Task'
              : 'Edit Project Task'
            : isTemplateMode
              ? 'Add Template Task'
              : 'Add Project Task'
        }
        width="520px"
      >
        <form onSubmit={submitItem} className={`${styles.modalBody} ${styles.fixedOutlineForm}`}>
          <div className={styles.formGroup} data-has-value="true">
            <label className={styles.outlineLabel}>
              Category <span className={styles.requiredMark}>*</span>
            </label>
            <input
              list="category-list"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Select or type a category..."
            />
            <datalist id="category-list">
              {allCategoryOptions.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div className={styles.formGroup} data-has-value="true">
            <label className={styles.outlineLabel}>
              Task Name <span className={styles.requiredMark}>*</span>
            </label>
            <input
              type="text"
              required
              value={form.taskName}
              onChange={(e) => setForm({ ...form, taskName: e.target.value })}
              placeholder="Enter task name"
            />
          </div>
          <div className={styles.formGroup} data-has-value="true">
            <label className={styles.outlineLabel}>Area Name</label>
            <input
              type="text"
              value={form.areaName}
              onChange={(e) => setForm({ ...form, areaName: e.target.value })}
              placeholder="Enter area name"
            />
          </div>
          <div className={styles.formGroup} data-has-value="true">
            <label className={styles.outlineLabel}>Resource Name</label>
            <input
              type="text"
              value={form.resourceName}
              onChange={(e) => setForm({ ...form, resourceName: e.target.value })}
              placeholder="Enter resource name"
            />
          </div>
          <div className={styles.formGroup} data-has-value="true">
            <label className={styles.outlineLabel}>Doer Name</label>
            <input
              list="users-list"
              value={form.doerName || ''}
              onChange={(e) => setForm({ ...form, doerName: e.target.value })}
              placeholder="Select or type a user..."
            />
            <datalist id="users-list">
              {users.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </datalist>
          </div>
          {isProjectMode && (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup} data-has-value="true">
                  <label className={styles.outlineLabel}>Planned Start</label>
                  <input
                    type="date"
                    value={form.plannedStartDate}
                    onChange={(e) =>
                      setForm({ ...form, plannedStartDate: e.target.value })
                    }
                  />
                </div>
                <div className={styles.formGroup} data-has-value="true">
                  <label className={styles.outlineLabel}>Planned End</label>
                  <input
                    type="date"
                    value={form.plannedEndDate}
                    onChange={(e) =>
                      setForm({ ...form, plannedEndDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup} data-has-value="true">
                  <label className={styles.outlineLabel}>Actual Start</label>
                  <input
                    type="date"
                    value={form.actualStartDate}
                    onChange={(e) =>
                      setForm({ ...form, actualStartDate: e.target.value })
                    }
                  />
                </div>
                <div className={styles.formGroup} data-has-value="true">
                  <label className={styles.outlineLabel}>Actual End</label>
                  <input
                    type="date"
                    value={form.actualEndDate}
                    onChange={(e) =>
                      setForm({ ...form, actualEndDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </>
          )}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function BuildingPlaceholder() {
  return (
    <div className={styles.installIconWrap}>
      <LayoutTemplate size={40} />
    </div>
  );
}
