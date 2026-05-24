'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, LayoutGrid, List,
  Calendar, Building, Tag, CheckCircle, FileText,
  Clock, AlertCircle, PlayCircle, X, Paperclip, MousePointerClick,
  UploadCloud, File as FileIcon, XCircle, ShoppingCart, IndianRupee
} from 'lucide-react';
import styles from './selections.module.css';
import Modal from '@/components/Modal';

interface FileAttachment {
  title: string;
  name: string;
  url: string;
}

interface Selection {
  rowIndex: number;
  timestamp: string;
  project: string;
  selectionNo: string;
  selectArea: string;
  areaName: string;
  productName: string;
  vendor: string;
  status: 'Proposed' | 'Approved' | 'Rejected' | 'Ordered';
  estimatedCost: string;
  assignedTo: string;
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
  const [selections, setSelections] = useState<Selection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSel, setEditingSel] = useState<Selection | null>(null);
  const [selToDelete, setSelToDelete] = useState<Selection | null>(null);

  // Form States
  const [formFields, setFormFields] = useState({
    project: '',
    selectArea: 'Living Room',
    areaName: '',
    productName: '',
    vendor: '',
    status: 'Proposed',
    estimatedCost: '',
    assignedTo: '',
    remarks: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newFileTitles, setNewFileTitles] = useState<string[]>([]);
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const areas = ['Living Room', 'Master Bedroom', 'Guest Bedroom', 'Kitchen', 'Bathroom', 'Dining Area', 'Balcony', 'Outdoor', 'Other'];
  const statuses = ['Proposed', 'Approved', 'Rejected', 'Ordered'];

  useEffect(() => {
    fetchSelections();
    fetchProjects();
    fetchUsers();

    const saved = localStorage.getItem('selections_view_mode') as 'card' | 'table';
    if (saved === 'card' || saved === 'table') {
      setTimeout(() => setViewMode(saved), 0);
    }
  }, []);

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('selections_view_mode', mode);
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
      project: projects[0]?.basicInfo?.name || '',
      selectArea: areas[0],
      areaName: '',
      productName: '',
      vendor: '',
      status: 'Proposed',
      estimatedCost: '',
      assignedTo: '',
      remarks: '',
    });
    setSelectedFiles([]);
    setNewFileTitles([]);
    setExistingFiles([]);
    setIsModalOpen(true);
  };

  const handleEdit = (sel: Selection) => {
    setEditingSel(sel);
    setFormFields({
      project: sel.project,
      selectArea: sel.selectArea,
      areaName: sel.areaName,
      productName: sel.productName,
      vendor: sel.vendor,
      status: sel.status,
      estimatedCost: sel.estimatedCost,
      assignedTo: sel.assignedTo,
      remarks: sel.remarks,
    });
    setSelectedFiles([]);
    setNewFileTitles([]);
    setExistingFiles(sel.files || []);
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
    if (!formFields.project || !formFields.productName) {
      alert('Project and Product Name are required.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('project', formFields.project);
      formData.append('selectArea', formFields.selectArea);
      formData.append('areaName', formFields.areaName);
      formData.append('productName', formFields.productName);
      formData.append('vendor', formFields.vendor);
      formData.append('status', formFields.status);
      formData.append('estimatedCost', formFields.estimatedCost);
      formData.append('assignedTo', formFields.assignedTo);
      formData.append('remarks', formFields.remarks);

      selectedFiles.forEach((file) => formData.append('files', file));
      formData.append('fileTitles', JSON.stringify(newFileTitles));

      let res;
      if (editingSel) {
        formData.append('selectionNo', editingSel.selectionNo);
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
    const matchesSearch =
      sel.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sel.selectionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sel.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sel.areaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sel.remarks.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = filterProject === '' || sel.project === filterProject;
    const matchesArea = filterArea === '' || sel.selectArea === filterArea;
    const matchesStatus = filterStatus === '' || sel.status === filterStatus;

    return matchesSearch && matchesProject && matchesArea && matchesStatus;
  });

  const uniqueProjectsList = Array.from(new Set(selections.map(s => s.project))).filter(Boolean);
  const uniqueAreasList = Array.from(new Set(selections.map(s => s.selectArea))).filter(Boolean);

  const groupedData: Record<string, Selection[]> = {};
  filteredSels.forEach(sel => {
    if (!groupedData[sel.project]) {
      groupedData[sel.project] = [];
    }
    groupedData[sel.project].push(sel);
  });

  const proposedCount = selections.filter(s => s.status === 'Proposed').length;
  const approvedCount = selections.filter(s => s.status === 'Approved').length;
  const orderedCount = selections.filter(s => s.status === 'Ordered').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Material & Product Selections</h2>
          <p>Track proposals, approvals, and orders for project materials.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>Add Selection</span>
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.total}`}>
          <div className={styles.statIcon}><MousePointerClick size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{selections.length}</h3>
            <p>Total Selections</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.proposed}`}>
          <div className={styles.statIcon}><Clock size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{proposedCount}</h3>
            <p>Proposed</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.approved}`}>
          <div className={styles.statIcon}><CheckCircle size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{approvedCount}</h3>
            <p>Approved</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.ordered}`}>
          <div className={styles.statIcon}><ShoppingCart size={18} /></div>
          <div className={styles.statInfo}>
            <h3>{orderedCount}</h3>
            <p>Ordered</p>
          </div>
        </div>
      </div>

      <div className={styles.filtersBar}>
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
        <div className={styles.filterControls}>
          <select className={styles.filterSelect} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {uniqueProjectsList.map(proj => <option key={proj} value={proj}>{proj}</option>)}
          </select>
          <select className={styles.filterSelect} value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
            <option value="">All Areas</option>
            {uniqueAreasList.map(area => <option key={area} value={area}>{area}</option>)}
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
          <p>Loading selections...</p>
        </div>
      ) : filteredSels.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>No selections found.</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className={styles.projectGroupSection}>
          {Object.keys(groupedData).map(projectKey => (
            <div key={projectKey}>
              <div className={styles.projectGroupHeader}>
                <h3>{projectKey}</h3>
              </div>
              <div className={styles.selGrid} style={{ marginTop: '16px' }}>
                {groupedData[projectKey].map(sel => (
                  <div key={sel.id} className={styles.selCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>{sel.productName}</div>
                      <span className={`${styles.statusBadge} ${styles[sel.status]}`}>{sel.status}</span>
                    </div>
                    <div className={styles.cardMeta}>
                      <div className={styles.metaItem} title="Selection No">
                        <Tag size={12} /> {sel.selectionNo}
                      </div>
                      <div className={styles.metaItem} title="Area">
                        <Building size={12} /> {sel.areaName || sel.selectArea}
                      </div>
                      {sel.estimatedCost && (
                        <div className={styles.metaItem} title="Cost">
                          <IndianRupee size={12} /> {sel.estimatedCost}
                        </div>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <span className={styles.areaTag}>{sel.selectArea}</span>
                      
                      <div className={styles.sectionBlock}>
                        <strong>Vendor / Supplier</strong>
                        <p>{sel.vendor || 'TBD'}</p>
                      </div>
                      
                      {sel.assignedTo && (
                        <div className={styles.sectionBlock}>
                          <strong>Selected By</strong>
                          <p>{sel.assignedTo}</p>
                        </div>
                      )}
                      {sel.remarks && (
                        <div className={styles.sectionBlock}>
                          <strong>Remarks</strong>
                          <p>{sel.remarks}</p>
                        </div>
                      )}
                      {sel.files && sel.files.length > 0 && (
                        <div className={styles.filesListBlock}>
                          <strong>Attachments ({sel.files.length})</strong>
                          <div className={styles.filesGrid}>
                            {sel.files.map((file, i) => (
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
                      <button className={styles.controlBtn} onClick={() => handleEdit(sel)}><Edit2 size={13} /></button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(sel)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.selTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Sel No</th>
                <th>Project</th>
                <th>Product & Area</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Cost</th>
                <th>Selected By</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {filteredSels.map(sel => (
                <tr key={sel.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(sel)}><Edit2 size={13} /></button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(sel)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                  <td><strong>{sel.selectionNo}</strong></td>
                  <td>{sel.project}</td>
                  <td>
                    <div className={styles.tableTitleCell}>
                      <span className={styles.tableRepName}>{sel.productName}</span>
                      <span className={styles.tableRepDetail}>{sel.selectArea} {sel.areaName ? `(${sel.areaName})` : ''}</span>
                    </div>
                  </td>
                  <td>{sel.vendor || '—'}</td>
                  <td><span className={`${styles.statusBadge} ${styles[sel.status]}`}>{sel.status}</span></td>
                  <td>{sel.estimatedCost ? `₹${sel.estimatedCost}` : '—'}</td>
                  <td>{sel.assignedTo || '—'}</td>
                  <td>
                    <div className={styles.tableFilesCell}>
                      {sel.files && sel.files.length > 0 ? (
                        sel.files.map((file, i) => (
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
        title={editingSel ? 'Edit Selection' : 'Add Selection'}
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
              <label><MousePointerClick size={14} /> Product Name *</label>
              <input type="text" name="productName" value={formFields.productName} onChange={handleInputChange} className={styles.formInput} placeholder="e.g. Italian Marble, Kohler Faucet" required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><LayoutGrid size={14} /> Select Area</label>
              <select name="selectArea" value={formFields.selectArea} onChange={handleInputChange} className={styles.formSelect}>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><Tag size={14} /> Specific Area Name</label>
              <input type="text" name="areaName" value={formFields.areaName} onChange={handleInputChange} className={styles.formInput} placeholder="e.g. Master Bedroom" />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Building size={14} /> Vendor / Supplier</label>
              <input type="text" name="vendor" value={formFields.vendor} onChange={handleInputChange} className={styles.formInput} placeholder="e.g. ABC Ceramics" />
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
              <label><IndianRupee size={14} /> Estimated Cost</label>
              <input type="text" name="estimatedCost" value={formFields.estimatedCost} onChange={handleInputChange} className={styles.formInput} placeholder="e.g. 50,000" />
            </div>
            <div className={styles.formGroup}>
              <label><Tag size={14} /> Selected By</label>
              <select name="assignedTo" value={formFields.assignedTo} onChange={handleInputChange} className={styles.formSelect}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label><FileText size={14} /> Remarks / Details</label>
            <textarea name="remarks" value={formFields.remarks} onChange={handleInputChange} className={styles.formTextarea} placeholder="Dimensions, finishes, specs..." />
          </div>

          <div className={styles.formGroup} style={{ marginTop: '8px' }}>
            <label><Paperclip size={14} /> Reference Documents & Images</label>
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
