'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, X, BarChart3, Search, Filter, ChevronLeft, ChevronRight, User, Phone, MapPin, Building, Briefcase, HardHat, Users, Calendar, Fingerprint, Tag, Download, Home, Store, CheckSquare, XCircle } from 'lucide-react';
import styles from './sales.module.css';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  getNextStepInfo,
  getPendingStepStatus,
  getStepName,
  isSalesLeadActive,
  isSalesLeadLost,
  SALES_MAX_STEP,
  SALES_PIPELINE_OPTS,
} from '@/lib/sales-pipeline';

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
  planned_6?: string;
  actual_6?: string;
  status_6?: string;
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

const StepCountdown = ({ lead, handleOpenStepModal }: { lead: Lead, handleOpenStepModal: (lead: Lead) => void }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const status = getPendingStepStatus(lead, { ...SALES_PIPELINE_OPTS, now });
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
      {isSalesLeadActive(lead) && (
        <button 
          className={`${styles.iconBtn} ${styles.complete}`}
          onClick={() => handleOpenStepModal(lead)}
          title={`Complete ${status.stepName}`}
        >
          <CheckSquare size={16} color="#1abc9c" />
        </button>
      )}
    </div>
  );
};

export const getLeadTypeColor = (type: string) => {
  switch(type) {
    case 'All Types': return '#3bafda';
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

export default function SalesPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [usersList, setUsersList] = useState<{ name: string; status?: string }[]>([]);

  // Filtering & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarMode, setSidebarMode] = useState<'salesman' | 'step'>('salesman');
  const [selectedSalesman, setSelectedSalesman] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [selectedLeadTypes, setSelectedLeadTypes] = useState<string[]>([]);
  const [filterCityTypes, setFilterCityTypes] = useState<string[]>([]);
  const [filterClientTypes, setFilterClientTypes] = useState<string[]>([]);
  const [filterSalesman, setFilterSalesman] = useState<string[]>([]);
  const [filterReferenceBy, setFilterReferenceBy] = useState<string[]>([]);
  const [filterGeneratedBy, setFilterGeneratedBy] = useState<string[]>([]);
  const [filterNameOfBuilder, setFilterNameOfBuilder] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<'delayed' | 'today' | 'tomorrow' | 'lost' | null>(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [currentStepLead, setCurrentStepLead] = useState<Lead | null>(null);
  const [stepFormData, setStepFormData] = useState<any>({});

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactNo: '',
    salesman: '',
    cityType: '',
    referenceBy: '',
    generatedBy: user?.name || '',
    leadType: '',
    typeOfClient: '',
    nameOfBuilder: '',
  });

  const getSalesStepInfo = (lead: Lead) => getNextStepInfo(lead, SALES_MAX_STEP);

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, []);

  const userNames = useMemo(
    () =>
      usersList
        .filter((u) => u.name?.trim() && (u.status || 'Active') === 'Active')
        .map((u) => u.name.trim())
        .sort((a, b) => a.localeCompare(b)),
    [usersList]
  );

  const sidebarSalesmen = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      const name = lead.salesman?.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [leads]);

  // Derived unique options for advanced filters
  const uniqueCityTypes = useMemo(() => Array.from(new Set(leads.map(l => l.cityType).filter(Boolean))), [leads]);
  const uniqueClientTypes = useMemo(() => Array.from(new Set(leads.map(l => l.typeOfClient).filter(Boolean))), [leads]);
  const uniqueSalesman = useMemo(() => Array.from(new Set(leads.map(l => l.salesman).filter(Boolean))), [leads]);
  const uniqueReferenceBy = useMemo(() => Array.from(new Set(leads.map(l => l.referenceBy).filter(Boolean))), [leads]);
  const uniqueGeneratedBy = useMemo(() => Array.from(new Set(leads.map(l => l.generatedBy).filter(Boolean))), [leads]);
  const uniqueNameOfBuilder = useMemo(() => Array.from(new Set(leads.map(l => l.nameOfBuilder).filter(Boolean))), [leads]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsersList(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
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
        generatedBy: user?.name || '',
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

  const handleOpenStepModal = (lead: Lead) => {
    setCurrentStepLead(lead);
    const info = getSalesStepInfo(lead);
    setStepFormData({
      status:
        info.step === 6
          ? 'Won'
          : info.step === 1
            ? ''
            : info.step === 2
              ? 'Qualified'
              : 'Done',
    });
    setIsStepModalOpen(true);
  };

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStepLead) return;
    setIsSubmitting(true);
    
    const info = getSalesStepInfo(currentStepLead);
    const step = info.step;
    if (step > SALES_MAX_STEP) return;
    
    const submitData = new FormData();
    Object.entries(currentStepLead).forEach(([k, v]) => {
      submitData.append(k, String(v || ''));
    });
    
    const now = new Date();
    const isStep6 = step === SALES_MAX_STEP;
    const isStepNextFollowUp = step > 1 && step < SALES_MAX_STEP && stepFormData.status === 'Next Follow Up';
    
    if (!isStepNextFollowUp || isStep6) {
      submitData.set(`actual_${step}`, now.toISOString());
    }
    
    submitData.set(`status_${step}`, stepFormData.status || '');

    if (isStep6) {
      if (stepFormData.status === 'Lost') {
        submitData.set('lost_remark', stepFormData.remarks || '');
      } else {
        submitData.set('lost_remark', '');
      }
    }
    
    if (step > 1 && !isStep6) {
      submitData.set(`next_follow_up_date_${step}`, isStepNextFollowUp ? (stepFormData.next_follow_up_date || '') : '');
      
      if (stepFormData.remarks) {
        if (step === 2) submitData.set(`remarks_2`, stepFormData.remarks);
        else submitData.set(`remark_${step}`, stepFormData.remarks);
      }
      if (step === 4 && stepFormData.meeting_mode) submitData.set(`meeting_mode_4`, stepFormData.meeting_mode);
    }
    
    if (step < SALES_MAX_STEP && !isStepNextFollowUp) {
      const nextPlanned = new Date(now);
      const tat = step === 2 ? 3 : 1; 
      nextPlanned.setDate(nextPlanned.getDate() + tat);
      if (nextPlanned.getDay() === 0) { // Sunday
        nextPlanned.setDate(nextPlanned.getDate() + 1);
      }
      submitData.set(`planned_${step + 1}`, nextPlanned.toISOString());
    }
    
    try {
      const response = await fetch(`/api/sales?rowIndex=${currentStepLead.rowIndex}`, {
        method: 'PUT',
        body: submitData
      });
      if (response.ok) {
        await fetchLeads();
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

    const handleCityTypeToggle = (type: string) => { setFilterCityTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]); setCurrentPage(1); };
    const handleClientTypeToggle = (type: string) => { setFilterClientTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]); setCurrentPage(1); };

    // Apply Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.name.toLowerCase().includes(q) || 
        l.contactNo.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    }

    // Apply Sidebar Filters
    if (sidebarMode === 'salesman' && selectedSalesman) {
      result = result.filter(l => l.salesman === selectedSalesman);
    }
    if (sidebarMode === 'step' && selectedStep !== null) {
      result = result.filter(l => getSalesStepInfo(l).step === selectedStep);
    }

    // Apply Time Filters
    if (timeFilter) {
      if (timeFilter === 'lost') {
        result = result.filter(l => isSalesLeadLost(l));
      } else {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const dayAfterStart = new Date(tomorrowStart);
        dayAfterStart.setDate(dayAfterStart.getDate() + 1);

        result = result.filter(l => {
          if (isSalesLeadLost(l)) return false;
          const status = getPendingStepStatus(l, SALES_PIPELINE_OPTS);
          if (!status) return false;
          
          if (timeFilter === 'delayed') return status.isDelayed;
          if (timeFilter === 'today') return status.plannedDate >= todayStart && status.plannedDate < tomorrowStart;
          if (timeFilter === 'tomorrow') return status.plannedDate >= tomorrowStart && status.plannedDate < dayAfterStart;
          return true;
        });
      }
    } else {
      // All Time view hides lost leads
      result = result.filter(l => !isSalesLeadLost(l));
    }

    // Apply Lead Type Filter
    if (selectedLeadTypes.length > 0) {
      result = result.filter(l => selectedLeadTypes.includes(l.leadType));
    }

    // Apply Advanced Filters
    if (filterCityTypes.length > 0) {
      result = result.filter(l => filterCityTypes.includes(l.cityType));
    }
    if (filterClientTypes.length > 0) {
      result = result.filter(l => filterClientTypes.includes(l.typeOfClient));
    }
    if (filterSalesman.length > 0) {
      result = result.filter(l => filterSalesman.includes(l.salesman));
    }
    if (filterReferenceBy.length > 0) {
      result = result.filter(l => filterReferenceBy.includes(l.referenceBy));
    }
    if (filterGeneratedBy.length > 0) {
      result = result.filter(l => filterGeneratedBy.includes(l.generatedBy));
    }
    if (filterNameOfBuilder.length > 0) {
      result = result.filter(l => filterNameOfBuilder.includes(l.nameOfBuilder));
    }

    return result;
  }, [leads, searchQuery, sidebarMode, selectedSalesman, selectedStep, timeFilter, selectedLeadTypes, filterCityTypes, filterClientTypes, filterSalesman, filterReferenceBy, filterGeneratedBy, filterNameOfBuilder]);

  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage) || 1;
  const currentLeads = filteredAndSortedLeads.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const leadTypesList = ['All Types', 'Hotel', 'Club House', 'Residence', 'Office', 'Showroom'];
  const timeList = ['All Time', 'Delayed', 'Today', 'Tomorrow', 'Lost'];

  const activeLeadTypePill = selectedLeadTypes.length === 1 ? selectedLeadTypes[0] : 'All Types';
  const activeTimeFilterPill = timeFilter === 'delayed' ? 'Delayed' : timeFilter === 'today' ? 'Today' : timeFilter === 'tomorrow' ? 'Tomorrow' : timeFilter === 'lost' ? 'Lost' : 'All Time';

  const handleLeadTypePillClick = (type: string) => {
    if (type === 'All Types') setSelectedLeadTypes([]);
    else setSelectedLeadTypes([type]);
    setCurrentPage(1);
  };

  const handleTimeFilterPillClick = (type: string) => {
    if (type === 'All Time') setTimeFilter(null);
    else setTimeFilter(type.toLowerCase() as any);
    setCurrentPage(1);
  };

  const leadTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leadTypesList.forEach(lt => counts[lt] = 0);
    // Only count non-lost for lead types
    const activeLeads = leads.filter(l => !isSalesLeadLost(l));
    counts['All Types'] = activeLeads.length;
    activeLeads.forEach(l => {
      if (l.leadType && counts[l.leadType] !== undefined) counts[l.leadType]++;
    });
    return counts;
  }, [leads]);

  const timeCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Time': 0, 'Delayed': 0, 'Today': 0, 'Tomorrow': 0, 'Lost': 0 };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterStart = new Date(tomorrowStart);
    dayAfterStart.setDate(dayAfterStart.getDate() + 1);

    leads.forEach(l => {
      if (isSalesLeadLost(l)) {
        counts['Lost']++;
        return;
      }
      counts['All Time']++;
      const status = getPendingStepStatus(l, SALES_PIPELINE_OPTS);
      if (!status) return;
      if (status.isDelayed) counts['Delayed']++;
      else if (status.plannedDate >= todayStart && status.plannedDate < tomorrowStart) counts['Today']++;
      else if (status.plannedDate >= tomorrowStart && status.plannedDate < dayAfterStart) counts['Tomorrow']++;
    });
    return counts;
  }, [leads]);

  const handleExportCSV = () => {
    if (filteredAndSortedLeads.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = ['ID', 'Name', 'Address', 'Contact No', 'Salesman', 'City Type', 'Reference By', 'Generated By', 'Lead Type', 'Type of Client', 'Builder Name', 'Date Created'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedLeads.map(l => [
        `"${l.id}"`, 
        `"${l.name}"`, 
        `"${l.address || ''}"`, 
        `"${l.contactNo || ''}"`, 
        `"${l.salesman || ''}"`, 
        `"${l.cityType || ''}"`, 
        `"${l.referenceBy || ''}"`, 
        `"${l.generatedBy || ''}"`, 
        `"${l.leadType || ''}"`, 
        `"${l.typeOfClient || ''}"`, 
        `"${l.nameOfBuilder || ''}"`, 
        `"${l.timestamp ? new Date(l.timestamp).toLocaleDateString() : ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'leads_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

            <div>
              <button 
                className={styles.dropdownBtn}
                onClick={() => setIsRightSidebarOpen(true)}
              >
                <Filter size={16} />
                Filters {(selectedLeadTypes.length + filterCityTypes.length + filterClientTypes.length) > 0 ? `(${selectedLeadTypes.length + filterCityTypes.length + filterClientTypes.length})` : ''}
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
            <button className={styles.createLeadBtn} onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Create Lead
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
                onClick={() => setSidebarMode('salesman')}
                className={`${styles.toggleSwitchBtn} ${sidebarMode === 'salesman' ? styles.active : ''}`}
                style={{ color: sidebarMode === 'salesman' ? '#fff' : '#6c757d' }}
              >Salesmen</button>
              <button 
                onClick={() => setSidebarMode('step')}
                className={`${styles.toggleSwitchBtn} ${sidebarMode === 'step' ? styles.active : ''}`}
                style={{ color: sidebarMode === 'step' ? '#fff' : '#6c757d' }}
              >Steps</button>
            </div>
          </div>
          <div className={styles.sidebarFilterList}>
            {sidebarMode === 'salesman' ? (
              <>
                <div 
                  className={`${styles.filterItem} ${selectedSalesman === null ? styles.active : ''}`}
                  onClick={() => { setSelectedSalesman(null); setCurrentPage(1); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>All Salesmen</span>
                    <span className={styles.badge}>{leads.length}</span>
                  </div>
                </div>
                {sidebarSalesmen.map(({ name, count }) => (
                  <div 
                    key={name}
                    className={`${styles.filterItem} ${selectedSalesman === name ? styles.active : ''}`}
                    onClick={() => { setSelectedSalesman(name); setCurrentPage(1); }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span>{name}</span>
                      <span className={styles.badge}>{count}</span>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div 
                  className={`${styles.filterItem} ${selectedStep === null ? styles.active : ''}`}
                  onClick={() => { setSelectedStep(null); setCurrentPage(1); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>All Steps</span>
                    <span className={styles.badge}>{leads.length}</span>
                  </div>
                </div>
                {[1, 2, 3, 4, 5, 6, 7].map((step) => {
                  const count = leads.filter(l => getSalesStepInfo(l).step === step).length;
                  return (
                    <div 
                      key={step}
                      className={`${styles.filterItem} ${selectedStep === step ? styles.active : ''}`}
                      onClick={() => { setSelectedStep(step); setCurrentPage(1); }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }} title={getStepName(step)}>{getStepName(step)}</span>
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
            
            <div className={styles.toggleSwitchContainer} style={{ flex: 1.5, padding: '4px' }}>
              <div 
                className={styles.toggleSwitchSliderDynamic} 
                style={{ 
                  width: `calc((100% - 8px) / 6)`,
                  left: `calc(4px + ${leadTypesList.indexOf(activeLeadTypePill) > -1 ? leadTypesList.indexOf(activeLeadTypePill) : 0} * ((100% - 8px) / 6))`,
                  background: getLeadTypeColor(activeLeadTypePill)
                }} 
              />
              {leadTypesList.map((type, idx) => {
                const isActive = activeLeadTypePill === type;
                const baseColor = getLeadTypeColor(type);
                return (
                  <button 
                    key={idx}
                    onClick={() => handleLeadTypePillClick(type)}
                    className={`${styles.toggleSwitchBtn} ${isActive ? styles.active : ''}`}
                    style={{ color: isActive ? '#fff' : '#6c757d' }}
                  >
                    {type} {leadTypeCounts[type] > 0 && <span className={styles.filterBadgeDynamic} style={{ background: isActive ? 'rgba(255,255,255,0.3)' : `${baseColor}15`, color: isActive ? '#fff' : baseColor }}>{leadTypeCounts[type]}</span>}
                  </button>
                );
              })}
            </div>

            <div className={styles.toggleSwitchContainer} style={{ flex: 1, padding: '4px' }}>
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
                    style={{ color: isActive ? '#fff' : '#6c757d' }}
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
                          backgroundColor: 'rgba(59, 175, 218, 0.1)',
                          color: '#3bafda',
                        }}>
                          {lead.leadType}
                        </span>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <StepCountdown lead={lead} handleOpenStepModal={handleOpenStepModal} />
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
                    {lead.meeting_mode_4 && (
                      <div className={styles.detailItem}>
                        <div className={styles.detailIconWrapper} style={{ color: '#2980b9' }}>
                          <Users size={16} />
                        </div>
                        <div className={styles.detailContent}>
                          <span className={styles.detailLabel}>Meeting Mode</span>
                          <span className={styles.detailValue}>{lead.meeting_mode_4}</span>
                        </div>
                      </div>
                    )}
                    {lead.status_6 && (
                      <div className={styles.detailItem}>
                        <div className={styles.detailIconWrapper} style={{ color: lead.status_6 === 'Won' ? '#1abc9c' : '#e74c3c' }}>
                          {lead.status_6 === 'Won' ? <CheckSquare size={16} /> : <XCircle size={16} />}
                        </div>
                        <div className={styles.detailContent}>
                          <span className={styles.detailLabel}>Close Status</span>
                          <span className={styles.detailValue} style={{ color: lead.status_6 === 'Won' ? '#1abc9c' : '#e74c3c', fontWeight: 700 }}>
                            {lead.status_6}
                          </span>
                        </div>
                      </div>
                    )}
                    {lead.lost_remark && (
                      <div className={styles.detailItem} style={{ gridColumn: '1 / -1', background: '#ffebee', padding: '10px', borderRadius: '8px', border: '1px solid #ffcdd2', marginTop: '10px', width: '100%', boxSizing: 'border-box' }}>
                        <div className={styles.detailIconWrapper} style={{ color: '#e74c3c' }}>
                          <XCircle size={16} />
                        </div>
                        <div className={styles.detailContent} style={{ width: '100%' }}>
                          <span className={styles.detailLabel} style={{ color: '#e74c3c', fontWeight: 600 }}>Lost Remark</span>
                          <span className={styles.detailValue} style={{ color: '#c0392b', whiteSpace: 'normal', display: 'block' }}>{lead.lost_remark}</span>
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
                      <select
                        name="salesman"
                        value={formData.salesman}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Salesman</option>
                        {userNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                        {formData.salesman &&
                          !userNames.includes(formData.salesman) && (
                            <option value={formData.salesman}>{formData.salesman}</option>
                          )}
                      </select>
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
                        <option value="Hotel">Hotel</option>
                        <option value="Club House">Club House</option>
                        <option value="Residence">Residence</option>
                        <option value="Office">Office</option>
                        <option value="Showroom">Showroom</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Type of Client</label>
                    <div className={styles.inputWithIcon}>
                      <Briefcase size={16} className={styles.inputIcon} />
                      <select 
                        name="typeOfClient" 
                        value={formData.typeOfClient} 
                        onChange={handleInputChange}
                      >
                        <option value="">Select Client Type</option>
                        <option value="NBD Incoming">NBD Incoming</option>
                        <option value="NBD Outgoing">NBD Outgoing</option>
                        <option value="CRR">CRR</option>
                      </select>
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
              <FilterSection title="Lead Type" options={['Hotel', 'Club House', 'Residence', 'Office', 'Showroom']} selected={selectedLeadTypes} onChange={handleLeadTypeToggle} />
              <FilterSection title="City Type" options={uniqueCityTypes} selected={filterCityTypes} onChange={(val) => { setFilterCityTypes(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
              <FilterSection title="Type of Client" options={uniqueClientTypes} selected={filterClientTypes} onChange={(val) => { setFilterClientTypes(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
              <FilterSection title="Salesman" options={uniqueSalesman} selected={filterSalesman} onChange={(val) => { setFilterSalesman(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
              <FilterSection title="Reference By" options={uniqueReferenceBy} selected={filterReferenceBy} onChange={(val) => { setFilterReferenceBy(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
              <FilterSection title="Generated By" options={uniqueGeneratedBy} selected={filterGeneratedBy} onChange={(val) => { setFilterGeneratedBy(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
              <FilterSection title="Name Of Builder" options={uniqueNameOfBuilder} selected={filterNameOfBuilder} onChange={(val) => { setFilterNameOfBuilder(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
            </div>
            <div className={styles.rightSidebarFooter}>
              <button className={styles.clearFiltersBtn} onClick={() => { 
                setSelectedLeadTypes([]); setFilterCityTypes([]); setFilterClientTypes([]); 
                setFilterSalesman([]); setFilterReferenceBy([]); setFilterGeneratedBy([]); setFilterNameOfBuilder([]); 
              }}>Clear All</button>
              <button className={styles.applyFiltersBtn} onClick={() => setIsRightSidebarOpen(false)}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Step Completion Bottom Sheet Modal */}
      {isStepModalOpen && currentStepLead && (
        <Modal 
          isOpen={isStepModalOpen} 
          onClose={() => setIsStepModalOpen(false)} 
          title={`Complete ${getSalesStepInfo(currentStepLead).title}`}
        >
          <form onSubmit={handleStepSubmit} className={styles.bottomSheetForm}>
            {getSalesStepInfo(currentStepLead).step === 1 ? (
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.outlineLabel}>Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                  <div 
                    className={`${styles.stepToggle} ${stepFormData.status === 'Done' ? styles.stepToggleOn : ''}`}
                    onClick={() => setStepFormData({...stepFormData, status: stepFormData.status === 'Done' ? '' : 'Done'})}
                  >
                    <div className={styles.stepToggleKnob} />
                  </div>
                  <span style={{ fontWeight: 600, color: stepFormData.status === 'Done' ? '#1abc9c' : 'var(--text-secondary)' }}>
                    {stepFormData.status === 'Done' ? 'Done' : 'Pending'}
                  </span>
                </div>
              </div>
            ) : getSalesStepInfo(currentStepLead).step === SALES_MAX_STEP ? (
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.outlineLabel}>Close Outcome</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                  <div className={styles.toggleSwitchContainer} style={{ width: '320px' }}>
                    <div 
                      className={styles.toggleSwitchSliderDynamic} 
                      style={{ 
                        width: 'calc(50% - 4px)',
                        left: stepFormData.status === 'Lost' ? 'calc(50% + 4px)' : '4px',
                        background: stepFormData.status === 'Lost' ? '#e74c3c' : '#1abc9c'
                      }} 
                    />
                    <button 
                      type="button"
                      onClick={() => setStepFormData({ ...stepFormData, status: 'Won' })}
                      className={`${styles.toggleSwitchBtn} ${stepFormData.status !== 'Lost' ? styles.active : ''}`}
                      style={{ color: stepFormData.status !== 'Lost' ? '#fff' : '#6c757d' }}
                    >Won</button>
                    <button 
                      type="button"
                      onClick={() => setStepFormData({ ...stepFormData, status: 'Lost' })}
                      className={`${styles.toggleSwitchBtn} ${stepFormData.status === 'Lost' ? styles.active : ''}`}
                      style={{ color: stepFormData.status === 'Lost' ? '#fff' : '#6c757d' }}
                    >Lost</button>
                  </div>
                </div>
              </div>
            ) : (
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
                      onClick={() => setStepFormData({...stepFormData, status: getSalesStepInfo(currentStepLead).step === 2 ? 'Qualified' : 'Done'})}
                      className={`${styles.toggleSwitchBtn} ${stepFormData.status !== 'Next Follow Up' ? styles.active : ''}`}
                      style={{ color: stepFormData.status !== 'Next Follow Up' ? '#fff' : '#6c757d' }}
                    >{getSalesStepInfo(currentStepLead).step === 2 ? 'Qualified' : 'Done'}</button>
                    <button 
                      type="button"
                      onClick={() => setStepFormData({...stepFormData, status: 'Next Follow Up'})}
                      className={`${styles.toggleSwitchBtn} ${stepFormData.status === 'Next Follow Up' ? styles.active : ''}`}
                      style={{ color: stepFormData.status === 'Next Follow Up' ? '#fff' : '#6c757d' }}
                    >Next Follow Up</button>
                  </div>
                </div>
              </div>
            )}
            
            {getSalesStepInfo(currentStepLead).step === SALES_MAX_STEP ? (
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.outlineLabel}>
                  {stepFormData.status === 'Lost' ? 'Lost Remark *' : 'Remarks'}
                </label>
                <div className={styles.inputWithIcon}>
                  <Edit2 size={16} className={styles.inputIcon} />
                  <input
                    type="text"
                    name="remarks"
                    value={stepFormData.remarks || ''}
                    onChange={(e) => setStepFormData({ ...stepFormData, remarks: e.target.value })}
                    placeholder={stepFormData.status === 'Lost' ? 'Enter reason for losing this lead' : 'Any closing remarks...'}
                    required={stepFormData.status === 'Lost'}
                  />
                </div>
              </div>
            ) : getSalesStepInfo(currentStepLead).step > 1 && (
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
                
                {getSalesStepInfo(currentStepLead).step === 4 && stepFormData.status !== 'Next Follow Up' && (
                  <div className={styles.formGroup}>
                    <label className={styles.outlineLabel}>Meeting Mode</label>
                    <div className={styles.inputWithIcon}>
                      <Users size={16} className={styles.inputIcon} />
                      <select name="meeting_mode" value={stepFormData.meeting_mode || ''} onChange={e => setStepFormData({...stepFormData, meeting_mode: e.target.value})} required className={styles.dropdownSelect} style={{ width: '100%', padding: '10px 10px 10px 35px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <option value="" disabled hidden> </option>
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                      </select>
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
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', gridColumn: '1 / -1' }}>
              <button type="button" onClick={() => setIsStepModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#1abc9c', color: 'white', cursor: 'pointer', fontWeight: 600 }}>{isSubmitting ? 'Saving...' : 'Complete Step'}</button>
            </div>
          </form>
        </Modal>
      )}

      </div>
    </div>
  );
}
