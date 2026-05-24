'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, LayoutGrid, List,
  Calendar, Building, Tag, CheckCircle, FileText,
  Clock, AlertCircle, PlayCircle, X, Paperclip, HardHat,
  UploadCloud, File as FileIcon, XCircle, MapPin, Target, Users
} from 'lucide-react';
import styles from './site-visits.module.css';
import Modal from '@/components/Modal';

interface FileAttachment {
  title: string;
  name: string;
  url: string;
}

interface SiteVisit {
  rowIndex: number;
  timestamp: string;
  visitDate: string;
  project: string;
  visitNo: string;
  purpose: string;
  visitedBy: string; // comma separated
  attendees: string;
  status: 'On Track' | 'Delayed' | 'Critical Issues' | 'Completed';
  observations: string;
  actionItems: string;
  files: FileAttachment[];
  remarks: string;
  id: string; // which is visitNo
}

interface Project {
  id: string;
  basicInfo: {
    name: string;
  };
}

export default function SiteVisitsPage() {
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterPurpose, setFilterPurpose] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SiteVisit | null>(null);
  const [visitToDelete, setVisitToDelete] = useState<SiteVisit | null>(null);

  // Form States
  const [formFields, setFormFields] = useState({
    visitDate: '',
    project: '',
    purpose: 'Initial Survey',
    attendees: '',
    status: 'On Track',
    observations: '',
    actionItems: '',
    remarks: '',
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newFileTitles, setNewFileTitles] = useState<string[]>([]);
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const purposes = ['Initial Survey', 'Progress Check', 'Quality Inspection', 'Client Meeting', 'Issue Resolution', 'Final Handover', 'Other'];
  const statuses = ['On Track', 'Delayed', 'Critical Issues', 'Completed'];

  useEffect(() => {
    fetchSiteVisits();
    fetchProjects();
    fetchUsers();

    const saved = localStorage.getItem('sitevisits_view_mode') as 'card' | 'table';
    if (saved === 'card' || saved === 'table') {
      setTimeout(() => setViewMode(saved), 0);
    }
  }, []);

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('sitevisits_view_mode', mode);
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

  async function fetchSiteVisits() {
    try {
      setLoading(true);
      const res = await fetch('/api/site-visits');
      if (res.ok) {
        const data = await res.json();
        setSiteVisits(data);
      }
    } catch (err) {
      console.error('Error fetching site visits:', err);
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
    setEditingVisit(null);
    setFormFields({
      visitDate: new Date().toISOString().split('T')[0],
      project: projects[0]?.basicInfo?.name || '',
      purpose: purposes[0],
      attendees: '',
      status: 'On Track',
      observations: '',
      actionItems: '',
      remarks: '',
    });
    setSelectedUsers([]);
    setSelectedFiles([]);
    setNewFileTitles([]);
    setExistingFiles([]);
    setIsModalOpen(true);
  };

  const handleEdit = (visit: SiteVisit) => {
    setEditingVisit(visit);
    setFormFields({
      visitDate: visit.visitDate,
      project: visit.project,
      purpose: visit.purpose,
      attendees: visit.attendees,
      status: visit.status,
      observations: visit.observations,
      actionItems: visit.actionItems,
      remarks: visit.remarks,
    });
    setSelectedUsers(visit.visitedBy ? visit.visitedBy.split(',').map(s => s.trim()).filter(Boolean) : []);
    setSelectedFiles([]);
    setNewFileTitles([]);
    setExistingFiles(visit.files || []);
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormFields(prev => ({ ...prev, [name]: value }));
  };

  const handleUserToggle = (userName: string) => {
    setSelectedUsers(prev => 
      prev.includes(userName) ? prev.filter(u => u !== userName) : [...prev, userName]
    );
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
    if (!formFields.project || !formFields.visitDate) {
      alert('Project and Visit Date are required.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('visitDate', formFields.visitDate);
      formData.append('project', formFields.project);
      formData.append('purpose', formFields.purpose);
      formData.append('visitedBy', selectedUsers.join(', '));
      formData.append('attendees', formFields.attendees);
      formData.append('status', formFields.status);
      formData.append('observations', formFields.observations);
      formData.append('actionItems', formFields.actionItems);
      formData.append('remarks', formFields.remarks);

      selectedFiles.forEach((file) => formData.append('files', file));
      formData.append('fileTitles', JSON.stringify(newFileTitles));

      let res;
      if (editingVisit) {
        formData.append('visitNo', editingVisit.visitNo);
        formData.append('timestamp', editingVisit.timestamp);
        formData.append('existingFiles', JSON.stringify(existingFiles));

        res = await fetch(`/api/site-visits?rowIndex=${editingVisit.rowIndex}`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        res = await fetch('/api/site-visits', {
          method: 'POST',
          body: formData,
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchSiteVisits();
      } else {
        const err = await res.json();
        alert(`Failed to save site visit: ${err.error}`);
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (visit: SiteVisit) => {
    setVisitToDelete(visit);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!visitToDelete) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/site-visits?rowIndex=${visitToDelete.rowIndex}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setVisitToDelete(null);
        fetchSiteVisits();
      } else {
        const err = await res.json();
        alert(`Failed to delete site visit: ${err.error}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering
  const filteredVisits = siteVisits.filter(visit => {
    const matchesSearch =
      visit.visitNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.visitedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.attendees.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.observations.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = filterProject === '' || visit.project === filterProject;
    const matchesPurpose = filterPurpose === '' || visit.purpose === filterPurpose;
    const matchesStatus = filterStatus === '' || visit.status === filterStatus;

    return matchesSearch && matchesProject && matchesPurpose && matchesStatus;
  });

  const uniqueProjectsList = Array.from(new Set(siteVisits.map(s => s.project))).filter(Boolean);
  const uniquePurposesList = Array.from(new Set(siteVisits.map(s => s.purpose))).filter(Boolean);

  const groupedData: Record<string, SiteVisit[]> = {};
  filteredVisits.forEach(visit => {
    if (!groupedData[visit.project]) {
      groupedData[visit.project] = [];
    }
    groupedData[visit.project].push(visit);
  });

  const onTrackCount = siteVisits.filter(s => s.status === 'On Track').length;
  const delayedCount = siteVisits.filter(s => s.status === 'Delayed').length;
  const issuesCount = siteVisits.filter(s => s.status === 'Critical Issues').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Site Visits</h2>
          <p>Track field inspections, client meetings, and site progress.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>Add Site Visit</span>
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.total}`}>
          <div className={styles.statIcon}><MapPin size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{siteVisits.length}</h3>
            <p>Total Visits</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.ontrack}`}>
          <div className={styles.statIcon}><CheckCircle size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{onTrackCount}</h3>
            <p>On Track</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.delayed}`}>
          <div className={styles.statIcon}><Clock size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{delayedCount}</h3>
            <p>Delayed</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.issues}`}>
          <div className={styles.statIcon}><AlertCircle size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{issuesCount}</h3>
            <p>Critical Issues</p>
          </div>
        </div>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search attendees, observations, IDs..."
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
          <select className={styles.filterSelect} value={filterPurpose} onChange={(e) => setFilterPurpose(e.target.value)}>
            <option value="">All Purposes</option>
            {uniquePurposesList.map(p => <option key={p} value={p}>{p}</option>)}
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
          <p>Loading site visits...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>No site visits found.</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className={styles.projectGroupSection}>
          {Object.keys(groupedData).map(projectKey => (
            <div key={projectKey}>
              <div className={styles.projectGroupHeader}>
                <h3>{projectKey}</h3>
              </div>
              <div className={styles.svGrid} style={{ marginTop: '16px' }}>
                {groupedData[projectKey].map(visit => (
                  <div key={visit.id} className={styles.svCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>{visit.purpose}</div>
                      <span className={`${styles.statusBadge} ${styles[visit.status.replace(/\s+/g, '')]}`}>{visit.status}</span>
                    </div>
                    <div className={styles.cardMeta}>
                      <div className={styles.metaItem} title="Visit No">
                        <Tag size={12} /> {visit.visitNo}
                      </div>
                      <div className={styles.metaItem} title="Date">
                        <Calendar size={12} /> {visit.visitDate}
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.sectionBlock}>
                        <strong><Users size={12} style={{ display: 'inline', marginRight: '4px' }}/>Visited By</strong>
                        <div className={styles.usersList}>
                          {visit.visitedBy ? visit.visitedBy.split(',').map((u, i) => (
                            <span key={i} className={styles.userChip}>{u.trim()}</span>
                          )) : <span style={{color: 'var(--text-light)'}}>None</span>}
                        </div>
                      </div>
                      
                      {visit.attendees && (
                        <div className={styles.sectionBlock}>
                          <strong>Other Attendees</strong>
                          <p>{visit.attendees}</p>
                        </div>
                      )}
                      {visit.observations && (
                        <div className={styles.sectionBlock}>
                          <strong>Key Observations</strong>
                          <p>{visit.observations}</p>
                        </div>
                      )}
                      {visit.actionItems && (
                        <div className={styles.sectionBlock}>
                          <strong>Action Items</strong>
                          <p>{visit.actionItems}</p>
                        </div>
                      )}
                      {visit.files && visit.files.length > 0 && (
                        <div className={styles.filesListBlock}>
                          <strong>Attachments ({visit.files.length})</strong>
                          <div className={styles.filesGrid}>
                            {visit.files.map((file, i) => (
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
                      <button className={styles.controlBtn} onClick={() => handleEdit(visit)}><Edit2 size={13} /></button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(visit)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.svTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Visit No</th>
                <th>Project</th>
                <th>Date & Purpose</th>
                <th>Status</th>
                <th>Visited By</th>
                <th>Observations</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.map(visit => (
                <tr key={visit.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(visit)}><Edit2 size={13} /></button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(visit)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                  <td><strong>{visit.visitNo}</strong></td>
                  <td>{visit.project}</td>
                  <td>
                    <div className={styles.tableTitleCell}>
                      <span className={styles.tableRepName}>{visit.visitDate}</span>
                      <span className={styles.tableRepDetail}>{visit.purpose}</span>
                    </div>
                  </td>
                  <td><span className={`${styles.statusBadge} ${styles[visit.status.replace(/\s+/g, '')]}`}>{visit.status}</span></td>
                  <td>
                    <div className={styles.usersList} style={{ maxWidth: '150px' }}>
                      {visit.visitedBy ? visit.visitedBy.split(',').map((u, i) => (
                        <span key={i} className={styles.userChip}>{u.trim()}</span>
                      )) : '—'}
                    </div>
                  </td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {visit.observations || '—'}
                  </td>
                  <td>
                    <div className={styles.tableFilesCell}>
                      {visit.files && visit.files.length > 0 ? (
                        visit.files.map((file, i) => (
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
        title={editingVisit ? 'Edit Site Visit' : 'Add Site Visit'}
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
              <label><Calendar size={14} /> Visit Date *</label>
              <input type="date" name="visitDate" value={formFields.visitDate} onChange={handleInputChange} className={styles.formInput} required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Target size={14} /> Purpose of Visit</label>
              <select name="purpose" value={formFields.purpose} onChange={handleInputChange} className={styles.formSelect}>
                {purposes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><AlertCircle size={14} /> Site Status</label>
              <select name="status" value={formFields.status} onChange={handleInputChange} className={styles.formSelect}>
                {statuses.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label><Users size={14} /> Visited By (Our Team)</label>
            <div className={styles.multiSelectBox}>
              {users.map(u => (
                <label key={u.name} className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.includes(u.name)}
                    onChange={() => handleUserToggle(u.name)}
                  />
                  {u.name}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label><Users size={14} /> Other Attendees (Client / Vendors)</label>
            <input type="text" name="attendees" value={formFields.attendees} onChange={handleInputChange} className={styles.formInput} placeholder="e.g. Mr. Sharma (Client), Ravi (Plumber)" />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><FileText size={14} /> Key Observations</label>
              <textarea name="observations" value={formFields.observations} onChange={handleInputChange} className={styles.formTextarea} placeholder="What was observed or discussed?" />
            </div>
            <div className={styles.formGroup}>
              <label><CheckCircle size={14} /> Action Items</label>
              <textarea name="actionItems" value={formFields.actionItems} onChange={handleInputChange} className={styles.formTextarea} placeholder="What needs to be done next?" />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label><Tag size={14} /> General Remarks</label>
            <input type="text" name="remarks" value={formFields.remarks} onChange={handleInputChange} className={styles.formInput} placeholder="Any other notes..." />
          </div>

          <div className={styles.formGroup} style={{ marginTop: '8px' }}>
            <label><Paperclip size={14} /> Site Photos & Documents</label>
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
            <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Saving...' : (editingVisit ? 'Update Visit' : 'Save Visit')}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !submitting && setIsDeleteModalOpen(false)} title="Confirm Deletion" width="400px">
        <div className={styles.deleteConfirmBody}>
          <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <p>Are you sure you want to delete <strong>{visitToDelete?.visitNo}</strong>?</p>
          <p className={styles.warningSub}>This action cannot be undone.</p>
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} disabled={submitting}>Cancel</button>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete Visit'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
