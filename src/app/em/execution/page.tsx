'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, Edit2, Trash2, CheckCircle, Clock, Search, ArrowLeft, 
  CheckCircle2, AlertCircle, Briefcase, User, CalendarDays, FileText, Download, Activity
} from 'lucide-react';
import { exportToCSV } from '@/utils/exportCsv';
import styles from '../em.module.css';
import Modal from '@/components/Modal';
import MultiSelectFilter from '@/components/MultiSelectFilter';
import SearchableSelect from '@/components/SearchableSelect';
import { useAuth } from '@/context/AuthContext';
import { filterProjectsForUser } from '@/lib/project-access';
import { canViewAllEmTasks, isTaskAssignedToUser } from '@/lib/em-access';
import { ProjectTrackerTasksSection } from './ProjectTrackerTasksSection';

type ExecutionTaskDraft = {
  id: string;
  supervisor_name: string;
  work_from: string;
  work_to: string;
  project_name: string;
  work_name: string;
  doer: string;
  remark: string;
};

function createTaskRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDateForSheet(isoDate: string) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function isTaskRowEmpty(row: ExecutionTaskDraft) {
  return (
    !row.supervisor_name &&
    !row.work_from &&
    !row.work_to &&
    !row.project_name &&
    !row.work_name &&
    !row.doer &&
    !row.remark
  );
}

function isTaskRowComplete(row: ExecutionTaskDraft) {
  return Boolean(
    row.supervisor_name &&
      row.work_from &&
      row.work_to &&
      row.project_name &&
      row.work_name.trim()
  );
}

