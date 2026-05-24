'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, LayoutGrid, List,
  Calendar, Building, Tag, CheckCircle, FileText,
  Clock, AlertCircle, PlayCircle, X, Paperclip, CheckSquare,
  UploadCloud, File as FileIcon
} from 'lucide-react';
import styles from './requirements.module.css';
import Modal from '@/components/Modal';

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
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [reqToDelete, setReqToDelete] = useState<Requirement | null>(null);

  // Form States
  const [formFields, setFormFields] = useState({
    project: '',
    title: '',
    category: 'Material',
    status: 'Pending',
    priority: 'Medium',
    assignedTo: '',
    targetDate: '',
    remarks: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newFileTitles, setNewFileTitles] = useState<string[]>([]);
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Material', 'Manpower', 'Design', 'Machinery', 'Consultation', 'Other'];
  const statuses = ['Pending', 'In Progress', 'Fulfilled', 'Cancelled'];
  const priorities = ['High', 'Medium', 'Low'];

  useEffect(() => {
    fetchRequirements();
    fetchProjects();
    fetchUsers();

    const saved = localStorage.getItem('requirements_view_mode') as 'card' | 'table';
    if (saved === 'card' || saved === 'table') {
      setTimeout(() => setViewMode(saved), 0);
    }
  }, []);

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('requirements_view_mode', mode);
  };

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
      project: projects[0]?.basicInfo?.name || '',
      title: '',
      category: categories[0],
      status: 'Pending',
      priority: 'Medium',
      assignedTo: '',
      targetDate: '',
      remarks: '',
    });
    setSelectedFiles([]);
    setNewFileTitles([]);
    setExistingFiles([]);
    setIsModalOpen(true);
  };

  const handleEdit = (req: Requirement) => {
    setEditingReq(req);
    setFormFields({
      project: req.project,
      title: req.title,
      category: req.category,
      status: req.status,
      priority: req.priority,
      assignedTo: req.assignedTo,
      targetDate: req.targetDate,
      remarks: req.remarks,
    });
    setSelectedFiles([]);
    setNewFileTitles([]);
    setExistingFiles(req.files || []);
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
      formData.append('status', formFields.status);
      formData.append('priority', formFields.priority);
      formData.append('assignedTo', formFields.assignedTo);
      formData.append('targetDate', formFields.targetDate);
      formData.append('remarks', formFields.remarks);

      selectedFiles.forEach((file) => formData.append('files', file));
      formData.append('fileTitles', JSON.stringify(newFileTitles));

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

    const matchesProject = filterProject === '' || req.project === filterProject;
    const matchesCategory = filterCategory === '' || req.category === filterCategory;
    const matchesStatus = filterStatus === '' || req.status === filterStatus;

    return matchesSearch && matchesProject && matchesCategory && matchesStatus;
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

  const pendingCount = requirements.filter(r => r.status === 'Pending').length;
  const inProgressCount = requirements.filter(r => r.status === 'In Progress').length;
  const fulfilledCount = requirements.filter(r => r.status === 'Fulfilled').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Project Requirements</h2>
          <p>Track materials, design decisions, manpower, and other project needs.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>Add Requirement</span>
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.total}`}>
          <div className={styles.statIcon}><CheckSquare size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{requirements.length}</h3>
            <p>Total Reqs</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.pending}`}>
          <div className={styles.statIcon}><Clock size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{pendingCount}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.inprogress}`}>
          <div className={styles.statIcon}><PlayCircle size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{inProgressCount}</h3>
            <p>In Progress</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.fulfilled}`}>
          <div className={styles.statIcon}><CheckCircle size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{fulfilledCount}</h3>
            <p>Fulfilled</p>
          </div>
        </div>
      </div>

      <div className={styles.filtersBar}>
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
          <select className={styles.filterSelect} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {uniqueProjectsList.map(proj => <option key={proj} value={proj}>{proj}</option>)}
          </select>
          <select className={styles.filterSelect} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {uniqueCategoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {statuses.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
          <div className={styles.viewToggleGroup}>
            <button className={`${styles.viewToggleBtn} ${viewMode === 'card' ? styles.activeView : ''}`} onClick={() => handleViewModeChange('card')}><LayoutGrid size={18} /></button>
            <button className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.activeView : ''}`} onClick={() => handleViewModeChange('table')}><List size={18} /></button>
          </div>
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
      ) : viewMode === 'card' ? (
        <div className={styles.projectGroupSection}>
          {Object.keys(groupedData).map(projectKey => (
            <div key={projectKey}>
              <div className={styles.projectGroupHeader}>
                <h3>{projectKey}</h3>
              </div>
              <div className={styles.reqGrid} style={{ marginTop: '16px' }}>
                {groupedData[projectKey].map(req => (
                  <div key={req.id} className={styles.reqCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>{req.title}</div>
                      <span className={`${styles.statusBadge} ${styles[req.status.replace(' ', '_')]}`}>{req.status}</span>
                    </div>
                    <div className={styles.cardMeta}>
                      <div className={styles.metaItem} title="Requirement No">
                        <Tag size={12} /> {req.requirementNo}
                      </div>
                      <div className={styles.metaItem} title="Target Date">
                        <Calendar size={12} /> {req.targetDate || 'No date'}
                      </div>
                      <div className={styles.metaItem} title="Priority">
                        <span className={`${styles.priorityBadge} ${styles[req.priority]}`}>{req.priority}</span>
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      <span className={styles.categoryTag}>{req.category}</span>
                      {req.assignedTo && (
                        <div className={styles.sectionBlock}>
                          <strong>Assigned To</strong>
                          <p>{req.assignedTo}</p>
                        </div>
                      )}
                      {req.remarks && (
                        <div className={styles.sectionBlock}>
                          <strong>Remarks</strong>
                          <p>{req.remarks}</p>
                        </div>
                      )}
                      {req.files && req.files.length > 0 && (
                        <div className={styles.filesListBlock}>
                          <strong>Attachments ({req.files.length})</strong>
                          <div className={styles.filesGrid}>
                            {req.files.map((file, i) => (
                              <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className={styles.fileItemLink}>
                                <span className={styles.fileLinkTitle}>
                                  <FileText size={14} className={styles.fileIcon} />
                                  {file.title || file.name}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(req)}><Edit2 size={13} /></button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(req)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Target Date</th>
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
                  <td><span className={`${styles.statusBadge} ${styles[req.status.replace(' ', '_')]}`}>{req.status}</span></td>
                  <td><span className={`${styles.priorityBadge} ${styles[req.priority]}`}>{req.priority}</span></td>
                  <td>{req.assignedTo || '—'}</td>
                  <td>{req.targetDate || '—'}</td>
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
              <select name="project" value={formFields.project} onChange={handleInputChange} className={styles.formSelect} required>
                {projects.length > 0 ? projects.map(p => <option key={p.id} value={p.basicInfo.name}>{p.basicInfo.name}</option>) : <option value="">No Active Projects</option>}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><CheckSquare size={14} /> Title *</label>
              <input type="text" name="title" value={formFields.title} onChange={handleInputChange} className={styles.formInput} placeholder="e.g. Paint Approval, Extra Manpower" required />
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
              <label><AlertCircle size={14} /> Status</label>
              <select name="status" value={formFields.status} onChange={handleInputChange} className={styles.formSelect}>
                {statuses.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><AlertCircle size={14} /> Priority</label>
              <select name="priority" value={formFields.priority} onChange={handleInputChange} className={styles.formSelect}>
                {priorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><Calendar size={14} /> Target Date</label>
              <input type="date" name="targetDate" value={formFields.targetDate} onChange={handleInputChange} className={styles.formInput} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label><Tag size={14} /> Assigned To</label>
            <select name="assignedTo" value={formFields.assignedTo} onChange={handleInputChange} className={styles.formSelect}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label><FileText size={14} /> Remarks / Description</label>
            <textarea name="remarks" value={formFields.remarks} onChange={handleInputChange} className={styles.formTextarea} placeholder="Detailed notes..." />
          </div>

          <div className={styles.formGroup} style={{ marginTop: '8px' }}>
            <label><Paperclip size={14} /> Documents & Attachments</label>
            <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
              <label>
                <UploadCloud size={24} style={{ color: 'var(--primary)' }} />
                <span>Click to browse or drag and drop files</span>
              </label>
              <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} />
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
