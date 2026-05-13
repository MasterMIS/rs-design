'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  Search, Plus, MoreHorizontal, Mail, Phone, MapPin, 
  Loader2, Camera, Lock, User as UserIcon, 
  Edit2, Trash2, Shield, PhoneCall, Filter, X,
  Eye, EyeOff, Briefcase, Building, UserCheck, Smartphone, Check
} from 'lucide-react';
import styles from './users.module.css';
import Modal from '@/components/Modal';
import GlobalLoading from '@/components/GlobalLoading';
import Loader from '@/components/Loader';
import SearchableSelect from '@/components/SearchableSelect';

interface User {
  id: number;
  name: string;
  role: string;
  email: string;
  status: string;
  avatar: string;
  mobile: string;
  password?: string;
  department: string;
  designation: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');
  const [error, setError] = useState<string | null>(null);
  
  // Dropdown data
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  
  // New Item Modals
  const [isNewDeptModalOpen, setIsNewDeptModalOpen] = useState(false);
  const [isNewDesigModalOpen, setIsNewDesigModalOpen] = useState(false);
  const [newItemValue, setNewItemValue] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'User',
    status: 'Active',
    password: '',
    mobile: '',
    department: '',
    designation: '',
    image: null as File | string | null
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const roles = ['Admin', 'User', 'PC', 'EA'];
  const statuses = ['Active', 'Inactive'];

