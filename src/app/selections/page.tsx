'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Edit2, Trash2, LayoutGrid, List,
  Calendar, Building, Tag, CheckCircle, FileText,
  Clock, AlertCircle, PlayCircle, X, Paperclip, MousePointerClick,
  UploadCloud, File as FileIcon, XCircle, ShoppingCart, IndianRupee
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
  const { activeProject } = useProject();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([]);
  const [uploadMode, setUploadMode] = useState<'images' | 'pdf'>('images');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const areas = ['Living Room', 'Master Bedroom', 'Guest Bedroom', 'Kitchen', 'Bathroom', 'Dining Area', 'Balcony', 'Outdoor', 'Other'];
  const statuses = ['Proposed', 'Approved', 'Rejected', 'Ordered'];

  useEffect(() => {
    fetchSelections();
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
      selectArea: areas[0] || 'Living Room',
      areaName: '',
      productName: '',
      vendor: '',
      status: 'Proposed',
      estimatedCost: '',
      assignedTo: '',
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
      formData.append('selectArea', formFields.selectArea);
      formData.append('areaName', formFields.areaName);
      formData.append('productName', formFields.productName);
      formData.append('vendor', formFields.vendor);
      formData.append('status', formFields.status);
      formData.append('estimatedCost', formFields.estimatedCost);
      formData.append('assignedTo', formFields.assignedTo);
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
    if (activeProject && sel.project !== activeProject.name) return false;

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
            <div className={styles.formGroup}>
              <label><LayoutGrid size={14} /> Select Area</label>
              <select name="selectArea" value={formFields.selectArea} onChange={handleInputChange} className={styles.formSelect}>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><Tag size={14} /> Specific Area Name</label>
              <input type="text" name="areaName" value={formFields.areaName} onChange={handleInputChange} className={styles.formInput} placeholder=" " />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Building size={14} /> Vendor / Supplier</label>
              <input type="text" name="vendor" value={formFields.vendor} onChange={handleInputChange} className={styles.formInput} placeholder=" " />
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
              <input type="text" name="estimatedCost" value={formFields.estimatedCost} onChange={handleInputChange} className={styles.formInput} placeholder=" " />
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
