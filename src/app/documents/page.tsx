'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Calendar, MapPin, Trash2, Edit2, LayoutGrid, List,
  Building, User, Users, MessageCircle, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, RefreshCw, Files, FileText, CalendarCheck,
  CheckSquare, FileUp, Link2, Loader2, Tag, FolderOpen, Key, Trash,
  FileSpreadsheet
} from 'lucide-react';
import styles from './documents.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';
import jsPDF from 'jspdf';

interface AttachedFile {
  title: string;
  name: string;
  url: string;
}

interface DocumentEntry {
  rowIndex: number;
  timestamp: string;
  project: string;
  title: string;
  category: 'Agreement / Contract' | 'Design Drawing' | 'Permit / NOC' | 'Invoice / Bill' | 'Certificate' | 'Other';
  referenceNumber: string;
  issueDate: string;
  expiryDate: string;
  stakeholders: string;
  status: 'Draft' | 'Active / Executed' | 'Under Review' | 'Superceded' | 'Expired';
  files: AttachedFile[];
  remarks: string;
  id: string;
}

interface Project {
  id: string;
  rowIndex: number;
  basicInfo: {
    name: string;
  };
}

interface StagedFileObject {
  file: File;
  title: string;
}

export default function DocumentsPage() {
  const { activeProject } = useProject();
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [users, setUsers] = useState<any[]>([]);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentEntry | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentEntry | null>(null);

  // File Upload Staging
  const [stagedFiles, setStagedFiles] = useState<StagedFileObject[]>([]);
  const [existingFiles, setExistingFiles] = useState<AttachedFile[]>([]);
  const [uploadMode, setUploadMode] = useState<'images' | 'pdf'>('images');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields State
  const [formFields, setFormFields] = useState({
    project: '',
    title: '',
    category: 'Agreement / Contract' as DocumentEntry['category'],
    referenceNumber: '',
    issueDate: '',
    expiryDate: '',
    stakeholders: '',
    status: 'Draft' as DocumentEntry['status'],
    remarks: '',
  });

  const categories: DocumentEntry['category'][] = [
    'Agreement / Contract',
    'Design Drawing',
    'Permit / NOC',
    'Invoice / Bill',
    'Certificate',
    'Other'
  ];

  const statuses: DocumentEntry['status'][] = [
    'Draft',
    'Active / Executed',
    'Under Review',
    'Superceded',
    'Expired'
  ];

  useEffect(() => {
    fetchDocuments();
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

  async function fetchDocuments() {
    try {
      setLoading(true);
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);

        // Expand projects by default in grouped card view
        const uniqueProjects: string[] = Array.from(new Set(data.map((d: DocumentEntry) => d.project)));
        const expandMap: Record<string, boolean> = {};
        uniqueProjects.forEach(proj => {
          expandMap[proj] = true;
        });
        setExpandedProjects(expandMap);
      }
    } catch (err) {
      console.error('Error fetching documents list:', err);
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
      console.error('Error fetching projects list:', err);
    }
  }

  const toggleProject = (projectName: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectName]: !prev[projectName]
    }));
  };

  const handleCreateNew = () => {
    setEditingDoc(null);
    setStagedFiles([]);
    setUploadMode('images');
    setUploadMode('images');
    setExistingFiles([]);
    setFormFields({
      project: activeProject ? activeProject.name : (projects[0]?.basicInfo?.name || ''),
      title: '',
      category: 'Agreement / Contract',
      referenceNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      stakeholders: '',
      status: 'Draft',
      remarks: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (doc: DocumentEntry) => {
    setEditingDoc(doc);
    setStagedFiles([]);
    setUploadMode('images');
    setExistingFiles(doc.files || []);
    setUploadMode('images');
    setFormFields({
      project: doc.project,
      title: doc.title,
      category: doc.category,
      referenceNumber: doc.referenceNumber,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
      stakeholders: doc.stakeholders,
      status: doc.status,
      remarks: doc.remarks,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).map(file => {
        // Clean default title by removing file extension
        const lastDot = file.name.lastIndexOf('.');
        const cleanName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
        // Format to a more readable spaced title
        const formattedTitle = cleanName.replace(/[_-]+/g, ' ');
        return {
          file,
          title: formattedTitle
        };
      });
      setStagedFiles(prev => [...prev, ...selected]);
    }
  };

  const handleStagedTitleChange = (index: number, val: string) => {
    setStagedFiles(prev => prev.map((item, i) => i === index ? { ...item, title: val } : item));
  };

  const handleExistingTitleChange = (index: number, val: string) => {
    setExistingFiles(prev => prev.map((item, i) => i === index ? { ...item, title: val } : item));
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (index: number) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.project || !formFields.title) {
      alert('Please fill out required fields (Project, Document Title)');
      return;
    }

    try {
      setSubmitting(true);
      const submitData = new FormData();
      submitData.append('project', formFields.project);
      submitData.append('title', formFields.title);
      submitData.append('category', formFields.category);
      submitData.append('referenceNumber', formFields.referenceNumber);
      submitData.append('issueDate', formFields.issueDate);
      submitData.append('expiryDate', formFields.expiryDate);
      submitData.append('stakeholders', formFields.stakeholders);
      submitData.append('status', formFields.status);
      submitData.append('remarks', formFields.remarks);

      // If all staged files are images and uploadMode is 'images', merge into single PDF
      let finalStagedFiles = stagedFiles.map(s => s.file);
      let finalStagedTitles = stagedFiles.map(item => item.title || item.file.name);

      if (uploadMode === 'images' && stagedFiles.length > 0) {
        const allImages = stagedFiles.every(s => s.file.type.startsWith('image/'));
        if (allImages) {
          const pdf = new jsPDF();
          for (let i = 0; i < stagedFiles.length; i++) {
            const file = stagedFiles[i].file;
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
          finalStagedFiles = [new File([pdfBlob], `Document_${Date.now()}.pdf`, { type: 'application/pdf' })];
          finalStagedTitles = ['Document (Combined PDF)'];
        }
      }

      // Append staged files
      finalStagedFiles.forEach(f => {
        submitData.append('files', f);
      });

      // Compile staged file titles array
      const stagedTitles = finalStagedTitles;

      if (editingDoc) {
        submitData.append('timestamp', editingDoc.timestamp);
        submitData.append('id', editingDoc.id);
        submitData.append('existingFiles', JSON.stringify(existingFiles)); // Sends updated/renamed existing files list
        submitData.append('newFileTitles', JSON.stringify(stagedTitles));

        const res = await fetch(`/api/documents?rowIndex=${editingDoc.rowIndex}`, {
          method: 'PUT',
          body: submitData,
        });

        if (res.ok) {
          setIsModalOpen(false);
          fetchDocuments();
        } else {
          const err = await res.json();
          alert(`Failed to update document entry: ${err.error}`);
        }
      } else {
        submitData.append('fileTitles', JSON.stringify(stagedTitles));

        const res = await fetch('/api/documents', {
          method: 'POST',
          body: submitData,
        });

        if (res.ok) {
          setIsModalOpen(false);
          fetchDocuments();
        } else {
          const err = await res.json();
          alert(`Failed to add document entry: ${err.error}`);
        }
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (doc: DocumentEntry) => {
    setDocToDelete(doc);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!docToDelete) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/documents?rowIndex=${docToDelete.rowIndex}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        setDocToDelete(null);
        fetchDocuments();
      } else {
        const err = await res.json();
        alert(`Failed to delete document entry: ${err.error}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Logic
  const filteredDocs = documents.filter(doc => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.stakeholders.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.remarks.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = filterProject === '' || doc.project === filterProject;
    const matchesCategory = filterCategory === '' || doc.category === filterCategory;
    const matchesStatus = filterStatus === '' || doc.status === filterStatus;

    return matchesSearch && matchesProject && matchesCategory && matchesStatus;
  });

  const uniqueProjectsList = Array.from(new Set(documents.map(d => d.project))).filter(Boolean);

  // Group by Project
  const groupedData: Record<string, DocumentEntry[]> = {};
  filteredDocs.forEach(doc => {
    if (!groupedData[doc.project]) {
      groupedData[doc.project] = [];
    }
    groupedData[doc.project].push(doc);
  });

  // Counters
  const totalCount = documents.length;
  const activeContractsCount = documents.filter(d => d.category === 'Agreement / Contract' && d.status === 'Active / Executed').length;
  const activePermitsCount = documents.filter(d => d.category === 'Permit / NOC' && d.status !== 'Expired').length;
  const designDrawingsCount = documents.filter(d => d.category === 'Design Drawing').length;

  return (
    <div className={styles.container}>
      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Document Management System (DMS)</h2>
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
            <span className="current">Documents</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {/* Main listing view */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>Loading document records...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>No document files found matching filters.</p>
        </div>
      ) : (<div className={styles.tableContainer}>
          <table className={styles.docTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Timestamp</th>
                <th>Project</th>
                <th>Document Title</th>
                <th>User Name</th>
                <th>File Attachments</th>
                <th>Remarks / Description</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(doc)} title="Edit Document Record">
                        <Edit2 size={13} />
                      </button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(doc)} title="Delete Document Record">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                  <td>
                    {doc.timestamp ? new Date(doc.timestamp).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td>{doc.project}</td>
                  <td>
                    <span className={styles.tableRepName}>{doc.title}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-light)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.stakeholders || '—'}
                  </td>
                  <td>
                    <div className={styles.tableFilesCell}>
                      {doc.files && doc.files.length > 0 ? (
                        doc.files.map((file, idx) => (
                          <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className={styles.tableFileLink} title={`${file.title || file.name} (${file.name})`}>
                            <Link2 size={11} />
                            <span>{file.title || file.name}</span>
                          </a>
                        ))
                      ) : (
                        <span className={styles.noFilesText}>No files</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-light)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.remarks || '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    {doc.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDoc ? 'Update Document Entry' : 'Add New Document Entry'}
        width="750px"
      >
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Building size={14} /> Associated Project *</label>
              <select
                name="project"
                value={formFields.project}
                onChange={handleInputChange}
                className={styles.formSelect}
                required
                disabled
              >
                {projects.length > 0 ? (
                  projects.map(p => (
                    <option key={p.id} value={p.basicInfo.name}>{p.basicInfo.name}</option>
                  ))
                ) : (
                  <option value="">No Active Projects</option>
                )}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><FileText size={14} /> Document Title / Name *</label>
              <input
                type="text"
                name="title"
                value={formFields.title}
                onChange={handleInputChange}
                className={styles.formInput}
                required
              />
            </div>
          </div>



          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Users size={14} /> User Person Name</label>
              <select
                name="stakeholders"
                value={formFields.stakeholders}
                onChange={handleInputChange}
                className={styles.formSelect}
              >
                <option value="">Select User</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag & Drop File Upload Staging Box */}
          <div className={styles.formGroup}>
            <label><FileUp size={14} /> Attached Document Files (Select Multiple)</label>
            
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '8px', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="radio" name="uploadMode" checked={uploadMode === 'images'} onChange={() => { setUploadMode('images'); setStagedFiles([]); }} />
                Images (Auto-convert to PDF)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="radio" name="uploadMode" checked={uploadMode === 'pdf'} onChange={() => { setUploadMode('pdf'); setStagedFiles([]); }} />
                PDF Documents
              </label>
            </div>

            <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={uploadMode === 'images' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.zip,image/*'}
                multiple
              />
              <label>
                <FileUp size={24} style={{ color: 'var(--text-light)', marginBottom: '4px' }} />
                <span>Click to select or upload multiple files</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>File will be saved to secure Google Drive folder</span>
              </label>
            </div>

            {/* List of staged (newly selected) files with inline custom titles */}
            {stagedFiles.length > 0 && (
              <div className={styles.uploadedStagedList}>
                <strong>New Files to Upload ({stagedFiles.length}):</strong>
                <div className={styles.stagingGrid}>
                  {stagedFiles.map((item, idx) => (
                    <div key={idx} className={styles.stagedFileItem}>
                      <div className={styles.stagedFileLeft}>
                        {uploadMode === 'images' ? (
                          <img src={URL.createObjectURL(item.file)} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <FileText size={14} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
                        )}
                        <span className={styles.stagedFileName} title={item.file.name}>
                          {item.file.name}
                        </span>
                      </div>
                      <button type="button" className={styles.removeStagedBtn} onClick={() => removeStagedFile(idx)}>
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List of existing attachments with inline custom titles */}
            {editingDoc && existingFiles.length > 0 && (
              <div className={styles.uploadedStagedList} style={{ marginTop: '12px' }}>
                <strong>Currently Saved Attachments ({existingFiles.length}):</strong>
                <div className={styles.stagingGrid}>
                  {existingFiles.map((file, idx) => (
                    <div key={idx} className={styles.stagedFileItem} style={{ borderColor: 'rgba(39, 206, 138, 0.3)' }}>
                      <div className={styles.stagedFileLeft}>
                        <Link2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className={styles.stagedFileName} style={{ color: 'var(--success)', textDecoration: 'none', maxWidth: '200px' }} title={file.name}>
                          {file.title || file.name}
                        </a>
                      </div>
                      <button type="button" className={styles.removeStagedBtn} onClick={() => removeExistingFile(idx)} title="Remove attachment">
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label><MessageCircle size={14} /> Remarks & Notes</label>
            <textarea
              name="remarks"
              value={formFields.remarks}
              onChange={handleInputChange}
              className={styles.formTextarea}
            />
          </div>

          <div className={styles.formActions}>
            <button type="submit" disabled={submitting} className={styles.submitBtn}>
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Loader2 size={16} className={styles.spin} />
                  Uploading Files...
                </span>
              ) : editingDoc ? 'Save Changes' : 'Create Entry'}
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Document Entry"
        width="450px"
      >
        <div className={styles.deleteConfirmBody}>
          <p>Are you sure you want to delete <strong>{docToDelete?.title}</strong>?</p>
          <p className={styles.warningSub}>This will permanently delete this document log from the Google Sheet.</p>
          <div className={styles.deleteActions}>
            <button type="button" onClick={handleDelete} disabled={submitting} className={styles.confirmDeleteBtn}>
              {submitting ? 'Deleting...' : 'Confirm Deletion'}
            </button>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
