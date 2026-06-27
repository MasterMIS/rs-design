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

interface CategoryPlannedDate {
  id: string;
  rowIndex?: number;
  project: string;
  category: string;
  startDate: string;
  endDate: string;
}

interface TrackerScheduleItem {
  id: string;
  rowIndex?: number;
  project: string;
  trackerId: string;
  actualDate: string;
  tplId?: string;
  isCompleting?: boolean;
}

const getCategoryIcon = (name: string, size = 16) => {
  const style = { marginRight: '8px', flexShrink: 0 };
  return <LayoutTemplate size={size} style={style} />;
};

export default function PMSTrackerPage() {
  const { activeProject } = useProject();
  const [templates, setTemplates] = useState<TrackerTemplate[]>([]);
  const [schedules, setSchedules] = useState<TrackerScheduleItem[]>([]);
  const [plannedDates, setPlannedDates] = useState<CategoryPlannedDate[]>([]);
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

  const activeProjectName = activeProject?.name || '';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'short' });
    const year = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          actualDate: ''
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
      if (projRes.ok) setProjects(await projRes.json());
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

  // ---- SCHEDULE HANDLERS ----
  const handleMarkComplete = async (tplId: string, trackerId: string) => {
    if (!activeProjectName) return;
    
    try {
      setLocalSchedule(prev => ({ ...prev, [tplId]: { ...prev[tplId], isCompleting: true } }));

      const today = new Date().toISOString().split('T')[0];
      const existing = localSchedule[tplId];
      
      const payload = {
        trackerId,
        project: activeProjectName,
        actualDate: today
      };

      const url = existing?.rowIndex ? `/api/pms-tracker?rowIndex=${existing.rowIndex}` : '/api/pms-tracker';
      const method = existing?.rowIndex ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing?.rowIndex ? payload : { project: activeProjectName, items: [payload] })
      });

      if (res.ok) {
        await fetchData(); 
      } else {
        alert('Failed to mark task as complete.');
        setLocalSchedule(prev => ({ ...prev, [tplId]: { ...prev[tplId], isCompleting: false } }));
      }
    } catch (err) {
      console.error(err);
      alert('Error marking task as complete.');
      setLocalSchedule(prev => ({ ...prev, [tplId]: { ...prev[tplId], isCompleting: false } }));
    }
  };

  const handleSaveCategoryPlan = async (category: string, field: 'startDate' | 'endDate', value: string) => {
    if (!activeProjectName) return;
    try {
      setSubmitting(true);
      const existingPlan = plannedDates.find(p => p.project === activeProjectName && p.category === category);
      
      const payload = { 
        project: activeProjectName, 
        category, 
        startDate: field === 'startDate' ? value : (existingPlan?.startDate || ''),
        endDate: field === 'endDate' ? value : (existingPlan?.endDate || '')
      };

      const url = existingPlan?.rowIndex ? `/api/pms-tracker/planned?rowIndex=${existingPlan.rowIndex}` : '/api/pms-tracker/planned';
      const method = existingPlan?.rowIndex ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchData();
      } else {
        alert('Failed to save planned dates for category.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
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
          if (item.actualDate) {
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
                {uniqueCategories.map(cat => (
                  <button
                    key={cat}
                    className={`${styles.sidebarItem} ${activeCategory === cat ? styles.active : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {getCategoryIcon(cat)}
                    {cat}
                  </button>
                ))}
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
                
                const currentCategoryPlan = activeCategory ? plannedDates.find(p => p.project === activeProjectName && p.category === activeCategory) : null;
                const currentStartDate = currentCategoryPlan?.startDate || '';
                const currentEndDate = currentCategoryPlan?.endDate || '';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeCategory && activeTab === 'templates' && activeProjectName && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={18} color="var(--primary)" />
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)' }}>{activeCategory} Timeline:</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)' }}>Start Date:</span>
                            <input 
                              type="date" 
                              className={styles.customDateInput}
                              value={currentStartDate}
                              onChange={(e) => handleSaveCategoryPlan(activeCategory, 'startDate', e.target.value)}
                              disabled={submitting}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)' }}>End Date:</span>
                            <input 
                              type="date" 
                              className={styles.customDateInput}
                              value={currentEndDate}
                              onChange={(e) => handleSaveCategoryPlan(activeCategory, 'endDate', e.target.value)}
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {items.length > 0 ? (
                      <div className={styles.tableContainer}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {items.map(item => {
                          const scheduleItem = localSchedule[item.id];
                          
                          // Calculate planned date based on category start date + task TAT
                          let calculatedPlanDateStr = '';
                          if (currentStartDate && activeTab === 'schedule') {
                            const sd = new Date(currentStartDate);
                            const tatDays = parseInt(item.tat || '0') || 0;
                            if (!isNaN(sd.getTime())) {
                              sd.setDate(sd.getDate() + tatDays);
                              calculatedPlanDateStr = sd.toISOString().split('T')[0];
                            }
                          }

                          return (
                            <div key={item.rowIndex} style={{
                              display: 'flex',
                              width: '100%',
                              background: activeTab === 'schedule' ? 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(246,248,255,1) 100%)' : 'var(--bg-card)',
                              borderLeft: activeTab === 'schedule' ? '4px solid var(--primary-color)' : 'none',
                              boxShadow: activeTab === 'schedule' ? '0 6px 16px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.06)',
                              borderRadius: '100px',
                              padding: '12px 20px',
                              gap: '20px',
                              alignItems: 'center'
                            }}>
                              {/* Left Section: Task Details */}
                              <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div className={styles.drawingTitleRow} style={{ marginBottom: 0 }}>
                                  <span className={styles.drawingNo} style={{ color: '#2563eb', fontWeight: 700, padding: '4px 0', whiteSpace: 'nowrap' }}>{item.trackerId || 'N/A'}</span>
                                  <strong className={styles.drawingName} style={{ color: '#1e293b', fontSize: '0.95rem' }}>{item.taskName}</strong>
                                </div>
                              </div>
                              
                              {/* Middle Section: Meta Info */}
                              <div style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 15px', flexWrap: 'wrap', gap: '10px' }}>
                                <span className={styles.metaTag} style={{ color: '#0369a1', fontWeight: 600, fontSize: '0.85rem' }}><Grid size={14} /> {item.areaName || 'No Area'}</span>
                                <span className={styles.metaTag} style={{ color: '#047857', fontWeight: 600, fontSize: '0.85rem' }}><User size={14} /> {item.resourceName || 'Unassigned'}</span>
                                <span className={styles.metaTag} style={{ color: '#0f766e', fontWeight: 600, fontSize: '0.85rem' }}>Doer: {item.doerName || 'Unassigned'}</span>
                                {activeTab === 'templates' && (
                                  <span className={styles.metaTag} style={{ color: '#9a3412', fontWeight: 700, fontSize: '0.85rem' }}>TAT: {item.tat || '0'} Days</span>
                                )}
                              </div>

                              {/* Right Section: Controls */}
                              {activeTab === 'schedule' ? (
                                <div style={{ flex: '0 0 250px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px' }}>
                                  <div className={styles.datesCol} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#312e81', fontWeight: 600 }}>
                                      <strong style={{ color: '#4f46e5', marginRight: '4px' }}>Plan:</strong> {formatDate(calculatedPlanDateStr)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <strong style={{ fontSize: '0.8rem', color: '#0d9488', fontWeight: 600 }}>Actual:</strong>
                                      {scheduleItem?.actualDate ? (
                                        <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700 }}>
                                          <CheckSquare size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                          {formatDate(scheduleItem.actualDate)}
                                        </span>
                                      ) : (
                                        <button 
                                          disabled={scheduleItem?.isCompleting}
                                          onClick={() => handleMarkComplete(item.id, item.trackerId)}
                                          style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            padding: '6px 12px', borderRadius: '6px', border: 'none',
                                            backgroundColor: scheduleItem?.isCompleting ? '#e2e8f0' : '#10b981',
                                            color: scheduleItem?.isCompleting ? '#64748b' : '#fff',
                                            fontSize: '0.8rem', fontWeight: 600, cursor: scheduleItem?.isCompleting ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s ease'
                                          }}
                                        >
                                          {scheduleItem?.isCompleting ? (
                                            <Loader2 size={14} style={{ animation: 'spin 2s linear infinite' }} />
                                          ) : (
                                            <CheckSquare size={14} />
                                          )}
                                          {scheduleItem?.isCompleting ? 'Saving...' : 'Complete'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ flex: '0 0 100px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button className={styles.controlBtn} onClick={() => handleEditTemplate(item)}><Edit2 size={13} /></button>
                                  <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setItemToDelete(item); setIsDeleteModalOpen(true); }}><Trash2 size={13} /></button>
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
          <div className={styles.formGroup}>
            <label>Turnaround Time (TAT) in Days</label>
            <input 
              type="number" 
              min="0"
              value={tplForm.tat} 
              onChange={e => setTplForm({...tplForm, tat: e.target.value})} 
            />
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
