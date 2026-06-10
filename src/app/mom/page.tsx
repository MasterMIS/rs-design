'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Calendar, MapPin, Trash2, Edit2, LayoutGrid, List,
  Building, User, Users, MessageCircle, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, RefreshCw, ClipboardList, CalendarCheck,
  CheckSquare, FileUp, Link2, Loader2, UserCheck, FileText,
  UploadCloud, File as FileIcon, X
} from 'lucide-react';
import styles from './mom.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';
import jsPDF from 'jspdf';

interface MOM {
  rowIndex: number;
  timestamp: string;
  project: string;
  purpose: string;
  meetingDate: string;
  ourAttendees: string;
  clientAttendees: string;
  location: string;
  keyDecisions: string;
  actionItems: string;
  nextMeetingDate: string;
  status: 'Draft' | 'Approved' | 'Distributed' | 'Closed';
  documents: string;
  remarks: string;
  id: string;
}

interface Project {
  id: string;
  rowIndex: number;
  basicInfo: {
    name: string;
    code?: string;
  };
}

export default function MOMPage() {
  const { activeProject } = useProject();
  const [momList, setMomList] = useState<MOM[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingMOM, setEditingMOM] = useState<MOM | null>(null);
  const [momToDelete, setMomToDelete] = useState<MOM | null>(null);

  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadMode, setUploadMode] = useState<'images' | 'pdf'>('images');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields State
  const [formFields, setFormFields] = useState({
    project: '',
    purpose: '',
    meetingDate: '',
    ourAttendees: '',
    clientAttendees: '',
    location: '',
    keyDecisions: '',
    actionItems: '',
    nextMeetingDate: '',
    status: 'Draft' as 'Draft' | 'Approved' | 'Distributed' | 'Closed',
    remarks: '',
  });

  const statuses: ('Draft' | 'Approved' | 'Distributed' | 'Closed')[] = ['Draft', 'Approved', 'Distributed', 'Closed'];

  useEffect(() => {
    fetchMOMList();
    fetchProjects();

    }, []);

  async function fetchMOMList() {
    try {
      setLoading(true);
      const res = await fetch('/api/mom');
      if (res.ok) {
        const data = await res.json();
        setMomList(data);

        // Expand all projects by default in grouped card view
        const uniqueProjects: string[] = Array.from(new Set(data.map((m: MOM) => m.project)));
        const expandMap: Record<string, boolean> = {};
        uniqueProjects.forEach(proj => {
          expandMap[proj] = true;
        });
        setExpandedProjects(expandMap);
      }
    } catch (err) {
      console.error('Error fetching MOM list:', err);
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

  const toggleProject = (projectName: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectName]: !prev[projectName]
    }));
  };

  const handleCreateNew = () => {
    setEditingMOM(null);
    setSelectedFiles([]);
    setFormFields({
      project: projects[0]?.basicInfo?.name || '',
      purpose: '',
      meetingDate: new Date().toISOString().split('T')[0],
      ourAttendees: '',
      clientAttendees: '',
      location: '',
      keyDecisions: '',
      actionItems: '',
      nextMeetingDate: '',
      status: 'Draft',
      remarks: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (mom: MOM) => {
    setEditingMOM(mom);
    setUploadMode('images');
    setSelectedFiles([]);
    setFormFields({
      project: mom.project,
      purpose: mom.purpose,
      meetingDate: mom.meetingDate,
      ourAttendees: mom.ourAttendees,
      clientAttendees: mom.clientAttendees,
      location: mom.location,
      keyDecisions: mom.keyDecisions,
      actionItems: mom.actionItems,
      nextMeetingDate: mom.nextMeetingDate,
      status: mom.status,
      remarks: mom.remarks,
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
      const filesArr = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArr]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.project || !formFields.purpose) {
      alert('Please fill out required fields (Project, Purpose of Meeting)');
      return;
    }

    try {
      setSubmitting(true);
      const submitData = new FormData();
      submitData.append('project', formFields.project);
      submitData.append('purpose', formFields.purpose);
      submitData.append('meetingDate', formFields.meetingDate);
      submitData.append('ourAttendees', formFields.ourAttendees);
      submitData.append('clientAttendees', formFields.clientAttendees);
      submitData.append('location', formFields.location);
      submitData.append('keyDecisions', formFields.keyDecisions);
      submitData.append('actionItems', formFields.actionItems);
      submitData.append('nextMeetingDate', formFields.nextMeetingDate);
      submitData.append('status', formFields.status);
      submitData.append('remarks', formFields.remarks);

      let fileToUpload: File | null = null;

      if (selectedFiles.length > 0) {
        const allImages = selectedFiles.every(f => f.type.startsWith('image/'));
        if (allImages && uploadMode === 'images') {
          const pdf = new jsPDF();
          for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
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
          fileToUpload = new File([pdfBlob], `MOM_${Date.now()}.pdf`, { type: 'application/pdf' });
        } else {
          fileToUpload = selectedFiles[0];
        }
      }

      if (fileToUpload) {
        submitData.append('file', fileToUpload);
      }


      if (editingMOM) {
        submitData.append('timestamp', editingMOM.timestamp);
        submitData.append('id', editingMOM.id);
        submitData.append('documents', editingMOM.documents); // Keep existing url if no new file is uploaded

        const res = await fetch(`/api/mom?rowIndex=${editingMOM.rowIndex}`, {
          method: 'PUT',
          body: submitData,
        });

        if (res.ok) {
          setIsModalOpen(false);
          fetchMOMList();
        } else {
          const err = await res.json();
          alert(`Failed to update MOM: ${err.error}`);
        }
      } else {
        const res = await fetch('/api/mom', {
          method: 'POST',
          body: submitData,
        });

        if (res.ok) {
          setIsModalOpen(false);
          fetchMOMList();
        } else {
          const err = await res.json();
          alert(`Failed to add MOM log: ${err.error}`);
        }
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (mom: MOM) => {
    setMomToDelete(mom);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!momToDelete) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/mom?rowIndex=${momToDelete.rowIndex}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        setMomToDelete(null);
        fetchMOMList();
      } else {
        const err = await res.json();
        alert(`Failed to delete MOM log: ${err.error}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Logic
  const filteredMOMList = momList.filter(mom => {
    const matchesSearch =
      mom.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mom.ourAttendees.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mom.clientAttendees.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mom.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mom.keyDecisions.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mom.actionItems.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mom.remarks.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = filterProject === '' || mom.project === filterProject;
    const matchesStatus = filterStatus === '' || mom.status === filterStatus;

    return matchesSearch && matchesProject && matchesStatus;
  });

  // Unique project lists for filters
  const uniqueProjectsList = Array.from(new Set(momList.map(m => m.project))).filter(Boolean);

  // Grouping logic by Project
  const groupedData: Record<string, MOM[]> = {};
  filteredMOMList.forEach(mom => {
    if (!groupedData[mom.project]) {
      groupedData[mom.project] = [];
    }
    groupedData[mom.project].push(mom);
  });

  // Counters
  const totalCount = momList.length;
  const draftCount = momList.filter(m => m.status === 'Draft').length;
  const distributedCount = momList.filter(m => m.status === 'Distributed' || m.status === 'Approved').length;
  const pendingNextCount = momList.filter(m => m.nextMeetingDate && new Date(m.nextMeetingDate) >= new Date()).length;

  return (
    <div className={styles.container}>
      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Minutes of Meeting (MOM)</h2>
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
            <span className="current">Meetings (MoM)</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>New MOM Log</span>
          </button>
        </div>
      </div>

      {/* Main Display Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>Loading meeting minutes logs...</p>
        </div>
      ) : filteredMOMList.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>No meeting logs found matching filters.</p>
        </div>
      ) : (<div className={styles.tableContainer}>
          <table className={styles.momTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Meeting Purpose</th>
                <th>Project</th>
                <th>Meeting Date</th>
                <th>Location</th>
                <th>MOM Document</th>
                <th>Status</th>
                <th>Action Items / Decisions</th>
                <th>Attendees</th>
              </tr>
            </thead>
            <tbody>
              {filteredMOMList.map((mom) => (
                <tr key={mom.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(mom)} title="Edit MOM Log">
                        <Edit2 size={13} />
                      </button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(mom)} title="Delete MOM Log">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.tableTitleCell}>
                      <span className={styles.tableRepName}>{mom.purpose}</span>
                      {mom.remarks && (
                        <span className={styles.tableRepDetail}>{mom.remarks}</span>
                      )}
                    </div>
                  </td>
                  <td>{mom.project}</td>
                  <td>
                    {mom.meetingDate ? new Date(mom.meetingDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td>{mom.location || '—'}</td>
                  <td>
                    {mom.documents ? (
                      <a href={mom.documents} target="_blank" rel="noopener noreferrer" className={styles.docLink} style={{ display: 'inline-flex' }}>
                        <Link2 size={12} />
                        <span>MOM Attachment</span>
                      </a>
                    ) : (
                      <span className={styles.noDocText}>No Doc</span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[mom.status.toLowerCase()]}`}>
                      {mom.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'normal', fontSize: '0.8rem' }}>
                    {mom.actionItems ? (
                      <div>
                        <strong>Actions:</strong>
                        <div style={{ whiteSpace: 'pre-line', marginTop: '2px', color: 'var(--text-main)' }}>{mom.actionItems}</div>
                      </div>
                    ) : mom.keyDecisions ? (
                      <div>
                        <strong>Decisions:</strong>
                        <div style={{ whiteSpace: 'pre-line', marginTop: '2px', color: 'var(--text-main)' }}>{mom.keyDecisions}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    {mom.ourAttendees && <div><strong>Our side:</strong> {mom.ourAttendees}</div>}
                    {mom.clientAttendees && <div style={{ marginTop: '2px' }}><strong>Client side:</strong> {mom.clientAttendees}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stakeholder Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMOM ? 'Update Minutes of Meeting (MOM)' : 'Create Meeting Minutes Log (MOM)'}
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
              <label><FileText size={14} /> Purpose of Meeting *</label>
              <input
                type="text"
                name="purpose"
                value={formFields.purpose}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g. Design Coordination, Vendor Review Meeting"
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Calendar size={14} /> Meeting Date *</label>
              <input
                type="date"
                name="meetingDate"
                value={formFields.meetingDate}
                onChange={handleInputChange}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label><MapPin size={14} /> Meeting Location / Platform</label>
              <input
                type="text"
                name="location"
                value={formFields.location}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g. Site Cabin, Main Office, Google Meet"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Users size={14} /> Our Side Attendees (PMC / RSDesign)</label>
              <textarea
                name="ourAttendees"
                value={formFields.ourAttendees}
                onChange={handleInputChange}
                className={styles.formTextarea}
                placeholder="List internal team representatives present..."
              />
            </div>
            <div className={styles.formGroup}>
              <label><UserCheck size={14} /> Client & Partners Attendees</label>
              <textarea
                name="clientAttendees"
                value={formFields.clientAttendees}
                onChange={handleInputChange}
                className={styles.formTextarea}
                placeholder="List clients, external consultants, or contractors..."
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><CheckSquare size={14} /> Key Decisions / Agreements</label>
              <textarea
                name="keyDecisions"
                value={formFields.keyDecisions}
                onChange={handleInputChange}
                className={styles.formTextarea}
                placeholder="Note key items agreed upon..."
              />
            </div>
            <div className={styles.formGroup}>
              <label><ClipboardList size={14} /> Action Plan & Task Responsibilities</label>
              <textarea
                name="actionItems"
                value={formFields.actionItems}
                onChange={handleInputChange}
                className={styles.formTextarea}
                placeholder="List actions, who owns them, and due dates..."
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><CalendarCheck size={14} /> Next Meeting / Review Date</label>
              <input
                type="date"
                name="nextMeetingDate"
                value={formFields.nextMeetingDate}
                onChange={handleInputChange}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label><AlertCircle size={14} /> Meeting Status</label>
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

          {/* Drag & Drop File Upload Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', marginTop: '12px', gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}><FileUp size={14} /> Documents & Attachments</label>
            
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="radio" name="uploadMode" checked={uploadMode === 'images'} onChange={() => { setUploadMode('images'); setSelectedFiles([]); }} />
                Images (Auto-convert to PDF)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="radio" name="uploadMode" checked={uploadMode === 'pdf'} onChange={() => { setUploadMode('pdf'); setSelectedFiles([]); }} />
                PDF Document (Single File)
              </label>
            </div>

            <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
              <label>
                <UploadCloud size={24} style={{ color: 'var(--primary)' }} />
                <span>Click to browse or drag and drop files</span>
              </label>
              <input type="file" multiple={uploadMode === 'images'} accept={uploadMode === 'images' ? 'image/*' : 'application/pdf'} ref={fileInputRef} onChange={handleFileChange} />
            </div>

            {selectedFiles.length > 0 && (
              <div className={styles.uploadedStagedList}>
                <strong>Staged Files</strong>
                <div className={styles.stagingGrid}>
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
                      <button type="button" className={styles.removeStagedBtn} onClick={(e) => { e.stopPropagation(); removeSelectedFile(i); }}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editingMOM && editingMOM.documents && selectedFiles.length === 0 && (
                <div className={styles.previewWrapper}>
                  <span className={styles.fileMeta} style={{ backgroundColor: 'rgba(39, 206, 138, 0.1)', color: 'var(--success)' }}>
                    <Link2 size={16} />
                    Existing Attached MOM Document
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Click to upload a new file and overwrite the existing document.</p>
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
              placeholder="Enter additional remarks or general meeting observations..."
            />
          </div>

          <div className={styles.formActions}>
            <button type="submit" disabled={submitting} className={styles.submitBtn}>
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Loader2 size={16} className={styles.spin} />
                  Saving MOM...
                </span>
              ) : editingMOM ? 'Save Changes' : 'Publish MOM Log'}
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
        title="Remove Meeting Minutes Log"
        width="450px"
      >
        <div className={styles.deleteConfirmBody}>
          <p>Are you sure you want to delete the meeting log <strong>{momToDelete?.purpose}</strong>?</p>
          <p className={styles.warningSub}>This will permanently delete this MOM row from the Google Sheet.</p>
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
