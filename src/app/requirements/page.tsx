'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Edit2, Trash2, LayoutGrid, List,
  Calendar, Building, Tag, CheckCircle, FileText,
  Clock, AlertCircle, PlayCircle, X, Paperclip, CheckSquare,
  UploadCloud, File as FileIcon
} from 'lucide-react';
import styles from './requirements.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import jsPDF from 'jspdf';

interface FileAttachment {
  title: string;
  name: string;
  url: string;
}

interface Requirement {
  rowIndex: number;
  timestamp: string;
  project: string;
  title: string;
  requirementNo: string;
  category: string;
  status: 'Pending' | 'In Progress' | 'Fulfilled' | 'Cancelled';
  priority: 'High' | 'Medium' | 'Low';
  assignedTo: string;
  targetDate: string;
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

export default function RequirementsPage() {
  const { activeProject } = useProject();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadMode, setUploadMode] = useState<'images' | 'pdf'>('images');
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [reqToDelete, setReqToDelete] = useState<Requirement | null>(null);

  const [formFields, setFormFields] = useState({
    project: '',
    title: '',
    category: 'Material',
    remarks: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newFileTitles, setNewFileTitles] = useState<string[]>([]);
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Material', 'Manpower', 'Design', 'Machinery', 'Consultation', 'Other'];

  useEffect(() => {
    fetchRequirements();
    fetchProjects();
    fetchUsers();

    }, []);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }

  async function fetchRequirements() {
    try {
      setLoading(true);
      const res = await fetch('/api/requirements');
      if (res.ok) {
        const data = await res.json();
        setRequirements(data);
      }
    } catch (err) {
      console.error('Error fetching requirements:', err);
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
    setEditingReq(null);
    setFormFields({
      project: activeProject ? activeProject.name : (projects[0]?.basicInfo?.name || ''),
      title: '',
      category: categories[0],
      remarks: '',
    });
    setSelectedFiles([]);
    setNewFileTitles([]);
    setExistingFiles([]);
    setUploadMode('images');
    setIsModalOpen(true);
  };

  const handleEdit = (req: Requirement) => {
    setEditingReq(req);
    setFormFields({
      project: req.project,
      title: req.title,
      category: req.category,
      remarks: req.remarks,
    });
    setSelectedFiles([]);
    setNewFileTitles([]);
    setExistingFiles(req.files || []);
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
      setNewFileTitles(prev => [...prev, ...filesArr.map(f => f.name)]);
    }
  };

  const handleRemoveNewFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setNewFileTitles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = (index: number) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewFileTitleChange = (index: number, newTitle: string) => {
    const updated = [...newFileTitles];
    updated[index] = newTitle;
    setNewFileTitles(updated);
  };

