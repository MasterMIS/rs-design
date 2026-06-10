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
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';
import jsPDF from 'jspdf';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
};

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
  const [users, setUsers] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { activeProject } = useProject();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterPurpose, setFilterPurpose] = useState('');

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
    remarks: '',
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([]);
  const [uploadMode, setUploadMode] = useState<'images' | 'pdf'>('images');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  useEffect(() => {
    fetchSiteVisits();
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
      project: activeProject ? activeProject.name : (projects[0]?.basicInfo?.name || ''),
      purpose: '',
      attendees: '',
      remarks: '',
    });
    setSelectedUsers([]);
    setSelectedFiles([]);
    setExistingFiles([]);
    setUploadMode('images');
    setIsModalOpen(true);
  };

  const handleEdit = (visit: SiteVisit) => {
    setEditingVisit(visit);
    setFormFields({
      visitDate: visit.visitDate,
      project: visit.project,
      purpose: visit.purpose,
      attendees: visit.attendees,
      remarks: visit.remarks,
    });
    setSelectedUsers(visit.visitedBy ? visit.visitedBy.split(',').map(s => s.trim()).filter(Boolean) : []);
    setSelectedFiles([]);
    setExistingFiles(visit.files || []);
    setUploadMode('images');
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
        const pdfFile = new File([pdfBlob], `Site_Photos_${Date.now()}.pdf`, { type: 'application/pdf' });
        finalFiles = [pdfFile];
        finalFileTitles = ['Site Photos (Combined PDF)'];
      }

      finalFiles.forEach((file) => formData.append('files', file));
      formData.append('fileTitles', JSON.stringify(finalFileTitles));

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
    // If we are in project-centric mode, force filter by activeProject
    if (activeProject && visit.project !== activeProject.name) return false;

    const matchesSearch =
      visit.visitNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.visitedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.attendees.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = filterProject === '' || visit.project === filterProject;
    const matchesPurpose = filterPurpose === '' || visit.purpose === filterPurpose;

    return matchesSearch && matchesProject && matchesPurpose;
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



  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Site Visits</h2>
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
            <span className="current">Site Visits & Updates</span>
          </div>
        </div>
        <div className={styles.headerActions} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className={styles.filtersBar} style={{ padding: '6px 12px', margin: 0 }}>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search attendees, IDs..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.filterControls}>

              <select className={styles.filterSelect} value={filterPurpose} onChange={(e) => setFilterPurpose(e.target.value)}>
                <option value="">All Purposes</option>
                {uniquePurposesList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} /> Add Site Visit
          </button>
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
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.svTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Visit No</th>
                <th>Date & Purpose</th>
                <th>Visited By</th>
                <th>Other Attendees</th>
                <th>Remarks</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredVisits].reverse().map(visit => (
                <tr key={visit.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(visit)}><Edit2 size={13} /></button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(visit)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                  <td><strong>{visit.visitNo}</strong></td>
                  <td>
                    <div className={styles.tableTitleCell}>
                      <span className={styles.tableRepName}>{formatDate(visit.visitDate)}</span>
                      <span className={styles.tableRepDetail}>{visit.purpose}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.usersList} style={{ maxWidth: '150px' }}>
                      {visit.visitedBy ? visit.visitedBy.split(',').map((u, i) => (
                        <span key={i} className={styles.userChip}>{u.trim()}</span>
                      )) : '—'}
                    </div>
                  </td>
                  <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {visit.attendees || '—'}
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    {visit.remarks || '—'}
                  </td>
                  <td>
                    <div className={styles.tableFilesCell}>
                      {visit.files && visit.files.length > 0 ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {visit.files.map((file, i) => (
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
              <select name="project" value={formFields.project} onChange={handleInputChange} className={styles.formSelect} required disabled={!!activeProject}>
                {projects.length > 0 ? projects.map(p => <option key={p.id} value={p.basicInfo.name}>{p.basicInfo.name}</option>) : <option value="">No Active Projects</option>}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><Calendar size={14} /> Visit Date *</label>
              <input type="date" name="visitDate" value={formFields.visitDate} onChange={handleInputChange} className={styles.formInput} required />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label><Target size={14} /> Purpose of Visit</label>
            <input type="text" name="purpose" value={formFields.purpose} onChange={handleInputChange} className={styles.formInput} placeholder=" " />
          </div>

          <div 
            className={styles.formGroup} 
            style={{ position: 'relative' }} 
            ref={dropdownRef}
            data-has-value={selectedUsers.length > 0 ? "true" : "false"}
            data-is-open={isUserDropdownOpen ? "true" : "false"}
          >
            <label><Users size={14} /> Visited By (Our Team)</label>
            <div 
              className={styles.formSelect} 
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            >
              <span style={{ color: selectedUsers.length === 0 ? 'var(--text-light)' : 'inherit' }}>
                {selectedUsers.length > 0 ? selectedUsers.join(', ') : ''}
              </span>
              <span>▼</span>
            </div>
            {isUserDropdownOpen && (
              <div style={{ position: 'absolute', zIndex: 10, width: '100%', top: '65px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', maxHeight: '250px', display: 'flex', flexDirection: 'column' }}>
                <input 
                  type="text" 
                  placeholder="Search team..." 
                  value={userSearchTerm} 
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className={styles.formInput}
                  style={{ marginBottom: '10px', padding: '8px' }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {users.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase())).map(u => (
                    <label key={u.name} className={styles.checkboxLabel} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.name)}
                        onChange={() => handleUserToggle(u.name)}
                      />
                      {u.name}
                    </label>
                  ))}
                  {users.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase())).length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center', padding: '10px' }}>No members found.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label><Users size={14} /> Other Attendees (Client / Vendors)</label>
            <input type="text" name="attendees" value={formFields.attendees} onChange={handleInputChange} className={styles.formInput} placeholder=" " />
          </div>

          <div className={styles.formGroup}>
            <label><Tag size={14} /> General Remarks</label>
            <input type="text" name="remarks" value={formFields.remarks} onChange={handleInputChange} className={styles.formInput} placeholder=" " />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', marginTop: '12px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}><Paperclip size={14} /> Site Photos & Documents</label>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="radio" name="uploadMode" checked={uploadMode === 'images'} onChange={() => { setUploadMode('images'); setSelectedFiles([]); }} /> Images (Auto-convert to PDF)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="radio" name="uploadMode" checked={uploadMode === 'pdf'} onChange={() => { setUploadMode('pdf'); setSelectedFiles([]); }} /> PDF Document
              </label>
            </div>

            <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
              <label>
                <UploadCloud size={24} style={{ color: 'var(--primary)' }} />
                <span>Click to browse or drag and drop files</span>
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
                        <FileIcon size={14} style={{ color: 'var(--text-light)' }} />
                        <span className={styles.stagedFileName}>{file.title || file.name}</span>
                      </div>
                      <button type="button" className={styles.removeStagedBtn} onClick={() => handleRemoveExistingFile(i)}><X size={16} /></button>
                    </div>
                  ))}
                  {selectedFiles.map((file, i) => (
                    <div key={`new-${i}`} className={styles.stagedFileItem}>
                      <div className={styles.stagedFileLeft} title={file.name}>
                        {uploadMode === 'images' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
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
