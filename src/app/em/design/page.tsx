'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Edit2, Trash2, CheckCircle, Clock, Search, ArrowLeft, 
  CheckCircle2, AlertCircle, Briefcase, User, CalendarDays, FileText, Download
} from 'lucide-react';
import { exportToCSV } from '@/utils/exportCsv';
import styles from '../em.module.css';
import Modal from '@/components/Modal';
import MultiSelectFilter from '@/components/MultiSelectFilter';
import SearchableSelect from '@/components/SearchableSelect';
import { useAuth } from '@/context/AuthContext';

export default function DesignPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [projFilter, setProjFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
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
  const [formWorkType, setFormWorkType] = useState('');
  const [formDoer, setFormDoer] = useState('');

  const workTypeOptions = [
    '2D Drawing', '3D Drawing', 'Architectal Drawing', 
    'MEP Drawing', 'Selection', 'Design Demo', 'Office Work', 'BOQ'
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchTasks = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [res, projRes, usersRes] = await Promise.all([
        fetch('/api/em/design'),
        fetch('/api/projects'),
        fetch('/api/users')
      ]);
      const data = await res.json();
      const projData = await projRes.json();
      const usersData = await usersRes.json();

      if (Array.isArray(data)) setTasks(data);
      else setTasks([]);

      if (Array.isArray(projData)) setProjectsList(projData);
      if (Array.isArray(usersData)) setUsersList(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormProject('');
    setFormWorkType('');
    setFormDoer(user?.role !== 'Admin' ? user?.name || '' : '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: any) => {
    setEditingTask(task);
    setFormProject(task.project_name || '');
    setFormWorkType(task.work_type || '');
    setFormDoer(task.doer_name || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const payload = {
      project_name: formData.get('project_name'),
      work_type: formData.get('work_type'),
      work_name: formData.get('work_name'),
      doer_name: formData.get('doer_name'),
      planned_date: formData.get('planned_date'),
      actual_date: editingTask ? editingTask.actual_date : '',
      status: editingTask ? editingTask.status : 'Pending',
    };

    setIsSaving(true);
    try {
      let res;
      if (editingTask) {
        res = await fetch(`/api/em/design?rowIndex=${editingTask.rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, timestamp: editingTask.timestamp }),
        });
      } else {
        res = await fetch('/api/em/design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        showToast(editingTask ? 'Task updated successfully!' : 'Task added successfully!');
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

  const handleDelete = async (rowIndex: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/em/design?rowIndex=${rowIndex}`, { method: 'DELETE' });
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
      const res = await fetch(`/api/em/design?rowIndex=${task.rowIndex}`, {
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
                          t.doer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const taskStatus = t.status || 'Pending';
    
    const matchesProj = projFilter.length === 0 || projFilter.includes(t.project_name);
    const matchesType = typeFilter.length === 0 || typeFilter.includes(t.work_type);
    const matchesDoer = doerFilter.length === 0 || doerFilter.includes(t.doer_name);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(taskStatus);
    
    let userMatches = true;
    if (user?.role !== 'Admin') {
      userMatches = t.doer_name === user?.name;
    }

    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      if (t.planned_date) {
        const parts = t.planned_date.split('/');
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

    return matchesSearch && matchesProj && matchesType && matchesDoer && matchesStatus && userMatches && matchesDate;
  });

  const uniqueProjects = Array.from(new Set(tasks.map(t => t.project_name).filter(Boolean)));
  const uniqueTypes = Array.from(new Set(tasks.map(t => t.work_type).filter(Boolean)));
  const uniqueDoers = Array.from(new Set(tasks.map(t => t.doer_name).filter(Boolean)));
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
          <h2>Design Management</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <Link href="/em">EM</Link>
            <span className="separator">&gt;</span>
            <span className="current">Design</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ padding: '10px 16px 10px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>
          <button onClick={() => exportToCSV(filteredTasks, 'Design_Tasks')} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600 }}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--primary)', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {/* Filter and Pagination Bar */}
        <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectFilter label="Project Name" options={uniqueProjects} selectedValues={projFilter} onChange={(v) => { setProjFilter(v); setCurrentPage(1); }} />
            <MultiSelectFilter label="Work Type" options={uniqueTypes} selectedValues={typeFilter} onChange={(v) => { setTypeFilter(v); setCurrentPage(1); }} />
            <MultiSelectFilter label="Doer" options={uniqueDoers} selectedValues={doerFilter} onChange={(v) => { setDoerFilter(v); setCurrentPage(1); }} />
            <MultiSelectFilter label="Status" options={uniqueStatuses} selectedValues={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px', backgroundColor: 'var(--bg-card)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Planned:</span>
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
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Project Name</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Work Type</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Work / Drawing</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Doer Name</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Planned Date</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Actual Date</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTasks.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)' }}>No tasks found.</td></tr>
                ) : (
                  paginatedTasks.map((task, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', backgroundColor: task.status === 'Completed' ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                      <td style={{ padding: '16px', fontSize: '0.9rem', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Briefcase size={16} style={{ color: '#4b6cb7' }} /> {task.project_name}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={16} style={{ color: '#f7b84b' }} /> {task.work_type}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={16} style={{ color: '#f7b84b' }} /> {task.work_name}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={16} style={{ color: '#3bafda' }} /> {task.doer_name}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-light)' }}>
                          <Clock size={16} style={{ color: '#10b981' }} /> {task.planned_date || '-'}
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
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? "Edit Design Task" : "Add Design Task"}>
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.fieldGroup}>
              <SearchableSelect 
                name="project_name" 
                value={formProject} 
                onChange={setFormProject} 
                options={projectsList.map((p: any) => p.basicInfo?.name).filter(Boolean)} 
                placeholder="Select Project" 
                icon={<Briefcase size={18} />}
              />
              <label>Project Name</label>
            </div>
            <div className={styles.fieldGroup}>
              <SearchableSelect 
                name="work_type" 
                value={formWorkType} 
                onChange={setFormWorkType} 
                options={workTypeOptions} 
                placeholder="Select Work Type" 
                icon={<FileText size={18} />}
              />
              <label>Work Type</label>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <div className={styles.inputWrapper}>
              <FileText className={styles.inputIcon} size={18} />
              <input type="text" name="work_name" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingTask?.work_name} placeholder=" " required />
            </div>
            <label>Work / Drawing Name</label>
          </div>

          <div className={styles.formRow}>
            <div className={styles.fieldGroup}>
              <SearchableSelect 
                name="doer_name" 
                value={formDoer} 
                onChange={setFormDoer} 
                options={usersList.map((u: any) => u.name).filter(Boolean)} 
                placeholder="Select Doer" 
                icon={<User size={18} />}
              />
              <label>Doer Name</label>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.inputWrapper}>
                <CalendarDays className={styles.inputIcon} size={18} />
                <input type="date" name="planned_date" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingTask?.planned_date ? editingTask.planned_date.split('/').reverse().join('-') : ''} placeholder=" " required />
              </div>
              <label>Planned Date</label>
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
      </Modal>
    </div>
  );
}
