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
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

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

    const saved = localStorage.getItem('dms_view_mode') as 'card' | 'table';
    if (saved === 'card' || saved === 'table') {
      setTimeout(() => {
        setViewMode(saved);
      }, 0);
    }
  }, []);

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('dms_view_mode', mode);
  };

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
    setExistingFiles([]);
    setFormFields({
      project: projects[0]?.basicInfo?.name || '',
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
    setExistingFiles(doc.files || []);
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

      // Append staged files
      stagedFiles.forEach(item => {
        submitData.append('files', item.file);
      });

      // Compile staged file titles array
      const stagedTitles = stagedFiles.map(item => item.title || item.file.name);

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
          <p>Store, track revisions, and securely upload contracts, permits, invoices, and design drawings.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.total}`}>
          <div className={styles.statIcon}>
            <Files size={18} />
          </div>
          <div className={styles.statInfo}>
            <h3>{totalCount}</h3>
            <p>Total Managed</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.contracts}`}>
          <div className={styles.statIcon}>
            <FileText size={18} />
          </div>
          <div className={styles.statInfo}>
            <h3>{activeContractsCount}</h3>
            <p>Executed Contracts</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.permits}`}>
          <div className={styles.statIcon}>
            <CalendarCheck size={18} />
          </div>
          <div className={styles.statInfo}>
            <h3>{activePermitsCount}</h3>
            <p>Active Permits</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.drawings}`}>
          <div className={styles.statIcon}>
            <FolderOpen size={18} />
          </div>
          <div className={styles.statInfo}>
            <h3>{designDrawingsCount}</h3>
            <p>Design Drawings</p>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className={styles.filtersBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search document title, version ref, stakeholders, remarks..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterControls}>
          <select
            className={styles.filterSelect}
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {uniqueProjectsList.map(proj => (
              <option key={proj} value={proj}>{proj}</option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <div className={styles.viewToggleGroup}>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'card' ? styles.activeView : ''}`}
              onClick={() => handleViewModeChange('card')}
              title="Grouped Cards"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.activeView : ''}`}
              onClick={() => handleViewModeChange('table')}
              title="Compact Table"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main listing view */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>Loading document records...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>No document files found matching filters.</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className={styles.projectGroupSection}>
          {Object.keys(groupedData).map(projectKey => {
            const projectDocs = groupedData[projectKey];
            const isOpen = expandedProjects[projectKey] !== false;

            return (
              <div key={projectKey} className={styles.projectGroupSection}>
                {/* Collapsible Project Banner */}
                <div className={styles.projectGroupHeader} style={{ cursor: 'pointer' }} onClick={() => toggleProject(projectKey)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    <h3>{projectKey} ({projectDocs.length})</h3>
                  </div>
                </div>

                {isOpen && (
                  <div className={styles.docGrid}>
                    {projectDocs.map(doc => (
                      <div key={doc.id} className={styles.docCard}>
                        <div className={styles.cardHeader}>
                          <span className={styles.cardTitle}>{doc.title}</span>
                          <span className={`${styles.statusBadge} ${styles[doc.status.replace(/\s+/g, '').toLowerCase()]}`}>
                            {doc.status}
                          </span>
                        </div>

                        <span className={styles.categoryTag}>{doc.category}</span>

                        <div className={styles.cardMeta}>
                          {doc.referenceNumber && (
                            <span className={styles.metaItem}>
                              <Tag size={13} />
                              Ref: {doc.referenceNumber}
                            </span>
                          )}
                          <span className={styles.metaItem}>
                            <Calendar size={13} />
                            Issued: {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                          {doc.expiryDate && (
                            <span className={styles.metaItem}>
                              <CalendarCheck size={13} style={{ color: doc.status === 'Expired' ? 'var(--danger)' : '#f39c12' }} />
                              Expires: {new Date(doc.expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>

                        <div className={styles.cardBody}>
                          {doc.stakeholders && (
                            <div className={styles.sectionBlock}>
                              <strong>Stakeholders Involved</strong>
                              <p>{doc.stakeholders}</p>
                            </div>
                          )}

                          {/* Multi file list display block */}
                          <div className={styles.filesListBlock}>
                            <strong>Attached Files ({doc.files?.length || 0})</strong>
                            {doc.files && doc.files.length > 0 ? (
                              <div className={styles.filesGrid}>
                                {doc.files.map((file, idx) => (
                                  <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className={styles.fileItemLink} title={`Download/View ${file.title}`}>
                                    <span className={styles.fileLinkTitle}>
                                      <Link2 size={13} className={styles.fileIcon} />
                                      {file.title}
                                    </span>
                                    {file.name && file.name !== file.title && (
                                      <span className={styles.fileLinkSub}>
                                        Source: {file.name}
                                      </span>
                                    )}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.noFilesText}>No files uploaded</span>
                            )}
                          </div>

                          {doc.remarks && (
                            <div className={styles.sectionBlock}>
                              <strong>Description & Remarks</strong>
                              <p style={{ fontSize: '0.75rem' }}>{doc.remarks}</p>
                            </div>
                          )}
                        </div>

                        <div className={styles.cardActions}>
                          <button className={styles.controlBtn} onClick={() => handleEdit(doc)} title="Edit Document Record">
                            <Edit2 size={13} />
                          </button>
                          <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(doc)} title="Delete Document Record">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.docTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Document Name</th>
                <th>Project</th>
                <th>Category</th>
                <th>Version / Ref</th>
                <th>Execution Date</th>
                <th>Status</th>
                <th>Attachments</th>
                <th>Stakeholders</th>
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
                    <div className={styles.tableTitleCell}>
                      <span className={styles.tableRepName}>{doc.title}</span>
                      {doc.remarks && (
                        <span className={styles.tableRepDetail}>{doc.remarks}</span>
                      )}
                    </div>
                  </td>
                  <td>{doc.project}</td>
                  <td>
                    <span className={styles.categoryTag} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{doc.category}</span>
                  </td>
                  <td>{doc.referenceNumber || '—'}</td>
                  <td>
                    {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[doc.status.replace(/\s+/g, '').toLowerCase()]}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.tableFilesCell}>
                      {doc.files && doc.files.length > 0 ? (
                        doc.files.map((file, idx) => (
                          <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className={styles.tableFileLink} title={`${file.title} (${file.name})`}>
                            <Link2 size={11} />
                            <span>{file.title}</span>
                          </a>
                        ))
                      ) : (
                        <span className={styles.noFilesText}>No files</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-light)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.stakeholders || '—'}
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
                placeholder="e.g. Master Design Subcontract Agreement"
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><FolderOpen size={14} /> Document Category *</label>
              <select
                name="category"
                value={formFields.category}
                onChange={handleInputChange}
                className={styles.formSelect}
                required
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><Tag size={14} /> Reference / Version Number</label>
              <input
                type="text"
                name="referenceNumber"
                value={formFields.referenceNumber}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g. REV-3, permit-no, CONT-2026-10"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Calendar size={14} /> Issue / Execution Date *</label>
              <input
                type="date"
                name="issueDate"
                value={formFields.issueDate}
                onChange={handleInputChange}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label><CalendarCheck size={14} /> Expiry / Renewal Date</label>
              <input
                type="date"
                name="expiryDate"
                value={formFields.expiryDate}
                onChange={handleInputChange}
                className={styles.formInput}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Users size={14} /> Involved Stakeholders / Signatories</label>
              <input
                type="text"
                name="stakeholders"
                value={formFields.stakeholders}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g. RSDesign, client representative name, managing consultant"
              />
            </div>
            <div className={styles.formGroup}>
              <label><AlertCircle size={14} /> Document Status</label>
              <select
                name="status"
                value={formFields.status}
                onChange={handleInputChange}
                className={styles.formSelect}
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag & Drop File Upload Staging Box */}
          <div className={styles.formGroup}>
            <label><FileUp size={14} /> Attached Document Files (Select Multiple)</label>
            <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.zip,image/*"
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
                        <FileText size={14} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
                        <span className={styles.stagedFileName} title={item.file.name}>
                          {item.file.name}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter file title / label (e.g. Executive Summary)"
                        value={item.title}
                        onChange={(e) => handleStagedTitleChange(idx, e.target.value)}
                        className={styles.stagedTitleInput}
                        required
                      />
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
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className={styles.stagedFileName} style={{ color: 'var(--success)', textDecoration: 'none' }} title={file.name}>
                          {file.name}
                        </a>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter file title / label"
                        value={file.title}
                        onChange={(e) => handleExistingTitleChange(idx, e.target.value)}
                        className={styles.stagedTitleInput}
                        style={{ borderColor: 'rgba(39, 206, 138, 0.3)' }}
                        required
                      />
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
              placeholder="Enter summary details, important terms, or general observations..."
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
