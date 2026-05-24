'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, Calendar, FileText,
  MapPin, CheckCircle, AlertCircle, Building, UploadCloud, File as FileIcon, X,
  User, Users, ClipboardCheck, AlertTriangle, XCircle, Tag, MessageSquare
} from 'lucide-react';
import styles from './audits.module.css';
import Modal from '@/components/Modal';

interface Audit {
  id: string;
  rowIndex: number;
  createdAt: string;
  project: string;
  auditDate: string;
  auditType: string;
  auditorName: string;
  presentInMeeting: string;
  status: string;
  keyFindings: string;
  actionItems: string;
  remarks: string;
  documents: { name: string; url: string }[];
}

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [auditToDelete, setAuditToDelete] = useState<Audit | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<{ name: string; url: string }[]>([]);

  const [formData, setFormData] = useState({
    project: '',
    auditDate: '',
    auditType: 'Site Quality Audit',
    auditorName: '',
    presentInMeeting: '',
    status: 'Pass',
    keyFindings: '',
    actionItems: '',
    remarks: '',
  });

  useEffect(() => {
    fetchAudits();
    fetchProjects();
  }, []);

  async function fetchAudits() {
    setLoading(true);
    try {
      const res = await fetch('/api/audits');
      if (res.ok) {
        setAudits(await res.json());
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

  const handleCreate = () => {
    setEditingAudit(null);
    setFormData({
      project: projects.length > 0 ? projects[0].basicInfo.name : '',
      auditDate: new Date().toISOString().split('T')[0],
      auditType: 'Site Quality Audit',
      auditorName: '',
      presentInMeeting: '',
      status: 'Pass',
      keyFindings: '',
      actionItems: '',
      remarks: ''
    });
    setFiles([]);
    setExistingDocs([]);
    setIsModalOpen(true);
  };

  const handleEdit = (a: Audit) => {
    setEditingAudit(a);
    setFormData({
      project: a.project,
      auditDate: a.auditDate,
      auditType: a.auditType,
      auditorName: a.auditorName,
      presentInMeeting: a.presentInMeeting,
      status: a.status,
      keyFindings: a.keyFindings,
      actionItems: a.actionItems,
      remarks: a.remarks
    });
    setFiles([]);
    setExistingDocs(a.documents || []);
    setIsModalOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project || !formData.auditorName) return;

    try {
      setSubmitting(true);
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      
      files.forEach(f => fd.append('newFiles', f));
      
      let res;
      if (editingAudit) {
        fd.append('id', editingAudit.id);
        fd.append('createdAt', editingAudit.createdAt);
        fd.append('existingDocs', JSON.stringify(existingDocs));

        res = await fetch(`/api/audits?rowIndex=${editingAudit.rowIndex}`, {
          method: 'PUT',
          body: fd,
        });
      } else {
        res = await fetch('/api/audits', {
          method: 'POST',
          body: fd,
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchAudits();
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

  const handleDelete = async () => {
    if (!auditToDelete) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/audits?rowIndex=${auditToDelete.rowIndex}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setAuditToDelete(null);
        fetchAudits();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Pass') return 'var(--success)';
    if (status === 'Fail') return 'var(--danger)';
    if (status === 'Needs Improvement') return '#f39c12';
    return 'var(--text-light)';
  };

  const filteredAudits = audits.filter(a => {
    const searchStr = `${a.project} ${a.auditorName} ${a.auditType} ${a.id}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
    const matchesProj = filterProject === '' || a.project === filterProject;
    return matchesSearch && matchesProj;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Audit Management</h2>
          <p>Track site quality, financials, and compliance audits across projects.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreate}>
            <Plus size={18} /> Log Audit
          </button>
        </div>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search audits..."
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
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading audits...</div>
      ) : (
        <div className={styles.memberGrid}>
          {filteredAudits.map(a => (
            <div key={a.id} className={styles.memberCard}>
              <div className={styles.memberTop}>
                <div className={styles.memberPrimary}>
                  <div className={styles.memberName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClipboardCheck size={16} color="var(--primary)" /> {a.auditType}
                  </div>
                  <div className={styles.memberDesignation}>{a.project}</div>
                </div>
                <div className={styles.recordControls}>
                  <button className={styles.controlBtn} title="Edit Audit" onClick={() => handleEdit(a)}><Edit2 size={14} /></button>
                  <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setAuditToDelete(a); setIsDeleteModalOpen(true); }}><Trash2 size={14} /></button>
                </div>
              </div>
              
              <div style={{ marginBottom: '12px', fontSize: '0.8rem', fontWeight: 600, color: getStatusColor(a.status), display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', backgroundColor: `${getStatusColor(a.status)}20` }}>
                {a.status === 'Pass' && <CheckCircle size={14} />}
                {a.status === 'Fail' && <XCircle size={14} />}
                {a.status === 'Needs Improvement' && <AlertTriangle size={14} />}
                {a.status}
              </div>

              <div className={styles.memberDetails}>
                <div className={styles.detailRow}>
                  <Calendar size={12} style={{ width: '70px' }} />
                  <div className={styles.detailValue}>{a.auditDate || '-'}</div>
                </div>
                <div className={styles.detailRow}>
                  <User size={12} style={{ width: '70px' }} />
                  <div className={styles.detailValue}>{a.auditorName || '-'}</div>
                </div>
                {a.presentInMeeting && (
                  <div className={styles.detailRow}>
                    <Users size={12} style={{ width: '70px' }} />
                    <div className={styles.detailValue} style={{ fontSize: '0.75rem' }}>{a.presentInMeeting}</div>
                  </div>
                )}
              </div>

              {a.keyFindings && (
                 <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                   <strong>Key Findings:</strong> {a.keyFindings.length > 60 ? a.keyFindings.substring(0, 60) + '...' : a.keyFindings}
                 </div>
              )}

              {a.documents && a.documents.length > 0 && (
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>Attached Evidence:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {a.documents.map((doc, idx) => (
                      <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', textDecoration: 'none' }}>
                        <FileIcon size={12} /> {doc.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredAudits.length === 0 && <p style={{ color: 'var(--text-light)', gridColumn: '1 / -1' }}>No audits found.</p>}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={editingAudit ? 'Edit Audit Log' : 'Log New Audit'} width="700px">
        <form onSubmit={submitForm} className={styles.formGrid}>
          
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Audit Details</h4>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Tag size={14} /> Project</label>
              <select value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} className={styles.formSelect} required disabled={!!editingAudit}>
                {projects.map(p => <option key={p.id} value={p.basicInfo.name}>{p.basicInfo.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><Calendar size={14} /> Audit Date</label>
              <input type="date" value={formData.auditDate} onChange={e => setFormData({...formData, auditDate: e.target.value})} className={styles.formInput} required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><ClipboardCheck size={14} /> Audit Type</label>
              <select value={formData.auditType} onChange={e => setFormData({...formData, auditType: e.target.value})} className={styles.formSelect} required>
                <option value="Site Quality Audit">Site Quality Audit</option>
                <option value="Financial Audit">Financial Audit</option>
                <option value="Safety & Compliance">Safety & Compliance</option>
                <option value="Process Audit">Process Audit</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><AlertCircle size={14} /> Overall Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className={styles.formSelect} required>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Needs Improvement">Needs Improvement</option>
                <option value="Pending Review">Pending Review</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><User size={14} /> Auditor Name</label>
              <input type="text" value={formData.auditorName} onChange={e => setFormData({...formData, auditorName: e.target.value})} className={styles.formInput} required />
            </div>
            <div className={styles.formGroup}>
              <label><Users size={14} /> Present In Meeting</label>
              <input type="text" value={formData.presentInMeeting} onChange={e => setFormData({...formData, presentInMeeting: e.target.value})} className={styles.formInput} placeholder="e.g. Rahul, John" />
            </div>
          </div>

          <h4 style={{ margin: '16px 0 8px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Findings & Evidence</h4>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><AlertTriangle size={14} /> Key Findings</label>
              <textarea value={formData.keyFindings} onChange={e => setFormData({...formData, keyFindings: e.target.value})} className={styles.formTextarea} style={{ minHeight: '80px' }} />
            </div>
            <div className={styles.formGroup}>
              <label><CheckCircle size={14} /> Action Items</label>
              <textarea value={formData.actionItems} onChange={e => setFormData({...formData, actionItems: e.target.value})} className={styles.formTextarea} style={{ minHeight: '80px' }} placeholder="What needs to be fixed?" />
            </div>
          </div>
          
          <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
            <label><MessageSquare size={14} /> Remarks / General Notes</label>
            <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className={styles.formTextarea} />
          </div>

          <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
            <label><UploadCloud size={14} /> Upload Documents / Evidence</label>
            <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
              <label>
                <UploadCloud size={24} style={{ color: 'var(--primary)' }} />
                <span>Click to browse or drag and drop files</span>
              </label>
              <input type="file" ref={fileInputRef} onChange={e => setFiles(Array.from(e.target.files || []))} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" multiple />
            </div>
            
            {(existingDocs.length > 0 || files.length > 0) && (
              <div className={styles.uploadedStagedList}>
                <div className={styles.stagingGrid}>
                  {existingDocs.map((doc, i) => (
                    <div key={`ext-${i}`} className={styles.stagedFileItem}>
                      <div className={styles.stagedFileLeft} title={doc.name}>
                        <FileIcon size={14} style={{ color: 'var(--primary)' }} />
                        <span className={styles.stagedFileName}>{doc.name}</span>
                      </div>
                      <button type="button" className={styles.removeStagedBtn} onClick={() => setExistingDocs(existingDocs.filter((_, idx) => idx !== i))}><X size={16} /></button>
                    </div>
                  ))}
                  {files.map((file, i) => (
                    <div key={`new-${i}`} className={styles.stagedFileItem}>
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

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Saving...' : 'Save Audit'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !submitting && setIsDeleteModalOpen(false)} title="Confirm Deletion" width="400px" type="danger">
        <div className={styles.deleteConfirmBody}>
          <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <p>Are you sure you want to delete this audit for <strong>{auditToDelete?.project}</strong>?</p>
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} disabled={submitting}>Cancel</button>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
