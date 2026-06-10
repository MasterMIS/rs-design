'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Settings,
  Building, Tag, CheckSquare, X, AlertCircle
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
  const [filterProject, setFilterProject] = useState('');

  // Filters for Templates
  const [filterTemplateTitle, setFilterTemplateTitle] = useState('');
  const [searchItemName, setSearchItemName] = useState('');

  // Modals
  const [isChkModalOpen, setIsChkModalOpen] = useState(false);
  const [isTplModalOpen, setIsTplModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [editingChk, setEditingChk] = useState<Checklist | null>(null);
  const [editingTplItem, setEditingTplItem] = useState<TemplateItem | null>(null);
  const [editingTplGroup, setEditingTplGroup] = useState<string | null>(null);
  
  const [itemToDelete, setItemToDelete] = useState<{type: 'checklist'|'template'|'templateGroup', data: any} | null>(null);

  // Forms
  const [chkForm, setChkForm] = useState({
    project: '',
    remarks: ''
  });
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

  const [tplForm, setTplForm] = useState({
    templateName: ''
  });
  const [tplItemNames, setTplItemNames] = useState<string[]>(['']);
  const [isNewTemplateName, setIsNewTemplateName] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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

  // ---- CHECKLIST HANDLERS ----
  const handleCreateChecklist = () => {
    setEditingChk(null);
    setChkForm({
      project: projects[0]?.basicInfo?.name || '',
      remarks: ''
    });
    
    const initialChecked: Record<string, boolean> = {};
    templateItems.forEach(item => {
      initialChecked[item.id] = false;
    });
    setCheckedState(initialChecked);
    setIsChkModalOpen(true);
  };

  const handleEditChecklist = (chk: Checklist) => {
    setEditingChk(chk);
    setChkForm({
      project: chk.project,
      remarks: chk.remarks
    });
    
    // Merge saved state with current template structure
    const mergedState: Record<string, boolean> = { ...chk.checkedItems };
    templateItems.forEach(item => {
      // Backwards compatibility with old keys
      const oldKey = `${item.templateName}||${item.itemName}`;
      if (mergedState[oldKey] !== undefined) {
        mergedState[item.id] = mergedState[oldKey];
        delete mergedState[oldKey];
      }
      
      if (mergedState[item.id] === undefined) {
        mergedState[item.id] = false;
      }
    });
    
    setCheckedState(mergedState);
    setIsChkModalOpen(true);
  };

  const toggleCheckItem = (key: string) => {
    setCheckedState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectGroup = (tplName: string, selectAll: boolean) => {
    const updated = { ...checkedState };
    groupedTemplates[tplName]?.forEach(item => {
      updated[item.id] = selectAll;
    });
    setCheckedState(updated);
  };

  const handleSelectAllGlobal = (selectAll: boolean) => {
    const updated = { ...checkedState };
    templateItems.forEach(item => {
      updated[item.id] = selectAll;
    });
    setCheckedState(updated);
  };

  const submitChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chkForm.project) return;

    const totalItems = templateItems.length;

    try {
      setSubmitting(true);
      const payload = {
        project: chkForm.project,
        checkedItems: checkedState,
        remarks: chkForm.remarks,
        totalItems
      };

      let res;
      if (editingChk) {
        res = await fetch(`/api/checklists?rowIndex=${editingChk.rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, referenceNo: editingChk.referenceNo, timestamp: editingChk.timestamp }),
        });
      } else {
        res = await fetch('/api/checklists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsChkModalOpen(false);
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
    const searchMatch = c.referenceNo.toLowerCase().includes(searchQuery.toLowerCase()) || c.project.toLowerCase().includes(searchQuery.toLowerCase());
    const projMatch = filterProject === '' || c.project === filterProject;
    return searchMatch && projMatch;
  });

  const uniqueProjectsList = Array.from(new Set(checklists.map(s => s.project))).filter(Boolean);

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

  // Template Filtering
  const filteredTemplateNames = uniqueTemplateNames.filter(name => {
    return filterTemplateTitle === '' || name === filterTemplateTitle;
  });

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
          <button className={styles.secondaryButton} onClick={() => setActiveTab(activeTab === 'checklists' ? 'templates' : 'checklists')}>
            {activeTab === 'checklists' ? <><Settings size={18} /> Manage Templates</> : <><CheckSquare size={18} /> View Checklists</>}
          </button>
          {activeTab === 'checklists' ? (
            <button className={styles.addButton} onClick={handleCreateChecklist}>
              <Plus size={18} /> Add Checklist
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
      ) : activeTab === 'checklists' ? (
        <>
          <div className={styles.filtersBar}>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search Checklists..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.filterControls}>
              <select className={styles.filterSelect} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
                <option value="">All Projects</option>
                {uniqueProjectsList.map(proj => <option key={proj} value={proj}>{proj}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.chkGrid}>
            {filteredChecklists.map(chk => {
              const totalChecked = Object.values(chk.checkedItems).filter(Boolean).length;
              return (
                <div key={chk.id} className={styles.chkCard} style={{ borderTop: `4px solid ${getBorderColor(chk.completedPercentage)}` }}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                      <Building size={18} /> {chk.project}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: getBorderColor(chk.completedPercentage) }}>{chk.completedPercentage}%</span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span><Tag size={12} /> {chk.referenceNo}</span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressHeader}>
                        <span>Overall Completion</span>
                        <span>{totalChecked} / {templateItems.length} items</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={`${styles.progressFill} ${getProgressColor(chk.completedPercentage)}`} style={{ width: `${chk.completedPercentage}%` }} />
                      </div>
                    </div>
                    
                    {/* Sub-scores per Template */}
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {uniqueTemplateNames.map(tplName => {
                        const itemsForTpl = groupedTemplates[tplName] || [];
                        if (itemsForTpl.length === 0) return null;
                        
                        let checkedCount = 0;
                        itemsForTpl.forEach(item => {
                          // Support both new ID format and old string format
                          if (chk.checkedItems[item.id] || chk.checkedItems[`${tplName}||${item.itemName}`]) {
                            checkedCount++;
                          }
                        });
                        
                        const pct = Math.round((checkedCount / itemsForTpl.length) * 100);
                        
                        return (
                          <div key={tplName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{tplName}</span>
                            <span style={{ color: 'var(--text-light)', fontWeight: 600 }}>{checkedCount} / {itemsForTpl.length} <span style={{ color: getBorderColor(pct), marginLeft: '4px' }}>({pct}%)</span></span>
                          </div>
                        );
                      })}
                    </div>

                    {chk.remarks && (
                      <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-main)', backgroundColor: 'var(--bg-main)', padding: '8px', borderRadius: '6px' }}>
                        <strong>Remarks:</strong> <span style={{ color: 'var(--text-light)' }}>{chk.remarks}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    <button className={`${styles.actionBtn} ${styles.primary}`} onClick={() => handleEditChecklist(chk)}><Edit2 size={12} /> Expand & Update</button>
                    <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setItemToDelete({type: 'checklist', data: chk}); setIsDeleteModalOpen(true); }}><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
            {filteredChecklists.length === 0 && <p style={{ color: 'var(--text-light)' }}>No checklists found.</p>}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.filtersBar}>
            <div className={styles.filterControls} style={{ flex: 1 }}>
              <select className={styles.filterSelect} style={{ width: '250px' }} value={filterTemplateTitle} onChange={(e) => setFilterTemplateTitle(e.target.value)}>
                <option value="">All Template Titles</option>
                {uniqueTemplateNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search items..."
                className={styles.searchInput}
                value={searchItemName}
                onChange={(e) => setSearchItemName(e.target.value)}
              />
            </div>
          </div>
          
          <div className={styles.projectGroupSection}>
            {filteredTemplateNames.map(tplName => {
              const items = groupedTemplates[tplName].filter(item => item.itemName.toLowerCase().includes(searchItemName.toLowerCase()));
              if (items.length === 0) return null;
              
              return (
                <div key={tplName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className={styles.projectGroupHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{tplName}</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className={`${styles.actionBtn} ${styles.primary}`} 
                        onClick={() => handleEditTemplateGroup(tplName)}
                        title="Edit entire template title and items"
                      >
                        <Edit2 size={14} /> Edit Title
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.delete}`} 
                        onClick={() => { setItemToDelete({type: 'templateGroup', data: tplName}); setIsDeleteModalOpen(true); }}
                        title="Delete entire template title and all its items"
                      >
                        <Trash2 size={14} /> Delete Title
                      </button>
                    </div>
                  </div>
                  <div className={styles.tableContainer}>
                    <table className={styles.chkTable} style={{ minWidth: '400px' }}>
                      <thead>
                        <tr>
                          <th>Checklist Item</th>
                          <th style={{ width: '100px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.rowIndex}>
                            <td><strong>{item.itemName}</strong></td>
                            <td>
                              <div className={styles.tableActions}>
                                <button className={styles.controlBtn} onClick={() => handleEditTemplateItem(item)}><Edit2 size={13} /></button>
                                <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setItemToDelete({type: 'template', data: item}); setIsDeleteModalOpen(true); }}><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            {filteredTemplateNames.length === 0 && <p style={{ color: 'var(--text-light)', padding: '20px', textAlign: 'center' }}>No templates found matching your criteria.</p>}
          </div>
        </div>
      )}

      {/* Unified Project Checklist Modal */}
      <Modal isOpen={isChkModalOpen} onClose={() => !submitting && setIsChkModalOpen(false)} title={editingChk ? `Update ${editingChk.project} Checklists` : 'New Project Checklists'} width="800px">
        <form onSubmit={submitChecklist} className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Project</label>
            <select value={chkForm.project} onChange={(e) => setChkForm({...chkForm, project: e.target.value})} className={styles.formSelect} required disabled={!!editingChk}>
              {projects.map(p => <option key={p.id} value={p.basicInfo.name}>{p.basicInfo.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup} style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ margin: 0 }}>Master Checklist (All Templates)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className={styles.secondaryButton} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '12px' }} onClick={() => handleSelectAllGlobal(true)}>Select All</button>
                <button type="button" className={styles.secondaryButton} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '12px' }} onClick={() => handleSelectAllGlobal(false)}>Deselect All</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {uniqueTemplateNames.length > 0 ? (
                uniqueTemplateNames.map(tplName => (
                  <div key={tplName} style={{ backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: 'var(--primary-light)', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ color: 'var(--primary)', margin: 0, fontSize: '0.95rem' }}>{tplName}</h4>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => handleSelectGroup(tplName, true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Select All</button>
                        <span style={{ color: 'var(--primary)', opacity: 0.5 }}>|</span>
                        <button type="button" onClick={() => handleSelectGroup(tplName, false)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Deselect All</button>
                      </div>
                    </div>
                    <div className={styles.formRow} style={{ padding: '12px', gap: '10px' }}>
                      {groupedTemplates[tplName].map(item => {
                        const key = item.id;
                        const isChecked = checkedState[key] || false;
                        return (
                          <div key={item.id} className={`${styles.checklistItem} ${isChecked ? styles.checked : ''}`} onClick={() => toggleCheckItem(key)}>
                            <input type="checkbox" checked={isChecked} onChange={() => {}} onClick={(e) => e.stopPropagation()} />
                            <span className={styles.itemLabel}>{item.itemName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>No checklist templates have been configured yet.</p>
              )}
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: '12px' }}>
            <label>Remarks / Notes</label>
            <input type="text" value={chkForm.remarks} onChange={(e) => setChkForm({...chkForm, remarks: e.target.value})} className={styles.formInput} placeholder="Optional notes" />
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsChkModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Saving...' : 'Save Master Checklist'}</button>
          </div>
        </form>
      </Modal>

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
                  onClick={() => { setIsNewTemplateName(!isNewTemplateName); setTplForm({...tplForm, templateName: ''}) }}
                >
                  {isNewTemplateName ? 'Select Existing' : 'Create New Title'}
                </button>
              )}
            </div>
            
            {isNewTemplateName ? (
              <input 
                type="text" 
                value={tplForm.templateName} 
                onChange={(e) => setTplForm({...tplForm, templateName: e.target.value})} 
                className={styles.formInput} 
                placeholder="e.g. 3D CHECKLIST 2024" 
                required 
              />
            ) : (
              <select 
                value={tplForm.templateName} 
                onChange={(e) => setTplForm({...tplForm, templateName: e.target.value})} 
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
