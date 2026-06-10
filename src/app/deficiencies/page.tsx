'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Users, MapPin, Calendar, 
  DollarSign, Filter, Trash2, Edit2, LayoutGrid, 
  List, Eye, AlertTriangle, CheckCircle, Clock, 
  Building, User, ArrowRight, Upload, X, RefreshCw,
  FileText, Wrench, MessageSquare, Image
} from 'lucide-react';
import styles from './deficiencies.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';


interface Deficiency {
  rowIndex: number;
  timestamp: string;
  project: string;
  reporter: string;
  area: string;
  beforeDocs: string;
  remarks: string;
  title: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  assignedTo: string;
  dueDate: string;
  afterDocs: string;
  id: string;
}

interface Project {
  id: string;
  rowIndex: number;
  basicInfo: {
    name: string;
    code?: string;
    type?: string;
  };
}

export default function DeficienciesPage() {
  const { activeProject } = useProject();
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [viewingDeficiency, setViewingDeficiency] = useState<Deficiency | null>(null);
  const [editingDeficiency, setEditingDeficiency] = useState<Deficiency | null>(null);
  const [deficiencyToDelete, setDeficiencyToDelete] = useState<Deficiency | null>(null);

  // File Upload states
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  // Form Fields state
  const [formFields, setFormFields] = useState({
    project: '',
    reporter: '',
    area: '',
    remarks: '',
    title: '',
    category: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    status: 'Open' as 'Open' | 'In Progress' | 'Resolved' | 'Closed',
    assignedTo: '',
    dueDate: '',
  });

  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'Carpentry / Wardrobe / Furniture',
    'Painting / Wallpaper / Polish',
    'Civil / Masonry / Tiling',
    'Electrical / Lighting / Automation',
    'Plumbing / Sanitary Fittings',
    'False Ceiling / POP / Gypsum',
    'Flooring (Wooden/Stone)',
    'HVAC / Ventilation',
    'Metalwork / Glass / Windows',
    'Deep Cleaning / Handover Prep'
  ];

  const priorities = ['Low', 'Medium', 'High'];
  const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

  useEffect(() => {
    fetchDeficiencies();
    fetchProjects();

    }, []);

  async function fetchDeficiencies() {
    try {
      setLoading(true);
      const res = await fetch('/api/deficiencies');
      if (res.ok) {
        const data = await res.json();
        setDeficiencies(data);
      }
    } catch (err) {
      console.error('Error fetching deficiencies:', err);
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

  // Pre-fill form for creation
  const handleCreateNew = () => {
    setEditingDeficiency(null);
    setBeforeFile(null);
    setBeforePreview(null);
    setAfterFile(null);
    setAfterPreview(null);
    setFormFields({
      project: projects[0]?.basicInfo?.name || '',
      reporter: '',
      area: '',
      remarks: '',
      title: '',
      category: categories[0],
      priority: 'Medium',
      status: 'Open',
      assignedTo: '',
      dueDate: '',
    });
    setIsModalOpen(true);
  };

  // Pre-fill form for editing
  const handleEdit = (deficiency: Deficiency) => {
    setEditingDeficiency(deficiency);
    setBeforeFile(null);
    setBeforePreview(deficiency.beforeDocs || null);
    setAfterFile(null);
    setAfterPreview(deficiency.afterDocs || null);
    setFormFields({
      project: deficiency.project,
      reporter: deficiency.reporter,
      area: deficiency.area,
      remarks: deficiency.remarks,
      title: deficiency.title,
      category: deficiency.category,
      priority: deficiency.priority,
      status: deficiency.status,
      assignedTo: deficiency.assignedTo,
      dueDate: deficiency.dueDate,
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

  // Handle Before File select
  const handleBeforeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBeforeFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBeforePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle After File select
  const handleAfterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAfterFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerBeforeFileSelect = () => beforeFileInputRef.current?.click();
  const triggerAfterFileSelect = () => afterFileInputRef.current?.click();

  const removeBeforeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBeforeFile(null);
    setBeforePreview(null);
    if (beforeFileInputRef.current) beforeFileInputRef.current.value = '';
  };

  const removeAfterFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAfterFile(null);
    setAfterPreview(null);
    if (afterFileInputRef.current) afterFileInputRef.current.value = '';
  };

  // Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.title || !formFields.project || !formFields.reporter || !formFields.area) {
      alert('Please fill out all required fields (Title, Project, Reporter, Area)');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('project', formFields.project);
      formData.append('reporter', formFields.reporter);
      formData.append('area', formFields.area);
      formData.append('remarks', formFields.remarks);
      formData.append('title', formFields.title);
      formData.append('category', formFields.category);
      formData.append('priority', formFields.priority);
      formData.append('status', formFields.status);
      formData.append('assignedTo', formFields.assignedTo);
      formData.append('dueDate', formFields.dueDate);

      if (editingDeficiency) {
        formData.append('id', editingDeficiency.id);
        formData.append('timestamp', editingDeficiency.timestamp);
        formData.append('beforeDocs', editingDeficiency.beforeDocs || '');
        formData.append('afterDocs', editingDeficiency.afterDocs || '');

        if (beforeFile) {
          formData.append('beforeImage', beforeFile);
        }
        if (afterFile) {
          formData.append('afterImage', afterFile);
        }

        const res = await fetch(`/api/deficiencies?rowIndex=${editingDeficiency.rowIndex}`, {
          method: 'PUT',
          body: formData,
        });

        if (res.ok) {
          setIsModalOpen(false);
          fetchDeficiencies();
        } else {
          const err = await res.json();
          alert(`Failed to update deficiency report: ${err.error}`);
        }
      } else {
        if (beforeFile) {
          formData.append('beforeImage', beforeFile);
        }

        const res = await fetch('/api/deficiencies', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          setIsModalOpen(false);
          fetchDeficiencies();
        } else {
          const err = await res.json();
          alert(`Failed to log deficiency report: ${err.error}`);
        }
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm row deletion
  const confirmDelete = (deficiency: Deficiency) => {
    setDeficiencyToDelete(deficiency);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deficiencyToDelete) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/deficiencies?rowIndex=${deficiencyToDelete.rowIndex}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        setDeficiencyToDelete(null);
        fetchDeficiencies();
      } else {
        const err = await res.json();
        alert(`Failed to delete record: ${err.error}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Logic
  const filteredDeficiencies = deficiencies.filter(def => {
    const matchesSearch = 
      def.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.reporter.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.remarks.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = filterProject === '' || def.project === filterProject;
    const matchesCategory = filterCategory === '' || def.category === filterCategory;
    const matchesPriority = filterPriority === '' || def.priority === filterPriority;
    const matchesStatus = filterStatus === '' || def.status === filterStatus;

    return matchesSearch && matchesProject && matchesCategory && matchesPriority && matchesStatus;
  });

  // Summary counts
  const totalCount = deficiencies.length;
  const openCount = deficiencies.filter(d => d.status === 'Open').length;
  const inProgressCount = deficiencies.filter(d => d.status === 'In Progress').length;
  const resolvedCount = deficiencies.filter(d => d.status === 'Resolved').length;
  const closedCount = deficiencies.filter(d => d.status === 'Closed').length;

  return (
    <div className={styles.container}>
      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Deficiency Reports</h2>
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
            <span className="current">Deficiencies</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>Log Deficiency</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Overview */}
      {/* Main content display */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>Loading deficiency records...</p>
        </div>
      ) : filteredDeficiencies.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>No deficiency snags found matching filters.</p>
        </div>
      ) : (<div className={styles.tableContainer}>
          <table className={styles.deficiencyTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Deficiency</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Reporter / Area</th>
                <th>Assigned Contractor</th>
                <th>Timeline</th>
                <th>Media</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeficiencies.map((def) => (
                <tr key={def.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.actionBtn} onClick={() => handleEdit(def)} title="Edit Report">
                        <Edit2 size={14} />
                      </button>
                      <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => confirmDelete(def)} title="Delete Record">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.tableTitleCell}>
                      <span className={styles.tableDeficiencyTitle}>{def.title}</span>
                      <span className={styles.tableDeficiencyCategory}>{def.category}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.projectBadge}>{def.project}</span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[def.status.replace(' ', '_')]}`}>{def.status}</span>
                  </td>
                  <td>
                    <span className={`${styles.priorityBadge} ${styles[def.priority]}`}>{def.priority}</span>
                  </td>
                  <td>
                    <div className={styles.tableTitleCell}>
                      <span style={{ fontWeight: 600 }}>{def.area}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>By: {def.reporter}</span>
                    </div>
                  </td>
                  <td>{def.assignedTo || '—'}</td>
                  <td>{def.dueDate ? new Date(def.dueDate).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className={styles.tableMediaCell}>
                      {def.beforeDocs && (
                        <a href={def.beforeDocs} target="_blank" rel="noreferrer">
                          <img src={def.beforeDocs} alt="Before Thumbnail" className={styles.tableThumbnail} title="Before Photo" />
                        </a>
                      )}
                      {def.afterDocs && (
                        <a href={def.afterDocs} target="_blank" rel="noreferrer">
                          <img src={def.afterDocs} alt="After Thumbnail" className={styles.tableThumbnail} title="After Photo" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Logging & Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDeficiency ? 'Update Deficiency Log' : 'Log Site Deficiency'}
        width="800px"
      >
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <FileText size={16} />
                Deficiency Title / Headline *
              </label>
              <input 
                type="text" 
                name="title" 
                value={formFields.title} 
                onChange={handleInputChange} 
                className={styles.formInput} 
                placeholder="e.g. Laminate peeling at master bed wardrobe"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>
                <Building size={16} />
                Associated Project *
              </label>
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
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <User size={16} />
                Logged / Reported By *
              </label>
              <input 
                type="text" 
                name="reporter" 
                value={formFields.reporter} 
                onChange={handleInputChange} 
                className={styles.formInput} 
                placeholder="Name of inspector, designer or client"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>
                <MapPin size={16} />
                Deficient Area / Room Name *
              </label>
              <input 
                type="text" 
                name="area" 
                value={formFields.area} 
                onChange={handleInputChange} 
                className={styles.formInput} 
                placeholder="e.g. Master Bedroom, Kitchen Counter"
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <Wrench size={16} />
                Trade Partner / Category
              </label>
              <select 
                name="category" 
                value={formFields.category} 
                onChange={handleInputChange} 
                className={styles.formSelect}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>
                <AlertTriangle size={16} />
                Severity / Priority
              </label>
              <select 
                name="priority" 
                value={formFields.priority} 
                onChange={handleInputChange} 
                className={styles.formSelect}
              >
                {priorities.map(prio => (
                  <option key={prio} value={prio}>{prio} Priority</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <Users size={16} />
                Assigned Contractor / Vendor
              </label>
              <input 
                type="text" 
                name="assignedTo" 
                value={formFields.assignedTo} 
                onChange={handleInputChange} 
                className={styles.formInput} 
                placeholder="e.g. Starlight Stoneworks"
              />
            </div>
            <div className={styles.formGroup}>
              <label>
                <Calendar size={16} />
                Target Rectification Date
              </label>
              <input 
                type="date" 
                name="dueDate" 
                value={formFields.dueDate} 
                onChange={handleInputChange} 
                className={styles.formInput} 
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <Clock size={16} />
                Deficiency Status
              </label>
              <select 
                name="status" 
                value={formFields.status} 
                onChange={handleInputChange} 
                className={styles.formSelect}
              >
                {statuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>
              <MessageSquare size={16} />
              Detailed Remarks & Explanations
            </label>
            <textarea 
              name="remarks" 
              value={formFields.remarks} 
              onChange={handleInputChange} 
              className={styles.formTextarea} 
              placeholder="Provide exact details of the defect, measurements, or materials affected..."
            />
          </div>

          {/* Before & After Attachment Uploaders */}
          <div className={styles.uploadSection}>
            <div className={styles.formGroup}>
              <label>
                <Image size={16} />
                Before Defect Image
              </label>
              <div className={styles.uploadBox} onClick={triggerBeforeFileSelect}>
                <input 
                  type="file" 
                  ref={beforeFileInputRef}
                  onChange={handleBeforeFileChange}
                  accept="image/*"
                />
                {beforePreview ? (
                  <div className={styles.previewWrapper}>
                    <img src={beforePreview} alt="Before Preview" className={styles.uploadPreview} />
                    <button type="button" className={styles.removeFileBtn} onClick={removeBeforeFile}>Change Photo</button>
                  </div>
                ) : (
                  <label>
                    <Upload size={24} />
                    <span>Upload Before Photo</span>
                  </label>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>
                <Image size={16} />
                After Fixed Proof (Optional / Resolution)
              </label>
              <div className={styles.uploadBox} onClick={triggerAfterFileSelect}>
                <input 
                  type="file" 
                  ref={afterFileInputRef}
                  onChange={handleAfterFileChange}
                  accept="image/*"
                />
                {afterPreview ? (
                  <div className={styles.previewWrapper}>
                    <img src={afterPreview} alt="After Preview" className={styles.uploadPreview} />
                    <button type="button" className={styles.removeFileBtn} onClick={removeAfterFile}>Change Photo</button>
                  </div>
                ) : (
                  <label>
                    <Upload size={24} />
                    <span>Upload After Fixed Photo</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Uploading to Drive...' : editingDeficiency ? 'Save Changes' : 'Create Snag Log'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Defect Report Record"
        width="450px"
      >
        <div className={styles.deleteConfirmBody}>
          <p>Are you sure you want to delete this deficiency record?</p>
          <p className={styles.warningSub}>Deficiency ID: <strong>{deficiencyToDelete?.id}</strong>. This will permanently erase the row from Google Sheets and cannot be undone.</p>
          <div className={styles.deleteActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
            <button type="button" className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Processing...' : 'Delete Record'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
