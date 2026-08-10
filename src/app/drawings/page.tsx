'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, Settings,
  CheckSquare, Calendar, User, Grid, LayoutTemplate, Loader2, Download, MapPin,
  Sparkles, CheckCircle2, Circle, AlertCircle, X, UploadCloud, FileText,
} from 'lucide-react';
import styles from './drawings.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { CONFIG } from '@/lib/config';
import Link from 'next/link';

interface InstallLog {
  id: string;
  text: string;
  tone: 'info' | 'ok' | 'warn' | 'run';
}

interface SourcePreview {
  label: string;
  drawingCount: number;
  zones: number;
  categories: number;
}

interface DrawingItem {
  id: string;
  rowIndex: number;
  drawingNo: string;
  zone: string;
  areaName: string;
  drawingName: string;
  resourceName: string;
  doerName: string;
  category: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  revisionNo: string;
  lastUpdated: string;
  drawingImage: string;
}

interface DrawingForm {
  drawingNo: string;
  zone: string;
  areaName: string;
  drawingName: string;
  resourceName: string;
  doerName: string;
  category: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  revisionNo: string;
  drawingImage: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const emptyForm = (defaults?: Partial<DrawingForm>): DrawingForm => ({
  drawingNo: '',
  zone: defaults?.zone || '',
  areaName: '',
  drawingName: '',
  resourceName: '',
  doerName: '',
  category: defaults?.category || 'Architecture',
  plannedStartDate: '',
  plannedEndDate: '',
  actualStartDate: '',
  actualEndDate: '',
  revisionNo: '0',
  drawingImage: '',
});

function sortCategories(cats: string[]) {
  return [...cats].sort((a, b) => a.localeCompare(b));
}

function sortZones(zones: string[]) {
  return [...zones].sort((a, b) => {
    const numA = a.match(/(\d+)/);
    const numB = b.match(/(\d+)/);
    if (numA && numB) return parseInt(numA[1], 10) - parseInt(numB[1], 10);
    return a.localeCompare(b);
  });
}

export default function DrawingsPage() {
  const { activeProject } = useProject();
  const { user } = useAuth();
  const activeProjectName = activeProject?.name || '';

  const [activeMode, setActiveMode] = useState<'project' | 'template'>('project');
  const [projectDrawings, setProjectDrawings] = useState<DrawingItem[]>([]);
  const [templates, setTemplates] = useState<DrawingItem[]>([]);
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

  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchItemName, setSearchItemName] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DrawingItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<DrawingItem | null>(null);
  const [updatingItem, setUpdatingItem] = useState<DrawingItem | null>(null);
  const [form, setForm] = useState<DrawingForm>(emptyForm());
  const [planDrafts, setPlanDrafts] = useState<Record<string, { startDate: string; endDate: string }>>({});

  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const workingItems = activeMode === 'template' ? templates : projectDrawings;
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

  const isPlanEditingHidden = (item: DrawingItem) =>
    Boolean(item.actualStartDate?.trim() && item.actualEndDate?.trim());

  async function fetchSources() {
    const res = await fetch('/api/drawings/sources');
    if (!res.ok) return;
    const data = await res.json();
    setSourceProjects(data.projects || []);
  }

  async function fetchTemplates() {
    const res = await fetch('/api/drawings/templates');
    if (!res.ok) return;
    setTemplates(await res.json());
  }

