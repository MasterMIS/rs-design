'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Link as LinkIcon, UserPlus, CheckCircle, Clock,
  Users, CheckCircle2, Award, Phone, Calendar, Briefcase, GraduationCap, MapPin,
  Building, FileText, User, Heart, DollarSign, Eye, ArrowLeft, Search, XCircle
} from 'lucide-react';
import styles from './hrms.module.css';
import Modal from '@/components/Modal';
import Link from 'next/link';

export default function HRMSPage() {
  const [activeTab, setActiveTab] = useState('enrollment');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [remarkType, setRemarkType] = useState<'1st' | 'final'>('1st');

  // Form State
  const [activeFormTab, setActiveFormTab] = useState<'personal' | 'professional' | 'remarks'>('personal');
  const [companyDetails, setCompanyDetails] = useState([{ companyName: '', experience: '', lastSalary: '' }]);

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [postFilter, setPostFilter] = useState('');

  // Details View State
  const [viewingEmp, setViewingEmp] = useState<any>(null);

  // Remark Modal State
  const [remarkSelection, setRemarkSelection] = useState('Approved');
  const [manualRemarkText, setManualRemarkText] = useState('');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [y, m, d] = parts;
    return `${d} ${months[parseInt(m) - 1]} ${y.slice(2)}`;
  };

  const openModalForCreate = () => {
    setEditingEmp(null);
    setActiveFormTab('personal');
    setCompanyDetails([{ companyName: '', experience: '', lastSalary: '' }]);
    setIsModalOpen(true);
  };

  const openModalForEdit = (emp: any) => {
    setEditingEmp(emp);
    setActiveFormTab('personal');

    // Try to parse existing company details JSON
    try {
      if (emp.company_details && emp.company_details.trim().startsWith('[')) {
        setCompanyDetails(JSON.parse(emp.company_details));
      } else if (emp.company_details) {
        // Fallback if it was just a regular string
        setCompanyDetails([{ companyName: emp.company_details, experience: '', lastSalary: '' }]);
      } else {
        setCompanyDetails([{ companyName: '', experience: '', lastSalary: '' }]);
      }
    } catch {
      setCompanyDetails([{ companyName: emp.company_details || '', experience: '', lastSalary: '' }]);
    }

    setIsModalOpen(true);
  };

  const handleAddCompany = () => setCompanyDetails([...companyDetails, { companyName: '', experience: '', lastSalary: '' }]);
  const handleRemoveCompany = (index: number) => setCompanyDetails(companyDetails.filter((_, i) => i !== index));
  const handleCompanyChange = (index: number, field: string, value: string) => {
    const newDetails = [...companyDetails];
    (newDetails[index] as any)[field] = value;
    setCompanyDetails(newDetails);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hrms');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      } else {
        console.error('API returned non-array data:', data);
        setEmployees([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    setIsSaving(true);
    try {
      let res;
      if (editingEmp) {
        formData.append('id', editingEmp.id);
        formData.append('created_at', editingEmp.created_at);
        formData.append('existing_cv_url', editingEmp.cv_upload || '');
        formData.append('existing_photo_url', editingEmp.photo_upload || '');
        formData.append('ea_remarks', editingEmp.ea_remarks || '');
        formData.append('director_remarks', editingEmp.director_remarks || '');
        formData.append('first_round_remark', editingEmp.first_round_remark || '');
        formData.append('final_round_remark', editingEmp.final_round_remark || '');

        // Override company_details with JSON string
        formData.set('company_details', JSON.stringify(companyDetails));

        res = await fetch(`/api/hrms?rowIndex=${editingEmp.rowIndex}`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        // Override company_details with JSON string
        formData.set('company_details', JSON.stringify(companyDetails));

        res = await fetch('/api/hrms', {
          method: 'POST',
          body: formData,
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        setEditingEmp(null);
        showToast(editingEmp ? 'Candidate updated successfully!' : 'Candidate added successfully!');
        fetchEmployees();
      } else {
        alert('Failed to save employee.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const getRemarkWithTimestamp = (status: string, manualText: string) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' };
    const timeStr = now.toLocaleDateString('en-GB', options).replace(/, /g, ' ');
    if (status === 'Manual Remark') {
      return `${manualText} (Saved: ${timeStr})`;
    }
    return `${status} (Saved: ${timeStr})`;
  };

  const handleRemarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (remarkSelection === 'Manual Remark' && !manualRemarkText.trim()) {
      alert("Please enter a manual remark.");
      return;
    }

    setIsSaving(true);
    const finalRemarkString = getRemarkWithTimestamp(remarkSelection, manualRemarkText);

    const formData = new FormData();
    formData.append('id', editingEmp.id);
    formData.append('created_at', editingEmp.created_at);
    formData.append('employee_name', editingEmp.employee_name);
    formData.append('contact_no', editingEmp.contact_no);
    formData.append('post_applied', editingEmp.post_applied);
    formData.append('qualification', editingEmp.qualification);
    formData.append('date_of_birth', editingEmp.date_of_birth);
    formData.append('marital_status', editingEmp.marital_status);
    formData.append('address', editingEmp.address);
    formData.append('expectation', editingEmp.expectation);
    formData.append('company_details', editingEmp.company_details);
    formData.append('existing_cv_url', editingEmp.cv_upload || '');
    formData.append('existing_photo_url', editingEmp.photo_upload || '');
    formData.append('ea_remarks', editingEmp.ea_remarks || '');
    formData.append('director_remarks', editingEmp.director_remarks || '');

    if (remarkType === '1st') {
      formData.append('first_round_remark', finalRemarkString);
      formData.append('final_round_remark', editingEmp.final_round_remark || '');
    } else {
      formData.append('first_round_remark', editingEmp.first_round_remark || '');
      formData.append('final_round_remark', finalRemarkString);
    }

    try {
      const res = await fetch(`/api/hrms?rowIndex=${editingEmp.rowIndex}`, {
        method: 'PUT',
        body: formData,
      });

      if (res.ok) {
        setIsRemarkModalOpen(false);
        setEditingEmp(null);
        setRemarkSelection('Approved');
        setManualRemarkText('');
        showToast('Remark saved successfully!');
        fetchEmployees();
      } else {
        alert('Failed to save remark.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rowIndex: number) => {
    if (confirm('Are you sure you want to delete this candidate?')) {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/hrms?rowIndex=${rowIndex}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Candidate deleted successfully!');
          fetchEmployees();
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred while deleting.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const isRejected = (emp: any) => {
    const first = emp.first_round_remark || '';
    const final = emp.final_round_remark || '';
    return first.includes('Rejected') || final.includes('Rejected');
  };

  const isApproved1st = (emp: any) => {
    const first = emp.first_round_remark || '';
    return first.includes('Approved');
  };

  const filteredEmployees = (Array.isArray(employees) ? employees : []).filter((emp) => {
    const rejected = isRejected(emp);
    const approved1st = isApproved1st(emp);

    if (activeTab === 'enrollment') {
      // Enrollment shows everyone
    } else if (activeTab === 'rejected') {
      if (!rejected) return false;
    } else if (activeTab === '1st_round') {
      if (rejected || approved1st) return false;
    } else if (activeTab === 'final_round') {
      if (rejected || !approved1st) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = emp.employee_name?.toLowerCase().includes(term);
      const matchesContact = emp.contact_no?.toLowerCase().includes(term);
      if (!matchesName && !matchesContact) return false;
    }

    if (postFilter) {
      if (emp.post_applied !== postFilter) return false;
    }

    return true;
  });

  const enrollmentCount = employees.length;
  const firstRoundCount = employees.filter(e => !isRejected(e) && !isApproved1st(e)).length;
  const finalRoundCount = employees.filter(e => !isRejected(e) && isApproved1st(e)).length;
  const rejectedCount = employees.filter(e => isRejected(e)).length;

  return (
    <div className={styles.container}>
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '30px', right: '30px',
          backgroundColor: '#10b981', color: 'white',
          padding: '14px 24px', borderRadius: '10px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '10px',
          zIndex: 9999, animation: 'fadeIn 0.3s ease-out'
        }}>
          <CheckCircle2 size={20} />
          <strong style={{ fontSize: '0.95rem' }}>{toastMessage}</strong>
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>HRMS System</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <span className="current">HRMS</span>
          </div>
        </div>
        {!viewingEmp ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className={styles.searchInputWrapper}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by Name or Contact..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className={styles.filterSelect}
              value={postFilter}
              onChange={(e) => setPostFilter(e.target.value)}
            >
              <option value="">All Posts Applied</option>
              <option value="3D DESIGNER">3D DESIGNER</option>
              <option value="2D DESIGNER">2D DESIGNER</option>
              <option value="ARCHITECT">ARCHITECT</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
              <option value="SALES EXECUTIVE">SALES EXECUTIVE</option>
              <option value="CRM">CRM</option>
              <option value="ACCOUNTANT">ACCOUNTANT</option>
              <option value="OFFICE EXECUTIVE">OFFICE EXECUTIVE</option>
              <option value="PC">PC</option>
              <option value="CIVIL ENGINEER">CIVIL ENGINEER</option>
              <option value="ELECTRICAL ENGINEER">ELECTRICAL ENGINEER</option>
              <option value="INTERIOR DESIGNER">INTERIOR DESIGNER</option>
              <option value="GRAPHIC DESIGNER">GRAPHIC DESIGNER</option>
              <option value="HR EXECUTIVE">HR EXECUTIVE</option>
              <option value="MARKETING EXECUTIVE">MARKETING EXECUTIVE</option>
              <option value="OTHERS">OTHERS</option>
            </select>
            <button className={styles.addButton} onClick={openModalForCreate}>
              <UserPlus size={18} /> Add Candidate
            </button>
          </div>
        ) : (
          <button className={styles.addButton} style={{ backgroundColor: 'var(--text-light)' }} onClick={() => setViewingEmp(null)}>
            <ArrowLeft size={18} /> Back to List
          </button>
        )}
      </div>

      {!viewingEmp ? (
        <>
          <div className={styles.tabsContainer}>
            <button
              className={`${styles.tabBtn} ${styles.enrollment} ${activeTab === 'enrollment' ? styles.active : ''}`}
              onClick={() => setActiveTab('enrollment')}
            >
              <div className={styles.tabIconWrapper}>
                <Users size={20} />
                <span>Enrollment</span>
              </div>
              <span className={styles.tabCount}>{enrollmentCount}</span>
            </button>
            <button
              className={`${styles.tabBtn} ${styles.firstRound} ${activeTab === '1st_round' ? styles.active : ''}`}
              onClick={() => setActiveTab('1st_round')}
            >
              <div className={styles.tabIconWrapper}>
                <CheckCircle2 size={20} />
                <span>1st Round</span>
              </div>
              <span className={styles.tabCount}>{firstRoundCount}</span>
            </button>
            <button
              className={`${styles.tabBtn} ${styles.finalRound} ${activeTab === 'final_round' ? styles.active : ''}`}
              onClick={() => setActiveTab('final_round')}
            >
              <div className={styles.tabIconWrapper}>
                <Award size={20} />
                <span>Final Round</span>
              </div>
              <span className={styles.tabCount}>{finalRoundCount}</span>
            </button>
            <button
              className={`${styles.tabBtn} ${styles.rejected} ${activeTab === 'rejected' ? styles.active : ''}`}
              onClick={() => setActiveTab('rejected')}
            >
              <div className={styles.tabIconWrapper}>
                <XCircle size={20} />
                <span>Rejected</span>
              </div>
              <span className={styles.tabCount}>{rejectedCount}</span>
            </button>
          </div>

          <div className={styles.tableContainer}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
            ) : (
              <table className={styles.hrmsTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Post Applied</th>
                    <th>Qualification</th>
                    <th>Files</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp, i) => (
                    <tr key={i} className={activeTab === 'enrollment' && isRejected(emp) ? styles.rejectedRow : ''}>
                      <td><strong>{emp.employee_name}</strong></td>
                      <td>
                        <div className={styles.tableIconRow}>
                          <Phone size={14} /> {emp.contact_no}
                        </div>
                      </td>
                      <td>
                        <div className={styles.tableIconRow}>
                          <Briefcase size={14} /> {emp.post_applied}
                        </div>
                      </td>
                      <td>
                        <div className={styles.tableIconRow}>
                          <GraduationCap size={14} /> {emp.qualification}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                          {emp.cv_upload && <a href={emp.cv_upload} target="_blank" rel="noreferrer" className={styles.fileLink}><LinkIcon size={12} /> CV</a>}
                          {emp.photo_upload && <a href={emp.photo_upload} target="_blank" rel="noreferrer" className={styles.fileLink}><LinkIcon size={12} /> Photo</a>}
                        </div>
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <button className={styles.controlBtn} onClick={() => setViewingEmp(emp)} title="View Details" style={{ backgroundColor: 'rgba(59, 175, 218, 0.1)', color: 'var(--primary)' }}>
                            <Eye size={16} />
                          </button>
                          <button className={styles.controlBtn} onClick={() => openModalForEdit(emp)} title="Edit Details">
                            <Edit2 size={16} />
                          </button>
                          {activeTab === '1st_round' && (
                            <button className={styles.controlBtn} onClick={() => { setEditingEmp(emp); setRemarkType('1st'); setIsRemarkModalOpen(true); }} title="Add 1st Round Remark">
                              <Clock size={16} />
                            </button>
                          )}
                          {activeTab === 'final_round' && (
                            <button className={styles.controlBtn} onClick={() => { setEditingEmp(emp); setRemarkType('final'); setIsRemarkModalOpen(true); }} title="Add Final Round Remark">
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => handleDelete(emp.rowIndex)} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No candidates found in this view.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className={styles.detailsView}>

          {/* Beautiful Profile Banner */}
          <div className={styles.profileBanner}>
            <div className={styles.profileAvatar}>
              {viewingEmp.employee_name ? viewingEmp.employee_name.charAt(0).toUpperCase() : <User size={40} />}
            </div>
            <div className={styles.profileHeaderInfo}>
              <h2>{viewingEmp.employee_name}</h2>
              <div className={styles.profileBadges}>
                <span className={styles.roleBadge}><Briefcase size={14} /> {viewingEmp.post_applied || 'Unspecified Role'}</span>
                <span className={styles.statusBadge}><Award size={14} /> {viewingEmp.qualification || 'No Qualification'}</span>
              </div>
              <div className={styles.profileContact}>
                <span><Phone size={14} /> {viewingEmp.contact_no}</span>
                <span><Calendar size={14} /> Born {formatDate(viewingEmp.date_of_birth)}</span>
                {viewingEmp.address && <span><MapPin size={14} /> {viewingEmp.address}</span>}
              </div>
            </div>
          </div>

          <div className={styles.detailsGrid}>

            {/* Left Column */}
            <div className={styles.detailsColumn}>
              <div className={styles.detailsCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconBox}><User size={18} /></div>
                  <h3 className={styles.cardTitle}>Personal Overview</h3>
                </div>
                <div className={styles.detailsGridInner}>
                  <div className={styles.detailItem}><span>Marital Status</span> <strong>{viewingEmp.marital_status || 'N/A'}</strong></div>
                  <div className={styles.detailItem}><span>Expectation</span> <strong className={styles.highlightText}><DollarSign size={14} /> {viewingEmp.expectation || 'N/A'}</strong></div>
                </div>
              </div>

              <div className={styles.detailsCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconBox}><Building size={18} /></div>
                  <h3 className={styles.cardTitle}>Experience History</h3>
                </div>
                <div className={styles.timelineList}>
                  {(() => {
                    try {
                      if (!viewingEmp.company_details) return <p className={styles.emptyState}>No experience listed.</p>;
                      let details = viewingEmp.company_details;
                      if (typeof details === 'string' && details.startsWith('[')) {
                        const parsed = JSON.parse(details);
                        if (parsed.length === 0 || (!parsed[0].companyName && !parsed[0].experience)) return <p className={styles.emptyState}>No experience listed.</p>;
                        return parsed.map((c: any, i: number) => (
                          <div key={i} className={styles.timelineItem}>
                            <div className={styles.timelineDot}></div>
                            <div className={styles.timelineContent}>
                              <h4>{c.companyName || 'Unknown Company'}</h4>
                              <div className={styles.timelineMeta}>
                                <span><Clock size={12} /> {c.experience || 'N/A'}</span>
                                <span className={styles.salaryTag}>Last Salary: {c.lastSalary || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        ));
                      }
                      return <p className={styles.emptyState}>{details}</p>;
                    } catch (e) {
                      return <p className={styles.emptyState}>{viewingEmp.company_details}</p>;
                    }
                  })()}
                </div>
              </div>
            </div>

            {/* Right Column: Remarks & Files */}
            <div className={styles.detailsColumn}>
              <div className={styles.detailsCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconBox}><FileText size={18} /></div>
                  <h3 className={styles.cardTitle}>Interview Feedback</h3>
                </div>
                <div className={styles.remarksList}>
                  <div className={styles.remarkBox}>
                    <label>EA Remarks</label>
                    <p>{viewingEmp.ea_remarks || 'No remarks added yet.'}</p>
                  </div>
                  <div className={styles.remarkBox}>
                    <label>Director Remarks</label>
                    <p>{viewingEmp.director_remarks || 'No remarks added yet.'}</p>
                  </div>
                  <div className={styles.remarkBox}>
                    <label>1st Round Remark</label>
                    <p>{viewingEmp.first_round_remark || 'No remarks added yet.'}</p>
                  </div>
                  <div className={`${styles.remarkBox} ${styles.finalRemark}`}>
                    <label>Final Round Remark</label>
                    <p>{viewingEmp.final_round_remark || 'No remarks added yet.'}</p>
                  </div>
                </div>
              </div>

              <div className={styles.detailsCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconBox}><LinkIcon size={18} /></div>
                  <h3 className={styles.cardTitle}>Attached Documents</h3>
                </div>
                <div className={styles.documentActionList}>
                  {viewingEmp.cv_upload ? (
                    <a href={viewingEmp.cv_upload} target="_blank" rel="noreferrer" className={styles.docBtn}>
                      <div className={styles.docIconWrapper}><FileText size={20} /></div>
                      <div className={styles.docInfo}>
                        <strong>Candidate CV</strong>
                        <span>Click to view document</span>
                      </div>
                    </a>
                  ) : (
                    <div className={styles.docEmpty}><FileText size={16} /> No CV Uploaded</div>
                  )}
                  {viewingEmp.photo_upload ? (
                    <a href={viewingEmp.photo_upload} target="_blank" rel="noreferrer" className={styles.docBtn}>
                      <div className={styles.docIconWrapper}><User size={20} /></div>
                      <div className={styles.docInfo}>
                        <strong>Candidate Photo</strong>
                        <span>Click to view image</span>
                      </div>
                    </a>
                  ) : (
                    <div className={styles.docEmpty}><User size={16} /> No Photo Uploaded</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingEmp(null); }} title={editingEmp ? "Edit Candidate" : "Add Candidate"}>
        <form onSubmit={handleCreateSubmit}>
          <div className={styles.formTabs}>
            <button type="button" className={`${styles.formTabBtn} ${activeFormTab === 'personal' ? styles.active : ''}`} onClick={() => setActiveFormTab('personal')}>
              <User size={16} /> Personal Details
            </button>
            <button type="button" className={`${styles.formTabBtn} ${activeFormTab === 'professional' ? styles.active : ''}`} onClick={() => setActiveFormTab('professional')}>
              <Briefcase size={16} /> Professional Details
            </button>
            <button type="button" className={`${styles.formTabBtn} ${activeFormTab === 'remarks' ? styles.active : ''}`} onClick={() => setActiveFormTab('remarks')}>
              <FileText size={16} /> Remarks Section
            </button>
          </div>

          <div className={styles.formGrid}>

            {/* PERSONAL DETAILS TAB */}
            <div style={{ display: activeFormTab === 'personal' ? 'block' : 'none' }}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Employee Name</label>
                  <div className={styles.inputWrapper}>
                    <User size={16} className={styles.inputIcon} />
                    <input type="text" name="employee_name" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingEmp?.employee_name} placeholder=" " required />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Contact No</label>
                  <div className={styles.inputWrapper}>
                    <Phone size={16} className={styles.inputIcon} />
                    <input type="text" name="contact_no" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingEmp?.contact_no} placeholder=" " required />
                  </div>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Date of Birth</label>
                  <div className={styles.inputWrapper}>
                    <Calendar size={16} className={styles.inputIcon} />
                    <input type="date" name="date_of_birth" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingEmp?.date_of_birth} placeholder=" " />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Marital Status</label>
                  <div className={styles.inputWrapper}>
                    <Heart size={16} className={styles.inputIcon} />
                    <select name="marital_status" className={`${styles.formSelect} ${styles.withIcon}`} defaultValue={editingEmp?.marital_status || ''}>
                      <option value="">Select...</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label>Address</label>
                <div className={styles.inputWrapper}>
                  <MapPin size={16} className={`${styles.inputIcon} ${styles.textareaIcon}`} />
                  <textarea name="address" className={`${styles.formTextarea} ${styles.withIcon}`} defaultValue={editingEmp?.address} placeholder=" "></textarea>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>CV Upload</label>
                  <input type="file" name="cv_upload" className={styles.formInput} />
                  {editingEmp?.cv_upload && <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Current CV uploaded. Leave empty to keep.</div>}
                </div>
                <div className={styles.formGroup}>
                  <label>Photo Upload</label>
                  <input type="file" name="photo_upload" className={styles.formInput} accept="image/*" />
                  {editingEmp?.photo_upload && <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Current Photo uploaded. Leave empty to keep.</div>}
                </div>
              </div>
            </div>

            {/* PROFESSIONAL DETAILS TAB */}
            <div style={{ display: activeFormTab === 'professional' ? 'block' : 'none' }}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Post Applied</label>
                  <div className={styles.inputWrapper}>
                    <Briefcase size={16} className={styles.inputIcon} />
                    <select name="post_applied" className={`${styles.formSelect} ${styles.withIcon}`} defaultValue={editingEmp?.post_applied || ''}>
                      <option value="">Select Option</option>
                      <option value="3D DESIGNER">3D DESIGNER</option>
                      <option value="2D DESIGNER">2D DESIGNER</option>
                      <option value="ARCHITECT">ARCHITECT</option>
                      <option value="SUPERVISOR">SUPERVISOR</option>
                      <option value="SALES EXECUTIVE">SALES EXECUTIVE</option>
                      <option value="CRM">CRM</option>
                      <option value="ACCOUNTANT">ACCOUNTANT</option>
                      <option value="OFFICE EXECUTIVE">OFFICE EXECUTIVE</option>
                      <option value="PC">PC</option>
                      <option value="CIVIL ENGINEER">CIVIL ENGINEER</option>
                      <option value="ELECTRICAL ENGINEER">ELECTRICAL ENGINEER</option>
                      <option value="INTERIOR DESIGNER">INTERIOR DESIGNER</option>
                      <option value="GRAPHIC DESIGNER">GRAPHIC DESIGNER</option>
                      <option value="HR EXECUTIVE">HR EXECUTIVE</option>
                      <option value="MARKETING EXECUTIVE">MARKETING EXECUTIVE</option>
                      <option value="OTHERS">OTHERS</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Qualification</label>
                  <div className={styles.inputWrapper}>
                    <GraduationCap size={16} className={styles.inputIcon} />
                    <input type="text" name="qualification" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingEmp?.qualification} placeholder=" " />
                  </div>
                </div>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label>Expectation</label>
                <div className={styles.inputWrapper}>
                  <DollarSign size={16} className={styles.inputIcon} />
                  <input type="text" name="expectation" className={`${styles.formInput} ${styles.withIcon}`} defaultValue={editingEmp?.expectation} placeholder=" " />
                </div>
              </div>

              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', zIndex: 1, position: 'relative' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>Company Details (Experience)</span>
                  <button type="button" className={styles.addCompanyBtn} onClick={handleAddCompany}>
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                {companyDetails.map((company, index) => (
                  <div key={index} className={styles.companyRow}>
                    <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '4px' }}>Company Name</span>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={company.companyName}
                        onChange={(e) => handleCompanyChange(index, 'companyName', e.target.value)}
                        placeholder="Ex: RS Design"
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '4px' }}>Experience</span>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={company.experience}
                        onChange={(e) => handleCompanyChange(index, 'experience', e.target.value)}
                        placeholder="Ex: 2 Years"
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '4px' }}>Last Salary</span>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={company.lastSalary}
                        onChange={(e) => handleCompanyChange(index, 'lastSalary', e.target.value)}
                        placeholder="Ex: 40k"
                      />
                    </div>
                    {companyDetails.length > 1 && (
                      <button type="button" className={styles.removeBtn} onClick={() => handleRemoveCompany(index)} title="Remove Row">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* REMARKS TAB */}
            <div style={{ display: activeFormTab === 'remarks' ? 'block' : 'none' }}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>EA Remarks</label>
                  <div className={styles.inputWrapper}>
                    <FileText size={16} className={`${styles.inputIcon} ${styles.textareaIcon}`} />
                    <textarea name="ea_remarks" className={`${styles.formTextarea} ${styles.withIcon}`} style={{ minHeight: '60px' }} defaultValue={editingEmp?.ea_remarks} placeholder=" "></textarea>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Director Remarks</label>
                  <div className={styles.inputWrapper}>
                    <FileText size={16} className={`${styles.inputIcon} ${styles.textareaIcon}`} />
                    <textarea name="director_remarks" className={`${styles.formTextarea} ${styles.withIcon}`} style={{ minHeight: '60px' }} defaultValue={editingEmp?.director_remarks} placeholder=" "></textarea>
                  </div>
                </div>
              </div>


            </div>

          </div>

          <div className={styles.formActions} style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', justifyContent: 'flex-end', display: 'flex', gap: '10px' }}>
            {activeFormTab !== 'personal' && (
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setActiveFormTab(activeFormTab === 'remarks' ? 'professional' : 'personal')}
              >
                Previous
              </button>
            )}
            <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>

            {activeFormTab !== 'remarks' ? (
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => setActiveFormTab(activeFormTab === 'personal' ? 'professional' : 'remarks')}
              >
                Next
              </button>
            ) : (
              <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Candidate'}
              </button>
            )}
          </div>
        </form>
      </Modal>

      <Modal isOpen={isRemarkModalOpen} onClose={() => { setIsRemarkModalOpen(false); setEditingEmp(null); setRemarkSelection('Approved'); setManualRemarkText(''); }} title={`Add ${remarkType === '1st' ? '1st' : 'Final'} Round Remark`}>
        <form onSubmit={handleRemarkSubmit}>
          <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
            <label>Status Selection</label>
            <select
              className={styles.formSelect}
              value={remarkSelection}
              onChange={(e) => setRemarkSelection(e.target.value)}
              required
            >
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Manual Remark">Manual Remark</option>
            </select>
          </div>

          {remarkSelection === 'Manual Remark' && (
            <div className={styles.formGroup} style={{ marginBottom: '16px', animation: 'fadeIn 0.2s ease-out' }}>
              <label>Manual Remark Details</label>
              <textarea
                className={styles.formTextarea}
                value={manualRemarkText}
                onChange={(e) => setManualRemarkText(e.target.value)}
                required
              ></textarea>
            </div>
          )}

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => { setIsRemarkModalOpen(false); setRemarkSelection('Approved'); setManualRemarkText(''); }}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Remark'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
