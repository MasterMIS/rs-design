'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Settings,
  Building, Tag, CheckSquare, X, AlertCircle,
  ListTodo, ChevronRight,
  MonitorPlay, Bed, Hammer, HardHat, Zap, Droplet, Wind,
  Paintbrush, Utensils, Bath, Grid, FileText, CheckCircle2, LayoutTemplate
} from 'lucide-react';
import styles from './checklists.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';

interface TemplateItem {
  id: string;
  rowIndex: number;
  templateName: string;
  itemName: string;
  timestamp: string;
}

interface Checklist {
  rowIndex: number;
  timestamp: string;
  project: string;
  referenceNo: string;
  checkedItems: Record<string, boolean>;
  remarks: string;
  completedPercentage: number;
  id: string;
}

interface Project {
  id: string;
  basicInfo: {
    name: string;
  };
}

const getTemplateIcon = (name: string, size = 16) => {
  const lowerName = name.toLowerCase();
  const style = { marginRight: '8px', flexShrink: 0 };
  
  if (lowerName.includes('3d') || lowerName.includes('design')) return <MonitorPlay size={size} style={style} />;
  if (lowerName.includes('bed')) return <Bed size={size} style={style} />;
  if (lowerName.includes('carpenter') || lowerName.includes('wood') || lowerName.includes('furniture')) return <Hammer size={size} style={style} />;
  if (lowerName.includes('civil') || lowerName.includes('mason')) return <HardHat size={size} style={style} />;
  if (lowerName.includes('electric') || lowerName.includes('light') || lowerName.includes('wiring')) return <Zap size={size} style={style} />;
  if (lowerName.includes('plumb') || lowerName.includes('water')) return <Droplet size={size} style={style} />;
  if (lowerName.includes('hvac') || lowerName.includes('ac ') || lowerName.includes('ventilation')) return <Wind size={size} style={style} />;
  if (lowerName.includes('paint') || lowerName.includes('polish')) return <Paintbrush size={size} style={style} />;
  if (lowerName.includes('kitchen')) return <Utensils size={size} style={style} />;
  if (lowerName.includes('bath') || lowerName.includes('toilet')) return <Bath size={size} style={style} />;
  if (lowerName.includes('floor') || lowerName.includes('tile') || lowerName.includes('marble')) return <Grid size={size} style={style} />;
  if (lowerName.includes('execution') || lowerName.includes('final')) return <CheckCircle2 size={size} style={style} />;
  
  return <LayoutTemplate size={size} style={style} />;
};

