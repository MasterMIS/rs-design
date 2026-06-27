'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, Settings,
  Building, Tag, CheckSquare, X, AlertCircle,
  ListTodo, ChevronRight, UploadCloud, User,
  MonitorPlay, Bed, Hammer, HardHat, Zap, Droplet, Wind,
  Paintbrush, Utensils, Bath, Grid, FileText, CheckCircle2, LayoutTemplate,
  Calendar, Clock, FileImage, Download, History
} from 'lucide-react';
import styles from './drawings.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';

interface DrawingTemplate {
  id: string;
  rowIndex: number;
  drawingNo: string;
  areaName: string;
  drawingName: string;
  resourceName: string;
  doerName: string;
  category: string;
}

interface DrawingScheduleItem {
  id: string;
  rowIndex?: number;
  project: string;
  drawingNo: string;
  areaName: string;
  drawingName: string;
  resourceName: string;
  doerName: string;
  planDate: string;
  actualDate: string;
  category: string;
  revisionNo: string;
  lastUpdated: string;
  drawingImage: string;
  rsDesignStatus: string;
  clientStatus: string;
  tplId?: string;
}

interface CategoryPlannedDate {
  id: string;
  rowIndex?: number;
  project: string;
  category: string;
  planDate: string;
}

const getCategoryIcon = (name: string, size = 16) => {
  const lowerName = name.toLowerCase();
  const style = { marginRight: '8px', flexShrink: 0 };
  
  if (lowerName.includes('architecture') || lowerName.includes('civil')) return <Building size={size} style={style} />;
  if (lowerName.includes('plumbing')) return <Droplet size={size} style={style} />;
  if (lowerName.includes('electrical')) return <Zap size={size} style={style} />;
  if (lowerName.includes('hvac')) return <Wind size={size} style={style} />;
  if (lowerName.includes('interior') || lowerName.includes('furniture')) return <Bed size={size} style={style} />;
  
  return <LayoutTemplate size={size} style={style} />;
};