  const handleExistingFileTitleChange = (index: number, newTitle: string) => {
    const updated = [...existingFiles];
    updated[index] = { ...updated[index], title: newTitle };
    setExistingFiles(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.project || !formFields.title) {
      alert('Project and Title are required.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('project', formFields.project);
      formData.append('title', formFields.title);
      formData.append('category', formFields.category);
      formData.append('remarks', formFields.remarks);

      let finalFiles = selectedFiles;
      let finalFileTitles = selectedFiles.map((_, i) => newFileTitles[i] || 'Attachment');

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
        const pdfFile = new File([pdfBlob], `Requirement_Images_${Date.now()}.pdf`, { type: 'application/pdf' });
        finalFiles = [pdfFile];
        finalFileTitles = ['Requirement Images (Combined PDF)'];
      }

      finalFiles.forEach((file) => formData.append('files', file));
      formData.append('fileTitles', JSON.stringify(finalFileTitles));

      let res;
      if (editingReq) {
        formData.append('id', editingReq.id);
        formData.append('requirementNo', editingReq.requirementNo);
        formData.append('timestamp', editingReq.timestamp);
        formData.append('existingFiles', JSON.stringify(existingFiles));

        res = await fetch(`/api/requirements?rowIndex=${editingReq.rowIndex}`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        res = await fetch('/api/requirements', {
          method: 'POST',
          body: formData,
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchRequirements();
      } else {
        const err = await res.json();
        alert(`Failed to save requirement: ${err.error}`);
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (req: Requirement) => {
    setReqToDelete(req);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!reqToDelete) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/requirements?rowIndex=${reqToDelete.rowIndex}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setReqToDelete(null);
        fetchRequirements();
      } else {
        const err = await res.json();
        alert(`Failed to delete requirement: ${err.error}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering
  const filteredReqs = requirements.filter(req => {
    const matchesSearch =
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requirementNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.remarks.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = activeProject ? req.project === activeProject.name : true;
    const matchesCategory = filterCategory === '' || req.category === filterCategory;

    return matchesSearch && matchesProject && matchesCategory;
  });

  const uniqueProjectsList = Array.from(new Set(requirements.map(r => r.project))).filter(Boolean);
  const uniqueCategoriesList = Array.from(new Set(requirements.map(r => r.category))).filter(Boolean);

  const groupedData: Record<string, Requirement[]> = {};
  filteredReqs.forEach(req => {
    if (!groupedData[req.project]) {
      groupedData[req.project] = [];
    }
    groupedData[req.project].push(req);
  });



  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Project Requirements</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <Link href="/projects">Project Portfolio</Link>
            {activeProject && (
              <>
                <span className="separator">&gt;</span>
                <span className="project-breadcrumb">{activeProject.name}</span>
              </>
            )}
            <span className="separator">&gt;</span>
            <span className="current">Project Requirements</span>
          </div>
        </div>
        <div className={styles.headerActions} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className={styles.filtersBar} style={{ padding: '6px 12px', margin: 0 }}>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search reqs, IDs, owners..." 
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className={styles.filterControls}>
              <select 
                className={styles.filterSelect}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {Array.from(new Set(requirements.map(r => r.category))).filter(Boolean).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              
            </div>
          </div>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} /> Add Requirement
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>Loading requirements...</p>
        </div>
      ) : filteredReqs.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>No requirements found.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.reqTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Req No</th>
                <th>Project</th>
                <th>Title & Desc</th>
                <th>Category</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {filteredReqs.map(req => (
                <tr key={req.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(req)}><Edit2 size={13} /></button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(req)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                  <td><strong>{req.requirementNo}</strong></td>
                  <td>{req.project}</td>
                  <td>
                    <div className={styles.tableTitleCell}>
                      <span className={styles.tableRepName}>{req.title}</span>
                      {req.remarks && <span className={styles.tableRepDetail}>{req.remarks.substring(0, 50)}{req.remarks.length > 50 ? '...' : ''}</span>}
                    </div>
                  </td>
                  <td>{req.category}</td>
                  <td>
                    <div className={styles.tableFilesCell}>
                      {req.files && req.files.length > 0 ? (
                        req.files.map((file, i) => (
                          <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className={styles.tableFileLink}>
                            <Paperclip size={10} /> {file.title || 'Doc'}
                          </a>
                        ))
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
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingReq ? 'Edit Requirement' : 'Add Requirement'}
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
              <label><CheckSquare size={14} /> Title *</label>
              <input type="text" name="title" value={formFields.title} onChange={handleInputChange} className={styles.formInput} placeholder=" " required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Tag size={14} /> Category</label>
              <select name="category" value={formFields.category} onChange={handleInputChange} className={styles.formSelect}>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><FileText size={14} /> Remarks / Description</label>
              <textarea name="remarks" value={formFields.remarks} onChange={handleInputChange} className={styles.formTextarea} placeholder=" " />
            </div>
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
              <input type="file" multiple={uploadMode === 'images'} accept={uploadMode === 'images' ? "image/*" : ".pdf"} ref={fileInputRef} onChange={handleFileSelect} />
            </div>

            {(existingFiles.length > 0 || selectedFiles.length > 0) && (
              <div className={styles.uploadedStagedList}>
                <strong>Staged Files</strong>
                <div className={styles.stagingGrid}>
                  {existingFiles.map((file, i) => (
                    <div key={`exist-${i}`} className={styles.stagedFileItem}>
                      <div className={styles.stagedFileLeft} title={file.name}>
                        <FileIcon size={14} style={{ color: 'var(--text-light)' }} />
                        <span className={styles.stagedFileName}>{file.name}</span>
                      </div>
                      <input type="text" className={styles.stagedTitleInput} value={file.title} onChange={(e) => handleExistingFileTitleChange(i, e.target.value)} placeholder="File Title" />
                      <button type="button" className={styles.removeStagedBtn} onClick={() => handleRemoveExistingFile(i)}><X size={16} /></button>
                    </div>
                  ))}
                  {selectedFiles.map((file, i) => (
                    <div key={`new-${i}`} className={styles.stagedFileItem}>
                      <div className={styles.stagedFileLeft} title={file.name}>
                        <FileIcon size={14} style={{ color: 'var(--success)' }} />
                        <span className={styles.stagedFileName}>{file.name}</span>
                      </div>
                      <input type="text" className={styles.stagedTitleInput} value={newFileTitles[i]} onChange={(e) => handleNewFileTitleChange(i, e.target.value)} placeholder="File Title" />
                      <button type="button" className={styles.removeStagedBtn} onClick={() => handleRemoveNewFile(i)}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Saving...' : (editingReq ? 'Update Requirement' : 'Save Requirement')}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !submitting && setIsDeleteModalOpen(false)} title="Confirm Deletion" width="400px">
        <div className={styles.deleteConfirmBody}>
          <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <p>Are you sure you want to delete <strong>{reqToDelete?.title}</strong>?</p>
          <p className={styles.warningSub}>This action cannot be undone.</p>
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} disabled={submitting}>Cancel</button>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete Requirement'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