  useEffect(() => {
    fetchUsers();
    fetchDropdowns();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      console.error('Error:', err);
      setError('Could not connect to the backend.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchDropdowns() {
    try {
      const response = await fetch('/api/dropdowns');
      if (!response.ok) throw new Error('Failed to fetch dropdowns');
      const data = await response.json();
      setDepartments(data.departments || []);
      setDesignations(data.designations || []);
    } catch (err: any) {
      console.error('Dropdown fetch error:', err);
    }
  }

  const handleAddNewItem = async (type: 'department' | 'designation') => {
    if (!newItemValue.trim()) return;
    try {
      setActionLoading(true);
      setLoadingText(`Adding ${type}...`);
      const response = await fetch('/api/dropdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value: newItemValue }),
      });
      if (!response.ok) throw new Error('Failed to add item');
      
      await fetchDropdowns();
      setNewItemValue('');
      if (type === 'department') setIsNewDeptModalOpen(false);
      else setIsNewDesigModalOpen(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: user.password || '',
      mobile: user.mobile || '',
      department: user.department || '',
      designation: user.designation || '',
      image: user.avatar || null
    });
    setPreviewUrl(user.avatar || null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      setLoadingText('Deleting User...');
      setActionLoading(true);
      const response = await fetch(`/api/users?id=${deletingUser.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
      await fetchUsers();
      setDeletingUser(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setLoadingText(editingUser ? 'Updating User...' : 'Creating User...');
      setActionLoading(true);
      
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('role', formData.role);
      submitData.append('status', formData.status);
      submitData.append('password', formData.password);
      submitData.append('mobile', formData.mobile);
      submitData.append('department', formData.department);
      submitData.append('designation', formData.designation);
      
      if (formData.image instanceof File) {
        submitData.append('image', formData.image);
      } else if (typeof formData.image === 'string') {
        submitData.append('image', formData.image);
      }

      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser ? `/api/users?id=${editingUser.id}` : '/api/users';

      const response = await fetch(url, {
        method: method,
        body: submitData,
      });

      if (!response.ok) throw new Error('Failed to save user');

      await fetchUsers();
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'User',
      status: 'Active',
      password: '',
      mobile: '',
      department: '',
      designation: '',
      image: null
    });
    setPreviewUrl(null);
    setShowPassword(false);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'All Status' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className={styles.usersContainer}>
      <GlobalLoading show={actionLoading} text={loadingText} />
      
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>User Management</h2>
          <p>Manage your team members and their account permissions.</p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={`${styles.filterBtn} ${isFilterVisible ? styles.activeFilter : ''}`}
            onClick={() => setIsFilterVisible(!isFilterVisible)}
          >
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button className={styles.addButton} onClick={() => {resetForm(); setIsModalOpen(true);}}>
            <Plus size={18} />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      <div className={styles.contentLayout}>
        {isFilterVisible && (
          <aside className={styles.verticalFilter}>
            <div className={styles.filterHeader}>
              <h3>Filters</h3>
              <button onClick={() => setIsFilterVisible(false)}><X size={18} /></button>
            </div>
            <div className={styles.filterGroup}>
              <label>Search</label>
              <div className={styles.searchBox}>
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.filterGroup}>
              <label>Role</label>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option>All Roles</option>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <button className={styles.clearBtn} onClick={() => {
              setSearchTerm('');
              setRoleFilter('All Roles');
              setStatusFilter('All Status');
            }}>Clear All</button>
          </aside>
        )}

        <div className={styles.mainGridArea}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {loading && !actionLoading ? (
            <div className={styles.loadingState}>
              <Loader size={40} text="Loading users..." />
            </div>
          ) : (
            <div className={styles.userGrid}>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div key={user.id} className={styles.userCard}>
                    <div className={styles.cardActions}>
                      <button className={styles.iconBtn} onClick={() => handleEdit(user)}>
                        <Edit2 size={16} />
                      </button>
                      <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteClick(user)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className={styles.cardHeader}>
                      <div className={styles.avatarWrapper}>
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className={styles.cardAvatar} 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            <UserIcon size={32} />
                          </div>
                        )}
                        <span className={`${styles.statusDot} ${styles[user.status.replace(' ', '').toLowerCase()] || styles.active}`} />
                      </div>
                      <h3 className={styles.cardName}>{user.name}</h3>
                      <span className={styles.cardRole}>{user.role}</span>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.infoItem}>
                        <Mail size={14} />
                        <span>{user.email}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <PhoneCall size={14} />
                        <span>{user.mobile || 'N/A'}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <Building size={14} />
                        <span>{user.department || 'No Dept'}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <Briefcase size={14} />
                        <span>{user.designation || 'No Desig'}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <Shield size={14} />
                        <span className={styles.statusLabel}>{user.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyStateContainer}>
                  <p className={styles.emptyState}>No users found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={!!deletingUser} 
        onClose={() => setDeletingUser(null)} 
        title="Delete User"
      >
        <div className={styles.deleteConfirm}>
          <p>Are you sure you want to delete <strong>{deletingUser?.name}</strong>?</p>
          <div className={styles.formActions}>
            <button className={styles.cancelButton} onClick={() => setDeletingUser(null)}>Cancel</button>
            <button className={`${styles.submitButton} ${styles.deleteConfirmBtn}`} onClick={confirmDelete}>
              Delete User
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {setIsModalOpen(false); resetForm();}} 
        title={editingUser ? "Edit User" : "Create New User"}
      >
        <form className={styles.userForm} onSubmit={handleSubmit}>
          <div className={styles.imageUploadSection}>
            <div 
              className={styles.imagePreview} 
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" referrerPolicy="no-referrer" />
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <Camera size={32} />
                  <span>Upload Photo</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              accept="image/*" 
              onChange={handleImageChange}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><UserIcon size={14} className={styles.labelIcon} /> Full Name</label>
              <input 
                type="text" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label><Smartphone size={14} className={styles.labelIcon} /> Mobile Number</label>
              <input 
                type="tel" 
                required 
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Mail size={14} className={styles.labelIcon} /> Email Address</label>
              <input 
                type="email" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label><Lock size={14} className={styles.labelIcon} /> Password</label>
              <div className={styles.inputWithIcon}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required={!editingUser} 
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={styles.passwordInput}
                />
                <button 
                  type="button" 
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Building size={14} className={styles.labelIcon} /> Department</label>
              <div className={styles.selectWithAdd}>
                <SearchableSelect 
                  options={departments}
                  value={formData.department}
                  onChange={(val) => setFormData({ ...formData, department: val })}
                  placeholder="Select Dept"
                />
                <button type="button" className={styles.miniAddBtn} onClick={() => setIsNewDeptModalOpen(true)}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label><Briefcase size={14} className={styles.labelIcon} /> Designation</label>
              <div className={styles.selectWithAdd}>
                <SearchableSelect 
                  options={designations}
                  value={formData.designation}
                  onChange={(val) => setFormData({ ...formData, designation: val })}
                  placeholder="Select Desig"
                />
                <button type="button" className={styles.miniAddBtn} onClick={() => setIsNewDesigModalOpen(true)}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Shield size={14} className={styles.labelIcon} /> Role</label>
              <div className={styles.toggleGroup}>
                {roles.map(r => (
                  <button 
                    key={r}
                    type="button"
                    className={`${styles.toggleBtn} ${formData.role === r ? styles.activeToggle : ''}`}
                    onClick={() => setFormData({ ...formData, role: r })}
                  >
                    {formData.role === r && <Check size={14} />}
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label><UserCheck size={14} className={styles.labelIcon} /> Status</label>
              <div className={styles.toggleGroup}>
                {statuses.map(s => (
                  <button 
                    key={s}
                    type="button"
                    className={`${styles.toggleBtn} ${formData.status === s ? styles.activeToggle : ''} ${s === 'Inactive' && formData.status === s ? styles.inactiveToggle : ''}`}
                    onClick={() => setFormData({ ...formData, status: s })}
                  >
                    {formData.status === s && <Check size={14} />}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => {setIsModalOpen(false); resetForm();}} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting} style={{ flex: 1 }}>
              {isSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Sub-Modals */}
      <Modal isOpen={isNewDeptModalOpen} onClose={() => setIsNewDeptModalOpen(false)} title="Add Department">
        <div className={styles.newItemForm}>
          <input 
            type="text" 
            placeholder="Department Name" 
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            autoFocus
          />
          <div className={styles.formActions}>
            <button className={styles.cancelButton} onClick={() => setIsNewDeptModalOpen(false)}>Cancel</button>
            <button className={styles.submitButton} onClick={() => handleAddNewItem('department')}>Add</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isNewDesigModalOpen} onClose={() => setIsNewDesigModalOpen(false)} title="Add Designation">
        <div className={styles.newItemForm}>
          <input 
            type="text" 
            placeholder="Designation Name" 
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            autoFocus
          />
          <div className={styles.formActions}>
            <button className={styles.cancelButton} onClick={() => setIsNewDesigModalOpen(false)}>Cancel</button>
            <button className={styles.submitButton} onClick={() => handleAddNewItem('designation')}>Add</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