export default function ExecutionPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [projFilter, setProjFilter] = useState<string[]>([]);
  const [supervisorFilter, setSupervisorFilter] = useState<string[]>([]);
  const [doerFilter, setDoerFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [toastMessage, setToastMessage] = useState('');
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  const [formProject, setFormProject] = useState('');
  const [formSupervisor, setFormSupervisor] = useState('');
  const [taskRows, setTaskRows] = useState<ExecutionTaskDraft[]>([]);
  const [activeTaskTab, setActiveTaskTab] = useState<'execution' | 'tracker'>('execution');

  const projectOptions = useMemo(
    () => projectsList.map((p: any) => p.basicInfo?.name).filter(Boolean),
    [projectsList]
  );

  const supervisorOptions = useMemo(
    () => usersList.map((u: any) => u.name).filter(Boolean),
    [usersList]
  );

  const defaultSupervisorName = !canViewAllEmTasks(user?.role) ? user?.name || '' : '';

  const createEmptyTaskRow = (): ExecutionTaskDraft => ({
    id: createTaskRowId(),
    supervisor_name: defaultSupervisorName,
    work_from: '',
    work_to: '',
    project_name: '',
    work_name: '',
    doer: '',
    remark: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchTasks = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [res, projRes, usersRes] = await Promise.all([
        fetch('/api/em/execution'),
        fetch('/api/projects'),
        fetch('/api/users')
      ]);
      const data = await res.json();
      const projData = await projRes.json();
      const usersData = await usersRes.json();

      if (Array.isArray(data)) setTasks(data);
      else setTasks([]);

      if (Array.isArray(projData)) setProjectsList(filterProjectsForUser(projData, user));
      if (Array.isArray(usersData)) setUsersList(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormProject('');
    setFormSupervisor(defaultSupervisorName);
    setTaskRows([createEmptyTaskRow(), createEmptyTaskRow(), createEmptyTaskRow()]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: any) => {
    setEditingTask(task);
    setFormProject(task.project_name || '');
    setFormSupervisor(task.supervisor_name || '');
    setTaskRows([]);
    setIsModalOpen(true);
  };

  const updateTaskRow = (id: string, field: keyof Omit<ExecutionTaskDraft, 'id'>, value: string) => {
    setTaskRows((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addTaskRow = () => {
    setTaskRows((rows) => [...rows, createEmptyTaskRow()]);
  };

  const removeTaskRow = (id: string) => {
    setTaskRows((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.id !== id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const payload = {
      supervisor_name: formData.get('supervisor_name'),
      work_from: formatDateForSheet(String(formData.get('work_from') || '')),
      work_to: formatDateForSheet(String(formData.get('work_to') || '')),
      project_name: formData.get('project_name'),
      work_name: formData.get('work_name'),
      doer: formData.get('doer'),
      remark: formData.get('remark'),
      actual_date: editingTask ? editingTask.actual_date : '',
      status: editingTask ? editingTask.status : 'Pending',
    };

    setIsSaving(true);
    try {
      const res = await fetch(`/api/em/execution?rowIndex=${editingTask.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, timestamp: editingTask.timestamp }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        showToast('Task updated successfully!');
        fetchTasks(true);
      } else {
        alert('Failed to save task.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const completeRows = taskRows.filter(isTaskRowComplete);
    const partialRows = taskRows.filter((row) => !isTaskRowEmpty(row) && !isTaskRowComplete(row));

    if (partialRows.length > 0) {
      alert('Please complete all required fields in each row, or remove incomplete rows.');
      return;
    }

    if (completeRows.length === 0) {
      alert('Add at least one complete task.');
      return;
    }

    const tasks = completeRows.map((row) => ({
      supervisor_name: row.supervisor_name,
      work_from: formatDateForSheet(row.work_from),
      work_to: formatDateForSheet(row.work_to),
      project_name: row.project_name,
      work_name: row.work_name.trim(),
      doer: row.doer.trim(),
      remark: row.remark.trim(),
      actual_date: '',
      status: 'Pending',
    }));

    setIsSaving(true);
    try {
      const res = await fetch('/api/em/execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsModalOpen(false);
        showToast(`${data.count || completeRows.length} task(s) added successfully!`);
        fetchTasks(true);
      } else {
        alert('Failed to save tasks.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rowIndex: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/em/execution?rowIndex=${rowIndex}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Task deleted successfully!');
          fetchTasks(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleMarkComplete = async (task: any) => {
    const today = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
    const payload = {
      ...task,
      status: 'Completed',
      actual_date: today
    };
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/em/execution?rowIndex=${task.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast('Task marked as completed!');
        fetchTasks(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const reversedTasks = [...tasks].reverse();
  const filteredTasks = reversedTasks.filter(t => {
    const matchesSearch = t.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.work_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.supervisor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const taskStatus = t.status || 'Pending';
    
    const matchesProj = projFilter.length === 0 || projFilter.includes(t.project_name);
    const matchesSup = supervisorFilter.length === 0 || supervisorFilter.includes(t.supervisor_name);
    const matchesDoer = doerFilter.length === 0 || doerFilter.includes(t.doer);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(taskStatus);

    let userMatches = true;
    if (user && !canViewAllEmTasks(user.role)) {
      userMatches = isTaskAssignedToUser(t, user.name);
    }

    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      if (t.work_from) {
        const parts = t.work_from.split('/');
        if (parts.length === 3) {
          const taskDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (startDateFilter) {
            const startDate = new Date(startDateFilter);
            if (taskDate < startDate) matchesDate = false;
          }
          if (endDateFilter) {
            const endDate = new Date(endDateFilter);
            if (taskDate > endDate) matchesDate = false;
          }
        }
      } else {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesProj && matchesSup && matchesDoer && matchesStatus && userMatches && matchesDate;
  });

  const uniqueProjects = Array.from(new Set(tasks.map(t => t.project_name).filter(Boolean)));
  const uniqueSupervisors = Array.from(new Set(tasks.map(t => t.supervisor_name).filter(Boolean)));
  const uniqueDoers = Array.from(new Set(tasks.map(t => t.doer).filter(Boolean)));
  const uniqueStatuses = ['Pending', 'In Progress', 'Completed'];

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className={styles.container}>
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '30px', right: '30px',
          backgroundColor: '#10b981', color: 'white',
          padding: '14px 24px', borderRadius: '10px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '10px',
          zIndex: 9999, animation: 'fadeIn 0.3s ease-out'
        }}>
          <CheckCircle2 size={20} />
          <strong style={{ fontSize: '0.95rem' }}>{toastMessage}</strong>
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Execution Management</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <Link href="/em">EM</Link>
            <span className="separator">&gt;</span>
            <span className="current">Execution</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {activeTaskTab === 'execution' && (
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ padding: '10px 16px 10px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>
          )}
          {activeTaskTab === 'execution' && (
          <>
          <button onClick={() => exportToCSV(filteredTasks, 'Execution_Tasks')} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600 }}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--primary)', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            <Plus size={16} /> Add Task
          </button>
          </>
          )}
        </div>
      </div>

      <section className={styles.sectionCard}>
        <div className={styles.taskTabBar}>
          <button
            type="button"
            className={`${styles.taskTab} ${activeTaskTab === 'execution' ? styles.taskTabActive : ''}`}
            onClick={() => setActiveTaskTab('execution')}
          >
            <FileText size={18} /> Execution Tasks
          </button>
          <button
            type="button"
            className={`${styles.taskTab} ${activeTaskTab === 'tracker' ? styles.taskTabActive : ''}`}
            onClick={() => setActiveTaskTab('tracker')}
          >
            <Activity size={18} /> Project Tracker Tasks
          </button>
        </div>

        {activeTaskTab === 'execution' ? (
        <>
        <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectFilter label="Project Name" options={uniqueProjects} selectedValues={projFilter} onChange={(v) => { setProjFilter(v); setCurrentPage(1); }} />
            <MultiSelectFilter label="Supervisor Name" options={uniqueSupervisors} selectedValues={supervisorFilter} onChange={(v) => { setSupervisorFilter(v); setCurrentPage(1); }} />
            <MultiSelectFilter label="Doer" options={uniqueDoers} selectedValues={doerFilter} onChange={(v) => { setDoerFilter(v); setCurrentPage(1); }} />
            <MultiSelectFilter label="Status" options={uniqueStatuses} selectedValues={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px', backgroundColor: 'var(--bg-card)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Work From:</span>
              <input type="date" value={startDateFilter} onChange={(e) => { setStartDateFilter(e.target.value); setCurrentPage(1); }} style={{ border: 'none', background: 'none', fontSize: '0.85rem', color: 'var(--text-main)', outline: 'none', padding: 0 }} />
              <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>to</span>
              <input type="date" value={endDateFilter} onChange={(e) => { setEndDateFilter(e.target.value); setCurrentPage(1); }} style={{ border: 'none', background: 'none', fontSize: '0.85rem', color: 'var(--text-main)', outline: 'none', padding: 0 }} />
              {(startDateFilter || endDateFilter) && (
                <button onClick={() => { setStartDateFilter(''); setEndDateFilter(''); setCurrentPage(1); }} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} title="Clear Dates">
                  &times;
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              <span>Show</span>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
              {filteredTasks.length > 0 ? `${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filteredTasks.length)} of ${filteredTasks.length}` : '0 entries'}
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: currentPage === 1 ? 'var(--bg-main)' : 'var(--bg-card)', color: currentPage === 1 ? 'var(--text-light)' : 'var(--text-main)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: currentPage === totalPages || totalPages === 0 ? 'var(--bg-main)' : 'var(--bg-card)', color: currentPage === totalPages || totalPages === 0 ? 'var(--text-light)' : 'var(--text-main)', cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer' }}>Next</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading data...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-dark) 100%)', color: 'white' }}>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Supervisor Name</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Work Period</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Project Name</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Work Name</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Doer</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Remark</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Actual Date</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTasks.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)' }}>No tasks found.</td></tr>
                ) : (
                  paginatedTasks.map((task, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', backgroundColor: task.status === 'Completed' ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                      <td style={{ padding: '16px', fontSize: '0.9rem', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={16} style={{ color: '#3bafda' }} /> {task.supervisor_name}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={16} style={{ color: '#10b981' }} /> {task.work_from || '-'} to {task.work_to || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Briefcase size={16} style={{ color: '#4b6cb7' }} /> {task.project_name}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={16} style={{ color: '#f7b84b' }} /> {task.work_name}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={16} style={{ color: '#3bafda' }} /> {task.doer}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={16} style={{ color: '#f7b84b' }} /> {task.remark}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem', color: task.actual_date ? 'var(--text-main)' : 'var(--text-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarDays size={16} style={{ color: '#10b981' }} /> {task.actual_date || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: task.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : (task.status === 'In Progress' ? 'rgba(59, 175, 218, 0.15)' : 'rgba(241, 85, 108, 0.15)'),
                          color: task.status === 'Completed' ? '#10b981' : (task.status === 'In Progress' ? '#3bafda' : '#f1556c'),
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          {task.status === 'Completed' ? <CheckCircle2 size={12} /> : (task.status === 'In Progress' ? <Clock size={12} /> : <AlertCircle size={12} />)}
                          {task.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {task.status !== 'Completed' && (
                            <button onClick={() => handleMarkComplete(task)} title="Mark Complete" style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                              <CheckCircle size={18} />
                            </button>
                          )}
                          <button onClick={() => handleOpenEdit(task)} title="Edit" style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(task.rowIndex)} title="Delete" style={{ background: 'none', border: 'none', color: '#f1556c', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        </>
        ) : (
          <ProjectTrackerTasksSection embedded onToast={showToast} />
        )}
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Edit Execution Task' : 'Add Execution Tasks'}
        width={editingTask ? undefined : '1100px'}
      >
        {editingTask ? (
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <SearchableSelect 
              name="supervisor_name" 
              value={formSupervisor} 
              onChange={setFormSupervisor} 
              options={supervisorOptions} 
              placeholder="Select Supervisor" 
              icon={<User size={18} />}
            />
            <label>Supervisor Name (Site Engineer)</label>
          </div>

          <div className={styles.formRow}>
            <div className={styles.fieldGroup}>
              <div className={styles.inputWrapper}>
                <CalendarDays className={styles.inputIcon} size={18} />
                <input type="date" name="work_from" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingTask?.work_from ? editingTask.work_from.split('/').reverse().join('-') : ''} placeholder=" " required />
              </div>
              <label>Work From (Date)</label>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.inputWrapper}>
                <CalendarDays className={styles.inputIcon} size={18} />
                <input type="date" name="work_to" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingTask?.work_to ? editingTask.work_to.split('/').reverse().join('-') : ''} placeholder=" " required />
              </div>
              <label>Work To (Date)</label>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.fieldGroup}>
              <SearchableSelect 
                name="project_name" 
                value={formProject} 
                onChange={setFormProject} 
                options={projectOptions} 
                placeholder="Select Project" 
                icon={<Briefcase size={18} />}
              />
              <label>Project Name</label>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.inputWrapper}>
                <FileText className={styles.inputIcon} size={18} />
                <input type="text" name="work_name" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingTask?.work_name} placeholder=" " required />
              </div>
              <label>Work Name</label>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.fieldGroup}>
              <div className={styles.inputWrapper}>
                <User className={styles.inputIcon} size={18} />
                <input type="text" name="doer" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingTask?.doer} placeholder=" " />
              </div>
              <label>Doer</label>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.inputWrapper}>
                <FileText className={styles.inputIcon} size={18} />
                <input type="text" name="remark" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingTask?.remark} placeholder=" " />
              </div>
              <label>Remark</label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
        ) : (
        <form onSubmit={handleBulkSubmit}>
          <div className={styles.bulkTaskToolbar}>
            <span className={styles.bulkTaskHint}>
              Fill each row to add multiple tasks at once. Empty rows are ignored.
            </span>
            <button type="button" className={styles.bulkAddRowBtn} onClick={addTaskRow}>
              <Plus size={16} /> Add Row
            </button>
          </div>

          <div className={styles.bulkTaskTableWrap}>
            <table className={styles.bulkTaskTable}>
              <thead>
                <tr>
                  <th>Supervisor</th>
                  <th>Work From</th>
                  <th>Work To</th>
                  <th>Project Name</th>
                  <th>Work Name</th>
                  <th>Doer</th>
                  <th>Remark</th>
                  <th style={{ width: 48, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {taskRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <select
                        className={styles.bulkTaskInput}
                        value={row.supervisor_name}
                        onChange={(e) => updateTaskRow(row.id, 'supervisor_name', e.target.value)}
                      >
                        <option value="">Select Supervisor</option>
                        {supervisorOptions.map((supervisor) => (
                          <option key={supervisor} value={supervisor}>{supervisor}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        className={styles.bulkTaskInput}
                        value={row.work_from}
                        onChange={(e) => updateTaskRow(row.id, 'work_from', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className={styles.bulkTaskInput}
                        value={row.work_to}
                        onChange={(e) => updateTaskRow(row.id, 'work_to', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className={styles.bulkTaskInput}
                        value={row.project_name}
                        onChange={(e) => updateTaskRow(row.id, 'project_name', e.target.value)}
                      >
                        <option value="">Select Project</option>
                        {projectOptions.map((project) => (
                          <option key={project} value={project}>{project}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.bulkTaskInput}
                        value={row.work_name}
                        onChange={(e) => updateTaskRow(row.id, 'work_name', e.target.value)}
                        placeholder="Work name"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.bulkTaskInput}
                        value={row.doer}
                        onChange={(e) => updateTaskRow(row.id, 'doer', e.target.value)}
                        placeholder="Doer"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.bulkTaskInput}
                        value={row.remark}
                        onChange={(e) => updateTaskRow(row.id, 'remark', e.target.value)}
                        placeholder="Remark"
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={styles.bulkRemoveRowBtn}
                        onClick={() => removeTaskRow(row.id)}
                        disabled={taskRows.length <= 1}
                        title={`Remove row ${index + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? 'Saving...' : 'Save All Tasks'}
            </button>
          </div>
        </form>
        )}
      </Modal>
    </div>
  );
}
