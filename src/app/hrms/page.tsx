'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, X, BarChart3, Search, Filter, ChevronLeft, ChevronRight, User, Phone, MapPin, Building, Briefcase, HardHat, Users, Calendar, Fingerprint, Tag, Download, Home, Store, CheckSquare, XCircle, RefreshCw } from 'lucide-react';
import styles from './hrms.module.css';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';

interface Candidate {
  rowIndex: number;
  id: string;
  created_at: string;
  updated_at: string;
  employee_name: string;
  contact_no: string;
  post_applied: string;
  qualification: string;
  date_of_birth: string;
  marital_status: string;
  address: string;
  expectation: string;
  company_details: string;
  cv_upload: string;
  photo_upload: string;
  planned_1?: string;
  actual_1?: string;
  status_1?: string;
  planned_2?: string;
  actual_2?: string;
  status_2?: string;
  next_follow_up_date_2?: string;
  remarks_2?: string;
  planned_3?: string;
  actual_3?: string;
  status_3?: string;
  next_follow_up_date_3?: string;
  remark_3?: string;
  planned_4?: string;
  actual_4?: string;
  status_4?: string;
  meeting_mode_4?: string;
  next_follow_up_date_4?: string;
  remark_4?: string;
  planned_5?: string;
  actual_5?: string;
  status_5?: string;
  next_follow_up_date_5?: string;
  remark_5?: string;
  lost_remark?: string;
}