  async function fetchProjectDrawings(projectName: string) {
    if (!projectName) {
      setInstalled(null);
      setProjectDrawings([]);
      return;
    }

    const res = await fetch(`/api/drawings?project=${encodeURIComponent(projectName)}`);
    if (res.status === 404) {
      setInstalled(false);
      setProjectDrawings([]);
      return;
    }
    if (!res.ok) {
      setInstalled(false);
      setProjectDrawings([]);
      return;
    }
    const data = await res.json();
    setInstalled(data.installed !== false);
    setProjectDrawings(data.drawings || []);
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
        await fetchProjectDrawings(activeProjectName);
      } else {
        setInstalled(null);
        setProjectDrawings([]);
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
    setSelectedZone(null);
    setSelectedCategory(null);
  }, [activeProjectName, activeMode]);

  const zones = useMemo(() => {
    const set = new Set(workingItems.map((t) => t.zone?.trim() || 'Unassigned Zone'));
    return sortZones(Array.from(set));
  }, [workingItems]);

  const activeZone = (selectedZone && zones.includes(selectedZone))
    ? selectedZone
    : zones[0] || null;

  const categoriesInZone = useMemo(() => {
    if (!activeZone) return [];
    const set = new Set(
      workingItems
        .filter((t) => (t.zone?.trim() || 'Unassigned Zone') === activeZone)
        .map((t) => t.category || 'Uncategorized')
    );
    return sortCategories(Array.from(set));
  }, [workingItems, activeZone]);

  const activeCategory = (selectedCategory && categoriesInZone.includes(selectedCategory))
    ? selectedCategory
    : categoriesInZone[0] || null;

  const visibleItems = useMemo(() => {
    if (!activeZone || !activeCategory) return [];
    return workingItems.filter((item) => {
      const zone = item.zone?.trim() || 'Unassigned Zone';
      const category = item.category || 'Uncategorized';
      if (zone !== activeZone || category !== activeCategory) return false;
      const q = searchItemName.toLowerCase();
      if (!q) return true;
      return (
        item.drawingName.toLowerCase().includes(q) ||
        item.drawingNo.toLowerCase().includes(q) ||
        item.areaName.toLowerCase().includes(q)
      );
    });
  }, [workingItems, activeZone, activeCategory, searchItemName]);

  const categoryHasPlanDates = (zone: string, category: string) => {
    if (!isProjectMode || !activeProjectName) return true;
    const items = projectDrawings.filter(
      (t) =>
        (t.zone?.trim() || 'Unassigned Zone') === zone &&
        (t.category || 'Uncategorized') === category
    );
    if (items.length === 0) return true;
    return items.every(
      (t) => t.plannedStartDate?.trim() && t.plannedEndDate?.trim()
    );
  };

  const zoneHasMissingPlans = (zone: string) => {
    if (!isProjectMode || !activeProjectName) return false;
    const cats = sortCategories(
      Array.from(
        new Set(
          projectDrawings
            .filter((t) => (t.zone?.trim() || 'Unassigned Zone') === zone)
            .map((t) => t.category || 'Uncategorized')
        )
      )
    );
    return cats.some((c) => !categoryHasPlanDates(zone, c));
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
        const res = await fetch('/api/drawings/templates');
        const list: DrawingItem[] = res.ok ? await res.json() : [];
        const items = Array.isArray(list) ? list : [];
        setSourcePreview({
          label: 'Template (master)',
          drawingCount: items.length,
          zones: new Set(items.map((t) => t.zone?.trim() || 'Unassigned Zone')).size,
          categories: new Set(items.map((t) => t.category || 'Uncategorized')).size,
        });
        return;
      }

      const res = await fetch(`/api/drawings?project=${encodeURIComponent(source)}`);
      if (!res.ok) {
        setSourcePreview({ label: `Project: ${source}`, drawingCount: 0, zones: 0, categories: 0 });
        return;
      }
      const data = await res.json();
      const list: DrawingItem[] = Array.isArray(data.drawings) ? data.drawings : [];
      setSourcePreview({
        label: `Project: ${source}`,
        drawingCount: list.length,
        zones: new Set(list.map((t) => t.zone?.trim() || 'Unassigned Zone')).size,
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
      pushInstallLog('Connecting to Drawing Schedule workbook…', 'run');
      setInstallPercent(8);
      await sleep(350);

      pushInstallLog(`Scanning source · ${sourceLabel}`, 'run');
      setInstallPercent(18);
      await sleep(400);

      const preview =
        sourcePreview ||
        ({
          label: sourceLabel,
          drawingCount: 0,
          zones: 0,
          categories: 0,
        } as SourcePreview);

      if (preview.drawingCount > 0) {
        pushInstallLog(
          `Found ${preview.drawingCount} drawings · ${preview.zones} zones · ${preview.categories} categories`,
          'ok'
        );
      } else {
        pushInstallLog('Reading drawing structure from source…', 'info');
      }
      setInstallPercent(28);
      await sleep(300);

      pushInstallLog(`Creating project sheet · ${activeProjectName}`, 'run');
      setInstallPercent(40);

      progressTimer = setInterval(() => {
        setInstallPercent((p) => (p < 88 ? p + 2 : p));
      }, 220);

      pushInstallLog('Copying drawing structure (dates left empty)…', 'run');

      const res = await fetch('/api/drawings/install', {
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
        alert(data.error || 'Failed to install drawings.');
        return;
      }

      const copied = data.drawingCount || preview.drawingCount || 0;
      setInstallPercent(94);
      pushInstallLog(`Wrote ${copied} drawings into “${data.project || activeProjectName}”`, 'ok');
      await sleep(280);

      setInstallPercent(100);
      pushInstallLog('Install complete — opening project sheet…', 'ok');
      await sleep(500);

      await fetchSources();
      await fetchProjectDrawings(activeProjectName);
      setActiveMode('project');
    } catch (err) {
      console.error(err);
      pushInstallLog('Install interrupted. Please try again.', 'warn');
      setInstallPercent(0);
      alert('Failed to install drawings.');
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setInstalling(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm(
      emptyForm({
        zone: activeZone && activeZone !== 'Unassigned Zone' ? activeZone : '',
        category: activeCategory || 'Architecture',
      })
    );
    setIsModalOpen(true);
  };

  const openEditModal = (item: DrawingItem) => {
    setEditingItem(item);
    setForm({
      drawingNo: item.drawingNo,
      zone: item.zone,
      areaName: item.areaName,
      drawingName: item.drawingName,
      resourceName: item.resourceName,
      doerName: item.doerName,
      category: item.category,
      plannedStartDate: item.plannedStartDate,
      plannedEndDate: item.plannedEndDate,
      actualStartDate: item.actualStartDate,
      actualEndDate: item.actualEndDate,
      revisionNo: item.revisionNo,
      drawingImage: item.drawingImage,
    });
    setIsModalOpen(true);
  };

  const openUpdateModal = (item: DrawingItem) => {
    setStagedFile(null);
    setUpdatingItem({ ...item });
    setIsUpdateModalOpen(true);
  };

  const buildPayload = (item: DrawingItem, patch: Partial<DrawingItem>) => ({
    drawingNo: item.drawingNo,
    zone: item.zone,
    areaName: item.areaName,
    drawingName: item.drawingName,
    resourceName: item.resourceName,
    doerName: item.doerName,
    category: item.category,
    plannedStartDate: item.plannedStartDate,
    plannedEndDate: item.plannedEndDate,
    actualStartDate: item.actualStartDate,
    actualEndDate: item.actualEndDate,
    revisionNo: item.revisionNo,
    drawingImage: item.drawingImage,
    ...patch,
  });

  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.drawingName?.trim() || !form.category?.trim()) {
      alert('Drawing Name and Category are required.');
      return;
    }

    setSubmitting(true);
    try {
      let url: string;
      let method: string;
      let body: Record<string, string>;

      if (isTemplateMode) {
        url = editingItem
          ? `/api/drawings/templates?rowIndex=${editingItem.rowIndex}`
          : '/api/drawings/templates';
        method = editingItem ? 'PUT' : 'POST';
        body = { ...form };
      } else {
        if (!activeProjectName) {
          alert('Select a project first.');
          return;
        }
        url = editingItem
          ? `/api/drawings?project=${encodeURIComponent(activeProjectName)}&rowIndex=${editingItem.rowIndex}`
          : '/api/drawings';
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
      else await fetchProjectDrawings(activeProjectName);
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
        ? `/api/drawings/templates?rowIndex=${itemToDelete.rowIndex}`
        : `/api/drawings?project=${encodeURIComponent(activeProjectName)}&rowIndex=${itemToDelete.rowIndex}`;

      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
        if (isTemplateMode) await fetchTemplates();
        else await fetchProjectDrawings(activeProjectName);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateDrawingRow = async (item: DrawingItem, patch: Partial<DrawingItem>) => {
    if (!activeProjectName) return false;
    const payload = buildPayload(item, patch);

    const res = await fetch(
      `/api/drawings?project=${encodeURIComponent(activeProjectName)}&rowIndex=${item.rowIndex}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    return res.ok;
  };

  const handleMarkWorkStep = async (item: DrawingItem) => {
    if (!activeProjectName) return;
    const today = getTodayIsoDate();
    let actualStartDate = item.actualStartDate || '';
    let actualEndDate = item.actualEndDate || '';

    if (!actualStartDate) {
      actualStartDate = today;
    } else if (!actualEndDate) {
      actualEndDate = today;
    } else {
      return;
    }

    setSavingRowId(item.id);
    try {
      const ok = await updateDrawingRow(item, { actualStartDate, actualEndDate });
      if (ok) await fetchProjectDrawings(activeProjectName);
      else alert('Failed to save work dates.');
    } catch (err) {
      console.error(err);
      alert('Error saving work dates.');
    } finally {
      setSavingRowId(null);
    }
  };

  const updatePlanDraft = (item: DrawingItem, field: 'startDate' | 'endDate', value: string) => {
    const key = String(item.rowIndex);
    setPlanDrafts((prev) => {
      const current = prev[key] ?? {
        startDate: item.plannedStartDate || '',
        endDate: item.plannedEndDate || '',
      };
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const savePlanDates = async (item: DrawingItem) => {
    const key = String(item.rowIndex);
    const draft = planDrafts[key];
    if (!draft?.startDate?.trim() || !draft?.endDate?.trim()) return;

    setSavingRowId(item.id);
    try {
      const ok = await updateDrawingRow(item, {
        plannedStartDate: draft.startDate,
        plannedEndDate: draft.endDate,
      });
      if (ok) {
        setPlanDrafts((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        await fetchProjectDrawings(activeProjectName);
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

  const handleApplyUpdate = async () => {
    if (!updatingItem || !activeProjectName) return;

    setSubmitting(true);
    try {
      let fileUrl = updatingItem.drawingImage || '';
      const original = projectDrawings.find((d) => d.rowIndex === updatingItem.rowIndex) || updatingItem;

      if (stagedFile) {
        const formData = new FormData();
        formData.append('files', stagedFile);
        formData.append('folderId', CONFIG.DRAWING_SCHEDULE.FOLDER_ID);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('File upload failed');

        const uploadData = await uploadRes.json();
        const urlData = uploadData.files[0].url;
        fileUrl = typeof urlData === 'string'
          ? urlData
          : (urlData.webViewLink || urlData.webContentLink || '');
      }

      const imageChanged = Boolean(stagedFile);

      let newRev = parseInt(updatingItem.revisionNo || '0', 10);
      if (imageChanged) {
        newRev += 1;
      }

      const ok = await updateDrawingRow(original, {
        drawingImage: fileUrl,
        revisionNo: String(newRev),
      });

      if (!ok) throw new Error('Failed to save drawing update');

      await fetchProjectDrawings(activeProjectName);
      setIsUpdateModalOpen(false);
      setUpdatingItem(null);
      setStagedFile(null);
    } catch (err) {
      console.error(err);
      alert(`Error applying changes: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const showInstallGate =
    isProjectMode &&
    Boolean(activeProjectName) &&
    installed === false;

  const showNoProject = isProjectMode && !activeProjectName;

  const allZoneOptions = useMemo(() => {
    const set = new Set([
      ...templates.map((t) => t.zone).filter(Boolean),
      ...projectDrawings.map((t) => t.zone).filter(Boolean),
    ]);
    return sortZones(Array.from(set));
  }, [templates, projectDrawings]);

  const allCategoryOptions = useMemo(() => {
    const set = new Set([
      ...templates.map((t) => t.category).filter(Boolean),
      ...projectDrawings.map((t) => t.category).filter(Boolean),
    ]);
    return sortCategories(Array.from(set));
  }, [templates, projectDrawings]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Drawing Schedule</h2>
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
            <span className="current">Drawing Schedule</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.modeSwitch} role="tablist" aria-label="Drawing mode">
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
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search drawings..."
                value={searchItemName}
                onChange={(e) => setSearchItemName(e.target.value)}
              />
            </div>
          )}
          {(isTemplateMode || (isProjectMode && installed && activeProjectName)) && (
            <button className={styles.addButton} onClick={openAddModal}>
              <Plus size={18} />
              {isTemplateMode ? 'Add Template Drawing' : 'Add Project Drawing'}
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
          <p>Open a project from the portfolio, then install or view its drawing schedule.</p>
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
              <h3>{installing ? 'Installing drawings…' : 'Install Drawings'}</h3>
              <p>
                Set up the drawing sheet for <strong>{activeProjectName}</strong>.
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
                      <strong>{sourcePreview.drawingCount}</strong> drawings
                    </span>
                    <span className={styles.installStatDot} />
                    <span className={styles.installStat}>
                      <strong>{sourcePreview.zones}</strong> zones
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
                disabled={installing || previewLoading || (sourcePreview?.drawingCount === 0)}
              >
                <Download size={18} /> Install Drawings
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
            <div className={styles.zoneSidebar}>
              <h3 className={styles.sidebarTitle}>Zones</h3>
              <div className={styles.sidebarList}>
                {zones.map((zone) => {
                  const missing = zoneHasMissingPlans(zone);
                  return (
                    <button
                      key={zone}
                      className={`${styles.sidebarItem} ${activeZone === zone ? styles.active : ''}`}
                      onClick={() => {
                        setSelectedZone(zone);
                        setSelectedCategory(null);
                      }}
                    >
                      <MapPin size={16} style={{ marginRight: 8, flexShrink: 0 }} />
                      <span className={styles.sidebarItemLabel}>{zone}</span>
                      {missing && (
                        <span className={styles.missingDateDot} aria-label="Planned dates not set" />
                      )}
                    </button>
                  );
                })}
                {zones.length === 0 && (
                  <p className={styles.emptySidebar}>No zones found.</p>
                )}
              </div>
            </div>

            <div className={styles.categorySidebar}>
              <h3 className={styles.sidebarTitle}>Categories</h3>
              <div className={styles.sidebarList}>
                {categoriesInZone.map((cat) => {
                  const missing =
                    activeZone &&
                    isProjectMode &&
                    !categoryHasPlanDates(activeZone, cat);
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
                {categoriesInZone.length === 0 && (
                  <p className={styles.emptySidebar}>No categories in this zone.</p>
                )}
              </div>
            </div>
          </div>

          <div className={styles.templateContent}>
            {isTemplateMode && (
              <div className={styles.templatePlanHint}>
                <Settings size={16} />
                <span>
                  Polishing <strong>Template</strong> — add, edit, or delete master drawings. Future installs copy this structure.
                </span>
              </div>
            )}
            {isProjectMode && activeProjectName && (
              <div className={styles.templatePlanHint}>
                <Calendar size={16} />
                <span>
                  Polishing project sheet for <strong>{activeProjectName}</strong> — edit drawings and set Planned / Actual dates.
                </span>
              </div>
            )}

            {activeCategory && activeZone ? (
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
                      const missingDrawingPlan =
                        isProjectMode &&
                        (!item.plannedStartDate?.trim() || !item.plannedEndDate?.trim());
                      const hidePlanEditors = isPlanEditingHidden(item);

                      return (
                        <div
                          key={item.rowIndex}
                          className={`${styles.drawingCard} ${isProjectMode ? styles.drawingCardProject : ''}`}
                        >
                          <div className={styles.taskInfoCol}>
                            <div className={styles.taskTitleRow}>
                              <span className={styles.trackerIdBadge}>
                                {item.drawingNo || 'N/A'}
                              </span>
                              <strong className={styles.taskName}>{item.drawingName}</strong>
                              {isDoerMissing(item.doerName) && (
                                <span
                                  className={styles.missingDoerDot}
                                  title="Doer not assigned"
                                />
                              )}
                              {missingDrawingPlan && (
                                <span
                                  className={styles.missingDateDot}
                                  title="Planned dates not set"
                                />
                              )}
                            </div>
                            <div className={styles.taskMetaRow}>
                              <span className={styles.metaTag}>
                                <MapPin size={14} /> {item.zone || 'No Zone'}
                              </span>
                              <span className={styles.metaTag}>
                                <Grid size={14} /> {item.areaName || 'No Area'}
                              </span>
                              <span className={styles.metaTag}>
                                <User size={14} /> {item.resourceName || 'Unassigned'}
                              </span>
                              <span
                                className={`${styles.metaTag} ${styles.metaTagDoer}`}
                                title={`Doer: ${item.doerName || 'Unassigned'}`}
                              >
                                Doer: {item.doerName || 'Unassigned'}
                              </span>
                              {item.drawingImage?.trim() && (
                                <a
                                  href={item.drawingImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.viewDocLink}
                                >
                                  <FileText size={12} /> View Doc · R{item.revisionNo || '0'}
                                </a>
                              )}
                            </div>
                          </div>

                          {isProjectMode ? (
                            <div className={styles.scheduleRightCol}>
                              <div className={styles.datesCol}>
                                <div className={styles.dateGrid}>
                                  <span className={`${styles.dateCell} ${styles.dateCellPlan}`}>
                                    <strong>Plan Start:</strong>{' '}
                                    {displayDate(item.plannedStartDate)}
                                  </span>
                                  <span className={`${styles.dateCell} ${styles.dateCellPlan}`}>
                                    <strong>Plan End:</strong>{' '}
                                    {displayDate(item.plannedEndDate)}
                                  </span>
                                  <span className={`${styles.dateCell} ${styles.dateCellActual}`}>
                                    <strong>Actual Start:</strong>{' '}
                                    {displayDate(item.actualStartDate)}
                                  </span>
                                  <span className={`${styles.dateCell} ${styles.dateCellActual}`}>
                                    <strong>Actual End:</strong>{' '}
                                    {displayDate(item.actualEndDate)}
                                  </span>
                                </div>
                                {!hidePlanEditors && (
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
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  style={{ padding: '6px 10px', fontSize: '0.75rem', justifyContent: 'center', width: '100%' }}
                                  onClick={() => openUpdateModal(item)}
                                >
                                  <UploadCloud size={14} /> Update
                                </button>
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
                  No drawings found matching your filters.
                </p>
              )
            ) : (
              <div className={styles.emptyContentBox}>
                <p style={{ color: 'var(--text-light)' }}>
                  {isTemplateMode
                    ? 'Add drawings to the Template to get started.'
                    : 'No drawings in this project sheet yet.'}
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
            Are you sure you want to delete <strong>{itemToDelete?.drawingName}</strong>?
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
              ? 'Edit Template Drawing'
              : 'Edit Project Drawing'
            : isTemplateMode
              ? 'Add Template Drawing'
              : 'Add Project Drawing'
        }
        width="520px"
      >
        <form onSubmit={submitItem} className={`${styles.modalBody} ${styles.fixedOutlineForm}`}>
          <div className={styles.formGroup} data-has-value="true">
            <label className={styles.outlineLabel}>Zone</label>
            <input
              list="zone-list"
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              placeholder="e.g. Zone-1"
            />
            <datalist id="zone-list">
              {allZoneOptions.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </div>
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
              Drawing Name <span className={styles.requiredMark}>*</span>
            </label>
            <input
              type="text"
              required
              value={form.drawingName}
              onChange={(e) => setForm({ ...form, drawingName: e.target.value })}
              placeholder="Enter drawing name"
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

      {isUpdateModalOpen && updatingItem && (
        <div className={styles.bottomModalOverlay} onClick={() => setIsUpdateModalOpen(false)}>
          <div className={styles.bottomModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.bottomModalHeader}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.2rem' }}>
                  Update Drawing
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                  {updatingItem.drawingName}
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsUpdateModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.bottomModalBody}>
              <div className={styles.updateGrid}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Upload Revision</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div className={styles.revBadge} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                      Current Rev: R{updatingItem.revisionNo || '0'}
                    </div>
                    <label className={styles.secondaryButton} style={{ cursor: 'pointer', margin: 0 }}>
                      <UploadCloud size={16} /> Select File
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setStagedFile(file);
                        }}
                        accept="image/*,.pdf,.doc,.docx"
                      />
                    </label>
                    {stagedFile && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> {stagedFile.name} ready to upload
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.bottomModalFooter}>
              <button className={styles.cancelBtn} onClick={() => setIsUpdateModalOpen(false)}>
                Close
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleApplyUpdate}
                disabled={submitting}
              >
                {submitting ? 'Applying...' : 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
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
