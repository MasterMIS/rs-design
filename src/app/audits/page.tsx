'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Edit2, Trash2, FileText, FileUp, File as FileIcon, X, AlertCircle, Link2, Trash
} from 'lucide-react';
import styles from './audits.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';
import jsPDF from 'jspdf';

interface Audit {
  id: string;
  rowIndex: number;
  createdAt: string;
  project: string;
  auditDate: string;
  auditType: string;
  auditorName: string;
  presentInMeeting: string;
  remarks: string;
  documents: { name: string; url: string; title?: string }[];
}

export default function AuditsPage() {
  const { activeProject } = useProject();
  const [audits, setAudits] = useState<Audit[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [auditToDelete, setAuditToDelete] = useState<Audit | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<{ name: string; url: string; title?: string }[]>([]);
  const [uploadMode, setUploadMode] = useState<'images' | 'pdf'>('images');

  const [formData, setFormData] = useState({
    auditDate: '',
    auditType: 'Civil',
    auditorName: '',
    presentInMeeting: '',
    remarks: '',
  });

  useEffect(() => {
    fetchAudits();
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

  const handleCreate = () => {
    if (!activeProject) {
      alert("Please select a project first.");
      return;
    }
    setEditingAudit(null);
    setFormData({
      auditDate: new Date().toISOString().split('T')[0],
      auditType: 'Civil',
      auditorName: '',
      presentInMeeting: '',
      remarks: '',
    });
    setUploadMode('images');
    setFiles([]);
    setExistingDocs([]);
    setIsModalOpen(true);
  };

  const handleEdit = (a: Audit) => {
    setEditingAudit(a);
    setFormData({
      auditDate: a.auditDate,
      auditType: a.auditType,
      auditorName: a.auditorName,
      presentInMeeting: a.presentInMeeting,
      remarks: a.remarks,
    });
    setUploadMode('images');
    setFiles([]);
    setExistingDocs(a.documents || []);
    setIsModalOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.auditType || !activeProject) return;

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('project', activeProject.name);
      
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      
      let finalFiles = files;
      if (uploadMode === 'images' && files.length > 0 && files.every(f => f.type.startsWith('image/'))) {
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
        finalFiles = [new File([pdfBlob], `Audit_${Date.now()}.pdf`, { type: 'application/pdf' })];
      }

      finalFiles.forEach(f => fd.append('newFiles', f));
      
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

  const projectAudits = audits.filter(a => !activeProject || a.project === activeProject.name);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Audits & Inspections</h2>
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
            <span className="current">Audits</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreate}>
            <Plus size={18} /> Add Audit Log
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading audits...</div>
      ) : projectAudits.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
          {activeProject ? `No audits found for ${activeProject.name}.` : 'Select a project to view its audits.'}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.directoryTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Created At</th>
                <th>Audit Date</th>
                <th>Audit Type</th>
                <th>Auditor Name</th>
                <th>Present In Meeting</th>
                <th>Remarks</th>
                <th>Documents</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {projectAudits.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(a)} title="Edit Audit">
                        <Edit2 size={13} />
                      </button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setAuditToDelete(a); setIsDeleteModalOpen(true); }} title="Delete Audit">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>{a.auditDate}</td>
                  <td>
                    <span className={styles.tableRepName}>{a.auditType}</span>
                  </td>
                  <td>{a.auditorName}</td>
                  <td>{a.presentInMeeting}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.remarks}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {a.documents && a.documents.map((doc, idx) => (
                        <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem' }}>
                          <Link2 size={12} /> {doc.title || doc.name}
                        </a>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{a.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={editingAudit ? 'Edit Audit Log' : 'Add Audit Log'} width="700px">
        <form onSubmit={submitForm} className={styles.formGrid}>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Project</label>
              <input type="text" value={activeProject?.name || ''} className={styles.formInput} disabled required />
            </div>
            <div className={styles.formGroup}>
              <label>Audit Date *</label>
              <input type="date" value={formData.auditDate} onChange={e => setFormData({...formData, auditDate: e.target.value})} className={styles.formInput} required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Audit Type *</label>
              <select value={formData.auditType} onChange={e => setFormData({...formData, auditType: e.target.value})} className={styles.formSelect} required>
        <option value="Civil">Civil</option>
        <option value="Electrical">Electrical</option>
        <option value="Plumbing">Plumbing</option>
        <option value="Tiles and marble">Tiles and marble</option>
        <option value="AC">AC</option>
        <option value="Paint and polish">Paint and polish</option>
        <option value="Carpentry">Carpentry</option>
        <option value="Hardware">Hardware</option>
        <option value="False ceiling and furnishing">False ceiling and furnishing</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Auditor Name</label>
              <input type="text" value={formData.auditorName} onChange={e => setFormData({...formData, auditorName: e.target.value})} className={styles.formInput} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label>Present In Meeting</label>
              <input type="text" value={formData.presentInMeeting} onChange={e => setFormData({...formData, presentInMeeting: e.target.value})} className={styles.formInput} />
            </div>
          </div>

          <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
            <label><FileUp size={14} /> Upload Documents</label>
            
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '8px', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="radio" name="uploadMode" checked={uploadMode === 'images'} onChange={() => { setUploadMode('images'); setFiles([]); }} />
                Images (Auto-convert to PDF)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="radio" name="uploadMode" checked={uploadMode === 'pdf'} onChange={() => { setUploadMode('pdf'); setFiles([]); }} />
                PDF Documents
              </label>
            </div>

            <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
              <label>
                <FileUp size={24} style={{ color: 'var(--text-light)', marginBottom: '4px' }} />
                <span>Click to select or upload multiple files</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>File will be saved to secure Google Drive folder</span>
              </label>
              <input type="file" ref={fileInputRef} onChange={e => setFiles(prev => [...prev, ...(Array.from(e.target.files || []) as File[])])} style={{ display: 'none' }} accept={uploadMode === 'images' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.zip,image/*'} multiple />
            </div>
            
            {files.length > 0 && (
              <div className={styles.uploadedStagedList}>
                <strong>New Files to Upload ({files.length}):</strong>
                <div className={styles.stagingGrid}>
                  {files.map((file, i) => (
                    <div key={i} className={styles.stagedFileItem}>
                      <div className={styles.stagedFileLeft} title={file.name}>
                        {uploadMode === 'images' ? (
                          <img src={URL.createObjectURL(file)} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <FileIcon size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                        )}
                        <span className={styles.stagedFileName}>{file.name}</span>
                      </div>
                      <button type="button" className={styles.removeStagedBtn} onClick={() => setFiles(files.filter((_, idx) => idx !== i))}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editingAudit && existingDocs.length > 0 && (
              <div className={styles.uploadedStagedList} style={{ marginTop: '12px' }}>
                <strong>Currently Saved Attachments:</strong>
                <div className={styles.stagingGrid}>
                  {existingDocs.map((doc, idx) => (
                    <div key={idx} className={styles.stagedFileItem} style={{ borderColor: 'rgba(39, 206, 138, 0.3)' }}>
                      <div className={styles.stagedFileLeft}>
                        <Link2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.stagedFileName} style={{ color: 'var(--success)', textDecoration: 'none', maxWidth: '200px' }} title={doc.name}>
                          {doc.title || doc.name}
                        </a>
                      </div>
                      <button type="button" className={styles.removeStagedBtn} onClick={() => setExistingDocs(existingDocs.filter((_, i) => i !== idx))} title="Remove attachment">
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
            <label>Remarks</label>
            <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className={styles.formTextarea} />
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
