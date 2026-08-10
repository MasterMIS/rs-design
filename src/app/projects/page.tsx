'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Briefcase, Users, MapPin, 
  Calendar, DollarSign, Filter, MoreVertical,
  CheckCircle, Clock, AlertTriangle, Building,
  User, Trash2, ArrowRight, ChevronRight, Globe,
  Home, Phone, Mail, FileText, Info, Edit2, ArrowLeft,
  ExternalLink, Layers, ShieldCheck, Activity, Tag,
  Layers3, Landmark, Contact, Map as MapIcon, Settings, BriefcaseBusiness,
  LayoutGrid, List, Eye, PenTool, Package
} from 'lucide-react';
import styles from './projects.module.css';
import Modal from '@/components/Modal';
import SearchableSelect from '@/components/SearchableSelect';
import GlobalLoading from '@/components/GlobalLoading';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { filterProjectsForUser } from '@/lib/project-access';
import { parseFlexibleDate } from '@/lib/em-access';
import {
  buildDrawingDoerTasksFromProjects,
  buildTrackerDoerTasksFromProjects,
  getDrawingProgressFromProjectSheets,
  getTrackerProgressFromProjectSheets,
  type DrawingProjectBundle,
  type TrackerProjectBundle,
} from '@/lib/schedule-merge';
import ProjectOverviewPanel from '@/components/ProjectOverviewPanel';

interface Project {
  id: string;
  rowIndex: number;
  basicInfo: any;
  clients: any[];
  sites: any[];
  team: any[];
  timeline: any;
  metadata: any;
}