export default function ChecklistsPage() {
  const { activeProject } = useProject();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'checklists' | 'templates'>('checklists');

  // Filters for Checklists
  const [searchQuery, setSearchQuery] = useState('');

  // Filters for Templates
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [searchItemName, setSearchItemName] = useState('');

  // Modals
  const [isTplModalOpen, setIsTplModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editingTplItem, setEditingTplItem] = useState<TemplateItem | null>(null);
  const [editingTplGroup, setEditingTplGroup] = useState<string | null>(null);

  const [itemToDelete, setItemToDelete] = useState<{ type: 'checklist' | 'template' | 'templateGroup', data: any } | null>(null);

  // Forms
  const [localCheckedState, setLocalCheckedState] = useState<Record<string, boolean>>({});

  const [tplForm, setTplForm] = useState({
    templateName: ''
  });
  const [tplItemNames, setTplItemNames] = useState<string[]>(['']);
  const [isNewTemplateName, setIsNewTemplateName] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const activeProjectName = activeProject?.name || '';
  const currentProjectChecklist = checklists.find(c => c.project === activeProjectName);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (currentProjectChecklist) {
      setLocalCheckedState(currentProjectChecklist.checkedItems || {});
    } else {
      setLocalCheckedState({});
    }
    setHasUnsavedChanges(false);
  }, [checklists, activeProjectName, currentProjectChecklist]);

  async function fetchData() {
    setLoading(true);
    try {
      const [chkRes, tplRes, projRes] = await Promise.all([
        fetch('/api/checklists'),
        fetch('/api/checklists/templates'),
        fetch('/api/projects')
      ]);

      if (chkRes.ok) setChecklists(await chkRes.json());
      if (tplRes.ok) setTemplateItems(await tplRes.json());
      if (projRes.ok) setProjects(await projRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Derived Template Data
  const groupedTemplates = templateItems.reduce((acc, curr) => {
    if (!acc[curr.templateName]) acc[curr.templateName] = [];
    acc[curr.templateName].push(curr);
    return acc;
  }, {} as Record<string, TemplateItem[]>);

  const uniqueTemplateNames = Object.keys(groupedTemplates).sort();
  const activeTemplateName = (selectedTemplate && uniqueTemplateNames.includes(selectedTemplate))
    ? selectedTemplate
    : uniqueTemplateNames[0] || null;

  // ---- CHECKLIST HANDLERS ----
  const toggleCheckItem = (key: string) => {
    setLocalCheckedState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setHasUnsavedChanges(true);
  };

  const saveChecklistProgress = async () => {
    if (!activeProjectName) {
      alert("No active project selected.");
      return;
    }

    try {
      setSubmitting(true);
      const totalItems = templateItems.length;
      const payload = {
        project: activeProjectName,
        checkedItems: localCheckedState,
        remarks: currentProjectChecklist?.remarks || '',
        totalItems
      };

      let res;
      if (currentProjectChecklist) {
        res = await fetch(`/api/checklists?rowIndex=${currentProjectChecklist.rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, referenceNo: currentProjectChecklist.referenceNo, timestamp: currentProjectChecklist.timestamp }),
        });
      } else {
        res = await fetch('/api/checklists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setHasUnsavedChanges(false);
        await fetchData(); // Refresh to get the new checklist ID if it was created
      } else {
        const err = await res.json();
        alert(`Error saving progress: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save checklist progress.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- TEMPLATE ITEM HANDLERS ----
  const handleAddTemplateItem = () => {
    setEditingTplItem(null);
    setEditingTplGroup(null);
    setTplForm({ templateName: uniqueTemplateNames[0] || '' });
    setTplItemNames(['']);
    setIsNewTemplateName(uniqueTemplateNames.length === 0);
    setIsTplModalOpen(true);
  };

  const handleEditTemplateItem = (item: TemplateItem) => {
    setEditingTplItem(item);
    setEditingTplGroup(null);
    setTplForm({ templateName: item.templateName });
    setTplItemNames([item.itemName]);
    setIsNewTemplateName(false);
    setIsTplModalOpen(true);
  };

  const handleEditTemplateGroup = (tplName: string) => {
    setEditingTplGroup(tplName);
    setEditingTplItem(null);
    setTplForm({ templateName: tplName });

    const items = groupedTemplates[tplName]?.map(i => i.itemName) || [];
    setTplItemNames(items.length > 0 ? items : ['']);

    setIsNewTemplateName(false);
    setIsTplModalOpen(true);
  };

  const handleTplItemNameChange = (index: number, val: string) => {
    const updated = [...tplItemNames];
    updated[index] = val;
    setTplItemNames(updated);
  };

  const addTplItemNameRow = () => setTplItemNames(prev => [...prev, '']);
  const removeTplItemNameRow = (index: number) => {
    if (tplItemNames.length > 1) {
      setTplItemNames(prev => prev.filter((_, i) => i !== index));
    }
  };

  const submitTemplateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanItems = tplItemNames.map(i => i.trim()).filter(i => i.length > 0);

    if (!tplForm.templateName || cleanItems.length === 0) {
      alert('Template Name and at least one Item are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        templateName: tplForm.templateName,
        itemName: editingTplItem ? cleanItems[0] : undefined,
        itemNames: !editingTplItem ? cleanItems : undefined
      };

      let res;
      if (editingTplItem) {
        res = await fetch(`/api/checklists/templates?rowIndex=${editingTplItem.rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, timestamp: editingTplItem.timestamp }),
        });
      } else if (editingTplGroup) {
        await fetch(`/api/checklists/templates?templateName=${encodeURIComponent(editingTplGroup)}`, { method: 'DELETE' });
        res = await fetch('/api/checklists/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateName: payload.templateName, itemNames: payload.itemNames }),
        });
      } else {
        res = await fetch('/api/checklists/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsTplModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- DELETE HANDLER ----
  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      setSubmitting(true);

      let endpoint = '';
      if (itemToDelete.type === 'checklist') {
        endpoint = `/api/checklists?rowIndex=${itemToDelete.data.rowIndex}`;
      } else if (itemToDelete.type === 'template') {
        endpoint = `/api/checklists/templates?rowIndex=${itemToDelete.data.rowIndex}`;
      } else if (itemToDelete.type === 'templateGroup') {
        endpoint = `/api/checklists/templates?templateName=${encodeURIComponent(itemToDelete.data)}`;
      }

      const res = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredChecklists = checklists.filter(c => {
    return c.referenceNo.toLowerCase().includes(searchQuery.toLowerCase()) || c.project.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getProgressColor = (pct: number) => {
    if (pct < 40) return styles.low;
    if (pct < 80) return styles.medium;
    return '';
  };

  const getBorderColor = (pct: number) => {
    if (pct < 40) return 'var(--danger)';
    if (pct < 80) return '#f39c12';
    return 'var(--success)';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Project Checklists</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <Link href="/projects">Project Portfolio</Link>
            {activeProject && (
              <>
                <span className="separator">&gt;</span>
                <button
                  className="project-breadcrumb"
                  style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                  onClick={() => {
                    localStorage.setItem('pending_view_project_id', activeProject.id);
                    window.location.href = '/projects';
                  }}
                >{activeProject.name}</button>
              </>
            )}
            <span className="separator">&gt;</span>
            <span className="current">Checklists</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchWrapper} style={{ width: '250px' }}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search template items..."
              className={styles.searchInput}
              value={searchItemName}
              onChange={(e) => setSearchItemName(e.target.value)}
            />
          </div>
          <button className={styles.secondaryButton} onClick={() => setActiveTab(activeTab === 'checklists' ? 'templates' : 'checklists')}>
            {activeTab === 'checklists' ? <><Settings size={18} /> Manage Templates</> : <><CheckSquare size={18} /> View Checklists</>}
          </button>
          {activeTab === 'checklists' ? (
            <button className={`${styles.addButton} ${styles.saveButton} ${hasUnsavedChanges ? styles.unsavedSaveButton : styles.savedSaveButton}`} onClick={saveChecklistProgress} disabled={submitting}>
              <CheckSquare size={18} /> {submitting ? 'Saving...' : 'Save Progress'}
            </button>
          ) : (
            <button className={styles.addButton} onClick={handleAddTemplateItem}>
              <Plus size={18} /> Add Checklist Item
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
              <h3 className={styles.sidebarTitle}>All Templates</h3>
              <div className={styles.sidebarList}>
                {uniqueTemplateNames.map(name => (
                  <button
                    key={name}
                    className={`${styles.sidebarItem} ${activeTemplateName === name ? styles.active : ''}`}
                    onClick={() => setSelectedTemplate(name)}
                  >
                    {getTemplateIcon(name)}
                    {name}
                  </button>
                ))}
                {uniqueTemplateNames.length === 0 && (
                  <p className={styles.emptySidebar}>No templates found.</p>
                )}
              </div>
            </div>

            {/* Content */}
            <div className={styles.templateContent}>
              {activeTemplateName ? (() => {
                const allItemsForTemplate = groupedTemplates[activeTemplateName] || [];
                const items = allItemsForTemplate.filter(item => item.itemName.toLowerCase().includes(searchItemName.toLowerCase()));
                
                // Calculate stats
                const totalItems = allItemsForTemplate.length;
                const completedItems = allItemsForTemplate.filter(item => localCheckedState[item.id]).length;
                const pendingItems = totalItems - completedItems;
                const completionPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {items.length > 0 ? (
                      <div className={styles.tableContainer}>
                        <div style={{ display: 'flex', background: 'var(--banner-bg)', borderRadius: '12px', color: 'white', marginBottom: '10px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, minWidth: '800px' }}>
                          <div style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ color: 'rgba(255,255,255,0.85)' }}>Checklist Item</span>
                              <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                              <span style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>{activeTemplateName}</span>
                            </div>
                            {activeTab === 'checklists' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '16px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', textTransform: 'none' }}>
                                <span style={{ color: 'rgba(255,255,255,0.9)' }}><strong>{totalItems}</strong> Total</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                                <span style={{ color: 'var(--success)' }}><strong>{completedItems}</strong> Completed</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                                <span style={{ color: '#f39c12' }}><strong>{pendingItems}</strong> Pending</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                                <span style={{ color: 'white', fontWeight: 800 }}>{completionPct}%</span>
                              </div>
                            )}
                          </div>
                          <div style={{ width: '280px', padding: '14px 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
                            {activeTab === 'templates' ? (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                                <button
                                  className={`${styles.actionBtn}`}
                                  onClick={() => handleEditTemplateGroup(activeTemplateName)}
                                  title="Edit entire template title and items"
                                  style={{ padding: '4px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap', backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.5)' }}
                                >
                                  <Edit2 size={12} /> Edit Title
                                </button>
                                <button
                                  className={`${styles.actionBtn}`}
                                  onClick={() => { setItemToDelete({ type: 'templateGroup', data: activeTemplateName }); setIsDeleteModalOpen(true); }}
                                  title="Delete entire template title and all its items"
                                  style={{ padding: '4px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap', backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.5)' }}
                                >
                                  <Trash2 size={12} /> Delete Title
                                </button>
                                <span style={{ marginLeft: '16px', color: 'rgba(255,255,255,0.9)' }}>ACTIONS</span>
                              </div>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.9)' }}>STATUS</span>
                            )}
                          </div>
                        </div>
                        <table className={styles.chkTable}>
                          <colgroup>
                            <col style={{ width: 'auto' }} />
                            <col style={{ width: '280px' }} />
                          </colgroup>
                          <tbody>
                            {items.map(item => (
                              <tr 
                                key={item.rowIndex}
                                onClick={(e) => {
                                  if (activeTab === 'checklists') {
                                    if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'BUTTON') {
                                      toggleCheckItem(item.id);
                                    }
                                  }
                                }}
                                style={{ cursor: activeTab === 'checklists' ? 'pointer' : 'default' }}
                              >
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {activeTab === 'checklists' && (
                                      <input 
                                        type="checkbox" 
                                        className={styles.customCheckbox}
                                        checked={!!localCheckedState[item.id]} 
                                        onChange={() => toggleCheckItem(item.id)}
                                      />
                                    )}
                                    {activeTab === 'templates' && <ChevronRight size={14} style={{ color: 'var(--text-light)' }} />}
                                    <strong style={{ textDecoration: (activeTab === 'checklists' && localCheckedState[item.id]) ? 'line-through' : 'none', color: (activeTab === 'checklists' && localCheckedState[item.id]) ? 'var(--text-light)' : 'inherit', transition: 'all 0.2s' }}>{item.itemName}</strong>
                                  </div>
                                </td>
                                <td>
                                  {activeTab === 'templates' ? (
                                    <div className={styles.tableActions}>
                                      <button className={styles.controlBtn} onClick={() => handleEditTemplateItem(item)}><Edit2 size={13} /></button>
                                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setItemToDelete({ type: 'template', data: item }); setIsDeleteModalOpen(true); }}><Trash2 size={13} /></button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                      {localCheckedState[item.id] ? (
                                        <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}><CheckCircle2 size={16} /> Completed</span>
                                      ) : (
                                        <span className={styles.blinkingPending}>Pending</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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

      {/* Template Item Modal */}
      <Modal isOpen={isTplModalOpen} onClose={() => !submitting && setIsTplModalOpen(false)} title={editingTplItem ? 'Edit Checklist Item' : editingTplGroup ? 'Edit Checklist Title' : 'Add Checklist Item'} width="500px">
        <form onSubmit={submitTemplateItem} className={styles.formGrid}>

          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Checklist Title (Template Name)</label>
              {!editingTplItem && !editingTplGroup && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  onClick={() => { setIsNewTemplateName(!isNewTemplateName); setTplForm({ ...tplForm, templateName: '' }) }}
                >
                  {isNewTemplateName ? 'Select Existing' : 'Create New Title'}
                </button>
              )}
            </div>

            {isNewTemplateName ? (
              <input
                type="text"
                value={tplForm.templateName}
                onChange={(e) => setTplForm({ ...tplForm, templateName: e.target.value })}
                className={styles.formInput}
                placeholder="e.g. 3D CHECKLIST 2024"
                required
              />
            ) : (
              <select
                value={tplForm.templateName}
                onChange={(e) => setTplForm({ ...tplForm, templateName: e.target.value })}
                className={styles.formSelect}
                required
                disabled={!!editingTplItem || !!editingTplGroup}
              >
                <option value="">Select a Template Title</option>
                {uniqueTemplateNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Checklist {editingTplItem ? 'Item' : 'Items'}</label>
            <div className={styles.dynamicItemList}>
              {tplItemNames.map((item, idx) => (
                <div key={idx} className={styles.dynamicItemRow}>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleTplItemNameChange(idx, e.target.value)}
                    className={styles.formInput}
                    placeholder="e.g. PROJECT NAME"
                    required
                  />
                  {!editingTplItem && tplItemNames.length > 1 && (
                    <button type="button" className={styles.removeItemBtn} onClick={() => removeTplItemNameRow(idx)}><X size={18} /></button>
                  )}
                </div>
              ))}
              {!editingTplItem && (
                <button type="button" className={styles.addItemBtn} onClick={addTplItemNameRow}>+ Add Another Item</button>
              )}
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsTplModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Saving...' : 'Save Item'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !submitting && setIsDeleteModalOpen(false)} title="Confirm Deletion" width="400px" type="danger">
        <div className={styles.deleteConfirmBody}>
          <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <p>Are you sure you want to delete this {itemToDelete?.type === 'template' ? 'checklist item' : itemToDelete?.type === 'templateGroup' ? 'entire checklist title and all its items' : 'project checklist'}?</p>
          <p className={styles.warningSub}>This action cannot be undone.</p>
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} disabled={submitting}>Cancel</button>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
