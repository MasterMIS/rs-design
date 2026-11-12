'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, X, BarChart3, Search, Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, User, Phone, MapPin, Building, Briefcase, HardHat, Users, Calendar, Fingerprint, Tag, Download, Home, Store, CheckSquare, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import styles from './sales.module.css';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  getNextStepInfo,
  getPendingStepStatus,
  getSalesLeadOutcome,
  getStepName,
  isSalesLeadActive,
  isSalesLeadClosed,
  isSalesLeadDisqualified,
  isSalesLeadLost,
  SALES_MAX_STEP,
  SALES_PIPELINE_OPTS,
} from '@/lib/sales-pipeline';

const BUILDER_NAME_OPTIONS = [
  'CLUB HOUSE',
  'COMMUNITY HALL',
  'SWIMMIMG POLL',
  'LOBBY',
  'ROOF TOP',
] as const;

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
  next_follow_up_date_1?: string;
  remarks_1?: string;
  planned_2?: string;
  actual_2?: string;
  status_2?: string;
  meeting_mode_2?: string;
  next_follow_up_date_2?: string;
  remarks_2?: string;
  planned_3?: string;
  actual_3?: string;
  status_3?: string;
  meeting_type_3?: string;
  next_follow_up_date_3?: string;
  remark_3?: string;
  planned_4?: string;
  actual_4?: string;
  status_4?: string;
  next_follow_up_date_4?: string;
  remark_4?: string;
  planned_5?: string;
  actual_5?: string;
  status_5?: string;
  next_follow_up_date_5?: string;
  remark_5?: string;
}

