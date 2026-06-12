'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Edit2, Trash2, FileText, FileUp, File as FileIcon, X, AlertCircle, Link2, Trash
} from 'lucide-react';
import styles from './deficiencies.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';
import jsPDF from 'jspdf';

interface Deficiency {
  id: string;
  rowIndex: number;
  timestamp: string;
  project: string;
  reporter: string;
  area: string;
  remarks: string;
  documents: { name: string; url: string; title?: string }[];
}

export default function DeficienciesPage() {
  const { activeProject } = useProject();
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [editingDeficiency, setEditingDeficiency] = useState<Deficiency | null>(null);
  const [deficiencyToDelete, setDeficiencyToDelete] = useState<Deficiency | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<{ name: string; url: string; title?: string }[]>([]);
  const [uploadMode, setUploadMode] = useState<'images' | 'pdf'>('images');

  const [formData, setFormData] = useState({
    reporter: '',
    area: '',
    remarks: '',
  });

  useEffect(() => {
    fetchDeficiencies();
  }, []);

  async function fetchDeficiencies() {
    setLoading(true);
    try {
      const res = await fetch('/api/deficiencies');
      if (res.ok) {
        setDeficiencies(await res.json());
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
    setEditingDeficiency(null);
    setFormData({
      reporter: '',
      area: '',
      remarks: '',
    });
    setUploadMode('images');
    setFiles([]);
    setExistingDocs([]);
    setIsModalOpen(true);
  };

  const handleEdit = (d: Deficiency) => {
    setEditingDeficiency(d);
    setFormData({
      reporter: d.reporter,
      area: d.area,
      remarks: d.remarks,
    });
    setUploadMode('images');
    setFiles([]);
    setExistingDocs(d.documents || []);
    setIsModalOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.area || !activeProject) return;

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
        finalFiles = [new File([pdfBlob], `Deficiency_${Date.now()}.pdf`, { type: 'application/pdf' })];
      }

      finalFiles.forEach(f => fd.append('newFiles', f));
      
      let res;
      if (editingDeficiency) {
        fd.append('id', editingDeficiency.id);
        fd.append('timestamp', editingDeficiency.timestamp);
        fd.append('existingDocs', JSON.stringify(existingDocs));

        res = await fetch(`/api/deficiencies?rowIndex=${editingDeficiency.rowIndex}`, {
          method: 'PUT',
          body: fd,
        });
      } else {
        res = await fetch('/api/deficiencies', {
          method: 'POST',
          body: fd,
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchDeficiencies();
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
    if (!deficiencyToDelete) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/deficiencies?rowIndex=${deficiencyToDelete.rowIndex}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setDeficiencyToDelete(null);
        fetchDeficiencies();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const projectDeficiencies = deficiencies.filter(d => !activeProject || d.project === activeProject.name);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Deficiency Log</h2>
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
            <span className="current">Deficiencies</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreate}>
            <Plus size={18} /> Log Deficiency
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading deficiencies...</div>
      ) : projectDeficiencies.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
          {activeProject ? `No deficiencies logged for ${activeProject.name}.` : 'Select a project to view its deficiencies.'}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.directoryTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Timestamp</th>
                <th>Logged / Reported By</th>
                <th>Deficient Area / Room Name</th>
                <th>Detailed Remarks & Explanations</th>
                <th>Document</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {projectDeficiencies.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(d)} title="Edit Deficiency">
                        <Edit2 size={13} />
                      </button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setDeficiencyToDelete(d); setIsDeleteModalOpen(true); }} title="Delete Deficiency">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                  <td>{new Date(d.timestamp).toLocaleString()}</td>
                  <td>{d.reporter}</td>
                  <td>
                    <span className={styles.tableRepName}>{d.area}</span>
                  </td>
                  <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.remarks}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {d.documents && d.documents.map((doc, idx) => (
                        <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem' }}>
                          <Link2 size={12} /> {doc.title || doc.name}
                        </a>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{d.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={editingDeficiency ? 'Edit Deficiency Log' : 'Add Deficiency Log'} width="700px">
        <form onSubmit={submitForm} className={styles.formGrid}>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Project</label>
              <input type="text" value={activeProject?.name || ''} className={styles.formInput} disabled required />
            </div>
            <div className={styles.formGroup}>
              <label>Logged / Reported By</label>
              <input type="text" value={formData.reporter} onChange={e => setFormData({...formData, reporter: e.target.value})} className={styles.formInput} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label>Deficient Area / Room Name *</label>
              <input type="text" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} className={styles.formInput} required />
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

            {editingDeficiency && existingDocs.length > 0 && (
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
            <label>Detailed Remarks & Explanations</label>
            <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className={styles.formTextarea} />
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Saving...' : 'Save Deficiency'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !submitting && setIsDeleteModalOpen(false)} title="Confirm Deletion" width="400px" type="danger">
        <div className={styles.deleteConfirmBody}>
          <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <p>Are you sure you want to delete this deficiency for <strong>{deficiencyToDelete?.project}</strong>?</p>
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} disabled={submitting}>Cancel</button>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