export default function DrawingsPage() {
  const { activeProject } = useProject();
  const [templates, setTemplates] = useState<DrawingTemplate[]>([]);
  const [schedules, setSchedules] = useState<DrawingScheduleItem[]>([]);
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
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<DrawingTemplate | null>(null);
  const [updatingItem, setUpdatingItem] = useState<DrawingScheduleItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Forms
  const [tplForm, setTplForm] = useState<Partial<DrawingTemplate>>({
    drawingNo: '', areaName: '', drawingName: '', resourceName: '', doerName: '', category: 'Architecture'
  });
  
  // State for project schedule
  const [localSchedule, setLocalSchedule] = useState<Record<string, DrawingScheduleItem>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);

  // History Sidebar State removed per user request

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
    // Merge templates with existing schedule for the active project
    if (!activeProjectName || templates.length === 0) {
      setLocalSchedule({});
      return;
    }

    const activeProjectData = projects.find(p => p.basicInfo?.name === activeProjectName || p.id === activeProjectName);
    const startDateStr = activeProjectData?.metadata?.createdAt;

    const projectSchedules = schedules.filter(s => s.project === activeProjectName);
    const merged: Record<string, DrawingScheduleItem> = {};

    templates.forEach(tpl => {
      const existingEntries = projectSchedules.filter(s => s.drawingNo === tpl.drawingNo);
      
      const catPlan = plannedDates.find(p => p.project === activeProjectName && p.category === tpl.category);
      const calculatedPlanDate = catPlan ? catPlan.planDate : '';

      if (existingEntries.length > 0) {
        const firstEntry = existingEntries[0];
        const lastEntry = existingEntries[existingEntries.length - 1];

        merged[tpl.id] = { 
          ...lastEntry,
          // Extract actual date from first entry to keep the original submission date
          actualDate: firstEntry.actualDate,
          
          // Re-inject template static fields
          areaName: tpl.areaName,
          drawingName: tpl.drawingName,
          resourceName: tpl.resourceName,
          doerName: tpl.doerName,
          category: tpl.category,
          planDate: calculatedPlanDate,
          id: lastEntry.id, // Keep existing ID
          tplId: tpl.id
        };
      } else {
        merged[tpl.id] = {
          id: `new-${tpl.id}`,
          tplId: tpl.id,
          project: activeProjectName,
          drawingNo: tpl.drawingNo,
          areaName: tpl.areaName,
          drawingName: tpl.drawingName,
          resourceName: tpl.resourceName,
          doerName: tpl.doerName,
          category: tpl.category,
          planDate: calculatedPlanDate,
          actualDate: '',
          revisionNo: '0',
          lastUpdated: '',
          drawingImage: '',
          rsDesignStatus: 'Pending',
          clientStatus: 'Pending'
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
        fetch('/api/drawings/templates'),
        fetch('/api/drawings'),
        fetch('/api/users'),
        fetch('/api/projects'),
        fetch('/api/drawings/planned')
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
  }, {} as Record<string, DrawingTemplate[]>);

  const uniqueCategories = Object.keys(groupedByCategory).sort();
  const activeCategory = (selectedCategory && uniqueCategories.includes(selectedCategory))
    ? selectedCategory
    : uniqueCategories[0] || null;

  // ---- SCHEDULE HANDLERS ----
  const handleScheduleChange = (tplId: string, field: keyof DrawingScheduleItem, value: any) => {
    setLocalSchedule(prev => {
      const updated = { ...prev[tplId], [field]: value };
      
      // Auto-increment revision if status changes or image uploaded (handled in upload)
      if (field === 'rsDesignStatus' || field === 'clientStatus') {
         if (prev[tplId][field] !== value) {
            updated.revisionNo = (parseInt(updated.revisionNo || '0') + 1).toString();
         }
      }

      return { ...prev, [tplId]: updated };
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveCategoryPlan = async (category: string, planDate: string) => {
    if (!activeProjectName) return;
    try {
      setSubmitting(true);
      const existingPlan = plannedDates.find(p => p.project === activeProjectName && p.category === category);
      const url = existingPlan?.rowIndex ? `/api/drawings/planned?rowIndex=${existingPlan.rowIndex}` : '/api/drawings/planned';
      const method = existingPlan?.rowIndex ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: activeProjectName, category, planDate })
      });

      if (res.ok) {
        await fetchData();
      } else {
        alert('Failed to save planned date for category.');
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
      
      // We'll separate items into ones that need POST (new) and ones that need PUT (existing)
      const itemsToPost: DrawingScheduleItem[] = [];
      const itemsToPut: DrawingScheduleItem[] = [];

      Object.values(localSchedule).forEach(item => {
        if (item.rowIndex) {
          itemsToPut.push(item);
        } else {
          // Only post if it has some data filled
          if (item.planDate || item.actualDate || item.drawingImage || item.rsDesignStatus !== 'Pending' || item.clientStatus !== 'Pending') {
            itemsToPost.push(item);
          }
        }
      });

      if (itemsToPost.length > 0) {
        await fetch('/api/drawings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project: activeProjectName, items: itemsToPost }),
        });
      }

      for (const item of itemsToPut) {
         await fetch(`/api/drawings?rowIndex=${item.rowIndex}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(item),
         });
      }

      setHasUnsavedChanges(false);
      await fetchData(); 
    } catch (err) {
      console.error(err);
      alert('Failed to save drawing schedule progress.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- TEMPLATE HANDLERS ----
  const handleAddTemplate = () => {
    setEditingTpl(null);
    setTplForm({ drawingNo: '', areaName: '', drawingName: '', resourceName: '', doerName: '', category: uniqueCategories[0] || 'Architecture' });
    setIsTplModalOpen(true);
  };

  const handleEditTemplate = (item: DrawingTemplate) => {
    setEditingTpl(item);
    setTplForm({ ...item });
    setIsTplModalOpen(true);
  };

  const submitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tplForm.drawingName || !tplForm.category) {
      alert('Drawing Name and Category are required.');
      return;
    }

    const submissionForm = { ...tplForm };
    if (!submissionForm.drawingNo) {
      submissionForm.drawingNo = `DWG-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    try {
      setSubmitting(true);
      const url = editingTpl ? `/api/drawings/templates?rowIndex=${editingTpl.rowIndex}` : '/api/drawings/templates';
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
      const res = await fetch(`/api/drawings/templates?rowIndex=${itemToDelete.rowIndex}`, { method: 'DELETE' });
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
                >{activeProjectName}</button>
              </>
            )}
            <span className="separator">&gt;</span>
            <span className="current">Drawing Schedule</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search drawings..." 
              value={searchItemName}
              onChange={(e) => setSearchItemName(e.target.value)}
            />
          </div>
          <button className={styles.secondaryButton} onClick={() => setActiveTab(activeTab === 'schedule' ? 'templates' : 'schedule')}>
            {activeTab === 'schedule' ? <><Settings size={18} /> Manage Templates</> : <><CheckSquare size={18} /> View Schedule</>}
          </button>
          {activeTab === 'templates' && (
            <button className={styles.addButton} onClick={handleAddTemplate}>
              <Plus size={18} /> Add Drawing Template
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
                  item.drawingName.toLowerCase().includes(searchItemName.toLowerCase()) || 
                  item.drawingNo.toLowerCase().includes(searchItemName.toLowerCase())
                );
                
                const currentCategoryPlan = activeCategory ? plannedDates.find(p => p.project === activeProjectName && p.category === activeCategory) : null;
                const currentPlanDate = currentCategoryPlan?.planDate || '';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeCategory && activeTab === 'schedule' && activeProjectName && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={18} color="var(--primary)" />
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)' }}>{activeCategory} Planned Date:</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input 
                            type="date" 
                            className={styles.customDateInput}
                            value={currentPlanDate}
                            onChange={(e) => handleSaveCategoryPlan(activeCategory, e.target.value)}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    )}

                    {items.length > 0 ? (
                      <div className={styles.tableContainer}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {items.map(item => {
                          const scheduleItem = localSchedule[item.id];
                          
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
                              {/* Left Section: Drawing Details */}
                              <div style={{ flex: activeTab === 'schedule' ? '0 0 30%' : '0 0 35%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div className={styles.drawingTitleRow} style={{ marginBottom: 0 }}>
                                  <span className={styles.drawingNo} style={{ color: '#2563eb', fontWeight: 700, padding: '4px 0', whiteSpace: 'nowrap' }}>{item.drawingNo || 'N/A'}</span>
                                  <strong className={styles.drawingName} style={{ color: '#1e293b', fontSize: '0.95rem' }}>{item.drawingName}</strong>
                                </div>
                                <div className={styles.drawingMetaRow} style={{ marginTop: '4px' }}>
                                  <span className={styles.metaTag} style={{ color: '#0369a1', fontWeight: 600 }}><Grid size={12} /> {item.areaName || 'No Area'}</span>
                                  <span className={styles.metaTag} style={{ color: '#047857', fontWeight: 600 }}><User size={12} /> {item.resourceName || 'Unassigned'}</span>
                                </div>
                              </div>
                              
                              {/* Middle Section: History Files (Schedule) OR Meta Details (Templates) */}
                              {activeTab === 'schedule' ? (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 15px', flexWrap: 'wrap', borderLeft: '1px dashed var(--border-color)', borderRight: '1px dashed var(--border-color)', minHeight: '40px' }}>
                                  {(() => {
                                    const itemHistory = schedules
                                      .filter(s => s.project === activeProjectName && s.drawingNo === item.drawingNo && s.drawingImage)
                                      .sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime());
                                      
                                    if (itemHistory.length === 0) return <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', fontWeight: 500 }}>No files uploaded yet</span>;
                                    
                                    return itemHistory.map((hist, idx) => {
                                      const isLatest = idx === itemHistory.length - 1;
                                      const dt = new Date(hist.lastUpdated);
                                      const formattedDate = !isNaN(dt.getTime()) ? `${dt.getDate().toString().padStart(2, '0')} ${(dt.toLocaleString('default', { month: 'short' }))} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}` : '';

                                      return (
                                        <div key={hist.id + idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                          <a 
                                            href={hist.drawingImage} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            title={`Rev ${hist.revisionNo} • ${dt.toLocaleString()}`}
                                            style={{
                                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                                              padding: '6px 14px', borderRadius: '20px',
                                              backgroundColor: 'transparent',
                                              border: isLatest ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                                              color: isLatest ? '#4f46e5' : '#64748b',
                                              fontSize: '0.85rem', textDecoration: 'none', fontWeight: 800,
                                              transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.05)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                          >
                                            <FileImage size={14} />
                                            R{hist.revisionNo}
                                          </a>
                                          {formattedDate && (
                                            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                                              {formattedDate}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              ) : (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '20px', padding: '0 15px' }}>
                                  <span className={styles.metaTag} style={{ color: '#0f766e', fontSize: '0.85rem', padding: '6px 0', fontWeight: 700 }}>
                                    <User size={14} /> Doer: {item.doerName || 'Unassigned'}
                                  </span>
                                </div>
                              )}

                              {/* Right Section: Controls */}
                              {activeTab === 'schedule' ? (
                                <div style={{ flex: '0 0 340px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                  <div className={styles.datesCol} style={{ flex: 1, paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#312e81', fontWeight: 600 }}>
                                      <strong style={{ color: '#4f46e5', marginRight: '4px' }}>Plan:</strong> {formatDate(scheduleItem?.planDate) === 'N/A' ? '' : formatDate(scheduleItem?.planDate)}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#134e4a', fontWeight: 600 }}>
                                      <strong style={{ color: '#0d9488', marginRight: '4px' }}>Actual:</strong> {formatDate(scheduleItem?.actualDate) === 'N/A' ? '' : formatDate(scheduleItem?.actualDate)}
                                    </div>
                                  </div>
                                  
                                  <div className={styles.statusCol} style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div className={`${styles.statusSelect} ${styles[scheduleItem?.rsDesignStatus?.replace(/\s+/g, '') || 'Pending']}`} style={{ display: 'inline-block', textAlign: 'center', pointerEvents: 'none', width: '100%', padding: '4px', fontWeight: 700 }}>
                                      RS: {scheduleItem?.rsDesignStatus || 'Pending'}
                                    </div>
                                    <div className={`${styles.statusSelect} ${styles[scheduleItem?.clientStatus?.replace(/\s+/g, '') || 'Pending']}`} style={{ display: 'inline-block', textAlign: 'center', pointerEvents: 'none', width: '100%', padding: '4px', fontWeight: 700 }}>
                                      Client: {scheduleItem?.clientStatus || 'Pending'}
                                    </div>
                                  </div>

                                  <div style={{ flex: '0 0 60px', display: 'flex', justifyContent: 'center' }}>
                                    <button 
                                      className={styles.controlBtn} 
                                      onClick={() => {
                                        setStagedFile(null);
                                        setUpdatingItem({ ...scheduleItem, tplId: item.id } as any);
                                        setIsUpdateModalOpen(true);
                                      }}
                                      title="Update Status"
                                    >
                                      <Edit2 size={16} />
                                    </button>
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
                        No items found matching your search.
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
          <p>Are you sure you want to delete <strong>{itemToDelete?.drawingName}</strong>?</p>
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
        title={editingTpl ? 'Edit Drawing Template' : 'Add Drawing Template'}
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
            <label>Drawing Name <span style={{color: 'red'}}>*</span></label>
            <input 
              type="text" 
              required 
              value={tplForm.drawingName} 
              onChange={e => setTplForm({...tplForm, drawingName: e.target.value})} 
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

      {/* Bottom Modal for Updating Schedule Item */}
      {isUpdateModalOpen && updatingItem && (
        <div className={styles.bottomModalOverlay} onClick={() => setIsUpdateModalOpen(false)}>
          <div className={styles.bottomModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.bottomModalHeader}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.2rem' }}>Update Schedule</h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-light)', fontSize: '0.85rem' }}>{updatingItem.drawingName}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsUpdateModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.bottomModalBody}>
              <div className={styles.updateGrid}>
                <div className={styles.formGroup}>
                  <label>RS Status</label>
                  <select 
                    className={styles.formSelect}
                    value={updatingItem.rsDesignStatus || 'Pending'}
                    onChange={(e) => setUpdatingItem({ ...updatingItem, rsDesignStatus: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Client Status</label>
                  <select 
                    className={styles.formSelect}
                    value={updatingItem.clientStatus || 'Pending'}
                    onChange={(e) => setUpdatingItem({ ...updatingItem, clientStatus: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                
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
              <button className={styles.cancelBtn} onClick={() => setIsUpdateModalOpen(false)}>Close</button>
              <button 
                className={styles.submitBtn} 
                onClick={async () => {
                  if (!updatingItem) return;
                  setSubmitting(true);
                  try {
                    let fileUrl = updatingItem.drawingImage || '';
                    const tplId = (updatingItem as any).tplId;
                    
                    if (stagedFile) {
                      setUploadingImageFor(tplId);
                      const formData = new FormData();
                      formData.append('files', stagedFile);
                      formData.append('folderId', '1j8iL0WFy52LhkUGN_g7UeZJOyYFb3AFP');

                      const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData,
                      });

                      if (res.ok) {
                        const data = await res.json();
                        const urlData = data.files[0].url;
                        fileUrl = typeof urlData === 'string' ? urlData : (urlData.webViewLink || urlData.webContentLink || '');
                      } else {
                        throw new Error('File upload failed');
                      }
                    }
                  
                    const currentItem = localSchedule[tplId];
                    let newRev = parseInt(updatingItem.revisionNo || '0');
                    
                    const rsChanged = updatingItem.rsDesignStatus !== currentItem.rsDesignStatus;
                    const clientChanged = updatingItem.clientStatus !== currentItem.clientStatus;

                    if (rsChanged || clientChanged || stagedFile) {
                      newRev++;
                    }
                    
                    // Always keep the original actual date if it exists
                    const newActualDate = updatingItem.actualDate && updatingItem.actualDate !== 'N/A' 
                      ? updatingItem.actualDate 
                      : new Date().toISOString().split('T')[0];

                    const updatedItemToSave = { 
                      ...updatingItem, 
                      drawingImage: fileUrl,
                      revisionNo: newRev.toString(),
                      actualDate: newActualDate
                    };

                    setLocalSchedule(prev => ({
                      ...prev,
                      [tplId]: updatedItemToSave
                    }));
                    
                    // ALWAYS append a new row to keep history, never update existing
                    const resApi = await fetch('/api/drawings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ project: activeProjectName, items: [updatedItemToSave] }),
                    });

                    if (!resApi.ok) {
                       const errData = await resApi.json();
                       throw new Error(errData.error || 'Failed to save to database');
                    }
                    await fetchData();
                  } catch(e) {
                    console.error(e);
                    alert("Error applying changes: " + (e as any).message);
                  } finally {
                    setUploadingImageFor(null);
                    setSubmitting(false);
                    setStagedFile(null);
                    setIsUpdateModalOpen(false);
                  }
                }}
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