const FilterSection = ({ title, options, selected, onChange }: { title: string, options: string[], selected: string[], onChange: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className={styles.filterSection}>
      <h4 className={styles.filterSectionTitle}>{title}</h4>
      <div className={styles.filterDropdownHeader} onClick={() => setIsOpen(!isOpen)}>
        <span style={{ color: selected.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {selected.length > 0 ? `${selected.length} selected` : 'Select options...'}
        </span>
        <ChevronRight size={16} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
      </div>
      {isOpen && (
        <div className={styles.filterDropdownBody}>
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className={styles.filterSearchInput} />
          <div className={styles.filterOptionsList}>
            {filteredOptions.map(opt => (
              <label key={opt} className={styles.filterOptionLabel}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => onChange(opt)} />
                {opt}
              </label>
            ))}
            {filteredOptions.length === 0 && <span className={styles.noOptions}>No options found</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export const getNextStepInfo = (candidate: Candidate) => {
  if (!candidate.actual_1) return { step: 1, title: 'Step 1' };
  if (!candidate.actual_2) return { step: 2, title: 'Step 2' };
  if (!candidate.actual_3) return { step: 3, title: 'Step 3' };
  if (!candidate.actual_4) return { step: 4, title: 'Step 4' };
  if (!candidate.actual_5) return { step: 5, title: 'Step 5' };
  return { step: 6, title: 'Completed' };
};

// Define dynamic icons for posts and steps
const getPostIcon = (post: string) => {
  switch (post) {
    case 'ARCHITECT': return <HardHat size={14} />;
    case 'SALES EXECUTIVE': return <BarChart3 size={14} />;
    case 'CRM': return <Phone size={14} />;
    case 'ACCOUNTANT': return <Calendar size={14} />;
    case 'HR EXECUTIVE': return <Users size={14} />;
    case 'MARKETING EXECUTIVE': return <Tag size={14} />;
    case 'CIVIL ENGINEER': return <Building size={14} />;
    case 'SUPERVISOR':
    case 'OFFICE EXECUTIVE':
    case 'PC': return <User size={14} />;
    case '3D DESIGNER':
    case '2D DESIGNER':
    case 'INTERIOR DESIGNER':
    case 'GRAPHIC DESIGNER': return <Store size={14} />;
    default: return <Briefcase size={14} />;
  }
};

const getStepIcon = (step: number) => {
  switch (step) {
    case 1: return <Phone size={14} />;
    case 2: return <User size={14} />;
    case 3: return <Users size={14} />;
    case 4: return <Edit2 size={14} />;
    case 5: return <Briefcase size={14} />;
    case 6: return <CheckSquare size={14} />;
    default: return <CheckSquare size={14} />;
  }
};

export const getStepName = (step: number) => {
  switch(step) {
    case 1: return "Step-1 Calling followup";
    case 2: return "Step-2 Level 1 interview";
    case 3: return "Step-3 Level 2 interview";
    case 4: return "Step-4 Offer letter";
    case 5: return "Step-5 Joining";
    default: return "Completed";
  }
};

export const getPendingStepStatus = (candidate: Candidate, customNow?: Date) => {
  const info = getNextStepInfo(candidate);
  if (info.step > 5) return null;
  
  const currentStatus = candidate[`status_${info.step}` as keyof Candidate];
  const nextFollowUpDateStr = candidate[`next_follow_up_date_${info.step}` as keyof Candidate];
  
  let plannedDateStr = candidate[`planned_${info.step}` as keyof Candidate];
  let isFollowUp = false;
  
  if (currentStatus === 'Next Follow Up' && nextFollowUpDateStr) {
    if (typeof nextFollowUpDateStr === 'string' && nextFollowUpDateStr.length === 10) {
      plannedDateStr = `${nextFollowUpDateStr}T12:30:00.000Z`;
    } else {
      plannedDateStr = nextFollowUpDateStr;
    }
    isFollowUp = true;
  }
  
  if (!plannedDateStr) return null; 
  
  const plannedDate = new Date(plannedDateStr as string);
  const now = customNow || new Date();
  
  const diffMs = plannedDate.getTime() - now.getTime();
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((Math.abs(diffMs) / (1000 * 60 * 60)) % 24);
  const diffMinutes = Math.floor((Math.abs(diffMs) / (1000 * 60)) % 60);
  const diffSeconds = Math.floor((Math.abs(diffMs) / 1000) % 60);
  
  let timeText = '';
  if (diffDays > 0) timeText += `${diffDays}d `;
  if (diffHours > 0 || diffDays > 0) timeText += `${diffHours}h `;
  if (diffMinutes > 0 || diffHours > 0 || diffDays > 0) timeText += `${diffMinutes}m `;
  timeText += `${diffSeconds}s`;
  
  const isDelayed = diffMs < 0;
  
  const formattedPlannedDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).format(plannedDate);
  
  return {
    stepName: getStepName(info.step),
    isDelayed,
    timeText: isDelayed ? `${timeText} delayed` : `${timeText} left`,
    plannedDate,
    formattedPlannedDate,
    step: info.step,
    isFollowUp
  };
};

const StepCountdown = ({ candidate, handleOpenStepModal }: { candidate: Candidate, handleOpenStepModal: (candidate: Candidate) => void }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const status = getPendingStepStatus(candidate, now);
  if (!status) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '10px', background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{status.stepName}</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: status.isDelayed ? '#f1556c' : '#1abc9c' }}>
            ({status.timeText})
          </span>
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {status.isFollowUp ? 'FOLLOW UP' : 'PLANNED'}: {status.formattedPlannedDate}
        </div>
      </div>
      {!candidate.lost_remark && (
        <button 
          className={`${styles.iconBtn} ${styles.complete}`}
          onClick={() => handleOpenStepModal(candidate)}
          title={`Complete ${status.stepName}`}
        >
          <CheckSquare size={16} color="#1abc9c" />
        </button>
      )}
    </div>
  );
};

export const getCandidateTypeColor = (type: string) => {
  switch(type) {
    case 'All Posts': return '#3bafda';
    case 'Hotel': return '#f7b84b';
    case 'Club House': return '#f1556c';
    case 'Residence': return '#1abc9c';
    case 'Office': return '#6559cc';
    case 'Showroom': return '#ff8acc';
    default: return '#3bafda';
  }
};

export const getTimeFilterColor = (time: string) => {
  switch(time) {
    case 'All Time': return '#3bafda';
    case 'Delayed': return '#f1556c';
    case 'Today': return '#f7b84b';
    case 'Tomorrow': return '#1abc9c';
    case 'Lost': return '#e74c3c';
    default: return '#3bafda';
  }
};

export const getSidebarModeColor = (mode: string) => {
  return mode === 'salesman' ? '#3bafda' : '#6559cc';
};

export default function HRMSPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [salesmenList, setSalesmenList] = useState<string[]>([]);
  const [isSalesmanModalOpen, setIsSalesmanModalOpen] = useState(false);
  const [newSalesmanName, setNewSalesmanName] = useState('');
  const [companyDetailsList, setCompanyDetailsList] = useState<{companyName: string; experience: string}[]>([{ companyName: '', experience: '' }]);

  // Filtering & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarMode, setSidebarMode] = useState<'post' | 'step'>('post');
  const [selectedPostApplied, setSelectedPostApplied] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [selectedCandidateTypes, setSelectedCandidateTypes] = useState<string[]>([]);
  const [filterPostApplied, setFilterPostApplied] = useState<string[]>([]);
  const [filterQualification, setFilterQualification] = useState<string[]>([]);
  const [filterMaritalStatus, setFilterMaritalStatus] = useState<string[]>([]);
  const [filterAddress, setFilterAddress] = useState<string[]>([]);
  const [filterExpectation, setFilterExpectation] = useState<string[]>([]);
  const [filterCompanyDetails, setFilterCompanyDetails] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<'delayed' | 'today' | 'tomorrow' | 'lost' | null>(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [currentStepCandidate, setCurrentStepCandidate] = useState<Candidate | null>(null);
  const [stepFormData, setStepFormData] = useState<any>({});

  const [formData, setFormData] = useState({
    employee_name: '',
    contact_no: '',
    post_applied: '',
    qualification: '',
    date_of_birth: '',
    marital_status: '',
    address: '',
    expectation: '',
    company_details: '',
  });

  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [currentLostCandidate, setCurrentLostCandidate] = useState<Candidate | null>(null);
  const [lostRemark, setLostRemark] = useState('');
  const [isRevertLostModalOpen, setIsRevertLostModalOpen] = useState(false);

  useEffect(() => {
    fetchCandidates();
    fetchSalesmen();
  }, []);

  // Derived unique options for advanced filters
  const uniquePostApplied = useMemo(() => Array.from(new Set(candidates.map(l => l.post_applied).filter(Boolean))), [candidates]);
  const uniqueQualification = useMemo(() => Array.from(new Set(candidates.map(l => l.qualification).filter(Boolean))), [candidates]);
  const uniqueMaritalStatus = useMemo(() => Array.from(new Set(candidates.map(l => l.marital_status).filter(Boolean))), [candidates]);
  const uniqueAddress = useMemo(() => Array.from(new Set(candidates.map(l => l.address).filter(Boolean))), [candidates]);
  const uniqueExpectation = useMemo(() => Array.from(new Set(candidates.map(l => l.expectation).filter(Boolean))), [candidates]);
  const uniqueCompanyDetails = useMemo(() => Array.from(new Set(candidates.map(l => l.company_details).filter(Boolean))), [candidates]);

  const fetchSalesmen = async () => {
    try {
      const response = await fetch('/api/hrms/salesmen');
      if (response.ok) {
        const data = await response.json();
        setSalesmenList(data);
      }
    } catch (error) {
      console.error('Error fetching salesmen:', error);
    }
  };

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/hrms');
      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      } else {
        console.error('Failed to fetch candidates');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (candidate?: Candidate) => {
    if (candidate) {
      setEditingCandidate(candidate);
      setFormData({
        employee_name: candidate.employee_name || '',
        contact_no: candidate.contact_no || '',
        post_applied: candidate.post_applied || '',
        qualification: candidate.qualification || '',
        date_of_birth: candidate.date_of_birth || '',
        marital_status: candidate.marital_status || '',
        address: candidate.address || '',
        expectation: candidate.expectation || '',
        company_details: candidate.company_details || '',
      });
      try {
        const parsed = JSON.parse(candidate.company_details || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCompanyDetailsList(parsed);
        } else {
          setCompanyDetailsList([{ companyName: candidate.company_details || '', experience: '' }]);
        }
      } catch (e) {
        setCompanyDetailsList([{ companyName: candidate.company_details || '', experience: '' }]);
      }
    } else {
      setEditingCandidate(null);
      setFormData({
        employee_name: '',
        contact_no: '',
        post_applied: '',
        qualification: '',
        date_of_birth: '',
        marital_status: '',
        address: '',
        expectation: '',
        company_details: '',
      });
      setCompanyDetailsList([{ companyName: '', experience: '' }]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCandidate(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSalesmanClick = () => {
    setNewSalesmanName('');
    setIsSalesmanModalOpen(true);
  };

  const handleAddSalesman = async () => {
    if (newSalesmanName && newSalesmanName.trim() !== '') {
      try {
        const response = await fetch('/api/hrms/salesmen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newSalesmanName.trim() })
        });
        if (response.ok) {
          fetchSalesmen();
          setFormData(prev => ({ ...prev, salesman: newSalesmanName.trim() }));
          setIsSalesmanModalOpen(false);
        } else {
          const err = await response.json();
          alert(`Error: ${err.error}`);
        }
      } catch (error) {
        console.error('Error adding salesman:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = e.currentTarget;
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });
      
      const cvFileInput = form.querySelector<HTMLInputElement>('input[name="cv_upload"]');
      const photoFileInput = form.querySelector<HTMLInputElement>('input[name="photo_upload"]');
      if (cvFileInput && cvFileInput.files && cvFileInput.files.length > 0) {
        submitData.set('cv_upload', cvFileInput.files[0]);
      }
      if (photoFileInput && photoFileInput.files && photoFileInput.files.length > 0) {
        submitData.set('photo_upload', photoFileInput.files[0]);
      }
      
      submitData.set('company_details', JSON.stringify(companyDetailsList));

      let response;
      if (editingCandidate) {
        submitData.append('id', editingCandidate.id);
        submitData.append('created_at', editingCandidate.created_at);
        submitData.append('existing_cv_url', editingCandidate.cv_upload || '');
        submitData.append('existing_photo_url', editingCandidate.photo_upload || '');
        
        // Preserve all step data
        for (let i = 1; i <= 5; i++) {
          submitData.append(`planned_${i}`, editingCandidate[`planned_${i}` as keyof Candidate] as string || '');
          submitData.append(`actual_${i}`, editingCandidate[`actual_${i}` as keyof Candidate] as string || '');
          submitData.append(`status_${i}`, editingCandidate[`status_${i}` as keyof Candidate] as string || '');
          submitData.append(`next_follow_up_date_${i}`, editingCandidate[`next_follow_up_date_${i}` as keyof Candidate] as string || '');
          submitData.append(`remark_${i}`, editingCandidate[`remark_${i}` as keyof Candidate] as string || '');
        }
        submitData.append('lost_remark', editingCandidate.lost_remark || '');
        
        response = await fetch(`/api/hrms?rowIndex=${editingCandidate.rowIndex}`, {
          method: 'PUT',
          body: submitData,
        });
      } else {
        response = await fetch('/api/hrms', {
          method: 'POST',
          body: submitData,
        });
      }

      if (response.ok) {
        await fetchCandidates();
        handleCloseModal();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error submitting candidate:', error);
      alert('An error occurred while saving the candidate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rowIndex: number) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      try {
        const response = await fetch(`/api/hrms?rowIndex=${rowIndex}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          await fetchCandidates();
        } else {
          alert('Failed to delete candidate');
        }
      } catch (error) {
        console.error('Error deleting candidate:', error);
      }
    }
  };

  const handleOpenStepModal = (candidate: Candidate) => {
    setCurrentStepCandidate(candidate);
    const info = getNextStepInfo(candidate);
    setStepFormData({
      status: info.step === 1 ? '' : info.step === 2 ? 'Qualified' : 'Done'
    });
    setIsStepModalOpen(true);
  };

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStepCandidate) return;
    setIsSubmitting(true);
    
    const info = getNextStepInfo(currentStepCandidate);
    const step = info.step;
    if (step > 5) return;
    
    const submitData = new FormData();
    Object.entries(currentStepCandidate).forEach(([k, v]) => {
      submitData.append(k, String(v || ''));
    });
    
    const now = new Date();
    
    const isStepNextFollowUp = stepFormData.status === 'Next Follow Up';
    
    if (!isStepNextFollowUp) {
      submitData.set(`actual_${step}`, now.toISOString());
    }
    
    submitData.set(`status_${step}`, stepFormData.status || '');
    
    submitData.set(`next_follow_up_date_${step}`, isStepNextFollowUp ? (stepFormData.next_follow_up_date || '') : '');
    
    if (isStepNextFollowUp && stepFormData.next_follow_up_date) {
      try {
        const [year, month, day] = stepFormData.next_follow_up_date.split('-');
        const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 18, 0, 0);
        submitData.set(`planned_${step}`, parsed.toISOString());
      } catch (e) {
        submitData.set(`planned_${step}`, stepFormData.next_follow_up_date);
      }
    }
    
    if (stepFormData.remarks) {
      submitData.set(`remark_${step}`, stepFormData.remarks);
    }
    
    if (step < 5 && !isStepNextFollowUp) {
      const nextPlanned = new Date(now);
      const tat = 1; // User requested 1 day TAT for all steps
      nextPlanned.setDate(nextPlanned.getDate() + tat);
      if (nextPlanned.getDay() === 0) { // Sunday
        nextPlanned.setDate(nextPlanned.getDate() + 1);
      }
      nextPlanned.setHours(18, 0, 0, 0);
      submitData.set(`planned_${step + 1}`, nextPlanned.toISOString());
    }
    
    try {
      const response = await fetch(`/api/hrms?rowIndex=${currentStepCandidate.rowIndex}`, {
        method: 'PUT',
        body: submitData
      });
      if (response.ok) {
        await fetchCandidates();
        setIsStepModalOpen(false);
      } else {
        alert("Failed to update step");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenLostModal = (candidate: Candidate) => {
    setCurrentLostCandidate(candidate);
    setLostRemark(String(candidate.lost_remark || ''));
    setIsLostModalOpen(true);
  };

  const handleLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLostCandidate) return;
    setIsSubmitting(true);
    
    const submitData = new FormData();
    Object.entries(currentLostCandidate).forEach(([k, v]) => {
      submitData.append(k, String(v || ''));
    });
    submitData.set('lost_remark', lostRemark);
    
    try {
      const response = await fetch(`/api/hrms?rowIndex=${currentLostCandidate.rowIndex}`, {
        method: 'PUT',
        body: submitData
      });
      if (response.ok) {
        await fetchCandidates();
        setIsLostModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRevertLostModal = (candidate: Candidate) => {
    setCurrentLostCandidate(candidate);
    setIsRevertLostModalOpen(true);
  };

  const handleRemoveLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLostCandidate) return;
    setIsSubmitting(true);
    const submitData = new FormData();
    Object.entries(currentLostCandidate).forEach(([k, v]) => {
      submitData.append(k, String(v || ''));
    });
    submitData.set('lost_remark', '');
    
    try {
      const response = await fetch(`/api/hrms?rowIndex=${currentLostCandidate.rowIndex}`, {
        method: 'PUT',
        body: submitData
      });
      if (response.ok) {
        await fetchCandidates();
        setIsRevertLostModalOpen(false);
      }
    } catch(e) {} finally {
      setIsSubmitting(false);
    }
  };

  const handleCandidateTypeToggle = (type: string) => {
    setSelectedCandidateTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setCurrentPage(1);
  };

  const filteredAndSortedCandidates = useMemo(() => {
    let result = [...candidates];
    
    // Sort: latest entry on top
    result.sort((a, b) => b.rowIndex - a.rowIndex);

    const handleCityTypeToggle = (type: string) => { setFilterPostApplied(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]); setCurrentPage(1); };
    const handleClientTypeToggle = (type: string) => { setFilterQualification(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]); setCurrentPage(1); };

    // Apply Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.employee_name.toLowerCase().includes(q) || 
        l.contact_no.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    }

    // Apply Sidebar Filters
    if (sidebarMode === 'post' && selectedPostApplied) {
      result = result.filter(l => l.marital_status === selectedPostApplied);
    }
    if (sidebarMode === 'step' && selectedStep !== null) {
      result = result.filter(l => getNextStepInfo(l).step === selectedStep);
    }

    // Apply Time Filters
    if (timeFilter) {
      if (timeFilter === 'lost') {
        result = result.filter(l => l.lost_remark);
      } else {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const dayAfterStart = new Date(tomorrowStart);
        dayAfterStart.setDate(dayAfterStart.getDate() + 1);

        result = result.filter(l => {
          if (l.lost_remark) return false;
          const status = getPendingStepStatus(l);
          if (!status) return false;
          
          if (timeFilter === 'delayed') return status.isDelayed;
          if (timeFilter === 'today') return status.plannedDate >= todayStart && status.plannedDate < tomorrowStart;
          if (timeFilter === 'tomorrow') return status.plannedDate >= tomorrowStart && status.plannedDate < dayAfterStart;
          return true;
        });
      }
    } else {
      // All Time view hides Lost candidates
      result = result.filter(l => !l.lost_remark);
    }

    // Apply Candidate Type Filter
    if (selectedCandidateTypes.length > 0) {
      result = result.filter(l => selectedCandidateTypes.includes(l.post_applied));
    }

    // Apply Advanced Filters
    if (filterPostApplied.length > 0) {
      result = result.filter(l => filterPostApplied.includes(l.post_applied));
    }
    if (filterQualification.length > 0) {
      result = result.filter(l => filterQualification.includes(l.qualification));
    }
    if (filterMaritalStatus.length > 0) {
      result = result.filter(l => filterMaritalStatus.includes(l.marital_status));
    }
    if (filterAddress.length > 0) {
      result = result.filter(l => filterAddress.includes(l.address));
    }
    if (filterExpectation.length > 0) {
      result = result.filter(l => filterExpectation.includes(l.expectation));
    }
    if (filterCompanyDetails.length > 0) {
      result = result.filter(l => filterCompanyDetails.includes(l.company_details));
    }

    return result;
  }, [candidates, searchQuery, sidebarMode, selectedPostApplied, selectedStep, timeFilter, selectedCandidateTypes, filterPostApplied, filterQualification, filterMaritalStatus, filterAddress, filterExpectation, filterCompanyDetails]);

  const totalPages = Math.ceil(filteredAndSortedCandidates.length / itemsPerPage) || 1;
  const currentCandidates = filteredAndSortedCandidates.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const candidateTypesList = ['All Posts', '3D DESIGNER', '2D DESIGNER', 'ARCHITECT', 'SALES EXECUTIVE', 'CRM', 'ACCOUNTANT'];
  const timeList = ['All Time', 'Delayed', 'Today', 'Tomorrow', 'Lost'];

  const activeCandidateTypePill = selectedCandidateTypes.length === 1 ? selectedCandidateTypes[0] : 'All Posts';
  const activeTimeFilterPill = timeFilter === 'delayed' ? 'Delayed' : timeFilter === 'today' ? 'Today' : timeFilter === 'tomorrow' ? 'Tomorrow' : timeFilter === 'lost' ? 'Lost' : 'All Time';

  const handleCandidateTypePillClick = (type: string) => {
    if (type === 'All Posts') setSelectedCandidateTypes([]);
    else setSelectedCandidateTypes([type]);
    setCurrentPage(1);
  };

  const handleTimeFilterPillClick = (type: string) => {
    if (type === 'All Time') setTimeFilter(null);
    else setTimeFilter(type.toLowerCase() as any);
    setCurrentPage(1);
  };

  const candidateTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    candidateTypesList.forEach(lt => counts[lt] = 0);
    // Only count non-lost for candidate types
    const activeCandidates = candidates.filter(l => !l.lost_remark);
    counts['All Posts'] = activeCandidates.length;
    activeCandidates.forEach(l => {
      if (l.post_applied && counts[l.post_applied] !== undefined) counts[l.post_applied]++;
    });
    return counts;
  }, [candidates]);

  const timeCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Time': 0, 'Delayed': 0, 'Today': 0, 'Tomorrow': 0, 'Lost': 0 };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterStart = new Date(tomorrowStart);
    dayAfterStart.setDate(dayAfterStart.getDate() + 1);

    candidates.forEach(l => {
      if (l.lost_remark) {
        counts['Lost']++;
        return;
      }
      counts['All Time']++;
      const status = getPendingStepStatus(l);
      if (!status) return;
      if (status.isDelayed) counts['Delayed']++;
      else if (status.plannedDate >= todayStart && status.plannedDate < tomorrowStart) counts['Today']++;
      else if (status.plannedDate >= tomorrowStart && status.plannedDate < dayAfterStart) counts['Tomorrow']++;
    });
    return counts;
  }, [candidates]);

  const handleExportCSV = () => {
    if (filteredAndSortedCandidates.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = ['ID', 'Name', 'Address', 'Contact No', 'Marital Status', 'Post Applied', 'Address', 'Expectation', 'Candidate Type', 'Qualification', 'Builder Name', 'Date Created'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedCandidates.map(l => [
        `"${l.id}"`, 
        `"${l.employee_name}"`, 
        `"${l.address || ''}"`, 
        `"${l.contact_no || ''}"`, 
        `"${l.marital_status || ''}"`, 
        `"${l.post_applied || ''}"`, 
        `"${l.address || ''}"`, 
        `"${l.expectation || ''}"`, 
        `"${l.post_applied || ''}"`, 
        `"${l.qualification || ''}"`, 
        `"${l.company_details || ''}"`, 
        `"${l.created_at ? new Date(l.created_at).toLocaleDateString() : ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'candidates_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>HRMS System</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <span className="current">HRMS</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className={styles.actionControls}>
            <div className={styles.searchBox}>
              <Search size={18} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Search candidates..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div>
              <button 
                className={styles.dropdownBtn}
                onClick={() => setIsRightSidebarOpen(true)}
              >
                <Filter size={16} />
                Filters {(selectedCandidateTypes.length + filterPostApplied.length + filterQualification.length) > 0 ? `(${selectedCandidateTypes.length + filterPostApplied.length + filterQualification.length})` : ''}
              </button>
            </div>
          </div>
          
          <div className={styles.pagination}>
            <span>Page {currentPage} of {totalPages}</span>
            <button className={styles.pageBtn} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
            <button className={styles.pageBtn} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></button>
            <button className={styles.exportBtn} onClick={handleExportCSV} title="Export CSV">
              <Download size={18} />
            </button>
            <button className={styles.createCandidateBtn} onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Create Candidate
            </button>
          </div>
        </div>
      </div>
      <div className={styles.container}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle} style={{ padding: '15px 20px', flexDirection: 'column', alignItems: 'stretch', gap: '15px' }}>
            <div className={styles.toggleSwitchContainer}>
              <div 
                className={`${styles.toggleSwitchSlider} ${sidebarMode === 'step' ? styles.toggleRight : ''}`} 
                style={{ background: getSidebarModeColor(sidebarMode) }}
              />
              <button 
                onClick={() => setSidebarMode('post')}
                className={`${styles.toggleSwitchBtn} ${sidebarMode === 'post' ? styles.active : ''}`}
                style={{ color: sidebarMode === 'post' ? '#fff' : '#6c757d' }}
              >Posts</button>
              <button 
                onClick={() => setSidebarMode('step')}
                className={`${styles.toggleSwitchBtn} ${sidebarMode === 'step' ? styles.active : ''}`}
                style={{ color: sidebarMode === 'step' ? '#fff' : '#6c757d' }}
              >Steps</button>
            </div>
          </div>
          <div className={styles.sidebarFilterList}>
            {sidebarMode === 'post' ? (
              <>
                <div 
                  className={`${styles.filterItem} ${selectedPostApplied === null ? styles.active : ''}`}
                  onClick={() => { setSelectedPostApplied(null); setCurrentPage(1); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase size={14} /><span>All Posts</span></div>
                    <span className={styles.badge}>{candidates.length}</span>
                  </div>
                </div>
                                {['3D DESIGNER', '2D DESIGNER', 'ARCHITECT', 'SUPERVISOR', 'SALES EXECUTIVE', 'CRM', 'ACCOUNTANT', 'OFFICE EXECUTIVE', 'PC', 'CIVIL ENGINEER', 'ELECTRICAL ENGINEER', 'INTERIOR DESIGNER', 'GRAPHIC DESIGNER', 'HR EXECUTIVE', 'MARKETING EXECUTIVE', 'OTHERS'].map((post, idx) => {
                  const count = candidates.filter(l => l.post_applied === post).length;
                  return (
                  <div 
                    key={idx}
                    className={`${styles.filterItem} ${selectedPostApplied === post ? styles.active : ''}`}
                    onClick={() => { setSelectedPostApplied(post); setCurrentPage(1); }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{getPostIcon(post)}<span>{post}</span></div>
                      <span className={styles.badge}>{count}</span>
                    </div>
                  </div>
                  );
                })}
              </>
            ) : (
              <>
                <div 
                  className={`${styles.filterItem} ${selectedStep === null ? styles.active : ''}`}
                  onClick={() => { setSelectedStep(null); setCurrentPage(1); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckSquare size={14} /><span>All Steps</span></div>
                    <span className={styles.badge}>{candidates.length}</span>
                  </div>
                </div>
                {[1, 2, 3, 4, 5, 6].map((step) => {
                  const count = candidates.filter(l => getNextStepInfo(l).step === step).length;
                  return (
                    <div 
                      key={step}
                      className={`${styles.filterItem} ${selectedStep === step ? styles.active : ''}`}
                      onClick={() => { setSelectedStep(step); setCurrentPage(1); }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{getStepIcon(step)}<span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }} title={getStepName(step)}>{getStepName(step)}</span></div>
                        {count > 0 && <span className={styles.badge}>{count}</span>}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Quick Filters */}
        <div className={styles.quickFiltersWrapper}>
          <div className={styles.quickFiltersContainer} style={{ display: 'flex', gap: '20px', padding: '10px 0', border: 'none', background: 'transparent', boxShadow: 'none' }}>
            
            <div className={styles.toggleSwitchContainer} style={{ padding: '4px', minWidth: '450px', flex: '0 0 auto' }}>
              <div 
                className={styles.toggleSwitchSliderDynamic} 
                style={{ 
                  width: `calc((100% - 8px) / ${timeList.length})`,
                  left: `calc(4px + ${timeList.indexOf(activeTimeFilterPill) > -1 ? timeList.indexOf(activeTimeFilterPill) : 0} * ((100% - 8px) / ${timeList.length}))`,
                  background: getTimeFilterColor(activeTimeFilterPill)
                }} 
              />
              {timeList.map((time, idx) => {
                const isActive = activeTimeFilterPill === time;
                const baseColor = getTimeFilterColor(time);
                return (
                  <button 
                    key={idx}
                    onClick={() => handleTimeFilterPillClick(time)}
                    className={`${styles.toggleSwitchBtn} ${isActive ? styles.active : ''}`}
                    style={{ color: isActive ? '#fff' : '#6c757d', whiteSpace: 'nowrap' }}
                  >
                    {time} {timeCounts[time] > 0 && <span className={styles.filterBadgeDynamic} style={{ background: isActive ? 'rgba(255,255,255,0.3)' : `${baseColor}15`, color: isActive ? '#fff' : baseColor }}>{timeCounts[time]}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Card List Area */}
        <div className={styles.cardListArea}>
          {isLoading ? (
            <div className={styles.emptyState}>Loading candidates...</div>
          ) : currentCandidates.length === 0 ? (
            <div className={styles.emptyState}>No candidates found matching your criteria.</div>
          ) : (
            <div className={styles.cardGrid}>
              {currentCandidates.map((candidate) => (
                <div key={candidate.rowIndex} className={styles.candidateCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                      <span className={styles.candidateId}>{candidate.id}</span>
                      <span className={styles.candidateName}>{candidate.employee_name}</span>
                      {candidate.post_applied && (
                        <span className={styles.post_appliedBadge} style={{
                          backgroundColor: 'rgba(59, 175, 218, 0.1)',
                          color: '#3bafda',
                        }}>
                          {candidate.post_applied}
                        </span>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <StepCountdown candidate={candidate} handleOpenStepModal={handleOpenStepModal} />
                      {!candidate.lost_remark ? (
                        <button 
                          className={`${styles.iconBtn} ${styles.delete}`}
                          onClick={() => handleOpenLostModal(candidate)}
                          title="Mark as Lost"
                          style={{ color: '#e74c3c' }}
                        >
                          <XCircle size={16} />
                        </button>
                      ) : (
                        <button 
                          className={`${styles.iconBtn} ${styles.update}`}
                          onClick={() => handleOpenRevertLostModal(candidate)}
                          title="Remove Lost Remark"
                          style={{ color: '#f7b84b' }}
                        >
                          <RefreshCw size={16} />
                        </button>
                      )}
                      <button 
                        className={`${styles.iconBtn} ${styles.edit}`}
                        onClick={() => handleOpenModal(candidate)}
                        title="Edit Candidate"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className={`${styles.iconBtn} ${styles.delete}`}
                        onClick={() => handleDelete(candidate.rowIndex)}
                        title="Delete Candidate"
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
                        <span className={styles.detailValue}>{candidate.contact_no || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#f1556c' }}>
                        <MapPin size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Address</span>
                        <span className={styles.detailValue}>{candidate.address || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#3bafda' }}>
                        <User size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Marital Status</span>
                        <span className={styles.detailValue}>{candidate.marital_status || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#1abc9c' }}>
                        <Building size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Post Applied</span>
                        <span className={styles.detailValue}>{candidate.post_applied || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#9b59b6' }}>
                        <Briefcase size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Qualification</span>
                        <span className={styles.detailValue}>{candidate.qualification || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#34495e' }}>
                        <HardHat size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Company Details</span>
                        <span className={styles.detailValue}>
                          {(() => {
                            try {
                              const parsed = JSON.parse(candidate.company_details);
                              if (Array.isArray(parsed)) {
                                return parsed.filter(p => p.companyName).map((p, i) => `${p.companyName} (${p.experience})`).join(', ') || '-';
                              }
                              return candidate.company_details;
                            } catch(e) {
                              return candidate.company_details || '-';
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#e67e22' }}>
                        <Download size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Attachments</span>
                        <span className={styles.detailValue} style={{ display: 'flex', gap: '8px' }}>
                          {candidate.cv_upload ? <a href={candidate.cv_upload} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db', textDecoration: 'underline' }}>CV</a> : 'No CV'}
                          {' | '}
                          {candidate.photo_upload ? <a href={candidate.photo_upload} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db', textDecoration: 'underline' }}>Photo</a> : 'No Photo'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#8e44ad' }}>
                        <Fingerprint size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Expectation</span>
                        <span className={styles.detailValue}>{candidate.expectation || '-'}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIconWrapper} style={{ color: '#7f8c8d' }}>
                        <Calendar size={16} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Date Created</span>
                        <span className={styles.detailValue}>
                          {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </div>
                    {candidate.meeting_mode_4 && (
                      <div className={styles.detailItem}>
                        <div className={styles.detailIconWrapper} style={{ color: '#2980b9' }}>
                          <Users size={16} />
                        </div>
                        <div className={styles.detailContent}>
                          <span className={styles.detailLabel}>Meeting Mode</span>
                          <span className={styles.detailValue}>{candidate.meeting_mode_4}</span>
                        </div>
                      </div>
                    )}
                    {candidate.lost_remark && (
                      <div className={styles.detailItem} style={{ gridColumn: '1 / -1', background: '#ffebee', padding: '10px', borderRadius: '8px', border: '1px solid #ffcdd2', marginTop: '10px', width: '100%', boxSizing: 'border-box' }}>
                        <div className={styles.detailIconWrapper} style={{ color: '#e74c3c' }}>
                          <XCircle size={16} />
                        </div>
                        <div className={styles.detailContent} style={{ width: '100%' }}>
                          <span className={styles.detailLabel} style={{ color: '#e74c3c', fontWeight: 600 }}>Lost Remark</span>
                          <span className={styles.detailValue} style={{ color: '#c0392b', whiteSpace: 'normal', display: 'block' }}>{candidate.lost_remark}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCandidate ? 'Edit Candidate' : 'Create New Candidate'}>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Employee Name *</label>
                    <div className={styles.inputWithIcon}>
                      <User size={16} className={styles.inputIcon} />
                      <input type="text" name="employee_name" value={formData.employee_name || ''} onChange={handleInputChange} required placeholder="Enter name" />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Contact No. *</label>
                    <div className={styles.inputWithIcon}>
                      <Phone size={16} className={styles.inputIcon} />
                      <input type="text" name="contact_no" value={formData.contact_no || ''} onChange={handleInputChange} required placeholder="Enter contact number" />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Date of Birth</label>
                    <div className={styles.inputWithIcon}>
                      <Calendar size={16} className={styles.inputIcon} />
                      <input type="date" name="date_of_birth" value={formData.date_of_birth || ''} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Marital Status</label>
                    <div className={styles.inputWithIcon}>
                      <Users size={16} className={styles.inputIcon} />
                      <select name="marital_status" value={formData.marital_status || ''} onChange={handleInputChange}>
                        <option value="">Select...</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`} style={{ gridColumn: "1 / -1" }}>
                    <label className={styles.outlineLabel}>Address</label>
                    <div className={styles.inputWithIcon}>
                      <MapPin size={16} className={styles.inputIcon} />
                      <input type="text" name="address" value={formData.address || ''} onChange={handleInputChange} placeholder="Enter full address" />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Post Applied</label>
                    <div className={styles.inputWithIcon}>
                      <Briefcase size={16} className={styles.inputIcon} />
                      <select name="post_applied" value={formData.post_applied || ''} onChange={handleInputChange}>
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
                    <label className={styles.outlineLabel}>Qualification</label>
                    <div className={styles.inputWithIcon}>
                      <User size={16} className={styles.inputIcon} />
                      <input type="text" name="qualification" value={formData.qualification || ''} onChange={handleInputChange} placeholder="Enter qualification" />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Expectation</label>
                    <div className={styles.inputWithIcon}>
                      <User size={16} className={styles.inputIcon} />
                      <input type="text" name="expectation" value={formData.expectation || ''} onChange={handleInputChange} placeholder="Salary expectation" />
                    </div>
                  </div>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`} style={{ gridColumn: "1 / -1" }}>
                    <label className={styles.outlineLabel}>Company Details (Experience)</label>
                    {companyDetailsList.map((company, index) => (
                      <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <div className={styles.inputWithIcon} style={{ flex: 1 }}>
                          <Building size={16} className={styles.inputIcon} />
                          <input type="text" value={company.companyName} onChange={e => {
                            const newDetails = [...companyDetailsList];
                            newDetails[index].companyName = e.target.value;
                            setCompanyDetailsList(newDetails);
                          }} placeholder="Company Name" />
                        </div>
                        <div className={styles.inputWithIcon} style={{ flex: 1 }}>
                          <Calendar size={16} className={styles.inputIcon} />
                          <input type="text" value={company.experience} onChange={e => {
                            const newDetails = [...companyDetailsList];
                            newDetails[index].experience = e.target.value;
                            setCompanyDetailsList(newDetails);
                          }} placeholder="Experience (e.g. 2 Years)" />
                        </div>
                        <button type="button" onClick={() => {
                          if (companyDetailsList.length > 1) {
                            setCompanyDetailsList(companyDetailsList.filter((_, i) => i !== index));
                          }
                        }} style={{ padding: '0 10px', background: '#ffebee', color: '#e74c3c', border: '1px solid #ffcdd2', borderRadius: '8px', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setCompanyDetailsList([...companyDetailsList, { companyName: '', experience: '' }])} style={{ alignSelf: 'flex-start', padding: '6px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={14} /> Add Company
                    </button>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>CV Upload</label>
                    <input type="file" name="cv_upload" style={{ padding: '10px' }} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Photo Upload</label>
                    <input type="file" name="photo_upload" accept="image/*" style={{ padding: '10px' }} />
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Saving...' : editingCandidate ? 'Update Candidate' : 'Save Candidate'}
                </button>
              </div>
            </form>
      </Modal>

      <Modal isOpen={isSalesmanModalOpen} onClose={() => setIsSalesmanModalOpen(false)} title="Add New Salesman">
        <div className={styles.modalBody}>
          <div className={styles.formGroup} style={{ marginTop: 0 }}>
            <label className={styles.outlineLabel}>Salesman Name</label>
            <div className={styles.inputWithIcon}>
              <User size={16} className={styles.inputIcon} />
              <input 
                type="text" 
                value={newSalesmanName} 
                onChange={(e) => setNewSalesmanName(e.target.value)} 
                placeholder="Enter salesman name"
                autoFocus
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsSalesmanModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
            <button type="button" onClick={handleAddSalesman} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
              Add Salesman
            </button>
          </div>
        </div>
      </Modal>

      {/* Right Advanced Filter Sidebar */}
      {isRightSidebarOpen && (
        <div className={styles.rightSidebarOverlay} onClick={() => setIsRightSidebarOpen(false)}>
          <div className={styles.rightSidebar} onClick={e => e.stopPropagation()}>
            <div className={styles.rightSidebarHeader}>
              <h3>Advanced Filters</h3>
              <button className={styles.closeSidebarBtn} onClick={() => setIsRightSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.rightSidebarContent}>
              <FilterSection title="Candidate Type" options={['Hotel', 'Club House', 'Residence', 'Office', 'Showroom']} selected={selectedCandidateTypes} onChange={handleCandidateTypeToggle} />
              <FilterSection title="City Type" options={uniquePostApplied} selected={filterPostApplied} onChange={(val) => { setFilterPostApplied(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
              <FilterSection title="Type of Client" options={uniqueQualification} selected={filterQualification} onChange={(val) => { setFilterQualification(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
              <FilterSection title="Salesman" options={uniqueMaritalStatus} selected={filterMaritalStatus} onChange={(val) => { setFilterMaritalStatus(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
              <FilterSection title="Reference By" options={uniqueAddress} selected={filterAddress} onChange={(val) => { setFilterAddress(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
              <FilterSection title="Generated By" options={uniqueExpectation} selected={filterExpectation} onChange={(val) => { setFilterExpectation(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
              <FilterSection title="Name Of Builder" options={uniqueCompanyDetails} selected={filterCompanyDetails} onChange={(val) => { setFilterCompanyDetails(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
            </div>
            <div className={styles.rightSidebarFooter}>
              <button className={styles.clearFiltersBtn} onClick={() => { 
                setSelectedCandidateTypes([]); setFilterPostApplied([]); setFilterQualification([]); 
                setFilterMaritalStatus([]); setFilterAddress([]); setFilterExpectation([]); setFilterCompanyDetails([]); 
              }}>Clear All</button>
              <button className={styles.applyFiltersBtn} onClick={() => setIsRightSidebarOpen(false)}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Step Completion Bottom Sheet Modal */}
      {isStepModalOpen && currentStepCandidate && (
        <Modal 
          isOpen={isStepModalOpen} 
          onClose={() => setIsStepModalOpen(false)} 
          title={`Complete ${getNextStepInfo(currentStepCandidate).title}`}
        >
          <form onSubmit={handleStepSubmit} className={styles.bottomSheetForm}>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.outlineLabel}>Outcome</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                <div className={styles.toggleSwitchContainer} style={{ width: '320px' }}>
                  <div 
                    className={styles.toggleSwitchSliderDynamic} 
                    style={{ 
                      width: 'calc(50% - 4px)',
                      left: stepFormData.status === 'Next Follow Up' ? 'calc(50% + 4px)' : '4px',
                      background: stepFormData.status === 'Next Follow Up' ? '#f7b84b' : '#1abc9c'
                    }} 
                  />
                  <button 
                    type="button"
                    onClick={() => setStepFormData({...stepFormData, status: getNextStepInfo(currentStepCandidate).step === 2 ? 'Qualified' : 'Done'})}
                    className={`${styles.toggleSwitchBtn} ${stepFormData.status !== 'Next Follow Up' ? styles.active : ''}`}
                    style={{ color: stepFormData.status !== 'Next Follow Up' ? '#fff' : '#6c757d' }}
                  >{getNextStepInfo(currentStepCandidate).step === 2 ? 'Qualified' : 'Done'}</button>
                  <button 
                    type="button"
                    onClick={() => setStepFormData({...stepFormData, status: 'Next Follow Up'})}
                    className={`${styles.toggleSwitchBtn} ${stepFormData.status === 'Next Follow Up' ? styles.active : ''}`}
                    style={{ color: stepFormData.status === 'Next Follow Up' ? '#fff' : '#6c757d' }}
                  >Next Follow Up</button>
                </div>
              </div>
            </div>
            
            <>
              {stepFormData.status === 'Next Follow Up' && (
                <div className={styles.formGroup}>
                  <label className={styles.outlineLabel}>Next Follow Up Date</label>
                  <div className={styles.inputWithIcon}>
                    <Calendar size={16} className={styles.inputIcon} />
                    <input type="date" name="next_follow_up_date" value={stepFormData.next_follow_up_date || ''} onChange={e => setStepFormData({...stepFormData, next_follow_up_date: e.target.value})} required={stepFormData.status === 'Next Follow Up'} />
                  </div>
                </div>
              )}
              

              
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.outlineLabel}>Remarks</label>
                <div className={styles.inputWithIcon}>
                  <Edit2 size={16} className={styles.inputIcon} />
                  <input type="text" name="remarks" value={stepFormData.remarks || ''} onChange={e => setStepFormData({...stepFormData, remarks: e.target.value})} placeholder="Any additional remarks..." />
                </div>
              </div>
            </>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', gridColumn: '1 / -1' }}>
              <button type="button" onClick={() => setIsStepModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#1abc9c', color: 'white', cursor: 'pointer', fontWeight: 600 }}>{isSubmitting ? 'Saving...' : 'Complete Step'}</button>
            </div>
          </form>
        </Modal>
      )}

      {isLostModalOpen && currentLostCandidate && (
        <Modal isOpen={isLostModalOpen} onClose={() => setIsLostModalOpen(false)} title="Mark Candidate as Lost">
          <form onSubmit={handleLostSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.outlineLabel}>Lost Remark *</label>
                <div className={styles.inputWithIcon}>
                  <Edit2 size={16} className={styles.inputIcon} />
                  <input 
                    type="text" 
                    value={lostRemark} 
                    onChange={e => setLostRemark(e.target.value)} 
                    placeholder="Enter reason for losing this candidate" 
                    required 
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', gridColumn: '1 / -1', padding: '0 24px 24px 24px' }}>
              <button type="button" onClick={() => setIsLostModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#e74c3c', color: 'white', cursor: 'pointer', fontWeight: 600 }}>{isSubmitting ? 'Saving...' : 'Mark as Lost'}</button>
            </div>
          </form>
        </Modal>
      )}
      {isRevertLostModalOpen && currentLostCandidate && (
        <Modal isOpen={isRevertLostModalOpen} onClose={() => setIsRevertLostModalOpen(false)} title="Unmark Candidate as Lost">
          <form onSubmit={handleRemoveLost}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  Are you sure you want to unmark this candidate as lost? This will remove the lost remark and reopen the candidate workflow.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', gridColumn: '1 / -1', padding: '0 24px 24px 24px' }}>
              <button type="button" onClick={() => setIsRevertLostModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#3bafda', color: 'white', cursor: 'pointer', fontWeight: 600 }}>{isSubmitting ? 'Processing...' : 'Unmark Lost'}</button>
            </div>
          </form>
        </Modal>
      )}
      </div>
    </div>
  );
}