const FilterSection = ({ title, options, selected, onChange }: { title: string, options: string[], selected: string[], onChange: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeight = 220;
      const openUp = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: Math.max(rect.width, 180),
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
        zIndex: 10050,
      });
    };

    updatePosition();

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div className={styles.filterSection} ref={wrapperRef}>
      <h4 className={styles.filterSectionTitle}>{title}</h4>
      <div
        ref={triggerRef}
        className={styles.filterDropdownHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selected.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {selected.length > 0 ? `${selected.length} selected` : 'Select options...'}
        </span>
        <ChevronRight size={16} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
      </div>
      {isOpen && (
        <div className={styles.filterDropdownBody} style={menuStyle}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.filterSearchInput}
            onClick={(e) => e.stopPropagation()}
          />
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

const DISQUALIFIED_LEADS_PILL = 'Disqualified Leads';

type StepChoiceOption = {
  id: string;
  label: string;
  activeClass: string;
};

const StepChoiceButtons = ({
  options,
  value,
  onChange,
}: {
  options: StepChoiceOption[];
  value: string;
  onChange: (id: string) => void;
}) => (
  <div className={styles.stepChoiceButtons}>
    {options.map((opt) => (
      <button
        key={opt.id}
        type="button"
        onClick={() => onChange(opt.id)}
        className={`${styles.stepChoiceBtn} ${
          value === opt.id ? `${styles.stepChoiceBtnActive} ${opt.activeClass}` : ''
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const LeadDueSummary = ({ lead }: { lead: Lead }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const outcome = getSalesLeadOutcome(lead);
  if (outcome === 'disqualified') {
    return (
      <div className={`${styles.leadDueSummary} ${styles.leadDueSummaryTerminal}`}>
        <span className={styles.leadDueStatus} style={{ color: '#e74c3c' }}>
          Disqualified
        </span>
      </div>
    );
  }

  if (outcome === 'lost') {
    return (
      <div className={`${styles.leadDueSummary} ${styles.leadDueSummaryTerminal}`}>
        <span className={styles.leadDueStatus} style={{ color: '#e74c3c' }}>
          Lost
        </span>
        {lead.remark_5?.trim() && (
          <>
            <span className={styles.leadDueSep}>·</span>
            <span className={styles.leadDuePlanned} title={lead.remark_5}>
              {lead.remark_5.length > 40 ? `${lead.remark_5.slice(0, 40)}…` : lead.remark_5}
            </span>
          </>
        )}
      </div>
    );
  }

  if (outcome === 'won') {
    return (
      <div className={`${styles.leadDueSummary} ${styles.leadDueSummaryTerminal}`}>
        <span className={styles.leadDueStatus} style={{ color: '#1abc9c' }}>
          Won
        </span>
      </div>
    );
  }

  if (!isSalesLeadActive(lead)) return null;

  const status = getPendingStepStatus(lead, { ...SALES_PIPELINE_OPTS, now });
  if (!status) return null;

  return (
    <div className={styles.leadDueSummary} title={status.isFollowUp ? 'Follow-up date' : 'Planned step date'}>
      <span className={styles.leadDuePlanned}>{status.formattedPlannedDate}</span>
      <span className={styles.leadDueSep}>·</span>
      <span
        className={styles.leadDueDelay}
        style={{ color: status.isDelayed ? '#f1556c' : '#1abc9c' }}
      >
        {status.timeText}
      </span>
    </div>
  );
};

type LeadDetailSegment = {
  key: string;
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
  /** Fills remaining columns on a 5-column row (e.g. address in cols 3–5). */
  spanCols?: number;
};

const PIPELINE_DATE_KEYS = new Set<string>([
  'planned_1', 'actual_1', 'next_follow_up_date_1',
  'planned_2', 'actual_2', 'next_follow_up_date_2',
  'planned_3', 'actual_3', 'next_follow_up_date_3',
  'planned_4', 'actual_4', 'next_follow_up_date_4',
  'planned_5', 'actual_5', 'next_follow_up_date_5',
]);

function formatPipelineDateTime(value?: string): string {
  if (!value?.trim()) return '';
  const raw = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return raw;
  const day = String(d.getDate()).padStart(2, '0');
  const month = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d);
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${mins}`;
}

type StepHistoryField = { key: keyof Lead; label: string };

const STEP_HISTORY_FIELDS: Record<number, StepHistoryField[]> = {
  1: [
    { key: 'planned_1', label: 'Planned' },
    { key: 'actual_1', label: 'Actual' },
    { key: 'status_1', label: 'Status' },
    { key: 'next_follow_up_date_1', label: 'Next follow-up' },
    { key: 'remarks_1', label: 'Remarks' },
  ],
  2: [
    { key: 'planned_2', label: 'Planned' },
    { key: 'actual_2', label: 'Actual' },
    { key: 'status_2', label: 'Status' },
    { key: 'meeting_mode_2', label: 'Channel' },
    { key: 'next_follow_up_date_2', label: 'Next follow-up' },
    { key: 'remarks_2', label: 'Remarks' },
  ],
  3: [
    { key: 'planned_3', label: 'Planned' },
    { key: 'actual_3', label: 'Actual' },
    { key: 'status_3', label: 'Status' },
    { key: 'meeting_type_3', label: 'Presentation' },
    { key: 'next_follow_up_date_3', label: 'Next follow-up' },
    { key: 'remark_3', label: 'Remarks' },
  ],
  4: [
    { key: 'planned_4', label: 'Planned' },
    { key: 'actual_4', label: 'Actual' },
    { key: 'status_4', label: 'Status' },
    { key: 'next_follow_up_date_4', label: 'Next follow-up' },
    { key: 'remark_4', label: 'Remarks' },
  ],
  5: [
    { key: 'planned_5', label: 'Planned' },
    { key: 'actual_5', label: 'Actual' },
    { key: 'status_5', label: 'Status' },
    { key: 'next_follow_up_date_5', label: 'Next follow-up' },
    { key: 'remark_5', label: 'Remarks' },
  ],
};

const LeadStepHistory = ({ lead }: { lead: Lead }) => {
  const currentStep = getNextStepInfo(lead, SALES_MAX_STEP).step;
  const hasAnyHistory = [1, 2, 3, 4, 5].some((step) =>
    STEP_HISTORY_FIELDS[step].some((f) => String(lead[f.key] ?? '').trim())
  );

  if (!hasAnyHistory) {
    return <p className={styles.stepHistoryEmpty}>No step history recorded yet.</p>;
  }

  return (
    <div className={styles.stepHistoryTrack}>
      {[1, 2, 3, 4, 5].map((step) => {
        const fullTitle = getStepName(step);
        const shortTitle = fullTitle.replace(/^Step \d+ —\s*/i, '');
        const fields = STEP_HISTORY_FIELDS[step].map((f) => {
          const raw = String(lead[f.key] ?? '').trim();
          const display = raw
            ? PIPELINE_DATE_KEYS.has(f.key)
              ? formatPipelineDateTime(raw)
              : raw
            : '—';
          return { label: f.label, display };
        });
        const actualKey = `actual_${step}` as keyof Lead;
        const hasActual = Boolean(String(lead[actualKey] ?? '').trim());
        const isCurrent = step === currentStep && currentStep <= SALES_MAX_STEP;
        const stepHasData = fields.some((f) => f.display !== '—');

        return (
          <div
            key={step}
            className={`${styles.stepHistoryCard} ${isCurrent ? styles.stepHistoryCardCurrent : ''} ${
              hasActual ? styles.stepHistoryCardDone : ''
            } ${!stepHasData ? styles.stepHistoryCardMuted : ''}`}
          >
            <div className={styles.stepHistoryCardHead}>
              <span className={styles.stepHistoryStBadge}>ST {step}</span>
              {hasActual ? (
                <CheckCircle2 size={16} className={styles.stepHistoryIconDone} aria-hidden />
              ) : (
                <Clock3 size={16} className={styles.stepHistoryIconPending} aria-hidden />
              )}
            </div>
            <div className={styles.stepHistoryCardTitle} title={fullTitle}>
              {shortTitle}
            </div>
            <div className={styles.stepHistoryCardBody}>
              {fields.map((field) => (
                <div key={field.label} className={styles.stepHistoryFieldRow}>
                  <span className={styles.stepHistoryFieldLabel}>{field.label}</span>
                  <span className={styles.stepHistoryFieldValue}>{field.display}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LeadRowCard = ({
  lead,
  onComplete,
  onEdit,
  onDelete,
}: {
  lead: Lead;
  onComplete: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (rowIndex: number) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${styles.leadCard} ${expanded ? styles.leadCardExpanded : ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.leadId}>{lead.id}</span>
          <span className={styles.leadName}>{lead.name}</span>
          {lead.leadType && (
            <span
              className={styles.leadTypeBadge}
              style={{
                backgroundColor: 'rgba(59, 175, 218, 0.1)',
                color: '#3bafda',
              }}
            >
              {lead.leadType}
            </span>
          )}
        </div>
        <LeadDueSummary lead={lead} />
        <div className={styles.cardActions}>
          {isSalesLeadActive(lead) && (
            <button
              className={`${styles.iconBtn} ${styles.complete}`}
              onClick={() => onComplete(lead)}
              title={`Complete step for ${lead.name}`}
            >
              <CheckSquare size={16} color="#1abc9c" />
            </button>
          )}
          <button
            type="button"
            className={`${styles.iconBtn} ${expanded ? styles.expandActive : ''}`}
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? 'Hide step history' : 'Show step history'}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button className={`${styles.iconBtn} ${styles.edit}`} onClick={() => onEdit(lead)} title="Edit Lead">
            <Edit2 size={16} />
          </button>
          <button
            className={`${styles.iconBtn} ${styles.delete}`}
            onClick={() => onDelete(lead.rowIndex)}
            title="Delete Lead"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className={styles.cardBody}>
        <LeadCardDetails lead={lead} />
      </div>

      {expanded && (
        <div className={styles.cardStepHistory}>
          <LeadStepHistory lead={lead} />
        </div>
      )}
    </div>
  );
};

const LeadCardDetails = ({ lead }: { lead: Lead }) => {
  const segments: LeadDetailSegment[] = [
    { key: 'contact', icon: <Phone size={13} />, color: '#f7b84b', label: 'Contact', value: lead.contactNo || '-' },
    { key: 'salesman', icon: <User size={13} />, color: '#3bafda', label: 'Salesman', value: lead.salesman || '-' },
    { key: 'city', icon: <Building size={13} />, color: '#1abc9c', label: 'City', value: lead.cityType || '-' },
    { key: 'client', icon: <Briefcase size={13} />, color: '#9b59b6', label: 'Client', value: lead.typeOfClient || '-' },
    { key: 'builder', icon: <HardHat size={13} />, color: '#34495e', label: 'Builder', value: lead.nameOfBuilder || '-' },
    { key: 'ref', icon: <Users size={13} />, color: '#e67e22', label: 'Ref', value: lead.referenceBy || '-' },
    { key: 'gen', icon: <Fingerprint size={13} />, color: '#8e44ad', label: 'Generated', value: lead.generatedBy || '-' },
    {
      key: 'address',
      icon: <MapPin size={13} />,
      color: '#f1556c',
      label: 'Address',
      value: lead.address || '-',
      spanCols: 3,
    },
  ];

  if (lead.meeting_mode_2) {
    segments.push({
      key: 'channel',
      icon: <Users size={13} />,
      color: '#2980b9',
      label: 'Channel',
      value: lead.meeting_mode_2,
    });
  }
  if (lead.meeting_type_3) {
    segments.push({
      key: 'presentation',
      icon: <Store size={13} />,
      color: '#16a085',
      label: 'Presentation',
      value: lead.meeting_type_3,
    });
  }
  return (
    <>
      <div className={styles.cardDetailsGrid}>
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={`${styles.cardDetailCell} ${
              seg.spanCols === 3
                ? styles.cardDetailCellSpan3
                : seg.spanCols === 2
                  ? styles.cardDetailCellSpan2
                  : ''
            }`}
          >
            <div className={styles.cardDetailCellHead}>
              <span className={styles.cardDetailIcon} style={{ color: seg.color }}>
                {seg.icon}
              </span>
              <span className={styles.cardDetailLabel}>{seg.label}</span>
            </div>
            <span className={styles.cardDetailValue} style={seg.valueStyle}>
              {seg.value}
            </span>
          </div>
        ))}
      </div>
      {lead.status_5 === 'Lost' && lead.remark_5 && (
        <div className={styles.lostRemarkCompact}>
          <XCircle size={12} color="#e74c3c" />
          <span className={styles.lostRemarkLabel}>Lost:</span>
          <span className={styles.lostRemarkText}>{lead.remark_5}</span>
        </div>
      )}
    </>
  );
};

export const getLeadTypeColor = (type: string) => {
  switch(type) {
    case 'All Types': return '#3bafda';
    case 'Disqualified Leads': return '#e74c3c';
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
  const [leadTypeOptions, setLeadTypeOptions] = useState<string[]>([]);
  const [isLeadTypeModalOpen, setIsLeadTypeModalOpen] = useState(false);
  const [newLeadTypeName, setNewLeadTypeName] = useState('');
  const [isAddingLeadType, setIsAddingLeadType] = useState(false);

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
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
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
    fetchLeadTypes();
  }, []);

  useEffect(() => {
    if (!isTimeDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTimeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTimeDropdownOpen]);

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
  const uniqueNameOfBuilder = useMemo(() => {
    const fromLeads = leads.map((l) => l.nameOfBuilder).filter(Boolean);
    return Array.from(new Set([...BUILDER_NAME_OPTIONS, ...fromLeads]));
  }, [leads]);

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

  const fetchLeadTypes = async () => {
    try {
      const response = await fetch('/api/sales/lead-types');
      if (response.ok) {
        const data = await response.json();
        setLeadTypeOptions(Array.isArray(data) ? data.filter(Boolean) : []);
      }
    } catch (error) {
      console.error('Error fetching lead types:', error);
    }
  };

  const handleAddLeadType = async () => {
    const trimmed = newLeadTypeName.trim();
    if (!trimmed) {
      alert('Lead type name is required.');
      return;
    }

    setIsAddingLeadType(true);
    try {
      const response = await fetch('/api/sales/lead-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to add lead type.');
        return;
      }

      await fetchLeadTypes();
      setFormData((prev) => ({ ...prev, leadType: trimmed }));
      setNewLeadTypeName('');
      setIsLeadTypeModalOpen(false);
    } catch (error) {
      console.error('Error adding lead type:', error);
      alert('Failed to add lead type.');
    } finally {
      setIsAddingLeadType(false);
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
      status: info.step === SALES_MAX_STEP ? 'Won' : info.step === 1 ? '' : 'Done',
      meeting_mode_2: '',
      meeting_type_3: '',
      next_follow_up_date: '',
      remarks: '',
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

    const isNextFollowUpPre = stepFormData.status === 'Next Follow Up';
    if (step === 2 && !isNextFollowUpPre && !stepFormData.meeting_mode_2) {
      alert('Please select a meeting channel.');
      setIsSubmitting(false);
      return;
    }
    if (step === 3 && !isNextFollowUpPre && !stepFormData.meeting_type_3) {
      alert('Please select a presentation type.');
      setIsSubmitting(false);
      return;
    }

    const submitData = new FormData();
    Object.entries(currentStepLead).forEach(([k, v]) => {
      submitData.append(k, String(v || ''));
    });
    
    const now = new Date();
    const isClosureStep = step === SALES_MAX_STEP;
    const isNextFollowUp = stepFormData.status === 'Next Follow Up';
    const isStep1Disqualified = step === 1 && stepFormData.status === 'Disqualified';
    const isStep1Qualified = step === 1 && stepFormData.status === 'Qualified';

    if (step === 1 && isNextFollowUp) {
      submitData.set('actual_1', '');
    } else if (step === 1 && (isStep1Qualified || isStep1Disqualified)) {
      submitData.set('actual_1', now.toISOString());
      submitData.set('next_follow_up_date_1', '');
      if (!stepFormData.remarks) {
        submitData.set('remarks_1', '');
      }
    } else if (!isNextFollowUp || isClosureStep) {
      submitData.set(`actual_${step}`, now.toISOString());
    }

    submitData.set(`status_${step}`, stepFormData.status || '');

    if (isClosureStep) {
      submitData.set('remark_5', stepFormData.remarks || '');
    }

    if (!isClosureStep) {
      if (isNextFollowUp) {
        submitData.set(`next_follow_up_date_${step}`, stepFormData.next_follow_up_date || '');
      } else if (step > 1) {
        submitData.set(`next_follow_up_date_${step}`, '');
      }

      if (stepFormData.remarks) {
        if (step === 1) submitData.set('remarks_1', stepFormData.remarks);
        else if (step === 2) submitData.set('remarks_2', stepFormData.remarks);
        else submitData.set(`remark_${step}`, stepFormData.remarks);
      }

      if (step === 2 && !isNextFollowUp && stepFormData.meeting_mode_2) {
        submitData.set('meeting_mode_2', stepFormData.meeting_mode_2);
      }
      if (step === 3 && !isNextFollowUp && stepFormData.meeting_type_3) {
        submitData.set('meeting_type_3', stepFormData.meeting_type_3);
      }
    }

    const shouldAdvancePlanned =
      step < SALES_MAX_STEP &&
      !isNextFollowUp &&
      !isStep1Disqualified &&
      (step > 1 || isStep1Qualified);

    if (shouldAdvancePlanned) {
      const nextPlanned = new Date(now);
      const tat = step === 2 ? 3 : 1;
      nextPlanned.setDate(nextPlanned.getDate() + tat);
      if (nextPlanned.getDay() === 0) {
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
      const viewingCompletedStep =
        sidebarMode === 'step' && selectedStep === SALES_MAX_STEP + 1;
      // Default list hides lost leads unless browsing Completed (won / lost / disqualified together).
      if (!viewingCompletedStep) {
        result = result.filter((l) => !isSalesLeadLost(l));
      }
    }

    // Apply Lead Type Filter
    if (selectedLeadTypes.length > 0) {
      if (
        selectedLeadTypes.length === 1 &&
        selectedLeadTypes[0] === DISQUALIFIED_LEADS_PILL
      ) {
        result = result.filter((l) => isSalesLeadDisqualified(l));
      } else {
        result = result.filter((l) => selectedLeadTypes.includes(l.leadType));
      }
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

  const leadTypesList = useMemo(() => {
    const types = ['All Types', ...leadTypeOptions];
    if (!types.includes(DISQUALIFIED_LEADS_PILL)) {
      const newLeadsIdx = types.indexOf('New Leads');
      types.splice(newLeadsIdx >= 0 ? newLeadsIdx + 1 : 1, 0, DISQUALIFIED_LEADS_PILL);
    }
    return types;
  }, [leadTypeOptions]);
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
    leadTypesList.forEach((lt) => {
      counts[lt] = 0;
    });
    const activeLeads = leads.filter((l) => !isSalesLeadLost(l));
    counts['All Types'] = activeLeads.length;
    if (leadTypesList.includes(DISQUALIFIED_LEADS_PILL)) {
      counts[DISQUALIFIED_LEADS_PILL] = leads.filter((l) => isSalesLeadDisqualified(l)).length;
    }
    activeLeads.forEach((l) => {
      if (!l.leadType) return;
      if (l.leadType === DISQUALIFIED_LEADS_PILL) return;
      if (counts[l.leadType] === undefined) counts[l.leadType] = 0;
      counts[l.leadType]++;
    });
    return counts;
  }, [leads, leadTypesList]);

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
    const headers = ['ID', 'Name', 'Address', 'Contact No', 'Salesman', 'City Type', 'Reference By', 'Generated By', 'Lead Type', 'Type of Client', 'Builder Name'];
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
              <div className={styles.dropdownContainer} ref={dropdownRef}>
                <button
                  type="button"
                  className={styles.dropdownBtn}
                  onClick={() => setIsTimeDropdownOpen((open) => !open)}
                >
                  <Calendar size={16} />
                  {activeTimeFilterPill}
                  {timeCounts[activeTimeFilterPill] > 0 && (
                    <span className={styles.timeFilterCount}>{timeCounts[activeTimeFilterPill]}</span>
                  )}
                  <ChevronDown size={14} />
                </button>
                {isTimeDropdownOpen && (
                  <div className={styles.dropdownMenu}>
                    {timeList.map((time) => {
                      const isActive = activeTimeFilterPill === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          className={`${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ''}`}
                          onClick={() => {
                            handleTimeFilterPillClick(time);
                            setIsTimeDropdownOpen(false);
                          }}
                        >
                          <span>{time}</span>
                          {timeCounts[time] > 0 && (
                            <span className={styles.timeFilterCount}>{timeCounts[time]}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
                {[1, 2, 3, 4, 5, SALES_MAX_STEP + 1].map((step) => {
                  const count = leads.filter(l => getSalesStepInfo(l).step === step).length;
                  const label = step === SALES_MAX_STEP + 1 ? 'Completed' : getStepName(step);
                  return (
                    <div 
                      key={step}
                      className={`${styles.filterItem} ${selectedStep === step ? styles.active : ''}`}
                      onClick={() => { setSelectedStep(step); setCurrentPage(1); }}
                    >
                      <div className={styles.sidebarStepRow}>
                        <span className={styles.sidebarStepLabel} title={label}>
                          {label}
                        </span>
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
          <div className={styles.leadTypePills}>
            {leadTypesList.map((type) => {
              const isActive = activeLeadTypePill === type;
              const baseColor = getLeadTypeColor(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleLeadTypePillClick(type)}
                  className={`${styles.leadTypePill} ${isActive ? styles.leadTypePillActive : ''}`}
                  style={
                    isActive
                      ? { background: baseColor, borderColor: baseColor, color: '#fff' }
                      : { borderColor: `${baseColor}55`, color: 'var(--text-secondary)' }
                  }
                >
                  {type}
                  {leadTypeCounts[type] > 0 && (
                    <span
                      className={styles.leadTypePillCount}
                      style={
                        isActive
                          ? { background: 'rgba(255,255,255,0.28)', color: '#fff' }
                          : { background: `${baseColor}18`, color: baseColor }
                      }
                    >
                      {leadTypeCounts[type]}
                    </span>
                  )}
                </button>
              );
            })}
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
                <LeadRowCard
                  key={lead.rowIndex}
                  lead={lead}
                  onComplete={handleOpenStepModal}
                  onEdit={handleOpenModal}
                  onDelete={handleDelete}
                />
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
                    <div className={styles.leadTypeFieldRow}>
                      <div className={styles.inputWithIcon}>
                        <Tag size={16} className={styles.inputIcon} />
                        <select
                          name="leadType"
                          value={formData.leadType}
                          onChange={handleInputChange}
                        >
                          <option value="">Select Lead Type</option>
                          {leadTypeOptions.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                          {formData.leadType &&
                            !leadTypeOptions.includes(formData.leadType) && (
                              <option value={formData.leadType}>{formData.leadType}</option>
                            )}
                        </select>
                      </div>
                      <button
                        type="button"
                        className={styles.addLeadTypeBtn}
                        title="Add Lead Type"
                        onClick={() => {
                          setNewLeadTypeName('');
                          setIsLeadTypeModalOpen(true);
                        }}
                      >
                        <Plus size={18} />
                      </button>
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

      <Modal
        isOpen={isLeadTypeModalOpen}
        onClose={() => {
          if (!isAddingLeadType) setIsLeadTypeModalOpen(false);
        }}
        title="Add Lead Type"
        width="420px"
      >
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.outlineLabel}>Lead Type Name *</label>
            <div className={styles.inputWithIcon}>
              <Tag size={16} className={styles.inputIcon} />
              <input
                type="text"
                value={newLeadTypeName}
                onChange={(e) => setNewLeadTypeName(e.target.value)}
                placeholder="Enter lead type"
                autoFocus
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setIsLeadTypeModalOpen(false)}
              disabled={isAddingLeadType}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddLeadType}
              disabled={isAddingLeadType}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: isAddingLeadType ? 0.7 : 1 }}
            >
              {isAddingLeadType ? 'Adding...' : 'Add Lead Type'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRightSidebarOpen}
        onClose={() => setIsRightSidebarOpen(false)}
        title="Advanced Filters"
        width="680px"
      >
        <div className={styles.filterModalContent}>
          <FilterSection title="Lead Type" options={leadTypeOptions} selected={selectedLeadTypes} onChange={handleLeadTypeToggle} />
          <FilterSection title="City Type" options={uniqueCityTypes} selected={filterCityTypes} onChange={(val) => { setFilterCityTypes(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
          <FilterSection title="Type of Client" options={uniqueClientTypes} selected={filterClientTypes} onChange={(val) => { setFilterClientTypes(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
          <FilterSection title="Salesman" options={uniqueSalesman} selected={filterSalesman} onChange={(val) => { setFilterSalesman(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
          <FilterSection title="Reference By" options={uniqueReferenceBy} selected={filterReferenceBy} onChange={(val) => { setFilterReferenceBy(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
          <FilterSection title="Generated By" options={uniqueGeneratedBy} selected={filterGeneratedBy} onChange={(val) => { setFilterGeneratedBy(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
          <FilterSection title="Name Of Builder" options={uniqueNameOfBuilder} selected={filterNameOfBuilder} onChange={(val) => { setFilterNameOfBuilder(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]); setCurrentPage(1); }} />
        </div>
        <div className={styles.filterModalFooter}>
          <button
            type="button"
            className={styles.clearFiltersBtn}
            onClick={() => {
              setSelectedLeadTypes([]);
              setFilterCityTypes([]);
              setFilterClientTypes([]);
              setFilterSalesman([]);
              setFilterReferenceBy([]);
              setFilterGeneratedBy([]);
              setFilterNameOfBuilder([]);
            }}
          >
            Clear All
          </button>
          <button
            type="button"
            className={styles.applyFiltersBtn}
            onClick={() => setIsRightSidebarOpen(false)}
          >
            Apply
          </button>
        </div>
      </Modal>

      {/* Step Completion Bottom Sheet Modal */}
      {isStepModalOpen && currentStepLead && (
        <Modal 
          isOpen={isStepModalOpen} 
          onClose={() => setIsStepModalOpen(false)} 
          title={`Complete — ${getStepName(getSalesStepInfo(currentStepLead).step)}`}
        >
          <form onSubmit={handleStepSubmit} className={styles.bottomSheetForm}>
            {getSalesStepInfo(currentStepLead).step === 1 ? (
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.outlineLabel}>Outcome</label>
                <StepChoiceButtons
                  value={stepFormData.status || ''}
                  onChange={(id) => setStepFormData({ ...stepFormData, status: id })}
                  options={[
                    { id: 'Qualified', label: 'Qualified', activeClass: styles.stepChoiceQualified },
                    { id: 'Next Follow Up', label: 'Next Follow Up', activeClass: styles.stepChoiceFollowUp },
                    { id: 'Disqualified', label: 'Disqualify', activeClass: styles.stepChoiceDisqualified },
                  ]}
                />
              </div>
            ) : getSalesStepInfo(currentStepLead).step === SALES_MAX_STEP ? (
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.outlineLabel}>Close Outcome</label>
                <StepChoiceButtons
                  value={stepFormData.status || 'Won'}
                  onChange={(id) => setStepFormData({ ...stepFormData, status: id })}
                  options={[
                    { id: 'Won', label: 'Won', activeClass: styles.stepChoiceQualified },
                    { id: 'Lost', label: 'Lost', activeClass: styles.stepChoiceDisqualified },
                  ]}
                />
              </div>
            ) : (
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.outlineLabel}>Outcome</label>
                <StepChoiceButtons
                  value={stepFormData.status || 'Done'}
                  onChange={(id) => setStepFormData({ ...stepFormData, status: id })}
                  options={[
                    { id: 'Done', label: 'Done', activeClass: styles.stepChoiceQualified },
                    { id: 'Next Follow Up', label: 'Next Follow Up', activeClass: styles.stepChoiceFollowUp },
                  ]}
                />
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
            ) : (
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

                {getSalesStepInfo(currentStepLead).step === 2 && stepFormData.status !== 'Next Follow Up' && (
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.outlineLabel}>Meeting channel *</label>
                    <StepChoiceButtons
                      value={stepFormData.meeting_mode_2 || ''}
                      onChange={(id) => setStepFormData({ ...stepFormData, meeting_mode_2: id })}
                      options={[
                        { id: 'WhatsApp', label: 'WhatsApp', activeClass: styles.stepChoiceWhatsApp },
                        { id: 'Email', label: 'Email', activeClass: styles.stepChoiceEmail },
                        { id: 'Physical', label: 'Physical', activeClass: styles.stepChoicePhysical },
                      ]}
                    />
                  </div>
                )}

                {getSalesStepInfo(currentStepLead).step === 3 && stepFormData.status !== 'Next Follow Up' && (
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.outlineLabel}>Presentation type *</label>
                    <StepChoiceButtons
                      value={stepFormData.meeting_type_3 || ''}
                      onChange={(id) => setStepFormData({ ...stepFormData, meeting_type_3: id })}
                      options={[
                        { id: 'Online', label: 'Online', activeClass: styles.stepChoiceOnline },
                        { id: 'Offline', label: 'Offline', activeClass: styles.stepChoiceOffline },
                      ]}
                    />
                  </div>
                )}
                
                {(getSalesStepInfo(currentStepLead).step > 1 ||
                  (getSalesStepInfo(currentStepLead).step === 1 &&
                    (stepFormData.status === 'Next Follow Up' ||
                      stepFormData.status === 'Disqualified'))) && (
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.outlineLabel}>Remarks</label>
                    <div className={styles.inputWithIcon}>
                      <Edit2 size={16} className={styles.inputIcon} />
                      <input
                        type="text"
                        name="remarks"
                        value={stepFormData.remarks || ''}
                        onChange={(e) => setStepFormData({ ...stepFormData, remarks: e.target.value })}
                        placeholder="Any additional remarks..."
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', gridColumn: '1 / -1' }}>
              <button type="button" onClick={() => setIsStepModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button
                type="submit"
                disabled={isSubmitting || (getSalesStepInfo(currentStepLead).step === 1 && !stepFormData.status)}
                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#1abc9c', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                {isSubmitting
                  ? 'Saving...'
                  : getSalesStepInfo(currentStepLead).step === 1
                    ? stepFormData.status === 'Qualified'
                      ? 'Confirm Qualified'
                      : stepFormData.status === 'Disqualified'
                        ? 'Confirm Disqualify'
                        : stepFormData.status === 'Next Follow Up'
                          ? 'Save Follow Up'
                          : 'Select outcome'
                    : 'Complete Step'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      </div>
    </div>
  );
}
