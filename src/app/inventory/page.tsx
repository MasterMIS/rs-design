'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Settings,
  CheckSquare, X, Package, ArrowDownLeft, ArrowUpRight,
  Database, Tag, Hash, Scale, Loader2, RefreshCw
} from 'lucide-react';
import styles from './inventory.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';

interface InventoryTemplate {
  id: string;
  rowIndex: number;
  itemNo: string;
  itemName: string;
  category: string;
  unit: string;
}

interface InventoryEstimate {
  id: string;
  rowIndex?: number;
  project: string;
  itemNo: string;
  estimatedQty: string;
}

interface InventoryTransaction {
  id: string;
  rowIndex?: number;
  project: string;
  itemNo: string;
  type: string;
  quantity: string;
  date: string;
  remarks: string;
}

const getCategoryIcon = (size = 16) => {
  const style = { marginRight: '8px', flexShrink: 0 };
  return <Database size={size} style={style} />;
};

export default function InventoryPage() {
  const { activeProject } = useProject();
  const [templates, setTemplates] = useState<InventoryTemplate[]>([]);
  const [estimates, setEstimates] = useState<InventoryEstimate[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'templates'>('view');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchItemName, setSearchItemName] = useState('');

  // Modals
  const [isTplModalOpen, setIsTplModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<InventoryTemplate | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Transaction Modal
  const [isTrxModalOpen, setIsTrxModalOpen] = useState(false);
  const [trxType, setTrxType] = useState<'In' | 'Out'>('In');
  const [activeItem, setActiveItem] = useState<InventoryTemplate | null>(null);
  const [trxForm, setTrxForm] = useState({ quantity: '', remarks: '', date: new Date().toISOString().split('T')[0] });

  // Estimate Modal
  const [isEstModalOpen, setIsEstModalOpen] = useState(false);
  const [estFormQty, setEstFormQty] = useState('');

  // Forms
  const [tplForm, setTplForm] = useState<Partial<InventoryTemplate>>({
    itemNo: '', itemName: '', category: 'General', unit: 'Nos'
  });
  
  // State for project estimates
  const [localEstimates, setLocalEstimates] = useState<Record<string, string>>({});

  const activeProjectName = activeProject?.name || '';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!activeProjectName || templates.length === 0) {
      setLocalEstimates({});
      return;
    }

    const projectEstimates = estimates.filter(e => e.project === activeProjectName);
    const estMap: Record<string, string> = {};

    templates.forEach(tpl => {
      const existing = projectEstimates.find(e => e.itemNo === tpl.itemNo);
      estMap[tpl.itemNo] = existing ? existing.estimatedQty : '';
    });

    setLocalEstimates(estMap);
  }, [templates, estimates, activeProjectName]);

  async function fetchData() {
    setLoading(true);
    try {
      const [tplRes, estRes, trxRes] = await Promise.all([
        fetch('/api/inventory/templates'),
        fetch('/api/inventory/estimates'),
        fetch('/api/inventory/transactions')
      ]);

      if (tplRes.ok) setTemplates(await tplRes.json());
      if (estRes.ok) setEstimates(await estRes.json());
      if (trxRes.ok) setTransactions(await trxRes.json());
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
  }, {} as Record<string, InventoryTemplate[]>);

  const uniqueCategories = Object.keys(groupedByCategory).sort((a, b) => a.localeCompare(b));
  const activeCategory = (selectedCategory && uniqueCategories.includes(selectedCategory))
    ? selectedCategory
    : uniqueCategories[0] || null;

  // ---- ESTIMATES HANDLERS ----
  const handleEstimateChange = (itemNo: string, value: string) => {
    setLocalEstimates(prev => ({ ...prev, [itemNo]: value }));
  };

  const openEstimateModal = (item: InventoryTemplate) => {
    setActiveItem(item);
    setEstFormQty(localEstimates[item.itemNo] || '');
    setIsEstModalOpen(true);
  };

  const submitEstimateModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectName || !activeItem) return;
    try {
      setSubmitting(true);
      const existing = estimates.find(e => e.project === activeProjectName && e.itemNo === activeItem.itemNo);
      
      const payload = { project: activeProjectName, itemNo: activeItem.itemNo, estimatedQty: estFormQty || '0' };
      const url = existing?.rowIndex ? `/api/inventory/estimates?rowIndex=${existing.rowIndex}` : '/api/inventory/estimates';
      const method = existing?.rowIndex ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEstModalOpen(false);
        setLocalEstimates(prev => ({ ...prev, [activeItem.itemNo]: estFormQty || '0' }));
        await fetchData(); 
      } else {
        alert('Failed to save estimate.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving estimate.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- TRANSACTIONS HANDLERS ----
  const openTransactionModal = (item: InventoryTemplate, type: 'In' | 'Out') => {
    setActiveItem(item);
    setTrxType(type);
    setTrxForm({ quantity: '', remarks: '', date: new Date().toISOString().split('T')[0] });
    setIsTrxModalOpen(true);
  };

  const submitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectName || !activeItem || !trxForm.quantity) return;

    try {
      setSubmitting(true);
      const payload = {
        project: activeProjectName,
        itemNo: activeItem.itemNo,
        type: trxType,
        quantity: trxForm.quantity,
        date: trxForm.date,
        remarks: trxForm.remarks,
        addedBy: 'User' // We can replace with actual user context later
      };

      const res = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsTrxModalOpen(false);
        await fetchData();
      } else {
        alert('Failed to save transaction.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- TEMPLATE HANDLERS ----
  const handleAddTemplate = () => {
    setEditingTpl(null);
    setTplForm({ itemNo: '', itemName: '', category: uniqueCategories[0] || 'General', unit: 'Nos' });
    setIsTplModalOpen(true);
  };

  const handleEditTemplate = (item: InventoryTemplate) => {
    setEditingTpl(item);
    setTplForm({ ...item });
    setIsTplModalOpen(true);
  };

  const submitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tplForm.itemName || !tplForm.category) {
      alert('Item Name and Category are required.');
      return;
    }

    const submissionForm = { ...tplForm };
    if (!submissionForm.itemNo) {
      submissionForm.itemNo = `ITM-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    try {
      setSubmitting(true);
      const url = editingTpl ? `/api/inventory/templates?rowIndex=${editingTpl.rowIndex}` : '/api/inventory/templates';
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
      const res = await fetch(`/api/inventory/templates?rowIndex=${itemToDelete.rowIndex}`, { method: 'DELETE' });
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
          <h2>Inventory</h2>
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
            <span className="current">Inventory</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchItemName}
              onChange={(e) => setSearchItemName(e.target.value)}
            />
          </div>
          <button className={styles.secondaryButton} onClick={() => setActiveTab(activeTab === 'view' ? 'templates' : 'view')}>
            {activeTab === 'view' ? <><Settings size={18} /> Manage Templates</> : <><Package size={18} /> View Inventory</>}
          </button>
          {activeTab === 'templates' && (
            <button className={styles.addButton} onClick={handleAddTemplate}>
              <Plus size={18} /> Add Item
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
                    {getCategoryIcon()}
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
                  item.itemName.toLowerCase().includes(searchItemName.toLowerCase()) || 
                  item.itemNo.toLowerCase().includes(searchItemName.toLowerCase())
                );

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {items.length > 0 ? (
                      <div className={styles.tableContainer}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {items.map(item => {
                            
                            // Calculate Live Stock
                            const trxs = transactions.filter(t => t.project === activeProjectName && t.itemNo === item.itemNo);
                            const totalIn = trxs.filter(t => t.type === 'In').reduce((sum, t) => sum + parseInt(t.quantity || '0'), 0);
                            const totalOut = trxs.filter(t => t.type === 'Out').reduce((sum, t) => sum + parseInt(t.quantity || '0'), 0);
                            const liveStock = totalIn - totalOut;
                            
                            const estimateVal = localEstimates[item.itemNo] || '';
                            const isEstChanged = estimates.find(e => e.project === activeProjectName && e.itemNo === item.itemNo)?.estimatedQty !== estimateVal;

                            return (
                              <div key={item.rowIndex} style={{
                                display: 'flex',
                                width: '100%',
                                background: activeTab === 'view' ? 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(246,248,255,1) 100%)' : 'var(--bg-card)',
                                borderLeft: activeTab === 'view' ? '4px solid var(--primary-color)' : 'none',
                                boxShadow: activeTab === 'view' ? '0 6px 16px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.06)',
                                borderRadius: '100px',
                                padding: '12px 20px',
                                gap: '20px',
                                alignItems: 'center'
                              }}>
                                {/* Left Section: Item Details */}
                                <div style={{ flex: '0 0 25%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div className={styles.drawingTitleRow} style={{ marginBottom: 0, alignItems: 'flex-start' }}>
                                    <span className={styles.drawingNo} style={{ color: '#2563eb', fontWeight: 700, padding: '4px 0', whiteSpace: 'nowrap' }}>{item.itemNo || 'N/A'}</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                                      <strong className={styles.drawingName} style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: '1.2' }}>{item.itemName}</strong>
                                      <span style={{ color: '#0369a1', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Scale size={12} /> Unit: {item.unit || 'Nos'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Middle Section: Live Stock & Estimates */}
                                <div style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 10px', flexWrap: 'nowrap', gap: '8px' }}>
                                  
                                  {activeTab === 'view' && (
                                    <>
                                      <div 
                                        onClick={() => openEstimateModal(item)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}
                                        title="Click to set estimate"
                                      >
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Est Qty:</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>{estimateVal || '0'}</span>
                                        <Edit2 size={12} color="#94a3b8" style={{ marginLeft: '4px' }} />
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', whiteSpace: 'nowrap' }}>
                                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>In:</span>
                                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8' }}>{totalIn}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fecaca', whiteSpace: 'nowrap' }}>
                                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626' }}>Out:</span>
                                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b91c1c' }}>{totalOut}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', padding: '4px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', whiteSpace: 'nowrap' }}>
                                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#047857' }}>Live:</span>
                                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#065f46' }}>{liveStock}</span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Right Section: Controls */}
                                {activeTab === 'view' ? (
                                  <div style={{ flex: '0 0 230px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button 
                                      onClick={() => openTransactionModal(item, 'In')}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 12px', borderRadius: '6px', border: 'none',
                                        backgroundColor: '#3b82f6', color: '#fff',
                                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(59,130,246,0.3)',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      <ArrowDownLeft size={16} /> Stock In
                                    </button>
                                    <button 
                                      onClick={() => openTransactionModal(item, 'Out')}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 12px', borderRadius: '6px', border: 'none',
                                        backgroundColor: '#ef4444', color: '#fff',
                                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(239,68,68,0.3)',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      Stock Out <ArrowUpRight size={16} />
                                    </button>
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
                  <p style={{ color: 'var(--text-light)' }}>Please create an item template first.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estimate Modal */}
      <Modal 
        isOpen={isEstModalOpen} 
        onClose={() => setIsEstModalOpen(false)} 
        title={`Set Estimate: ${activeItem?.itemName}`}
        width="400px"
      >
        <form onSubmit={submitEstimateModal} className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Estimated Quantity ({activeItem?.unit})</label>
            <input 
              type="number" 
              required
              min="0"
              value={estFormQty} 
              onChange={e => setEstFormQty(e.target.value)} 
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsEstModalOpen(false)}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Saving...' : `Save Estimate`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transaction Modal */}
      <Modal 
        isOpen={isTrxModalOpen} 
        onClose={() => setIsTrxModalOpen(false)} 
        title={`Log Stock ${trxType}: ${activeItem?.itemName}`}
        width="450px"
      >
        <form onSubmit={submitTransaction} className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Quantity ({activeItem?.unit}) <span style={{color: 'red'}}>*</span></label>
            <input 
              type="number" 
              required
              min="1"
              value={trxForm.quantity} 
              onChange={e => setTrxForm({...trxForm, quantity: e.target.value})} 
            />
          </div>
          <div className={styles.formGroup}>
            <label>Date</label>
            <input 
              type="date" 
              required
              value={trxForm.date} 
              onChange={e => setTrxForm({...trxForm, date: e.target.value})} 
            />
          </div>
          <div className={styles.formGroup}>
            <label>Remarks</label>
            <textarea 
              rows={3}
              value={trxForm.remarks} 
              onChange={e => setTrxForm({...trxForm, remarks: e.target.value})} 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', resize: 'none' }}
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsTrxModalOpen(false)}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting} style={{ backgroundColor: trxType === 'In' ? '#3b82f6' : '#ef4444' }}>
              {submitting ? 'Saving...' : `Confirm Stock ${trxType}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="Confirm Deletion"
        type="danger"
        width="450px"
      >
        <div className={styles.modalBody}>
          <p>Are you sure you want to delete <strong>{itemToDelete?.itemName}</strong>?</p>
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
        title={editingTpl ? 'Edit Item Template' : 'Add Item Template'}
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
            <label>Item Name <span style={{color: 'red'}}>*</span></label>
            <input 
              type="text" 
              required 
              value={tplForm.itemName} 
              onChange={e => setTplForm({...tplForm, itemName: e.target.value})} 
            />
          </div>
          <div className={styles.formGroup}>
            <label>Unit</label>
            <input 
              type="text" 
              value={tplForm.unit} 
              onChange={e => setTplForm({...tplForm, unit: e.target.value})} 
              placeholder="e.g., Nos, Kg, Liters, Sq Ft"
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
