'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, Phone, Mail, FileText,
  MapPin, CreditCard, Star, AlertCircle, Building, UploadCloud, File as FileIcon, X,
  User, Tag, Landmark, Banknote, MessageSquare, History, CheckCircle, Clock, XCircle, FileBadge
} from 'lucide-react';
import styles from './quotations.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';
import jsPDF from 'jspdf';

interface Quotation {
  id: string;
  rowIndex: number;
  createdAt: string;
  project: string;
  title: string;
  vendor: string;
  amount: string;
  version: string;
  status: string;
  internalApproval: { status: string; by: string; at: string };
  clientApproval: { status: string; by: string; at: string };
  remarks: string;
  history: any[];
  currentFile: { name: string; url: string } | null;
}

export default function QuotationsPage() {
  const { activeProject } = useProject();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [editMode, setEditMode] = useState<'CREATE' | 'REVISE' | 'EDIT_DETAILS'>('CREATE');
  const [quoteToDelete, setQuoteToDelete] = useState<Quotation | null>(null);
  const [activeHistoryQuote, setActiveHistoryQuote] = useState<Quotation | null>(null);
  const [pendingActionQuote, setPendingActionQuote] = useState<Quotation | null>(null);
  const [pendingActionType, setPendingActionType] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    project: '',
    title: '',
    vendor: '',
    amount: '',
    remarks: '',
  });

  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    fetchQuotations();
    fetchProjects();
    fetchVendors();
  }, []);

  async function fetchQuotations() {
    setLoading(true);
    try {
      const res = await fetch('/api/quotations');
      if (res.ok) {
        setQuotations(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        setProjects(await res.json());
      }
    } catch (err) { console.error(err); }
  }

  async function fetchVendors() {
    try {
      const res = await fetch('/api/vendors');
      if (res.ok) {
        setVendors(await res.json());
      }
    } catch (err) { console.error(err); }
  }

  const handleCreate = () => {
    setEditingQuote(null);
    setEditMode('CREATE');
    setFormData({
      project: projects.length > 0 ? projects[0].basicInfo.name : '',
      title: '', vendor: '', amount: '', remarks: ''
    });
    setFiles([]);
    setIsModalOpen(true);
  };

  const handleRevise = (q: Quotation) => {
    setEditingQuote(q);
    setEditMode('REVISE');
    setFormData({
      project: q.project, title: q.title, vendor: q.vendor, 
      amount: q.amount, remarks: q.remarks
    });
    setFiles([]);
    setIsModalOpen(true);
  };

  const handleEditDetails = (q: Quotation) => {
    setEditingQuote(q);
    setEditMode('EDIT_DETAILS');
    setFormData({
      project: q.project, title: q.title, vendor: q.vendor, 
      amount: q.amount, remarks: q.remarks
    });
    setFiles([]);
    setIsModalOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      setSubmitting(true);
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      
      let finalFiles = files;
      if (files.length > 0 && files.every(f => f.type.startsWith('image/'))) {
        const pdf = new jsPDF();
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const imgUrl = URL.createObjectURL(file);
          const img = new Image();
          img.src = imgUrl;
          await new Promise((resolve) => { img.onload = () => resolve(true); img.onerror = () => resolve(false); });
          if (!img.width) { URL.revokeObjectURL(imgUrl); continue; }
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgRatio = img.width / img.height;
          const pdfRatio = pdfWidth / pdfHeight;
          let finalWidth = pdfWidth;
          let finalHeight = pdfHeight;
          if (imgRatio > pdfRatio) { finalHeight = pdfWidth / imgRatio; } else { finalWidth = pdfHeight * imgRatio; }
          const x = (pdfWidth - finalWidth) / 2;
          const y = (pdfHeight - finalHeight) / 2;
          if (i > 0) { pdf.addPage(); pdf.setPage(i + 1); }
          const format = file.type === 'image/png' ? 'PNG' : 'JPEG';
          pdf.addImage(img, format, x, y, finalWidth, finalHeight, `img_${i}`);
          URL.revokeObjectURL(imgUrl);
        }
        const pdfBlob = pdf.output('blob');
        finalFiles = [new File([pdfBlob], `Quotation_${Date.now()}.pdf`, { type: 'application/pdf' })];
      }

      finalFiles.forEach(f => fd.append('newFiles', f));
      
      let res;
      if (editMode === 'REVISE' && editingQuote) {
        fd.append('id', editingQuote.id);
        fd.append('createdAt', editingQuote.createdAt);
        fd.append('version', editingQuote.version);
        fd.append('status', editingQuote.status);
        fd.append('internalApproval', JSON.stringify(editingQuote.internalApproval));
        fd.append('clientApproval', JSON.stringify(editingQuote.clientApproval));
        fd.append('history', JSON.stringify(editingQuote.history));
        fd.append('currentFile', JSON.stringify(editingQuote.currentFile));
        fd.append('actionType', 'UPLOAD_REVISION');
        fd.append('actionNotes', 'New revision uploaded');

        res = await fetch(`/api/quotations?rowIndex=${editingQuote.rowIndex}`, {
          method: 'PUT',
          body: fd,
        });
      } else if (editMode === 'EDIT_DETAILS' && editingQuote) {
        fd.append('id', editingQuote.id);
        fd.append('createdAt', editingQuote.createdAt);
        fd.append('version', editingQuote.version);
        fd.append('status', editingQuote.status);
        fd.append('internalApproval', JSON.stringify(editingQuote.internalApproval));
        fd.append('clientApproval', JSON.stringify(editingQuote.clientApproval));
        fd.append('history', JSON.stringify(editingQuote.history));
        fd.append('currentFile', JSON.stringify(editingQuote.currentFile));
        fd.append('actionType', 'UPDATE');
        fd.append('actionNotes', 'Details updated');

        res = await fetch(`/api/quotations?rowIndex=${editingQuote.rowIndex}`, {
          method: 'PUT',
          body: fd,
        });
      } else {
        res = await fetch('/api/quotations', {
          method: 'POST',
          body: fd,
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchQuotations();
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

  const initiateAction = (quote: Quotation, actionType: string) => {
    setPendingActionQuote(quote);
    setPendingActionType(actionType);
    setActionNotes('');
    setIsActionModalOpen(true);
  };

  const confirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingActionQuote) return;

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('id', pendingActionQuote.id);
      fd.append('project', pendingActionQuote.project);
      fd.append('title', pendingActionQuote.title);
      fd.append('vendor', pendingActionQuote.vendor);
      fd.append('amount', pendingActionQuote.amount);
      fd.append('remarks', pendingActionQuote.remarks);
      fd.append('version', pendingActionQuote.version);
      fd.append('status', pendingActionQuote.status);
      fd.append('internalApproval', JSON.stringify(pendingActionQuote.internalApproval));
      fd.append('clientApproval', JSON.stringify(pendingActionQuote.clientApproval));
      fd.append('history', JSON.stringify(pendingActionQuote.history));
      fd.append('currentFile', JSON.stringify(pendingActionQuote.currentFile));
      
      fd.append('actionType', pendingActionType);
      fd.append('actionNotes', actionNotes);

      const res = await fetch(`/api/quotations?rowIndex=${pendingActionQuote.rowIndex}`, {
        method: 'PUT',
        body: fd,
      });

      if (res.ok) {
        setIsActionModalOpen(false);
        setPendingActionQuote(null);
        fetchQuotations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!quoteToDelete) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/quotations?rowIndex=${quoteToDelete.rowIndex}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setQuoteToDelete(null);
        fetchQuotations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Approved')) return 'var(--success)';
    if (status.includes('Pending')) return '#f39c12';
    if (status.includes('Revision')) return 'var(--danger)';
    return 'var(--text-light)';
  };

  const filteredQuotes = quotations.filter(q => {
    const searchStr = `${q.title} ${q.project} ${q.vendor} ${q.id}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
    const matchesProj = filterProject === '' || q.project === filterProject;
    return matchesSearch && matchesProj;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Quotation Management</h2>
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
            <span className="current">Quotations</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreate}>
            <Plus size={18} /> Add Quotation
          </button>
        </div>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search quotations..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterControls}>
          <select className={styles.filterSelect} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.basicInfo.name}>{p.basicInfo.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading quotations...</div>
      ) : (
        <div className={styles.memberGrid}>
          {filteredQuotes.map(q => (
            <div key={q.id} className={styles.memberCard}>
              <div className={styles.memberTop}>
                <div className={styles.memberPrimary}>
                  <div className={styles.memberName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileBadge size={16} color="var(--primary)" /> {q.title}
                  </div>
                  <div className={styles.memberDesignation}>{q.project} • {q.version}</div>
                </div>
                <div className={styles.recordControls}>
                  <button className={styles.controlBtn} title="Edit Details" onClick={() => handleEditDetails(q)}><Edit2 size={14} /></button>
                  <button className={styles.controlBtn} title="View History" onClick={() => { setActiveHistoryQuote(q); setIsHistoryModalOpen(true); }}><History size={14} /></button>
                  <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setQuoteToDelete(q); setIsDeleteModalOpen(true); }}><Trash2 size={14} /></button>
                </div>
              </div>
              
              <div style={{ marginBottom: '8px', fontSize: '0.8rem', fontWeight: 600, color: getStatusColor(q.status) }}>
                {q.status}
              </div>

              <div className={styles.memberDetails}>
                <div className={styles.detailRow}>
                  <Building size={12} style={{ width: '70px' }} />
                  <div className={styles.detailValue}>{q.vendor || '-'}</div>
                </div>
                <div className={styles.detailRow}>
                  <Banknote size={12} style={{ width: '70px' }} />
                  <div className={styles.detailValue}>₹{q.amount ? Number(q.amount).toLocaleString() : '-'}</div>
                </div>
              </div>

              {q.currentFile && (
                <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                  <a href={q.currentFile.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-main)', padding: '6px 10px', borderRadius: '4px', textDecoration: 'none', color: 'var(--primary)', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                    <FileText size={14} /> View Current Document
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
                {q.status === 'Pending Internal' && (
                  <>
                    <button onClick={() => initiateAction(q, 'APPROVE_INTERNAL')} className={styles.secondaryButton} style={{ flex: 1, backgroundColor: 'var(--success)', color: 'white', border: 'none', padding: '6px' }}>Approve Internal</button>
                    <button onClick={() => initiateAction(q, 'REQUEST_REVISION')} className={styles.secondaryButton} style={{ flex: 1, backgroundColor: 'var(--danger)', color: 'white', border: 'none', padding: '6px' }}>Reject</button>
                  </>
                )}
                {q.status === 'Pending Client' && (
                  <>
                    <button onClick={() => initiateAction(q, 'APPROVE_CLIENT')} className={styles.secondaryButton} style={{ flex: 1, backgroundColor: 'var(--success)', color: 'white', border: 'none', padding: '6px' }}>Client Approved</button>
                    <button onClick={() => initiateAction(q, 'REQUEST_REVISION')} className={styles.secondaryButton} style={{ flex: 1, backgroundColor: 'var(--danger)', color: 'white', border: 'none', padding: '6px' }}>Client Rejected</button>
                  </>
                )}
                {q.status === 'Needs Revision' && (
                  <button onClick={() => handleRevise(q)} className={styles.submitBtn} style={{ width: '100%', padding: '6px' }}>Upload Revision</button>
                )}
              </div>

            </div>
          ))}
          {filteredQuotes.length === 0 && <p style={{ color: 'var(--text-light)', gridColumn: '1 / -1' }}>No quotations found.</p>}
        </div>
      )}

      {/* Add / Revise Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={editMode === 'REVISE' ? `Upload Revision (${editingQuote?.title})` : editMode === 'EDIT_DETAILS' ? `Edit Quotation (${editingQuote?.title})` : 'Add New Quotation'} width="650px">
        <form onSubmit={submitForm} className={styles.formGrid}>
          
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Details</h4>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Tag size={14} /> Project</label>
              <select value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} className={styles.formSelect} required disabled={editMode !== 'CREATE'}>
                {projects.map(p => <option key={p.id} value={p.basicInfo.name}>{p.basicInfo.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><FileText size={14} /> Title / Description</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={styles.formInput} required disabled={editMode === 'REVISE'} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Building size={14} /> Vendor Name</label>
              <select value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} className={styles.formSelect}>
                <option value="">-- Select Vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.companyName}>{v.companyName}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><Banknote size={14} /> Amount (₹)</label>
              <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className={styles.formInput} />
            </div>
          </div>

          <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
            <label><UploadCloud size={14} /> Upload PDF/Doc {editMode === 'EDIT_DETAILS' && "(Optional - Leave empty to keep current file)"}</label>
            <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
              <label>
                <UploadCloud size={24} style={{ color: 'var(--primary)' }} />
                <span>Click to browse or drag and drop files</span>
              </label>
              <input type="file" ref={fileInputRef} onChange={e => setFiles(Array.from(e.target.files || []))} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" required={editMode !== 'EDIT_DETAILS'} />
            </div>
            
            {files.length > 0 && (
              <div className={styles.uploadedStagedList}>
                <strong>Staged File</strong>
                <div className={styles.stagingGrid}>
                  {files.map((file, i) => (
                    <div key={i} className={styles.stagedFileItem}>
                      <div className={styles.stagedFileLeft} title={file.name}>
                        <FileIcon size={14} style={{ color: 'var(--success)' }} />
                        <span className={styles.stagedFileName}>{file.name}</span>
                      </div>
                      <button type="button" className={styles.removeStagedBtn} onClick={() => setFiles(files.filter((_, idx) => idx !== i))}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
            <label><MessageSquare size={14} /> Remarks / Notes</label>
            <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className={styles.formTextarea} />
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Uploading...' : 'Save Quotation'}</button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Quotation History" width="500px">
        {activeHistoryQuote && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <strong>{activeHistoryQuote.title}</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Current Status: {activeHistoryQuote.status}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '2px solid var(--border-color)', marginLeft: '8px', paddingLeft: '16px' }}>
              {activeHistoryQuote.history.map((evt, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-23px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary)', border: '2px solid var(--bg-card)' }}></div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{evt.action}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{new Date(evt.at).toLocaleString()} by {evt.by}</div>
                  {evt.notes && <div style={{ fontSize: '0.8rem', marginTop: '4px', fontStyle: 'italic' }}>"{evt.notes}"</div>}
                  {evt.file && (
                    <a href={evt.file.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', marginTop: '4px', color: 'var(--primary)', textDecoration: 'none' }}>
                      <FileIcon size={12} /> View Document
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal isOpen={isActionModalOpen} onClose={() => !submitting && setIsActionModalOpen(false)} title="Action Notes" width="400px">
        <form onSubmit={confirmAction}>
          <div className={styles.formGroup}>
            <label><MessageSquare size={14} /> Add Notes (Optional)</label>
            <textarea 
              value={actionNotes} 
              onChange={e => setActionNotes(e.target.value)} 
              className={styles.formTextarea} 
              placeholder="E.g. Approved with condition... or Error in pricing..."
              autoFocus
            />
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsActionModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting} style={{ backgroundColor: pendingActionType === 'REQUEST_REVISION' ? 'var(--danger)' : 'var(--success)' }}>
              {submitting ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !submitting && setIsDeleteModalOpen(false)} title="Confirm Deletion" width="400px" type="danger">
        <div className={styles.deleteConfirmBody}>
          <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <p>Are you sure you want to delete <strong>{quoteToDelete?.title}</strong>?</p>
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} disabled={submitting}>Cancel</button>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
