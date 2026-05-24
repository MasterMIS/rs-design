'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, Phone, Mail, FileText,
  MapPin, CreditCard, Star, AlertCircle, Building, UploadCloud, File as FileIcon, X,
  User, Tag, Landmark, Banknote, MessageSquare
} from 'lucide-react';
import styles from './vendors.module.css';
import Modal from '@/components/Modal';

interface Vendor {
  id: string;
  rowIndex: number;
  createdAt: string;
  companyName: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  officeAddress: string;
  gstin: string;
  bankDetails: string;
  paymentTerms: string;
  qualityRating: string;
  remarks: string;
  attachments: { name: string; url: string }[];
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    companyName: '',
    category: '',
    contactPerson: '',
    phone: '',
    email: '',
    officeAddress: '',
    gstin: '',
    bankDetails: '',
    paymentTerms: '',
    qualityRating: '3',
    remarks: ''
  });

  const categories = [
    'Carpentry', 'Electrical', 'Plumbing', 'Flooring & Tiling', 
    'HVAC', 'Hardware & Fittings', 'Custom Furniture', 'Painting', 
    'Glass & Mirrors', 'Civil Work', 'Other'
  ];

  useEffect(() => {
    fetchVendors();
  }, []);

  async function fetchVendors() {
    setLoading(true);
    try {
      const res = await fetch('/api/vendors');
      if (res.ok) {
        setVendors(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => {
    setEditingVendor(null);
    setFormData({
      companyName: '', category: categories[0], contactPerson: '',
      phone: '', email: '', officeAddress: '', gstin: '',
      bankDetails: '', paymentTerms: '', qualityRating: '3', remarks: ''
    });
    setFiles([]);
    setIsModalOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      companyName: vendor.companyName, category: vendor.category, 
      contactPerson: vendor.contactPerson, phone: vendor.phone, 
      email: vendor.email, officeAddress: vendor.officeAddress, 
      gstin: vendor.gstin, bankDetails: vendor.bankDetails, 
      paymentTerms: vendor.paymentTerms, qualityRating: vendor.qualityRating || '3', 
      remarks: vendor.remarks
    });
    setFiles([]);
    setIsModalOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) return;

    try {
      setSubmitting(true);
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      
      files.forEach(f => fd.append('newFiles', f));
      
      let res;
      if (editingVendor) {
        fd.append('id', editingVendor.id);
        fd.append('createdAt', editingVendor.createdAt);
        fd.append('existingFiles', JSON.stringify(editingVendor.attachments));
        
        res = await fetch(`/api/vendors?rowIndex=${editingVendor.rowIndex}`, {
          method: 'PUT',
          body: fd,
        });
      } else {
        res = await fetch('/api/vendors', {
          method: 'POST',
          body: fd,
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchVendors();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!vendorToDelete) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/vendors?rowIndex=${vendorToDelete.rowIndex}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setVendorToDelete(null);
        fetchVendors();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVendors = vendors.filter(v => {
    const searchStr = `${v.companyName} ${v.contactPerson} ${v.category}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === '' || v.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const getRatingStars = (ratingStr: string) => {
    const r = parseInt(ratingStr) || 0;
    return Array(5).fill(0).map((_, i) => (
      <Star key={i} size={14} fill={i < r ? "#f39c12" : "none"} color={i < r ? "#f39c12" : "var(--border-color)"} />
    ));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Vendor Management</h2>
          <p>Centralized directory for suppliers, contractors, and vendors.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreate}>
            <Plus size={18} /> Add Vendor
          </button>
        </div>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search vendors..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterControls}>
          <select className={styles.filterSelect} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading vendors...</div>
      ) : (
        <div className={styles.memberGrid}>
          {filteredVendors.map(vendor => (
            <div key={vendor.id} className={styles.memberCard}>
              <div className={styles.memberTop}>
                <div className={styles.memberPrimary}>
                  <div className={styles.memberName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={16} color="var(--primary)" /> {vendor.companyName}
                  </div>
                  <div className={styles.memberDesignation}>{vendor.category}</div>
                </div>
                <div className={styles.recordControls}>
                  <button className={styles.controlBtn} onClick={() => handleEdit(vendor)}><Edit2 size={14} /></button>
                  <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => { setVendorToDelete(vendor); setIsDeleteModalOpen(true); }}><Trash2 size={14} /></button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                {getRatingStars(vendor.qualityRating)}
              </div>

              <div className={styles.memberDetails}>
                <div className={styles.detailRow}>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)', width: '70px' }}>Contact:</div>
                  <div className={styles.detailValue}>{vendor.contactPerson}</div>
                </div>
                <div className={styles.detailRow}>
                  <Phone size={12} style={{ width: '70px' }} />
                  <div className={styles.detailValue}>{vendor.phone || '-'}</div>
                </div>
                <div className={styles.detailRow}>
                  <Mail size={12} style={{ width: '70px' }} />
                  <div className={styles.detailValue}>{vendor.email || '-'}</div>
                </div>
                <div className={styles.detailRow}>
                  <CreditCard size={12} style={{ width: '70px' }} />
                  <div className={styles.detailValue}>{vendor.gstin || '-'}</div>
                </div>
                {vendor.remarks && (
                  <div className={styles.detailRow} style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--text-light)' }}>
                    "{vendor.remarks}"
                  </div>
                )}
              </div>

              {vendor.attachments && vendor.attachments.length > 0 && (
                <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {vendor.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-main)', padding: '2px 8px', borderRadius: '4px', textDecoration: 'none', color: 'var(--primary)', border: '1px solid var(--border-color)' }}>
                      <FileText size={10} /> Catalog
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredVendors.length === 0 && <p style={{ color: 'var(--text-light)', gridColumn: '1 / -1' }}>No vendors found.</p>}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={editingVendor ? 'Edit Vendor' : 'Add New Vendor'} width="650px">
        <form onSubmit={submitForm} className={styles.formGrid}>
          
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Basic Information</h4>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Building size={14} /> Company / Vendor Name</label>
              <input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className={styles.formInput} required />
            </div>
            <div className={styles.formGroup}>
              <label><Tag size={14} /> Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={styles.formSelect} required>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><User size={14} /> Contact Person</label>
              <input type="text" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className={styles.formInput} />
            </div>
            <div className={styles.formGroup}>
              <label><Phone size={14} /> Phone Number</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={styles.formInput} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Mail size={14} /> Email Address</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={styles.formInput} />
            </div>
            <div className={styles.formGroup}>
              <label><MapPin size={14} /> Office / Shop Address</label>
              <input type="text" value={formData.officeAddress} onChange={e => setFormData({...formData, officeAddress: e.target.value})} className={styles.formInput} />
            </div>
          </div>

          <h4 style={{ margin: '16px 0 8px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Billing & Financials</h4>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><CreditCard size={14} /> GSTIN / Tax ID</label>
              <input type="text" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} className={styles.formInput} />
            </div>
            <div className={styles.formGroup}>
              <label><Landmark size={14} /> Bank Details (A/c, IFSC)</label>
              <input type="text" value={formData.bankDetails} onChange={e => setFormData({...formData, bankDetails: e.target.value})} className={styles.formInput} placeholder="e.g. HDFC 12345, IFSC000" />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label><Banknote size={14} /> Payment Terms</label>
            <input type="text" value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} className={styles.formInput} placeholder="e.g. 50% Advance, 50% on Delivery" />
          </div>

          <h4 style={{ margin: '16px 0 8px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Evaluation & Files</h4>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Star size={14} /> Quality Rating (1-5)</label>
              <select value={formData.qualityRating} onChange={e => setFormData({...formData, qualityRating: e.target.value})} className={styles.formSelect}>
                <option value="1">1 Star - Poor</option>
                <option value="2">2 Stars - Below Average</option>
                <option value="3">3 Stars - Average</option>
                <option value="4">4 Stars - Good</option>
                <option value="5">5 Stars - Excellent</option>
              </select>
            </div>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label><FileText size={14} /> Upload Catalog / Price List</label>
              <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
                <label>
                  <UploadCloud size={24} style={{ color: 'var(--primary)' }} />
                  <span>Click to browse or drag and drop files</span>
                </label>
                <input type="file" ref={fileInputRef} onChange={e => setFiles(Array.from(e.target.files || []))} style={{ display: 'none' }} multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx" />
              </div>
              
              {files.length > 0 && (
                <div className={styles.uploadedStagedList}>
                  <strong>Staged Files</strong>
                  <div className={styles.stagingGrid}>
                    {files.map((file, i) => (
                      <div key={i} className={styles.stagedFileItem}>
                        <div className={styles.stagedFileLeft} title={file.name}>
                          <FileIcon size={14} style={{ color: 'var(--success)' }} />
                          <span className={styles.stagedFileName}>{file.name}</span>
                        </div>
                        <button type="button" className={styles.removeStagedBtn} onClick={() => setFiles(files.filter((_, idx) => idx !== i))}><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label><MessageSquare size={14} /> Specialities / Remarks</label>
            <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className={styles.formTextarea} placeholder="e.g. Best for Italian marble, usually delays by 1 week..." />
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Saving...' : 'Save Vendor'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !submitting && setIsDeleteModalOpen(false)} title="Confirm Deletion" width="400px" type="danger">
        <div className={styles.deleteConfirmBody}>
          <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <p>Are you sure you want to delete <strong>{vendorToDelete?.companyName}</strong>?</p>
          <p className={styles.warningSub}>This will remove all their details from the database.</p>
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} disabled={submitting}>Cancel</button>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
