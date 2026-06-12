'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Edit2, Trash2, FileText, FileUp, File as FileIcon, X, AlertCircle, Link2, Trash
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
  nameOfPerson: string;
  nameOfQuotation: string;
  documentUrl: string;
  remarks: string;
  statusRSDesign: string;
  timestampRSDesign: string;
  statusClient: string;
  timestampClient: string;
}

export default function QuotationsPage() {
  const { activeProject } = useProject();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quotation | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMode, setUploadMode] = useState<'images' | 'pdf'>('images');

  const [formData, setFormData] = useState({
    nameOfPerson: '',
    nameOfQuotation: '',
    remarks: '',
    statusRSDesign: 'Pending',
    statusClient: 'Pending',
    documentUrl: '',
  });

  const statuses = ['Pending', 'Approved', 'Rejected', 'Needs Revision'];

  useEffect(() => {
    fetchQuotations();
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

  const handleCreate = () => {
    if (!activeProject) {
      alert("Please select a project first.");
      return;
    }
    setEditingQuote(null);
    setFormData({
      nameOfPerson: '',
      nameOfQuotation: '',
      remarks: '',
      statusRSDesign: 'Pending',
      statusClient: 'Pending',
      documentUrl: '',
    });
    setUploadMode('images');
    setFiles([]);
    setIsModalOpen(true);
  };

  const handleEdit = (q: Quotation) => {
    setEditingQuote(q);
    setFormData({
      nameOfPerson: q.nameOfPerson,
      nameOfQuotation: q.nameOfQuotation,
      remarks: q.remarks,
      statusRSDesign: q.statusRSDesign || 'Pending',
      statusClient: q.statusClient || 'Pending',
      documentUrl: q.documentUrl || '',
    });
    setUploadMode('images');
    setFiles([]);
    setIsModalOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameOfQuotation || !activeProject) return;

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
        finalFiles = [new File([pdfBlob], `Quotation_${Date.now()}.pdf`, { type: 'application/pdf' })];
      }

      finalFiles.forEach(f => fd.append('newFiles', f));
      
      let res;
      if (editingQuote) {
        fd.append('id', editingQuote.id);
        fd.append('createdAt', editingQuote.createdAt);
        fd.append('oldStatusRSDesign', editingQuote.statusRSDesign);
        fd.append('oldStatusClient', editingQuote.statusClient);
        fd.append('timestampRSDesign', editingQuote.timestampRSDesign);
        fd.append('timestampClient', editingQuote.timestampClient);
        // documentUrl is already appended via Object.entries(formData)

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

  const filteredQuotes = quotations.filter(q => !activeProject || q.project === activeProject.name);

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

      {loading ? (
        <div style={{ padding: '100px 0', textAlign: 'center', color: 'var(--text-light)' }}>Loading quotations...</div>
      ) : filteredQuotes.length === 0 ? (
        <div style={{ padding: '100px 0', textAlign: 'center', color: 'var(--text-light)' }}>No quotations found for this project.</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.directoryTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Name of Person</th>
                <th>Quotation Name</th>
                <th>Documents</th>
                <th>Status (RS Design)</th>
                <th>RS Timestamp</th>
                <th>Status (Client)</th>
                <th>Client Timestamp</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(q)} title="Edit Quotation">
                        <Edit2 size={13} />
                      </button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setQuoteToDelete(q); setIsDeleteModalOpen(true); }} title="Delete Quotation">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                  <td><strong>{q.nameOfPerson || '-'}</strong></td>
                  <td><div style={{ color: 'var(--primary)', fontWeight: 600 }}>{q.nameOfQuotation}</div></td>
                  <td>
                    {q.documentUrl ? (
                      <a href={q.documentUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                        <FileText size={12} /> View
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[q.statusRSDesign.replace(' ', '_')] || ''}`} style={{ backgroundColor: q.statusRSDesign.includes('Approv') ? 'rgba(39,206,138,0.1)' : q.statusRSDesign.includes('Reject') ? 'rgba(241,85,108,0.1)' : 'rgba(243,156,18,0.1)', color: q.statusRSDesign.includes('Approv') ? 'var(--success)' : q.statusRSDesign.includes('Reject') ? 'var(--danger)' : '#f39c12', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {q.statusRSDesign}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    {q.timestampRSDesign ? new Date(q.timestampRSDesign).toLocaleString() : '-'}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[q.statusClient.replace(' ', '_')] || ''}`} style={{ backgroundColor: q.statusClient.includes('Approv') ? 'rgba(39,206,138,0.1)' : q.statusClient.includes('Reject') ? 'rgba(241,85,108,0.1)' : 'rgba(243,156,18,0.1)', color: q.statusClient.includes('Approv') ? 'var(--success)' : q.statusClient.includes('Reject') ? 'var(--danger)' : '#f39c12', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {q.statusClient}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    {q.timestampClient ? new Date(q.timestampClient).toLocaleString() : '-'}
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.remarks}>
                    {q.remarks || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={editingQuote ? `Edit Quotation` : 'Add New Quotation'} width="600px">
        <form onSubmit={submitForm} className={styles.formGrid}>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Name of Person</label>
              <input type="text" value={formData.nameOfPerson} onChange={e => setFormData({...formData, nameOfPerson: e.target.value})} className={styles.formInput} />
            </div>
            <div className={styles.formGroup}>
              <label>Name of Quotation *</label>
              <input type="text" value={formData.nameOfQuotation} onChange={e => setFormData({...formData, nameOfQuotation: e.target.value})} className={styles.formInput} required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Status (RS Design)</label>
              <select value={formData.statusRSDesign} onChange={e => setFormData({...formData, statusRSDesign: e.target.value})} className={styles.formSelect}>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Status (Client Side)</label>
              <select value={formData.statusClient} onChange={e => setFormData({...formData, statusClient: e.target.value})} className={styles.formSelect}>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
            <label><FileUp size={14} /> Upload Document {editingQuote && "(Optional - Leave empty to keep current file)"}</label>
            
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

            {/* List of existing attachments */}
            {editingQuote && formData.documentUrl && (
              <div className={styles.uploadedStagedList} style={{ marginTop: '12px' }}>
                <strong>Currently Saved Attachment:</strong>
                <div className={styles.stagingGrid}>
                  <div className={styles.stagedFileItem} style={{ borderColor: 'rgba(39, 206, 138, 0.3)' }}>
                    <div className={styles.stagedFileLeft}>
                      <Link2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                      <a href={formData.documentUrl} target="_blank" rel="noopener noreferrer" className={styles.stagedFileName} style={{ color: 'var(--success)', textDecoration: 'none', maxWidth: '200px' }} title="View Document">
                        View Current Document
                      </a>
                    </div>
                    <button type="button" className={styles.removeStagedBtn} onClick={() => setFormData({...formData, documentUrl: ''})} title="Remove attachment">
                      <Trash size={13} />
                    </button>
                  </div>
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
            <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Saving...' : 'Save Quotation'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !submitting && setIsDeleteModalOpen(false)} title="Confirm Deletion" width="400px" type="danger">
        <div className={styles.deleteConfirmBody}>
          <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <p>Are you sure you want to delete <strong>{quoteToDelete?.nameOfQuotation}</strong>?</p>
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} disabled={submitting}>Cancel</button>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