function getActiveTeamNames(team: any[]): string {
  const names = (team || [])
    .filter((m) => m.isActive !== 'No' && m.name?.trim())
    .map((m) => m.name.trim());
  return names.length > 0 ? names.join(', ') : 'No team assigned';
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr?.trim()) return '—';
  const date = parseFlexibleDate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDaysRemaining(dateStr?: string): number | null {
  const date = parseFlexibleDate(dateStr);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { setActiveProject } = useProject();
  const { user } = useAuth();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{ name: string; status?: string; role?: string }[]>([]);
  const projects = useMemo(
    () => filterProjectsForUser<Project>(allProjects, user),
    [allProjects, user]
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [detailDrawingBundles, setDetailDrawingBundles] = useState<DrawingProjectBundle[]>([]);
  const [detailTrackerBundles, setDetailTrackerBundles] = useState<TrackerProjectBundle[]>([]);
  const [detailPendingApprovals, setDetailPendingApprovals] = useState(0);

  const projectTypeTabs = useMemo(() => {
    const typeCounts = new Map<string, { label: string; count: number }>();
    projects.forEach((project) => {
      const type = project.basicInfo?.type?.trim();
      if (!type) return;
      const key = type.toLowerCase();
      const existing = typeCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        typeCounts.set(key, { label: type, count: 1 });
      }
    });

    const priority = ['flat', 'villa', 'bunglow'];
    const entries = Array.from(typeCounts.values());
    const ordered = [
      ...priority
        .map((key) => entries.find((entry) => entry.label.toLowerCase() === key))
        .filter((entry): entry is { label: string; count: number } => !!entry),
      ...entries
        .filter((entry) => !priority.includes(entry.label.toLowerCase()))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];

    return ordered.map((entry) => ({
      type: entry.label,
      count: entry.count,
    }));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let result = projects;

    if (typeFilter !== 'All') {
      result = result.filter(
        (project) =>
          project.basicInfo?.type?.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return result;

    return result.filter((project) => {
      const teamNames = getActiveTeamNames(project.team).toLowerCase();
      return (
        project.basicInfo?.name?.toLowerCase().includes(query) ||
        project.basicInfo?.code?.toLowerCase().includes(query) ||
        project.id?.toLowerCase().includes(query) ||
        project.basicInfo?.type?.toLowerCase().includes(query) ||
        project.basicInfo?.status?.toLowerCase().includes(query) ||
        project.clients?.[0]?.name?.toLowerCase().includes(query) ||
        teamNames.includes(query)
      );
    });
  }, [projects, searchQuery, typeFilter]);
  
  // Dropdowns
  const projectTypes = ['Flat', 'Corporate Office', 'Retail Store', 'Bunglow', 'Apartment', 'Showroom', 'Factory', 'Warehouse', 'Hotels', 'Club House', 'Restaurent', 'Building'];
  const projectCategories = ['Full Interior', 'Renovation', 'Furniture Only', 'Consultancy', 'Architectural Design', 'Interior Cunsultancy', 'PMC', 'Turnky', 'Architecture', 'Contractual', 'Furniture Supply'];
  const projectStatuses = ['In Progress', 'On Hold', 'Completed', 'Cancelled', 'Quotation'];
  const clientTypes = ['Owner', 'Co-owner', 'Architect', 'Consultant', 'Contractor', 'Accounts', 'Purchase Team', 'Site Coordinator', 'Decision Maker', 'Vendor Reference'];
  const siteTypes = [...projectTypes];
  const memberRoles = ['Project Manager', 'Designer', 'Supervisor', 'Sales', '2D Designer', '3D Designer', 'Architect', 'MEP', 'PC', 'CRM', 'Project Head', 'Supervisor 1', 'Supervisor 2', 'Tech'];

  // Form State
  const [formData, setFormData] = useState({
    basicInfo: {
      name: '', code: '', type: 'Flat', category: 'Full Interior', status: 'In Progress', 
      priority: 'Medium', description: '', startDate: '', expectedEndDate: '', actualEndDate: '', 
      estimatedBudget: '', finalBudget: '', referenceSource: '', leadSource: '', notes: ''
    },
    clients: [{ type: 'Owner', name: '', company: '', mobile: '', altMobile: '', email: '', designation: '', gstNo: '', address: '', isPrimary: 'No', remarks: '' }],
    sites: [{ name: 'Main Site', type: 'Flat', address: '', city: '', state: '', pincode: '', googleLocation: '', area: '', floors: '', status: 'Active', startDate: '', endDate: '', possessionDate: '', supervisor: '', workingHours: '', accessNotes: '' }],
    team: [{ role: 'Project Manager', name: '', employeeId: '', responsibility: '', assignedDate: '', isActive: 'Yes' }]
  });

  const userOptions = useMemo(() => {
    const fromUsers = users
      .filter((u) => u.status !== 'Inactive' && u.role !== 'Client')
      .map((u) => u.name)
      .filter(Boolean);
    const fromTeam = formData.team.map((m) => m.name).filter(Boolean);
    return Array.from(new Set([...fromUsers, ...fromTeam])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [users, formData.team]);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    const saved = localStorage.getItem('projects_view_mode') as 'card' | 'table';
    if (saved === 'card' || saved === 'table') {
      setTimeout(() => {
        setViewMode(saved);
      }, 0);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    const saved = localStorage.getItem('projects_view_mode') as 'card' | 'table';
    if (saved === 'card' || saved === 'table') {
      setTimeout(() => {
        setViewMode(saved);
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (!viewingProject) {
      setDetailDrawingBundles([]);
      setDetailTrackerBundles([]);
      setDetailPendingApprovals(0);
      return;
    }

    const projectName = viewingProject.basicInfo?.name?.trim() || '';
    let cancelled = false;

    async function loadDetailMetrics() {
      try {
        const [drawingRes, trackerRes, quotationsRes] = await Promise.all([
          fetch('/api/drawings?all=1'),
          fetch('/api/pms-tracker?all=1'),
          fetch('/api/quotations'),
        ]);

        const drawings = drawingRes.ok ? await drawingRes.json() : [];
        const trackers = trackerRes.ok ? await trackerRes.json() : [];
        const quotations = quotationsRes.ok ? await quotationsRes.json() : [];

        if (cancelled) return;

        const drawingBundles = Array.isArray(drawings)
          ? (drawings as DrawingProjectBundle[]).filter(
              (b) => b.project?.trim().toLowerCase() === projectName.toLowerCase()
            )
          : [];
        const trackerBundles = Array.isArray(trackers)
          ? (trackers as TrackerProjectBundle[]).filter(
              (b) => b.project?.trim().toLowerCase() === projectName.toLowerCase()
            )
          : [];

        setDetailDrawingBundles(drawingBundles);
        setDetailTrackerBundles(trackerBundles);

        const pending = (Array.isArray(quotations) ? quotations : []).filter((q: any) => {
          const matches =
            q.project?.trim().toLowerCase() === projectName.toLowerCase();
          if (!matches) return false;
          const rs = (q.statusRSDesign || 'Pending').trim();
          const client = (q.statusClient || 'Pending').trim();
          return rs === 'Pending' || client === 'Pending';
        }).length;
        setDetailPendingApprovals(pending);
      } catch (err) {
        console.error('Failed to load project overview metrics', err);
        if (!cancelled) {
          setDetailDrawingBundles([]);
          setDetailTrackerBundles([]);
          setDetailPendingApprovals(0);
        }
      }
    }

    loadDetailMetrics();
    return () => {
      cancelled = true;
    };
  }, [viewingProject]);

  const projectOverview = useMemo(() => {
    if (!viewingProject) return null;

    const projectName = viewingProject.basicInfo?.name?.trim() || '';
    const names = [projectName];
    const drawingProgress = getDrawingProgressFromProjectSheets(
      detailDrawingBundles,
      names
    );
    const trackerProgress = getTrackerProgressFromProjectSheets(
      detailTrackerBundles,
      names
    );

    const hasDrawing = drawingProgress.total > 0;
    const hasTracker = trackerProgress.total > 0;
    const avgProgress =
      hasDrawing && hasTracker
        ? Math.round((drawingProgress.percent + trackerProgress.percent) / 2)
        : hasDrawing
          ? drawingProgress.percent
          : hasTracker
            ? trackerProgress.percent
            : 0;

    const drawingTasks = buildDrawingDoerTasksFromProjects(
      detailDrawingBundles,
      names
    );
    const trackerTasks = buildTrackerDoerTasksFromProjects(
      detailTrackerBundles,
      names
    );
    const today = startOfDay(new Date());

    let overdueCount = 0;
    let dueTodayCount = 0;
    let currentWorkTitle = 'No active work';
    let currentWorkDetail = 'No in-progress drawing or tracker tasks.';
    let nextMilestoneTitle = 'No upcoming milestone';
    let nextMilestoneDue = '—';
    let nextDueMs = Number.POSITIVE_INFINITY;

    const considerTask = (task: {
      actualStartDate?: string;
      actualEndDate?: string;
      planStartDate?: string;
      planEndDate?: string;
      drawingName?: string;
      taskName?: string;
      category?: string;
      completed?: boolean;
    }) => {
      if (task.actualEndDate?.trim() || task.completed) return;

      const due =
        parseFlexibleDate(task.planEndDate) ||
        parseFlexibleDate(task.planStartDate);
      if (due) {
        const dueDay = startOfDay(due);
        if (dueDay.getTime() < today.getTime()) overdueCount += 1;
        else if (dueDay.getTime() === today.getTime()) dueTodayCount += 1;
        else if (dueDay.getTime() < nextDueMs) {
          nextDueMs = dueDay.getTime();
          nextMilestoneTitle =
            task.drawingName ||
            task.taskName ||
            task.category ||
            'Upcoming task';
          nextMilestoneDue = formatDisplayDate(
            task.planEndDate || task.planStartDate
          );
        }
      }

      if (
        currentWorkTitle === 'No active work' &&
        task.actualStartDate?.trim() &&
        !task.actualEndDate?.trim()
      ) {
        currentWorkTitle =
          task.drawingName || task.taskName || task.category || 'In progress';
        currentWorkDetail = task.category
          ? `${task.category} in progress`
          : 'Work currently underway';
      }
    };

    drawingTasks.forEach(considerTask);
    trackerTasks.forEach(considerTask);

    const healthLabel =
      overdueCount > 0 ? 'Delayed' : dueTodayCount > 0 ? 'At Risk' : 'On Track';

    const site = viewingProject.sites?.[0];
    const locationParts = [site?.city, site?.state].filter(Boolean);
    const locationLabel = locationParts.join(', ');

    const status = viewingProject.basicInfo?.status || 'In Progress';
    const progressStatusLabel =
      status === 'Completed'
        ? 'Completed'
        : avgProgress > 0
          ? 'In Progress'
          : status;

    return {
      name: projectName || 'Untitled Project',
      locationLabel,
      category: viewingProject.basicInfo?.category || '',
      lastUpdated: formatDisplayDate(
        viewingProject.metadata?.createdAt || viewingProject.basicInfo?.startDate
      ),
      progressPercent: avgProgress,
      progressStatusLabel,
      targetCompletion: formatDisplayDate(
        viewingProject.basicInfo?.expectedEndDate
      ),
      daysRemaining: getDaysRemaining(viewingProject.basicInfo?.expectedEndDate),
      healthLabel: healthLabel as 'On Track' | 'At Risk' | 'Delayed',
      pendingApprovals: detailPendingApprovals,
      currentWorkTitle,
      currentWorkDetail,
      nextMilestoneTitle,
      nextMilestoneDue,
    };
  }, [
    viewingProject,
    detailDrawingBundles,
    detailTrackerBundles,
    detailPendingApprovals,
  ]);

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('projects_view_mode', mode);
  };

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  }

  async function fetchProjects() {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      const data = await res.json();
      setAllProjects(data);
      // Auto-open project detail if navigating back from a module page
      const pendingId = localStorage.getItem('pending_view_project_id');
      if (pendingId) {
        localStorage.removeItem('pending_view_project_id');
        const visible = filterProjectsForUser<Project>(data, user);
        const found = visible.find((p) => p.id === pendingId);
        if (found) setViewingProject(found);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateNew = () => {
    resetForm();
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      basicInfo: { ...project.basicInfo },
      clients: [...project.clients],
      sites: [...project.sites],
      team: [...project.team]
    });
    // Use a small timeout to ensure state settles if needed, though usually not required
    setIsModalOpen(true);
  };

  const confirmDelete = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/projects?id=${projectToDelete.id}&rowIndex=${projectToDelete.rowIndex}`, { method: 'DELETE' });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setViewingProject(null);
        fetchProjects();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setActionLoading(false);
      setProjectToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const url = editingProject 
        ? `/api/projects?id=${editingProject.id}&rowIndex=${editingProject.rowIndex}` 
        : '/api/projects';
      
      const res = await fetch(url, {
        method: editingProject ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProject ? { ...formData, metadata: editingProject.metadata } : formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchProjects();
        resetForm();
        if (editingProject && viewingProject?.id === editingProject.id) {
           const updatedRes = await fetch('/api/projects');
           const updatedData = await updatedRes.json();
           const refreshed = updatedData.find((p: Project) => p.id === editingProject.id);
           if (refreshed) setViewingProject(refreshed);
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      basicInfo: { name: '', code: '', type: 'Flat', category: 'Full Interior', status: 'In Progress', priority: 'Medium', description: '', startDate: '', expectedEndDate: '', actualEndDate: '', estimatedBudget: '', finalBudget: '', referenceSource: '', leadSource: '', notes: '' },
      clients: [{ type: 'Owner', name: '', company: '', mobile: '', altMobile: '', email: '', designation: '', gstNo: '', address: '', isPrimary: 'No', remarks: '' }],
      sites: [{ name: 'Main Site', type: 'Flat', address: '', city: '', state: '', pincode: '', googleLocation: '', area: '', floors: '', status: 'Active', startDate: '', endDate: '', possessionDate: '', supervisor: '', workingHours: '', accessNotes: '' }],
      team: [{ role: 'Project Manager', name: '', employeeId: '', responsibility: '', assignedDate: '', isActive: 'Yes' }]
    });
    setActiveTab('basic');
  };

  const addRow = (section: 'clients' | 'sites' | 'team') => {
    const newRow = section === 'clients' ? { type: 'Owner', name: '', company: '', mobile: '', altMobile: '', email: '', designation: '', gstNo: '', address: '', isPrimary: 'No', remarks: '' } :
                   section === 'sites' ? { name: '', type: 'Flat', address: '', city: '', state: '', pincode: '', googleLocation: '', area: '', floors: '', status: 'Active', startDate: '', endDate: '', possessionDate: '', supervisor: '', workingHours: '', accessNotes: '' } :
                   { role: '', name: '', employeeId: '', responsibility: '', assignedDate: '', isActive: 'Yes' };
    setFormData({ ...formData, [section]: [...formData[section], newRow] });
  };

  const removeRow = (section: 'clients' | 'sites' | 'team', index: number) => {
    const updated = formData[section].filter((_, i) => i !== index);
    setFormData({ ...formData, [section]: updated });
  };

  const updateSection = (section: string, idx: number, field: string, val: any) => {
    const newData: any = { ...formData };
    newData[section][idx][field] = val;
    setFormData(newData);
  };

  const navigateToModule = (path: string) => {
    if (viewingProject) {
      setActiveProject({ id: viewingProject.id, name: viewingProject.basicInfo.name });
      router.push(path);
    }
  };

  if (viewingProject) {
    return (
      <div className={styles.detailContainer}>
        <div className={styles.header} style={{ marginBottom: '16px' }}>
          <div className={styles.titleSection}>
            <h2>Project Portfolio</h2>
            <div className="breadcrumbNav">
              <Link href="/">Dashboard</Link>
              <span className="separator">&gt;</span>
              <span onClick={() => setViewingProject(null)} style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}>Project Portfolio</span>
              <span className="separator">&gt;</span>
              <span className="current">{viewingProject.basicInfo.name}</span>
            </div>
          </div>
          <div className={styles.detailActions}>
            <button className={styles.editBtnDetail} onClick={() => handleEdit(viewingProject)}>
              <Edit2 size={18} /> Edit Project
            </button>
            <button className={styles.deleteBtnTop} onClick={() => confirmDelete(viewingProject)}>
              <Trash2 size={18} /> Delete Project
            </button>
          </div>
        </div>

        <div className={styles.detailContent}>
          {projectOverview ? <ProjectOverviewPanel data={projectOverview} /> : null}
          
          <div className={styles.descriptionSection}>
            <div className={styles.cardHeaderSmall}><FileText size={18} /> Project Description</div>
            <p>{viewingProject.basicInfo.description || 'No description provided.'}</p>
          </div>

          <div className={styles.modulesSection}>
            <div className={styles.cardHeaderSmall}><LayoutGrid size={18} /> Jump to Module</div>
            <div className={styles.modulesGrid}>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/site-visits')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: '#fff', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.3)' }}>
                  <MapPin size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Site Visits</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/requirements')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#fff', boxShadow: '0 8px 20px rgba(217, 119, 6, 0.3)' }}>
                  <Briefcase size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Requirements</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/selections')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #34d399, #059669)', color: '#fff', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.3)' }}>
                  <Layers size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Selections</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/documents')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #fb7185, #e11d48)', color: '#fff', boxShadow: '0 8px 20px rgba(225, 29, 72, 0.3)' }}>
                  <FileText size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Documents</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/mom')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #c084fc, #7e22ce)', color: '#fff', boxShadow: '0 8px 20px rgba(126, 34, 206, 0.3)' }}>
                  <Calendar size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Meetings (MoM)</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/directory')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #2dd4bf, #0f766e)', color: '#fff', boxShadow: '0 8px 20px rgba(15, 118, 110, 0.3)' }}>
                  <Contact size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Directory</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/quotations')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #f472b6, #be185d)', color: '#fff', boxShadow: '0 8px 20px rgba(190, 24, 93, 0.3)' }}>
                  <DollarSign size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Quotations</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/audits')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #a3e635, #4d7c0f)', color: '#fff', boxShadow: '0 8px 20px rgba(77, 124, 15, 0.3)' }}>
                  <ShieldCheck size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Audits & Inspections</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/checklists')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #818cf8, #4338ca)', color: '#fff', boxShadow: '0 8px 20px rgba(67, 56, 202, 0.3)' }}>
                  <CheckCircle size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Checklists</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/deficiencies')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #f87171, #b91c1c)', color: '#fff', boxShadow: '0 8px 20px rgba(185, 28, 28, 0.3)' }}>
                  <AlertTriangle size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Snags / Deficiencies</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/drawings')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #8b5cf6, #5b21b6)', color: '#fff', boxShadow: '0 8px 20px rgba(91, 33, 182, 0.3)' }}>
                  <PenTool size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Drawing Schedule</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/pms-tracker')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)', color: '#fff', boxShadow: '0 8px 20px rgba(180, 83, 9, 0.3)' }}>
                  <Activity size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>PMS Tracker</span>
              </button>
              <button className={styles.moduleTile} onClick={() => navigateToModule('/inventory')}>
                <div className={styles.moduleIconWrapper} style={{ background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', boxShadow: '0 8px 20px rgba(4, 120, 87, 0.3)' }}>
                  <Package size={28} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', letterSpacing: '0.3px' }}>Inventory</span>
              </button>
            </div>
          </div>
        </div>

        {/* Custom Confirmation Modal */}
        <Modal 
          isOpen={isDeleteModalOpen} 
          onClose={() => setIsDeleteModalOpen(false)} 
          title="Confirm Deletion"
          type="danger"
          width="450px"
        >
          <div className={styles.deleteConfirmBody}>
            <p>Are you sure you want to delete <strong>{projectToDelete?.basicInfo.name}</strong>?</p>
            <p className={styles.warningSub}>This action cannot be undone and all project data will be permanently removed.</p>
            <div className={styles.deleteActions}>
              <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className={styles.confirmDeleteBtn} onClick={handleDelete}>Yes, Delete Project</button>
            </div>
          </div>
        </Modal>

        {/* Pre-filled Edit Modal (Logic kept separate to avoid conflicts) */}
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={editingProject ? 'Edit Project Details' : 'Create New Project'}
          width="1000px"
        >
          <div className={styles.tabHeader}>
            <button className={`${styles.tabBtn} ${activeTab === 'basic' ? styles.activeTab : ''}`} onClick={() => setActiveTab('basic')}><Landmark size={16} /> Basic Details</button>
            <button className={`${styles.tabBtn} ${activeTab === 'clients' ? styles.activeTab : ''}`} onClick={() => setActiveTab('clients')}><Contact size={16} /> Clients ({formData.clients.length})</button>
            <button className={`${styles.tabBtn} ${activeTab === 'sites' ? styles.activeTab : ''}`} onClick={() => setActiveTab('sites')}><MapIcon size={16} /> Sites ({formData.sites.length})</button>
            <button className={`${styles.tabBtn} ${activeTab === 'team' ? styles.activeTab : ''}`} onClick={() => setActiveTab('team')}><BriefcaseBusiness size={16} /> Internal Team</button>
          </div>

          <form onSubmit={handleSubmit} className={styles.outlineForm}>
            {activeTab === 'basic' && (
              <div className={styles.formSection}>
                <div className={styles.gridForm}>
                  <div className={styles.formGroup}>
                    <label><Briefcase size={14} className={styles.labelIcon} /> Project Name</label>
                    <input type="text" required value={formData.basicInfo.name} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, name: e.target.value}})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label><Layers3 size={14} className={styles.labelIcon} /> Project Type</label>
                    <select value={formData.basicInfo.type} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, type: e.target.value}})}>
                      {projectTypes.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label><Settings size={14} className={styles.labelIcon} /> Category</label>
                    <select value={formData.basicInfo.category} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, category: e.target.value}})}>
                      {projectCategories.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label><Activity size={14} className={styles.labelIcon} /> Status</label>
                    <select value={formData.basicInfo.status} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, status: e.target.value}})}>
                      {projectStatuses.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}><label><Calendar size={14} className={styles.labelIcon} /> Start Date</label><input type="date" value={formData.basicInfo.startDate} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, startDate: e.target.value}})} /></div>
                  <div className={styles.formGroup}><label><Calendar size={14} className={styles.labelIcon} /> Expected Completion</label><input type="date" value={formData.basicInfo.expectedEndDate} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, expectedEndDate: e.target.value}})} /></div>
                  <div className={styles.formGroup}><label><DollarSign size={14} className={styles.labelIcon} /> Estimated Budget</label><input type="number" value={formData.basicInfo.estimatedBudget} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, estimatedBudget: e.target.value}})} /></div>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}><label><FileText size={14} className={styles.labelIcon} /> Description</label><textarea value={formData.basicInfo.description} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, description: e.target.value}})} /></div>
                </div>
              </div>
            )}

            {activeTab === 'clients' && (
              <div className={styles.dynamicRows}>
                {formData.clients.map((client, idx) => (
                  <div key={idx} className={styles.rowItem}>
                    <div className={styles.rowHeader}><h4>Client {idx + 1}</h4>{formData.clients.length > 1 && <button type="button" onClick={() => removeRow('clients', idx)} className={styles.removeBtn}><Trash2 size={16} /></button>}</div>
                    <div className={styles.gridForm}>
                      <div className={styles.formGroup}><label><Info size={14} className={styles.labelIcon} /> Type</label><select value={client.type} onChange={(e) => updateSection('clients', idx, 'type', e.target.value)}>{clientTypes.map(t => <option key={t}>{t}</option>)}</select></div>
                      <div className={styles.formGroup}><label><User size={14} className={styles.labelIcon} /> Name</label><input type="text" value={client.name} onChange={(e) => updateSection('clients', idx, 'name', e.target.value)} /></div>
                      <div className={styles.formGroup}><label><Building size={14} className={styles.labelIcon} /> Company</label><input type="text" value={client.company} onChange={(e) => updateSection('clients', idx, 'company', e.target.value)} /></div>
                      <div className={styles.formGroup}><label><Phone size={14} className={styles.labelIcon} /> Mobile</label><input type="tel" value={client.mobile} onChange={(e) => updateSection('clients', idx, 'mobile', e.target.value)} /></div>
                      <div className={styles.formGroup}><label><Mail size={14} className={styles.labelIcon} /> Email</label><input type="email" value={client.email} onChange={(e) => updateSection('clients', idx, 'email', e.target.value)} /></div>
                      <div className={styles.formGroup} data-has-value="true">
                        <label><CheckCircle size={14} className={styles.labelIcon} /> Primary?</label>
                        <div style={{ padding: '9px 14px', border: '2px solid #cbd5e1', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div 
                              style={{ 
                                width: '46px', height: '24px', backgroundColor: client.isPrimary === 'Yes' ? 'var(--primary)' : '#cbd5e1', 
                                borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' 
                              }} 
                              onClick={() => updateSection('clients', idx, 'isPrimary', client.isPrimary === 'Yes' ? 'No' : 'Yes')}
                            >
                              <div style={{
                                width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%',
                                position: 'absolute', top: '2px', left: client.isPrimary === 'Yes' ? '24px' : '2px',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                              }} />
                            </div>
                            <span style={{ marginLeft: '12px', fontSize: '14px', fontWeight: 500, color: client.isPrimary === 'Yes' ? 'var(--primary)' : '#64748b' }}>
                              {client.isPrimary === 'Yes' ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles.formGroup} ${styles.fullWidth}`}><label><MapPin size={14} className={styles.labelIcon} /> Address</label><textarea value={client.address} onChange={(e) => updateSection('clients', idx, 'address', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <button type="button" className={styles.addRowBtn} onClick={() => addRow('clients')}><Plus size={16} /> Add Another Client</button>
              </div>
            )}

            {activeTab === 'sites' && (
              <div className={styles.dynamicRows}>
                {formData.sites.map((site, idx) => (
                  <div key={idx} className={styles.rowItem}>
                    <div className={styles.rowHeader}><h4>Site {idx + 1}</h4>{formData.sites.length > 1 && <button type="button" onClick={() => removeRow('sites', idx)} className={styles.removeBtn}><Trash2 size={16} /></button>}</div>
                    <div className={styles.gridForm}>
                      <div className={styles.formGroup}><label><MapPin size={14} className={styles.labelIcon} /> Name</label><input type="text" value={site.name} onChange={(e) => updateSection('sites', idx, 'name', e.target.value)} /></div>
                      <div className={styles.formGroup}><label><Home size={14} className={styles.labelIcon} /> Type</label><select value={site.type} onChange={(e) => updateSection('sites', idx, 'type', e.target.value)}>{siteTypes.map(t => <option key={t}>{t}</option>)}</select></div>
                      <div className={styles.formGroup}><label><Layers size={14} className={styles.labelIcon} /> Area (Sqft)</label><input type="number" value={site.area} onChange={(e) => updateSection('sites', idx, 'area', e.target.value)} /></div>
                      <div className={styles.formGroup}><label><Globe size={14} className={styles.labelIcon} /> City</label><input type="text" value={site.city} onChange={(e) => updateSection('sites', idx, 'city', e.target.value)} /></div>
                      <div className={`${styles.formGroup} ${styles.fullWidth}`}><label><MapIcon size={14} className={styles.labelIcon} /> Site Address</label><textarea value={site.address} onChange={(e) => updateSection('sites', idx, 'address', e.target.value)} /></div>
                      <div className={`${styles.formGroup} ${styles.fullWidth}`}><label><ExternalLink size={14} className={styles.labelIcon} /> Map URL</label><input type="url" value={site.googleLocation} onChange={(e) => updateSection('sites', idx, 'googleLocation', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <button type="button" className={styles.addRowBtn} onClick={() => addRow('sites')}><Plus size={16} /> Add Another Site</button>
              </div>
            )}

            {activeTab === 'team' && (
              <div className={styles.dynamicRows}>
                {formData.team.map((member, idx) => (
                  <div key={idx} className={styles.rowItem}>
                    <div className={styles.rowHeader}><h4>Member {idx + 1}</h4>{formData.team.length > 1 && <button type="button" onClick={() => removeRow('team', idx)} className={styles.removeBtn}><Trash2 size={16} /></button>}</div>
                    <div className={styles.gridForm}>
                      <div className={styles.formGroup}><label><ShieldCheck size={14} className={styles.labelIcon} /> Role</label><select value={member.role} onChange={(e) => updateSection('team', idx, 'role', e.target.value)}>{memberRoles.map(r => <option key={r}>{r}</option>)}</select></div>
                      <div className={styles.formGroup}>
                        <label><User size={14} className={styles.labelIcon} /> Name</label>
                        <SearchableSelect
                          value={member.name}
                          onChange={(val) => updateSection('team', idx, 'name', val)}
                          options={userOptions}
                          placeholder="Select User"
                          icon={<User size={14} />}
                        />
                      </div>
                      <div className={styles.formGroup}><label><Calendar size={14} className={styles.labelIcon} /> Assigned Date</label><input type="date" value={member.assignedDate} onChange={(e) => updateSection('team', idx, 'assignedDate', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <button type="button" className={styles.addRowBtn} onClick={() => addRow('team')}><Plus size={16} /> Assign Member</button>
              </div>
            )}

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
              {activeTab !== 'team' ? (
                <button type="button" className={styles.submitBtn} onClick={() => {
                  const tabs = ['basic', 'clients', 'sites', 'team'];
                  setActiveTab(tabs[tabs.indexOf(activeTab) + 1]);
                }}>Next Section <ChevronRight size={16} /></button>
              ) : <button type="submit" className={styles.submitBtn}>{editingProject ? 'Update Project' : 'Save Project'}</button>}
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className={styles.projectsContainer}>
      <GlobalLoading show={actionLoading} text="Saving Project..." />
      
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Project Portfolio</h2>
          <div className="breadcrumbNav" style={{ marginBottom: '4px' }}>
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <span className="current">Project Portfolio</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchContainer}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.viewToggleGroup}>
            <button 
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'card' ? styles.activeView : ''}`}
              onClick={() => handleViewModeChange('card')}
              title="Card View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.activeView : ''}`}
              onClick={() => handleViewModeChange('table')}
              title="Table View"
            >
              <List size={18} />
            </button>
          </div>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      <div className={styles.typeFilterRow}>
        <button
          type="button"
          className={`${styles.typeFilterTab} ${typeFilter === 'All' ? styles.typeFilterTabActive : ''}`}
          onClick={() => setTypeFilter('All')}
        >
          All ({projects.length})
        </button>
        {projectTypeTabs.map(({ type, count }) => (
          <button
            key={type}
            type="button"
            className={`${styles.typeFilterTab} ${typeFilter.toLowerCase() === type.toLowerCase() ? styles.typeFilterTabActive : ''}`}
            onClick={() => setTypeFilter(type)}
          >
            {type} ({count})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>
            {searchQuery.trim() || typeFilter !== 'All'
              ? 'No projects match your filters.'
              : 'No projects found.'}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className={styles.projectGrid}>
          {filteredProjects.map((project) => (
            <div key={project.id} className={styles.projectCard}>
              <div className={styles.cardTop}>
                <div className={styles.cardHeader}>
                  <span className={styles.projectBadge}>{project.basicInfo.type}</span>
                  <span className={styles.projectCode}>{project.basicInfo.code || project.id}</span>
                </div>
                <h3>{project.basicInfo.name}</h3>
                
                <div className={styles.progressWrapper}>
                  <div className={styles.progressHeader}>
                    <span>Progress</span>
                    <span>{project.metadata?.completion || 0}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${project.metadata?.completion || 0}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className={styles.cardDetails}>
                <div className={styles.detailItem}>
                  <User size={14} />
                  <span>{project.clients[0]?.name || 'N/A'}</span>
                </div>
                <div className={styles.detailItem}>
                  <Users size={14} />
                  <span>{getActiveTeamNames(project.team)}</span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.teamAvatars}>
                  <Users size={16} color="#94a3b8" />
                  <span className={styles.teamCount}>{project.team.length} Members</span>
                </div>
                <button className={styles.viewBtn} onClick={() => setViewingProject(project)}>Manage Project</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.projectTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Project</th>
                <th>Type</th>
                <th>Progress</th>
                <th>Client</th>
                <th>Internal Team</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button 
                        className={styles.tableActionBtn} 
                        onClick={() => setViewingProject(project)} 
                        title="Manage Project"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className={styles.tableActionBtn} 
                        onClick={() => handleEdit(project)} 
                        title="Edit Project"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className={`${styles.tableActionBtn} ${styles.deleteBtn}`} 
                        onClick={() => confirmDelete(project)} 
                        title="Delete Project"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={styles.tableProjectName}>{project.basicInfo.name}</span>
                    <span className={styles.tableProjectCode}>{project.basicInfo.code || project.id}</span>
                  </td>
                  <td>
                    <span className={styles.tableBadge}>{project.basicInfo.type}</span>
                  </td>
                  <td>
                    <div className={styles.tableProgressWrapper}>
                      <div className={styles.tableProgressHeader}>
                        <span>{project.metadata?.completion || 0}%</span>
                      </div>
                      <div className={styles.tableProgressBar}>
                        <div 
                          className={styles.tableProgressFill} 
                          style={{ width: `${project.metadata?.completion || 0}%` }} 
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.tableMetaCell}>
                      <User size={14} />
                      <span>{project.clients[0]?.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.tableMetaCell}>
                      <Users size={14} />
                      <span>{getActiveTeamNames(project.team)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Main Creation Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProject ? 'Edit Project Details' : 'Create New Project'}
        width="1000px"
      >
        <div className={styles.tabHeader}>
          <button className={`${styles.tabBtn} ${activeTab === 'basic' ? styles.activeTab : ''}`} onClick={() => setActiveTab('basic')}><Landmark size={16} /> Basic Details</button>
          <button className={`${styles.tabBtn} ${activeTab === 'clients' ? styles.activeTab : ''}`} onClick={() => setActiveTab('clients')}><Contact size={16} /> Clients ({formData.clients.length})</button>
          <button className={`${styles.tabBtn} ${activeTab === 'sites' ? styles.activeTab : ''}`} onClick={() => setActiveTab('sites')}><MapIcon size={16} /> Sites ({formData.sites.length})</button>
          <button className={`${styles.tabBtn} ${activeTab === 'team' ? styles.activeTab : ''}`} onClick={() => setActiveTab('team')}><BriefcaseBusiness size={16} /> Internal Team</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.outlineForm}>
          {activeTab === 'basic' && (
            <div className={styles.formSection}>
              <div className={styles.gridForm}>
                <div className={styles.formGroup}>
                  <label><Briefcase size={14} className={styles.labelIcon} /> Project Name</label>
                  <input type="text" required value={formData.basicInfo.name} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, name: e.target.value}})} />
                </div>
                <div className={styles.formGroup}>
                  <label><Layers3 size={14} className={styles.labelIcon} /> Project Type</label>
                  <select value={formData.basicInfo.type} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, type: e.target.value}})}>
                    {projectTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label><Settings size={14} className={styles.labelIcon} /> Category</label>
                  <select value={formData.basicInfo.category} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, category: e.target.value}})}>
                    {projectCategories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label><Activity size={14} className={styles.labelIcon} /> Status</label>
                  <select value={formData.basicInfo.status} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, status: e.target.value}})}>
                    {projectStatuses.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}><label><Calendar size={14} className={styles.labelIcon} /> Start Date</label><input type="date" value={formData.basicInfo.startDate} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, startDate: e.target.value}})} /></div>
                <div className={styles.formGroup}><label><Calendar size={14} className={styles.labelIcon} /> Expected Completion</label><input type="date" value={formData.basicInfo.expectedEndDate} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, expectedEndDate: e.target.value}})} /></div>
                <div className={styles.formGroup}><label><DollarSign size={14} className={styles.labelIcon} /> Estimated Budget</label><input type="number" value={formData.basicInfo.estimatedBudget} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, estimatedBudget: e.target.value}})} /></div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}><label><FileText size={14} className={styles.labelIcon} /> Description</label><textarea value={formData.basicInfo.description} onChange={(e) => setFormData({...formData, basicInfo: {...formData.basicInfo, description: e.target.value}})} /></div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className={styles.dynamicRows}>
              {formData.clients.map((client, idx) => (
                <div key={idx} className={styles.rowItem}>
                  <div className={styles.rowHeader}><h4>Client {idx + 1}</h4>{formData.clients.length > 1 && <button type="button" onClick={() => removeRow('clients', idx)} className={styles.removeBtn}><Trash2 size={16} /></button>}</div>
                  <div className={styles.gridForm}>
                    <div className={styles.formGroup}><label><Info size={14} className={styles.labelIcon} /> Type</label><select value={client.type} onChange={(e) => updateSection('clients', idx, 'type', e.target.value)}>{clientTypes.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className={styles.formGroup}><label><User size={14} className={styles.labelIcon} /> Name</label><input type="text" value={client.name} onChange={(e) => updateSection('clients', idx, 'name', e.target.value)} /></div>
                    <div className={styles.formGroup}><label><Building size={14} className={styles.labelIcon} /> Company</label><input type="text" value={client.company} onChange={(e) => updateSection('clients', idx, 'company', e.target.value)} /></div>
                    <div className={styles.formGroup}><label><Phone size={14} className={styles.labelIcon} /> Mobile</label><input type="tel" value={client.mobile} onChange={(e) => updateSection('clients', idx, 'mobile', e.target.value)} /></div>
                    <div className={styles.formGroup}><label><Mail size={14} className={styles.labelIcon} /> Email</label><input type="email" value={client.email} onChange={(e) => updateSection('clients', idx, 'email', e.target.value)} /></div>
                    <div className={styles.formGroup} data-has-value="true">
                      <label><CheckCircle size={14} className={styles.labelIcon} /> Primary?</label>
                      <div style={{ padding: '9px 14px', border: '2px solid #cbd5e1', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div 
                            style={{ 
                              width: '46px', height: '24px', backgroundColor: client.isPrimary === 'Yes' ? 'var(--primary)' : '#cbd5e1', 
                              borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' 
                            }} 
                            onClick={() => updateSection('clients', idx, 'isPrimary', client.isPrimary === 'Yes' ? 'No' : 'Yes')}
                          >
                            <div style={{
                              width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%',
                              position: 'absolute', top: '2px', left: client.isPrimary === 'Yes' ? '24px' : '2px',
                              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }} />
                          </div>
                          <span style={{ marginLeft: '12px', fontSize: '14px', fontWeight: 500, color: client.isPrimary === 'Yes' ? 'var(--primary)' : '#64748b' }}>
                            {client.isPrimary === 'Yes' ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}><label><MapPin size={14} className={styles.labelIcon} /> Address</label><textarea value={client.address} onChange={(e) => updateSection('clients', idx, 'address', e.target.value)} /></div>
                  </div>
                </div>
              ))}
              <button type="button" className={styles.addRowBtn} onClick={() => addRow('clients')}><Plus size={16} /> Add Another Client</button>
            </div>
          )}

          {activeTab === 'sites' && (
            <div className={styles.dynamicRows}>
              {formData.sites.map((site, idx) => (
                <div key={idx} className={styles.rowItem}>
                  <div className={styles.rowHeader}><h4>Site {idx + 1}</h4>{formData.sites.length > 1 && <button type="button" onClick={() => removeRow('sites', idx)} className={styles.removeBtn}><Trash2 size={16} /></button>}</div>
                  <div className={styles.gridForm}>
                    <div className={styles.formGroup}><label><MapPin size={14} className={styles.labelIcon} /> Name</label><input type="text" value={site.name} onChange={(e) => updateSection('sites', idx, 'name', e.target.value)} /></div>
                    <div className={styles.formGroup}><label><Home size={14} className={styles.labelIcon} /> Type</label><select value={site.type} onChange={(e) => updateSection('sites', idx, 'type', e.target.value)}>{siteTypes.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className={styles.formGroup}><label><Layers size={14} className={styles.labelIcon} /> Area (Sqft)</label><input type="number" value={site.area} onChange={(e) => updateSection('sites', idx, 'area', e.target.value)} /></div>
                    <div className={styles.formGroup}><label><Globe size={14} className={styles.labelIcon} /> City</label><input type="text" value={site.city} onChange={(e) => updateSection('sites', idx, 'city', e.target.value)} /></div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}><label><MapIcon size={14} className={styles.labelIcon} /> Site Address</label><textarea value={site.address} onChange={(e) => updateSection('sites', idx, 'address', e.target.value)} /></div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}><label><ExternalLink size={14} className={styles.labelIcon} /> Map URL</label><input type="url" value={site.googleLocation} onChange={(e) => updateSection('sites', idx, 'googleLocation', e.target.value)} /></div>
                  </div>
                </div>
              ))}
              <button type="button" className={styles.addRowBtn} onClick={() => addRow('sites')}><Plus size={16} /> Add Another Site</button>
            </div>
          )}

          {activeTab === 'team' && (
            <div className={styles.dynamicRows}>
              {formData.team.map((member, idx) => (
                <div key={idx} className={styles.rowItem}>
                  <div className={styles.rowHeader}><h4>Member {idx + 1}</h4>{formData.team.length > 1 && <button type="button" onClick={() => removeRow('team', idx)} className={styles.removeBtn}><Trash2 size={16} /></button>}</div>
                  <div className={styles.gridForm}>
                    <div className={styles.formGroup}><label><ShieldCheck size={14} className={styles.labelIcon} /> Role</label><select value={member.role} onChange={(e) => updateSection('team', idx, 'role', e.target.value)}>{memberRoles.map(r => <option key={r}>{r}</option>)}</select></div>
                    <div className={styles.formGroup}>
                      <label><User size={14} className={styles.labelIcon} /> Name</label>
                      <SearchableSelect
                        value={member.name}
                        onChange={(val) => updateSection('team', idx, 'name', val)}
                        options={userOptions}
                        placeholder="Select User"
                        icon={<User size={14} />}
                      />
                    </div>
                    <div className={styles.formGroup}><label><Calendar size={14} className={styles.labelIcon} /> Assigned Date</label><input type="date" value={member.assignedDate} onChange={(e) => updateSection('team', idx, 'assignedDate', e.target.value)} /></div>
                  </div>
                </div>
              ))}
              <button type="button" className={styles.addRowBtn} onClick={() => addRow('team')}><Plus size={16} /> Assign Member</button>
            </div>
          )}

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
            {activeTab !== 'team' ? (
              <button type="button" className={styles.submitBtn} onClick={() => {
                const tabs = ['basic', 'clients', 'sites', 'team'];
                setActiveTab(tabs[tabs.indexOf(activeTab) + 1]);
              }}>Next Section <ChevronRight size={16} /></button>
            ) : <button type="submit" className={styles.submitBtn}>{editingProject ? 'Update Project' : 'Save Project'}</button>}
          </div>
        </form>
      </Modal>
    </div>
  );
}
