'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Edit2, Trash2, LayoutGrid, List,
  Calendar, Building, Tag, CheckCircle, FileText,
  Clock, AlertCircle, PlayCircle, X, Paperclip, MousePointerClick,
  UploadCloud, File as FileIcon
} from 'lucide-react';
import styles from './selections.module.css';
import Modal from '@/components/Modal';

import { useProject } from '@/context/ProjectContext';
import jsPDF from 'jspdf';

interface FileAttachment {
  title: string;
  name: string;
  url: string;
}

interface Selection {
  rowIndex: number;
  timestamp: string;
  project: string;
  areaName: string;
  productName: string;
  vendor: string;
  files: FileAttachment[];
  remarks: string;
  id: string;
}

interface Project {
  id: string;
  basicInfo: {
    name: string;
  };
}

export default function SelectionsPage() {
  const { activeProject } = useProject();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreaTile, setSelectedAreaTile] = useState<string | null>(null);

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSel, setEditingSel] = useState<Selection | null>(null);
  const [selToDelete, setSelToDelete] = useState<Selection | null>(null);

  // Form States
  const [formFields, setFormFields] = useState({
    project: '',
    areaName: '',
    productName: '',
    vendor: '',
    remarks: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([]);
  const [uploadMode, setUploadMode] = useState<'images' | 'pdf'>('images');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSelections();
    fetchProjects();
  }, []);



  async function fetchSelections() {
    try {
      setLoading(true);
      const res = await fetch('/api/selections');
      if (res.ok) {
        const data = await res.json();
        setSelections(data);
      }
    } catch (err) {
      console.error('Error fetching selections:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }

  const handleCreateNew = () => {
    setEditingSel(null);
    setFormFields({
      project: activeProject ? activeProject.name : (projects[0]?.basicInfo?.name || ''),
      areaName: '',
      productName: '',
      vendor: '',
      remarks: '',
    });
    setSelectedFiles([]);
    setExistingFiles([]);
    setUploadMode('images');
    setIsModalOpen(true);
  };

  const handleEdit = (sel: Selection) => {
    setEditingSel(sel);
    setFormFields({
      project: sel.project,
      areaName: sel.areaName,
      productName: sel.productName,
      vendor: sel.vendor,
      remarks: sel.remarks,
    });
    setSelectedFiles([]);
    setExistingFiles(sel.files || []);
    setUploadMode('images');
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormFields(prev => ({ ...prev, [name]: value }));
  };

  // File Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArr]);
    }
  };

  const handleRemoveNewFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = (index: number) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.project || !formFields.productName) {
      alert('Project and Product Name are required.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('project', formFields.project);
      formData.append('areaName', formFields.areaName);
      formData.append('productName', formFields.productName);
      formData.append('vendor', formFields.vendor);
      formData.append('remarks', formFields.remarks);

      let finalFiles = selectedFiles;
      let finalFileTitles = selectedFiles.map(f => f.name);

      if (uploadMode === 'images' && selectedFiles.length > 0) {
        const pdf = new jsPDF();

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const imgUrl = URL.createObjectURL(file);

          const img = new Image();
          img.src = imgUrl;
          await new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
          });

          if (!img.width) {
            URL.revokeObjectURL(imgUrl);
            continue;
          }

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgRatio = img.width / img.height;
          const pdfRatio = pdfWidth / pdfHeight;

          let finalWidth = pdfWidth;
          let finalHeight = pdfHeight;

          if (imgRatio > pdfRatio) {
            finalHeight = pdfWidth / imgRatio;
          } else {
            finalWidth = pdfHeight * imgRatio;
          }

          const x = (pdfWidth - finalWidth) / 2;
          const y = (pdfHeight - finalHeight) / 2;

          if (i > 0) {
            pdf.addPage();
            pdf.setPage(i + 1);
          }

          const format = file.type === 'image/png' ? 'PNG' : 'JPEG';
          pdf.addImage(img, format, x, y, finalWidth, finalHeight, `img_${i}`);
          URL.revokeObjectURL(imgUrl);
        }

        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], `Selection_Photos_${Date.now()}.pdf`, { type: 'application/pdf' });
        finalFiles = [pdfFile];
        finalFileTitles = ['Combined Photos PDF'];
      }

      finalFiles.forEach((file) => formData.append('files', file));
      formData.append('fileTitles', JSON.stringify(finalFileTitles));

      let res;
      if (editingSel) {
        formData.append('timestamp', editingSel.timestamp);
        formData.append('existingFiles', JSON.stringify(existingFiles));

        res = await fetch(`/api/selections?rowIndex=${editingSel.rowIndex}`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        res = await fetch('/api/selections', {
          method: 'POST',
          body: formData,
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchSelections();
      } else {
        const err = await res.json();
        alert(`Failed to save selection: ${err.error}`);
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (sel: Selection) => {
    setSelToDelete(sel);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selToDelete) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/selections?rowIndex=${selToDelete.rowIndex}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setSelToDelete(null);
        fetchSelections();
      } else {
        const err = await res.json();
        alert(`Failed to delete selection: ${err.error}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering
  const filteredSels = selections.filter(sel => {
    if (activeProject && sel.project !== activeProject.name) return false;

    const matchesSearch =
      sel.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sel.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sel.areaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sel.remarks.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const uniqueAreas = Array.from(new Set(filteredSels.map(sel => sel.areaName))).filter(Boolean);

  const tableSels = selectedAreaTile 
    ? filteredSels.filter(sel => sel.areaName === selectedAreaTile)
    : filteredSels;


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Material & Product Selections</h2>
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
            <span className="current">Material Selections</span>
          </div>
        </div>
        <div className={styles.headerActions} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className={styles.filtersBar} style={{ padding: '6px 12px', margin: 0 }}>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search products, vendors, IDs..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>Add Selection</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>Loading selections...</p>
        </div>
      ) : filteredSels.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>No selections found.</p>
        </div>
      ) : (
        <>
          <div className={styles.areaGrid}>
            <div
              className={`${styles.areaTile} ${selectedAreaTile === null ? styles.activeTile : ''}`}
              onClick={() => setSelectedAreaTile(null)}
            >
              <div className={`${styles.areaIconWrapper} ${styles.color0}`}>
                <LayoutGrid size={24} />
              </div>
              <h4>All Areas</h4>
              <p>{filteredSels.length} Items</p>
            </div>
            {uniqueAreas.map((area, index) => {
              const count = filteredSels.filter(s => s.areaName === area).length;
              const isSelected = selectedAreaTile === area;
              const colorClass = styles[`color${(index + 1) % 8}`];
              return (
                <div
                  key={area}
                  className={`${styles.areaTile} ${isSelected ? styles.activeTile : ''}`}
                  onClick={() => setSelectedAreaTile(area)}
                >
                  <div className={`${styles.areaIconWrapper} ${colorClass}`}>
                    <LayoutGrid size={24} />
                  </div>
                  <h4>{area}</h4>
                  <p>{count} Items</p>
                </div>
              );
            })}
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.selTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Project</th>
                <th>Area Name</th>
                <th>Product Name</th>
                <th>Vendor</th>
                <th>Remarks</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {tableSels.map(sel => (
                <tr key={sel.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(sel)}><Edit2 size={13} /></button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(sel)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                  <td>{sel.project}</td>
                  <td>{sel.areaName}</td>
                  <td><strong>{sel.productName}</strong></td>
                  <td>{sel.vendor || '—'}</td>
                  <td>{sel.remarks || '—'}</td>
                  <td>
                    <div className={styles.tableFilesCell}>
                      {sel.files && sel.files.length > 0 ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {sel.files.map((file, i) => (
                            <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" title={file.title || 'Attachment'} style={{ display: 'inline-flex', padding: '6px', backgroundColor: 'var(--primary-light)', borderRadius: '6px' }}>
                              <FileText size={18} color="var(--primary)" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>None</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingSel ? 'Edit Selection' : 'Add Selection'}
        width="800px"
      >
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Building size={14} /> Project *</label>
              {activeProject ? (
                <input type="text" value={activeProject.name} disabled className={styles.formInput} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-light)', cursor: 'not-allowed' }} />
              ) : (
                <select name="project" value={formFields.project} onChange={handleInputChange} className={styles.formSelect} required>
                  {projects.length > 0 ? projects.map(p => <option key={p.id} value={p.basicInfo.name}>{p.basicInfo.name}</option>) : <option value="">No Active Projects</option>}
                </select>
              )}
            </div>
            <div className={styles.formGroup}>
              <label><MousePointerClick size={14} /> Product Name *</label>
              <input type="text" name="productName" value={formFields.productName} onChange={handleInputChange} className={styles.formInput} placeholder=" " required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ width: '100%' }}>
              <label><Tag size={14} /> Area Name / Detail</label>
              <input type="text" name="areaName" value={formFields.areaName} onChange={handleInputChange} className={styles.formInput} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ width: '100%' }}>
              <label><Building size={14} /> Vendor / Supplier</label>
              <input type="text" name="vendor" value={formFields.vendor} onChange={handleInputChange} className={styles.formInput} placeholder=" " />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label><FileText size={14} /> Remarks / Details</label>
            <textarea name="remarks" value={formFields.remarks} onChange={handleInputChange} className={styles.formTextarea} placeholder=" " />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}><Paperclip size={14} /> Documents & Attachments</label>
              <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button type="button" style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: uploadMode === 'images' ? 'var(--primary)' : 'transparent', color: uploadMode === 'images' ? 'white' : 'var(--text-light)', transition: 'all 0.2s' }} onClick={() => setUploadMode('images')}>📸 Images to PDF</button>
                <button type="button" style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: uploadMode === 'pdf' ? 'var(--primary)' : 'transparent', color: uploadMode === 'pdf' ? 'white' : 'var(--text-light)', transition: 'all 0.2s' }} onClick={() => setUploadMode('pdf')}>📄 Upload PDF Directly</button>
              </div>
            </div>

            <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
              <label>
                <UploadCloud size={24} style={{ color: 'var(--primary)' }} />
                <span>{uploadMode === 'images' ? 'Click or drag images to merge into a single PDF' : 'Click or drag a PDF document'}</span>
              </label>
              <input type="file" multiple={uploadMode === 'images'} accept={uploadMode === 'images' ? 'image/*' : 'application/pdf'} ref={fileInputRef} onChange={handleFileSelect} />
            </div>

            {(existingFiles.length > 0 || selectedFiles.length > 0) && (
              <div className={styles.uploadedStagedList}>
                <strong>Staged Files</strong>
                <div className={styles.stagingGrid}>
                  {existingFiles.map((file, i) => (
                    <div key={`exist-${i}`} className={styles.stagedFileItem}>
                      <div className={styles.stagedFileLeft} title={file.name}>
                        {uploadMode === 'images' ? (
                          <img src={file.url} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <FileIcon size={14} style={{ color: 'var(--text-light)' }} />
                        )}
                        <span className={styles.stagedFileName}>{file.title || file.name}</span>
                      </div>
                      <button type="button" className={styles.removeStagedBtn} onClick={() => handleRemoveExistingFile(i)}><X size={16} /></button>
                    </div>
                  ))}
                  {selectedFiles.map((file, i) => (
                    <div key={`new-${i}`} className={styles.stagedFileItem}>
                      <div className={styles.stagedFileLeft} title={file.name}>
                        {uploadMode === 'images' ? (
                          <img src={URL.createObjectURL(file)} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <FileIcon size={14} style={{ color: 'var(--success)' }} />
                        )}
                        <span className={styles.stagedFileName}>{file.name}</span>
                      </div>
                      <button type="button" className={styles.removeStagedBtn} onClick={() => handleRemoveNewFile(i)}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Saving...' : (editingSel ? 'Update Selection' : 'Save Selection')}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !submitting && setIsDeleteModalOpen(false)} title="Confirm Deletion" width="400px">
        <div className={styles.deleteConfirmBody}>
          <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <p>Are you sure you want to delete <strong>{selToDelete?.productName}</strong>?</p>
          <p className={styles.warningSub}>This action cannot be undone.</p>
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} disabled={submitting}>Cancel</button>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete Selection'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
