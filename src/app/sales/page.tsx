'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, X, BarChart3, Search, Filter, ChevronLeft, ChevronRight, User, Phone, MapPin, Building, Briefcase, HardHat, Users, Calendar, Fingerprint, Tag } from 'lucide-react';
import styles from './sales.module.css';
import Modal from '@/components/Modal';

interface Lead {
  rowIndex: number;
  id: string;
  timestamp: string;
  name: string;
  address: string;
  contactNo: string;
  salesman: string;
  cityType: string;
  referenceBy: string;
  generatedBy: string;
  leadType: string;
  typeOfClient: string;
  nameOfBuilder: string;
}

export default function SalesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [salesmenList, setSalesmenList] = useState<string[]>([]);

  // Filtering & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSalesman, setSelectedSalesman] = useState<string | null>(null);
  const [selectedLeadTypes, setSelectedLeadTypes] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactNo: '',
    salesman: '',
    cityType: '',
    referenceBy: '',
    generatedBy: '',
    leadType: '',
    typeOfClient: '',
    nameOfBuilder: '',
  });

  useEffect(() => {
    fetchLeads();
    fetchSalesmen();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSalesmen = async () => {
    try {
      const response = await fetch('/api/sales/salesmen');
      if (response.ok) {
        const data = await response.json();
        setSalesmenList(data);
      }
    } catch (error) {
      console.error('Error fetching salesmen:', error);
    }
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sales');
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      } else {
        console.error('Failed to fetch leads');
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        address: lead.address,
        contactNo: lead.contactNo,
        salesman: lead.salesman,
        cityType: lead.cityType,
        referenceBy: lead.referenceBy,
        generatedBy: lead.generatedBy,
        leadType: lead.leadType,
        typeOfClient: lead.typeOfClient,
        nameOfBuilder: lead.nameOfBuilder,
      });
    } else {
      setEditingLead(null);
      setFormData({
        name: '',
        address: '',
        contactNo: '',
        salesman: '',
        cityType: '',
        referenceBy: '',
        generatedBy: '',
        leadType: '',
        typeOfClient: '',
        nameOfBuilder: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLead(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSalesman = async () => {
    const newSalesman = prompt('Enter new Salesman name:');
    if (newSalesman && newSalesman.trim() !== '') {
      try {
        const response = await fetch('/api/sales/salesmen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newSalesman })
        });
        if (response.ok) {
          fetchSalesmen();
          setFormData(prev => ({ ...prev, salesman: newSalesman.trim() }));
        } else {
          const err = await response.json();
          alert(`Error: ${err.error}`);
        }
      } catch (error) {
        console.error('Error adding salesman:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });

      let response;
      if (editingLead) {
        submitData.append('id', editingLead.id);
        submitData.append('timestamp', editingLead.timestamp);
        response = await fetch(`/api/sales?rowIndex=${editingLead.rowIndex}`, {
          method: 'PUT',
          body: submitData,
        });
      } else {
        response = await fetch('/api/sales', {
          method: 'POST',
          body: submitData,
        });
      }

      if (response.ok) {
        await fetchLeads();
        handleCloseModal();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error submitting lead:', error);
      alert('An error occurred while saving the lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rowIndex: number) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        const response = await fetch(`/api/sales?rowIndex=${rowIndex}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          await fetchLeads();
        } else {
          alert('Failed to delete lead');
        }
      } catch (error) {
        console.error('Error deleting lead:', error);
      }
    }
  };

  const handleLeadTypeToggle = (type: string) => {
    setSelectedLeadTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setCurrentPage(1);
  };

  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];
    
    // Sort: latest entry on top
    result.sort((a, b) => b.rowIndex - a.rowIndex);

    // Apply Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.name.toLowerCase().includes(q) || 
        l.contactNo.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    }

    // Apply Salesman Filter
    if (selectedSalesman) {
      result = result.filter(l => l.salesman === selectedSalesman);
    }

    // Apply Lead Type Filter
    if (selectedLeadTypes.length > 0) {
      result = result.filter(l => selectedLeadTypes.includes(l.leadType));
    }

    return result;
  }, [leads, searchQuery, selectedSalesman, selectedLeadTypes]);

  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage) || 1;
  const currentLeads = filteredAndSortedLeads.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Sales Management</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <span className="current">Sales</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className={styles.actionControls}>
            <div className={styles.searchBox}>
              <Search size={18} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Search leads..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div className={styles.dropdownContainer} ref={dropdownRef}>
              <button 
                className={styles.dropdownBtn}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Filter size={16} />
                Lead Type ({selectedLeadTypes.length || 'All'})
              </button>
              {isDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {['Hot', 'Warm', 'Cold'].map(type => (
                    <label key={type} className={styles.dropdownItem}>
                      <input 
                        type="checkbox" 
                        checked={selectedLeadTypes.includes(type)}
                        onChange={() => handleLeadTypeToggle(type)}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className={styles.pagination}>
            <span>Page {currentPage} of {totalPages}</span>
            <button className={styles.pageBtn} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
            <button className={styles.pageBtn} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></button>
            <button className={styles.createLeadBtn} onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Create Lead
            </button>
          </div>
        </div>
      </div>
      <div className={styles.container}>
        {/* Sidebar for Salesman Filtering */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            <User size={20} color="#3bafda" />
            Salesmen
          </div>
          <div className={styles.sidebarFilterList}>
          <div 
            className={`${styles.filterItem} ${selectedSalesman === null ? styles.active : ''}`}
            onClick={() => { setSelectedSalesman(null); setCurrentPage(1); }}
          >
            All Salesmen
          </div>
          {salesmenList.map((salesman, idx) => (
            <div 
              key={idx}
              className={`${styles.filterItem} ${selectedSalesman === salesman ? styles.active : ''}`}
              onClick={() => { setSelectedSalesman(salesman); setCurrentPage(1); }}
            >
              {salesman}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Card List Area */}
        <div className={styles.cardListArea}>
          {isLoading ? (
            <div className={styles.emptyState}>Loading leads...</div>
          ) : currentLeads.length === 0 ? (
            <div className={styles.emptyState}>No leads found matching your criteria.</div>
          ) : (
            <div className={styles.cardGrid}>
              {currentLeads.map((lead) => (
                <div key={lead.rowIndex} className={styles.leadCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                      <span className={styles.leadId}>{lead.id}</span>
                      <span className={styles.leadName}>{lead.name}</span>
                      {lead.leadType && (
                        <span className={styles.leadTypeBadge} style={{
                          backgroundColor: lead.leadType === 'Hot' ? 'rgba(241, 85, 108, 0.1)' : 
                                           lead.leadType === 'Warm' ? 'rgba(247, 184, 75, 0.1)' : 'rgba(26, 188, 156, 0.1)',
                          color: lead.leadType === 'Hot' ? '#f1556c' : 
                                 lead.leadType === 'Warm' ? '#f7b84b' : '#1abc9c',
                        }}>
                          {lead.leadType}
                        </span>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button 
                        className={`${styles.iconBtn} ${styles.edit}`}
                        onClick={() => handleOpenModal(lead)}
                        title="Edit Lead"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className={`${styles.iconBtn} ${styles.delete}`}
                        onClick={() => handleDelete(lead.rowIndex)}
                        title="Delete Lead"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.cardBody}>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#f7b84b' }}>
                        <Phone size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Contact No.</span>
                        <span className={styles.detailValue}>{lead.contactNo || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#f1556c' }}>
                        <MapPin size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Address</span>
                        <span className={styles.detailValue}>{lead.address || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#3bafda' }}>
                        <User size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Salesman</span>
                        <span className={styles.detailValue}>{lead.salesman || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#1abc9c' }}>
                        <Building size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>City Type</span>
                        <span className={styles.detailValue}>{lead.cityType || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#9b59b6' }}>
                        <Briefcase size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Type of Client</span>
                        <span className={styles.detailValue}>{lead.typeOfClient || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#34495e' }}>
                        <HardHat size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Builder Name</span>
                        <span className={styles.detailValue}>{lead.nameOfBuilder || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#e67e22' }}>
                        <Users size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Reference By</span>
                        <span className={styles.detailValue}>{lead.referenceBy || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#8e44ad' }}>
                        <Fingerprint size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Generated By</span>
                        <span className={styles.detailValue}>{lead.generatedBy || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#7f8c8d' }}>
                        <Calendar size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Date Created</span>
                        <span className={styles.detailValue}>
                          {lead.timestamp ? new Date(lead.timestamp).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingLead ? 'Edit Lead' : 'Create New Lead'}>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Name *</label>
                    <div className={styles.inputWithIcon}>
                      <User size={16} className={styles.inputIcon} />
                      <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="Enter client name"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Contact No.</label>
                    <div className={styles.inputWithIcon}>
                      <Phone size={16} className={styles.inputIcon} />
                      <input 
                        type="text" 
                        name="contactNo" 
                        value={formData.contactNo} 
                        onChange={handleInputChange} 
                        placeholder="Enter contact number"
                      />
                    </div>
                  </div>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.outlineLabel}>Address</label>
                    <div className={styles.inputWithIcon}>
                      <MapPin size={16} className={styles.inputIcon} />
                      <input 
                        type="text" 
                        name="address" 
                        value={formData.address} 
                        onChange={handleInputChange} 
                        placeholder="Enter full address"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Salesman</label>
                    <div className={styles.inputWithIcon}>
                      <User size={16} className={styles.inputIcon} />
                      <input 
                        type="text" 
                        name="salesman" 
                        value={formData.salesman} 
                        onChange={handleInputChange} 
                        list="salesmen-list"
                        placeholder="Select or type Salesman"
                        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none', flex: 1 }}
                      />
                      <datalist id="salesmen-list">
                        {salesmenList.map((sm, idx) => (
                          <option key={idx} value={sm} />
                        ))}
                      </datalist>
                      <button 
                        type="button" 
                        style={{ 
                          background: 'var(--bg-hover)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '0 8px 8px 0', 
                          padding: '0 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          height: '46.4px'
                        }}
                        onClick={handleAddSalesman}
                        title="Add new salesman"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>City Type</label>
                    <div className={styles.inputWithIcon}>
                      <Building size={16} className={styles.inputIcon} />
                      <input 
                        type="text" 
                        name="cityType" 
                        value={formData.cityType} 
                        onChange={handleInputChange} 
                        placeholder="e.g., Tier 1, Tier 2"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Reference By</label>
                    <div className={styles.inputWithIcon}>
                      <Users size={16} className={styles.inputIcon} />
                      <input 
                        type="text" 
                        name="referenceBy" 
                        value={formData.referenceBy} 
                        onChange={handleInputChange} 
                        placeholder="Who referred this lead?"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Generated By</label>
                    <div className={styles.inputWithIcon}>
                      <Fingerprint size={16} className={styles.inputIcon} />
                      <input 
                        type="text" 
                        name="generatedBy" 
                        value={formData.generatedBy} 
                        onChange={handleInputChange} 
                        placeholder="Employee name"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Lead Type</label>
                    <div className={styles.inputWithIcon}>
                      <Tag size={16} className={styles.inputIcon} />
                      <select 
                        name="leadType" 
                        value={formData.leadType} 
                        onChange={handleInputChange}
                      >
                        <option value="">Select Lead Type</option>
                        <option value="Hot">Hot</option>
                        <option value="Warm">Warm</option>
                        <option value="Cold">Cold</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Type of Client</label>
                    <div className={styles.inputWithIcon}>
                      <Briefcase size={16} className={styles.inputIcon} />
                      <input 
                        type="text" 
                        name="typeOfClient" 
                        value={formData.typeOfClient} 
                        onChange={handleInputChange} 
                        placeholder="e.g., Builder, Individual"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Name Of Builder</label>
                    <div className={styles.inputWithIcon}>
                      <HardHat size={16} className={styles.inputIcon} />
                      <input 
                        type="text" 
                        name="nameOfBuilder" 
                        value={formData.nameOfBuilder} 
                        onChange={handleInputChange} 
                        placeholder="If applicable"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Saving...' : editingLead ? 'Update Lead' : 'Save Lead'}
                </button>
              </div>
            </form>
      </Modal>
      </div>
    </div>
  );
}
