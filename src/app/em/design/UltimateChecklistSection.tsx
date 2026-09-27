'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit2,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { canViewAllEmTasks, filterTasksForEmUser, matchesDateRangeFilter } from '@/lib/em-access';
import { CHECKLIST_CATEGORIES, FREQUENCIES, allowsMultipleDueDates, formatCompletedAt, formatDisplayDate, sheetDateToIso, type ChecklistViewRow, type MasterTask } from '@/lib/ultimate-checklist';
import Modal from '@/components/Modal';
import MultiSelectFilter from '@/components/MultiSelectFilter';
import SearchableSelect from '@/components/SearchableSelect';
import styles from '../em.module.css';

type InnerTab = 'master' | 'checklist';

type UserOption = {
  name: string;
  department: string;
};

type MasterForm = {
  category: string;
  task: string;
  doer_name: string;
  department: string;
  frequency: string;
  due_dates: string[];
};

const EMPTY_FORM: MasterForm = {
  category: '',
  task: '',
  doer_name: '',
  department: '',
  frequency: 'Daily',
  due_dates: [],
};

interface UltimateChecklistSectionProps {
  onToast: (message: string) => void;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => Promise<void>;
};

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function weekDates(anchorIso?: string) {
  const base = anchorIso ? new Date(`${anchorIso}T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const weekday = start.getDay();
  start.setDate(start.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { iso: toIsoDate(date), label, day: date.getDate() };
  });
}

function checklistKey(row: { task_id: string; occurrence_date: string }) {
  return `${row.task_id}-${row.occurrence_date}`;
}

function canComplete(status: string) {
  return status === 'Pending' || status === 'Overdue';
}

export function CircleCheck({
  checked,
  label,
  light = false,
  onToggle,
}: {
  checked: boolean;
  label: string;
  light?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: checked ? 'none' : `1.5px solid ${light ? 'rgba(255,255,255,0.9)' : 'var(--primary)'}`,
        background: checked ? (light ? '#ffffff' : 'var(--primary)') : 'transparent',
        color: light ? 'var(--primary)' : '#ffffff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  );
}

export function UltimateChecklistSection({ onToast }: UltimateChecklistSectionProps) {
  const { user } = useAuth();
  const canAssignOthers = canViewAllEmTasks(user?.role);

  const [innerTab, setInnerTab] = useState<InnerTab>('checklist');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [masters, setMasters] = useState<MasterTask[]>([]);
  const [checklistRows, setChecklistRows] = useState<ChecklistViewRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MasterTask | null>(null);
  const [form, setForm] = useState<MasterForm>(EMPTY_FORM);
  const [notice, setNotice] = useState('');
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [masterSearch, setMasterSearch] = useState('');
  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string[]>([]);
  const [masterPage, setMasterPage] = useState(1);
  const [masterPageSize, setMasterPageSize] = useState(10);

  const [checklistSearch, setChecklistSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [checklistCategoryFilter, setChecklistCategoryFilter] = useState<string[]>([]);
  const [doerFilter, setDoerFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [checklistPage, setChecklistPage] = useState(1);
  const [checklistPageSize, setChecklistPageSize] = useState(10);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [masterRes, checklistRes, usersRes, dropdownRes] = await Promise.all([
        fetch('/api/em/ultimate-checklist/master'),
        fetch('/api/em/ultimate-checklist/checklist'),
        fetch('/api/users'),
        fetch('/api/dropdowns'),
      ]);

      const masterData = masterRes.ok ? await masterRes.json() : [];
      const checklistData = checklistRes.ok ? await checklistRes.json() : [];
      const userData = usersRes.ok ? await usersRes.json() : [];
      const dropdownData = dropdownRes.ok ? await dropdownRes.json() : {};

      setMasters(Array.isArray(masterData) ? masterData : []);
      setChecklistRows(Array.isArray(checklistData) ? checklistData : []);
      setUsers(
        Array.isArray(userData)
          ? userData
              .filter((item: UserOption) => item?.name)
              .map((item: UserOption) => ({ name: item.name, department: item.department || '' }))
          : []
      );
      setDepartments(Array.isArray(dropdownData.departments) ? dropdownData.departments : []);

      if (!masterRes.ok || !checklistRes.ok) {
        const failed = !masterRes.ok ? masterData : checklistData;
        setNotice(failed?.error || 'Could not load the ultimate checklist.');
      }
    } catch (error) {
      console.error(error);
      setNotice('Could not load the ultimate checklist.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refreshChecklist = async () => {
    const res = await fetch('/api/em/ultimate-checklist/checklist');
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setChecklistRows(data);
  };

  useEffect(() => {
    fetchData();
    // Load once when the tab is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleMasters = useMemo(
    () => filterTasksForEmUser(masters, user),
    [masters, user]
  );
  const visibleChecklist = useMemo(
    () => filterTasksForEmUser(checklistRows, user),
    [checklistRows, user]
  );

  const categoryOptions = useMemo(() => {
    if (form.category && !CHECKLIST_CATEGORIES.includes(form.category as (typeof CHECKLIST_CATEGORIES)[number])) {
      return [form.category, ...CHECKLIST_CATEGORIES];
    }
    return [...CHECKLIST_CATEGORIES];
  }, [form.category]);

  const multipleDates = !editingTask && allowsMultipleDueDates(form.frequency) && form.frequency !== 'Weekly';
  const weeklyPicker = form.frequency === 'Weekly';

  const departmentOptions = useMemo(() => {
    const fromTasks = visibleMasters.map((task) => task.department).filter(Boolean);
    return Array.from(new Set([...departments, ...fromTasks])).sort((a, b) => a.localeCompare(b));
  }, [departments, visibleMasters]);

  const doerOptions = useMemo(() => {
    const selectedDepartment = form.department.trim().toLowerCase();
    const names = users
      .filter((item) => {
        if (!selectedDepartment) return false;
        return item.department.trim().toLowerCase() === selectedDepartment;
      })
      .map((item) => item.name);

    if (form.doer_name && !names.includes(form.doer_name)) names.unshift(form.doer_name);
    if (!canAssignOthers && user?.name && !names.includes(user.name)) names.unshift(user.name);
    return Array.from(new Set(names));
  }, [users, form.department, form.doer_name, canAssignOthers, user?.name]);

  const filteredMasters = useMemo(() => {
    const query = masterSearch.trim().toLowerCase();
    return visibleMasters.filter((task) => {
      const matchesSearch = !query || [task.category, task.task, task.doer_name, task.department, task.frequency]
        .join(' ')
        .toLowerCase()
        .includes(query);
      const matchesCategory = masterCategoryFilter.length === 0 || masterCategoryFilter.includes(task.category);
      return matchesSearch && matchesCategory;
    });
  }, [visibleMasters, masterSearch, masterCategoryFilter]);

  const filteredChecklist = useMemo(() => {
    const query = checklistSearch.trim().toLowerCase();
    return visibleChecklist.filter((row) => {
      const matchesSearch = !query || [row.category, row.task, row.doer_name, row.department, row.frequency]
        .join(' ')
        .toLowerCase()
        .includes(query);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(row.status);
      const matchesCategory = checklistCategoryFilter.length === 0 || checklistCategoryFilter.includes(row.category);
      const matchesDoer = doerFilter.length === 0 || doerFilter.includes(row.doer_name);
      const matchesDepartment = departmentFilter.length === 0 || departmentFilter.includes(row.department);
      const matchesDate = matchesDateRangeFilter(row.occurrence_date, startDateFilter, endDateFilter);
      return matchesSearch && matchesStatus && matchesCategory && matchesDoer && matchesDepartment && matchesDate;
    });
  }, [visibleChecklist, checklistSearch, statusFilter, checklistCategoryFilter, doerFilter, departmentFilter, startDateFilter, endDateFilter]);

  const completableRows = filteredChecklist.filter((row) => canComplete(row.status));

  const masterPageCount = Math.max(1, Math.ceil(filteredMasters.length / masterPageSize));
  const checklistPageCount = Math.max(1, Math.ceil(filteredChecklist.length / checklistPageSize));
  const safeMasterPage = Math.min(masterPage, masterPageCount);
  const safeChecklistPage = Math.min(checklistPage, checklistPageCount);
  const masterStart = (safeMasterPage - 1) * masterPageSize;
  const checklistStart = (safeChecklistPage - 1) * checklistPageSize;
  const pagedMasters = filteredMasters.slice(masterStart, masterStart + masterPageSize);
  const pagedChecklist = filteredChecklist.slice(checklistStart, checklistStart + checklistPageSize);

  const masterCategories = useMemo(
    () => Array.from(new Set(visibleMasters.map((task) => task.category).filter(Boolean))).sort(),
    [visibleMasters]
  );
  const checklistCategories = useMemo(
    () => Array.from(new Set(visibleChecklist.map((row) => row.category).filter(Boolean))).sort(),
    [visibleChecklist]
  );
  const checklistDoers = useMemo(
    () => Array.from(new Set(visibleChecklist.map((row) => row.doer_name).filter(Boolean))).sort(),
    [visibleChecklist]
  );
  const checklistDepartments = useMemo(
    () => Array.from(new Set(visibleChecklist.map((row) => row.department).filter(Boolean))).sort(),
    [visibleChecklist]
  );

  const openCreate = () => {
    setEditingTask(null);
    setForm({
      ...EMPTY_FORM,
      doer_name: canAssignOthers ? '' : user?.name || '',
      due_dates: [todayIso()],
    });
    setIsModalOpen(true);
  };

  const openEdit = (task: MasterTask) => {
    setEditingTask(task);
    setForm({
      category: task.category,
      task: task.task,
      doer_name: canAssignOthers ? task.doer_name : user?.name || task.doer_name,
      department: task.department,
      frequency: task.frequency || 'Daily',
      due_dates: [sheetDateToIso(task.due_date)],
    });
    setIsModalOpen(true);
  };

  const updateForm = (field: keyof MasterForm, value: string) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'frequency' && value === 'Daily') {
        next.due_dates = [current.due_dates.find(Boolean) || todayIso()];
      }
      if (field === 'frequency' && value === 'Weekly') {
        const week = new Set(weekDates().map((day) => day.iso));
        const kept = current.due_dates.filter((date) => week.has(date));
        next.due_dates = kept.length ? kept : [todayIso()];
      }
      if (field === 'department') {
        const stillValid = users.some(
          (item) =>
            item.name === current.doer_name &&
            item.department.trim().toLowerCase() === value.trim().toLowerCase()
        );
        if (!canAssignOthers) {
          next.doer_name = user?.name || current.doer_name;
        } else if (!stillValid) {
          next.doer_name = '';
        }
      }
      return next;
    });
  };

  const updateDueDate = (index: number, value: string) => {
    setForm((current) => {
      const dueDates = [...current.due_dates];
      dueDates[index] = value;
      return { ...current, due_dates: dueDates };
    });
  };

  const addDueDate = () => {
    setForm((current) => ({ ...current, due_dates: [...current.due_dates, ''] }));
  };

  const removeDueDate = (index: number) => {
    setForm((current) => ({
      ...current,
      due_dates: current.due_dates.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const saveMaster = async (event: React.FormEvent) => {
    event.preventDefault();
    const dueDates = form.due_dates.map((date) => date.trim()).filter(Boolean);
    if (!form.category.trim() || !form.task.trim() || !form.doer_name || !form.department || !form.frequency || dueDates.length === 0) {
      setNotice('Fill in category, task, doer, department, frequency, and at least one due date.');
      return;
    }
    if (new Set(dueDates).size !== dueDates.length) {
      setNotice('Remove duplicate dates before saving.');
      return;
    }
    if (form.frequency === 'Daily' && dueDates.length > 1) {
      setNotice('A daily task can have only one start date.');
      return;
    }

    setSaving(true);
    try {
      const url = editingTask
        ? `/api/em/ultimate-checklist/master?rowIndex=${editingTask.rowIndex}`
        : '/api/em/ultimate-checklist/master';
      const res = await fetch(url, {
        method: editingTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          task: form.task,
          doer_name: form.doer_name,
          department: form.department,
          frequency: form.frequency,
          due_date: dueDates[0],
          due_dates: editingTask ? [dueDates[0]] : dueDates,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(data.error || 'Failed to save the task.');
        return;
      }
      setIsModalOpen(false);
      const count = Number(data.count) || dueDates.length;
      onToast(editingTask ? 'Task updated.' : count > 1 ? `${count} tasks saved.` : 'Task saved.');
      await fetchData(true);
    } catch (error) {
      console.error(error);
      setNotice('Failed to save the task.');
    } finally {
      setSaving(false);
    }
  };

  const deleteMaster = (task: MasterTask) => {
    setConfirmRequest({
      title: 'Delete task',
      message: 'Delete this task and its completed dates?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`/api/em/ultimate-checklist/master?rowIndex=${task.rowIndex}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setNotice(data.error || 'Failed to delete the task.');
          return;
        }
        onToast('Task deleted.');
        await fetchData(true);
      },
    });
  };

  const completeRows = async (rows: ChecklistViewRow[]) => {
    const pending = rows.filter((row) => canComplete(row.status));
    if (!pending.length) return;
    setBulkSaving(true);
    const completedAt = new Date().toLocaleString('en-GB');
    const completedBy = user?.name || '';
    const keys = new Set(pending.map(checklistKey));
    try {
      const res = await fetch('/api/em/ultimate-checklist/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed_by: completedBy,
          items: pending.map((row) => ({
            task_id: row.task_id,
            occurrence_date: row.occurrence_date,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(data.error || 'Failed to complete the selected tasks.');
        return;
      }
      setChecklistRows((current) => current.map((row) => (
        keys.has(checklistKey(row))
          ? { ...row, status: 'Completed', completed_at: completedAt, completed_by: completedBy }
          : row
      )));
      setSelectedKeys((current) => current.filter((key) => !keys.has(key)));
      onToast(pending.length > 1 ? `${pending.length} tasks completed.` : 'Task marked complete.');
      void refreshChecklist();
    } catch (error) {
      console.error(error);
      setNotice('Failed to complete the selected tasks.');
    } finally {
      setBulkSaving(false);
    }
  };

  const runConfirm = async () => {
    if (!confirmRequest) return;
    setConfirming(true);
    try {
      await confirmRequest.onConfirm();
      setConfirmRequest(null);
    } catch (error) {
      console.error(error);
      setNotice('Something went wrong. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div>
      <div className={styles.taskTabBar}>
        <button
          type="button"
          className={`${styles.taskTab} ${innerTab === 'master' ? styles.taskTabActive : ''}`}
          onClick={() => setInnerTab('master')}
        >
          <ClipboardList size={18} /> Master
        </button>
        <button
          type="button"
          className={`${styles.taskTab} ${innerTab === 'checklist' ? styles.taskTabActive : ''}`}
          onClick={() => setInnerTab('checklist')}
        >
          <ListChecks size={18} /> Checklist
        </button>
      </div>

      {innerTab === 'master' ? (
        <>
          <div className={styles.sectionToolbar}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className={styles.sectionSearchWrap}>
                <Search size={16} className={styles.sectionSearchIcon} />
                <input
                  className={styles.sectionSearchInput}
                  placeholder="Search tasks..."
                  value={masterSearch}
                  onChange={(event) => {
                    setMasterSearch(event.target.value);
                    setMasterPage(1);
                  }}
                />
              </div>
              <MultiSelectFilter
                label="Category"
                options={masterCategories}
                selectedValues={masterCategoryFilter}
                onChange={(values) => { setMasterCategoryFilter(values); setMasterPage(1); }}
              />
            </div>
            <button
              type="button"
              onClick={openCreate}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--primary)', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
          <Pager
            page={safeMasterPage}
            pageCount={filteredMasters.length === 0 ? 0 : masterPageCount}
            pageSize={masterPageSize}
            start={masterStart}
            total={filteredMasters.length}
            onPageSize={(size) => {
              setMasterPageSize(size);
              setMasterPage(1);
            }}
            onPage={setMasterPage}
          />
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading data...</div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Task</th>
                    <th>Doer Name</th>
                    <th>Department</th>
                    <th>Frequency</th>
                    <th>Due Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedMasters.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-light)' }}>No tasks saved yet.</td>
                    </tr>
                  ) : pagedMasters.map((task) => (
                    <tr key={task.task_id || task.rowIndex}>
                      <td>{task.category || '—'}</td>
                      <td>{task.task || '—'}</td>
                      <td>{task.doer_name || '—'}</td>
                      <td>{task.department || '—'}</td>
                      <td>{task.frequency || '—'}</td>
                      <td>{formatDisplayDate(task.due_date) || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button type="button" title="Edit" onClick={() => openEdit(task)} style={iconButtonStyle}>
                            <Edit2 size={18} />
                          </button>
                          <button type="button" title="Delete" onClick={() => deleteMaster(task)} style={{ ...iconButtonStyle, color: '#f1556c' }}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.sectionToolbar}>
            <div className={styles.sectionFilters}>
              <div className={styles.sectionSearchWrap}>
                <Search size={16} className={styles.sectionSearchIcon} />
                <input
                  className={styles.sectionSearchInput}
                  placeholder="Search checklist..."
                  value={checklistSearch}
                  onChange={(event) => {
                    setChecklistSearch(event.target.value);
                    setChecklistPage(1);
                  }}
                />
              </div>
              <MultiSelectFilter label="Status" options={['Pending', 'Overdue', 'Completed']} selectedValues={statusFilter} onChange={(values) => { setStatusFilter(values); setChecklistPage(1); }} />
              <MultiSelectFilter label="Category" options={checklistCategories} selectedValues={checklistCategoryFilter} onChange={(values) => { setChecklistCategoryFilter(values); setChecklistPage(1); }} />
              <MultiSelectFilter label="Doer" options={checklistDoers} selectedValues={doerFilter} onChange={(values) => { setDoerFilter(values); setChecklistPage(1); }} />
              <MultiSelectFilter label="Department" options={checklistDepartments} selectedValues={departmentFilter} onChange={(values) => { setDepartmentFilter(values); setChecklistPage(1); }} />
              <div className={styles.sectionDateFilter}>
                <span className={styles.sectionDateFilterLabel}>Due:</span>
                <input
                  type="date"
                  className={styles.sectionDateInput}
                  value={startDateFilter}
                  onChange={(event) => { setStartDateFilter(event.target.value); setChecklistPage(1); }}
                />
                <span className={styles.sectionDateDivider}>to</span>
                <input
                  type="date"
                  className={styles.sectionDateInput}
                  value={endDateFilter}
                  onChange={(event) => { setEndDateFilter(event.target.value); setChecklistPage(1); }}
                />
                {(startDateFilter || endDateFilter) && (
                  <button
                    type="button"
                    className={styles.sectionDateClear}
                    title="Clear dates"
                    onClick={() => { setStartDateFilter(''); setEndDateFilter(''); setChecklistPage(1); }}
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
            {selectedKeys.length > 0 && (
              <button
                type="button"
                onClick={() => completeRows(checklistRows.filter((row) => selectedKeys.includes(checklistKey(row))))}
                disabled={bulkSaving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--primary)', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: bulkSaving ? 'wait' : 'pointer', fontWeight: 600, opacity: bulkSaving ? 0.85 : 1, flexShrink: 0 }}
              >
                {bulkSaving ? <Loader2 size={16} className={styles.spin} /> : <CheckCircle2 size={16} />}
                {bulkSaving ? 'Completing...' : `Complete selected (${selectedKeys.length})`}
              </button>
            )}
          </div>
          <Pager
            page={safeChecklistPage}
            pageCount={filteredChecklist.length === 0 ? 0 : checklistPageCount}
            pageSize={checklistPageSize}
            start={checklistStart}
            total={filteredChecklist.length}
            onPageSize={(size) => {
              setChecklistPageSize(size);
              setChecklistPage(1);
            }}
            onPage={setChecklistPage}
          />
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading data...</div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Task</th>
                    <th>Doer Name</th>
                    <th>Department</th>
                    <th>Frequency</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Completed At</th>
                    <th style={{ textAlign: 'right', width: '56px' }}>
                      <CircleCheck
                        light
                        label="Select all open tasks"
                        checked={completableRows.length > 0 && completableRows.every((row) => selectedKeys.includes(checklistKey(row)))}
                        onToggle={() => {
                          const allSelected = completableRows.length > 0 && completableRows.every((row) => selectedKeys.includes(checklistKey(row)));
                          setSelectedKeys(allSelected ? [] : completableRows.map(checklistKey));
                        }}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedChecklist.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-light)' }}>No checklist rows for the current filters.</td>
                    </tr>
                  ) : pagedChecklist.map((row) => {
                    const key = checklistKey(row);
                    const open = canComplete(row.status);
                    const toggleRow = () => {
                      setSelectedKeys((current) => (
                        current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
                      ));
                    };
                    return (
                      <tr
                        key={key}
                        className={row.status === 'Completed' ? styles.rowCompleted : undefined}
                        onClick={open && !bulkSaving ? toggleRow : undefined}
                        style={open ? { cursor: 'pointer' } : undefined}
                      >
                        <td>{row.category || '—'}</td>
                        <td>{row.task || '—'}</td>
                        <td>{row.doer_name || '—'}</td>
                        <td>{row.department || '—'}</td>
                        <td>{row.frequency || '—'}</td>
                        <td>{formatDisplayDate(row.occurrence_date) || '—'}</td>
                        <td>
                          <span style={statusStyle(row.status)}>
                            {row.status === 'Completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            {row.status}
                          </span>
                        </td>
                        <td>{formatCompletedAt(row.completed_at) || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {open && (
                            <CircleCheck
                              label={`Select ${row.task}`}
                              checked={selectedKeys.includes(key)}
                              onToggle={toggleRow}
                            />
                          )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Edit Checklist Task' : 'Add Checklist Task'}
      >
        <form onSubmit={saveMaster} className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.fieldGroup}>
              <label>Category</label>
              <SearchableSelect
                options={categoryOptions}
                value={form.category}
                onChange={(value) => updateForm('category', value)}
                placeholder="Select Category"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Task</label>
              <input
                className={styles.formInput}
                value={form.task}
                onChange={(event) => updateForm('task', event.target.value)}
                placeholder="Task"
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.fieldGroup}>
              <label>Department</label>
              <SearchableSelect
                options={departmentOptions}
                value={form.department}
                onChange={(value) => updateForm('department', value)}
                placeholder="Select Department"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Doer Name</label>
              <SearchableSelect
                options={doerOptions}
                value={form.doer_name}
                onChange={(value) => {
                  if (!canAssignOthers) return;
                  updateForm('doer_name', value);
                }}
                placeholder={form.department ? 'Select Doer' : 'Select department first'}
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label>Frequency</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {FREQUENCIES.map((frequency) => {
                const selected = form.frequency === frequency;
                return (
                  <button
                    key={frequency}
                    type="button"
                    onClick={() => updateForm('frequency', frequency)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: selected ? 'none' : '1px solid var(--border-color)',
                      background: selected ? 'var(--primary)' : 'var(--bg-card)',
                      color: selected ? 'white' : 'var(--text-main)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {frequency}
                  </button>
                );
              })}
            </div>
          </div>
          {!multipleDates && !weeklyPicker && (
            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label>{form.frequency === 'Daily' ? 'Start Date' : 'Due Date'}</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={form.due_dates[0] || ''}
                  onChange={(event) => updateDueDate(0, event.target.value)}
                />
              </div>
            </div>
          )}
          {weeklyPicker && (
            <div className={styles.fieldGroup}>
              <label>Weekdays</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {weekDates(editingTask ? form.due_dates[0] : undefined).map((day) => {
                  const selected = form.due_dates.includes(day.iso);
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      onClick={() => {
                        if (editingTask) {
                          setForm((current) => ({ ...current, due_dates: [day.iso] }));
                          return;
                        }
                        setForm((current) => {
                          const week = new Set(weekDates().map((item) => item.iso));
                          const kept = current.due_dates.filter((date) => week.has(date) && date !== day.iso);
                          return {
                            ...current,
                            due_dates: selected ? kept : [...kept, day.iso],
                          };
                        });
                      }}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        border: selected ? 'none' : '1px solid var(--border-color)',
                        background: selected ? 'var(--primary)' : 'var(--bg-card)',
                        color: selected ? 'white' : 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        padding: 0,
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', letterSpacing: '0.02em' }}>{day.label}</span>
                      <span style={{ fontSize: '0.9rem' }}>{day.day}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {multipleDates && (
            <div className={styles.fieldGroup}>
              <label>Due Dates</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {form.due_dates.map((date, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={date}
                      onChange={(event) => updateDueDate(index, event.target.value)}
                    />
                    <button
                      type="button"
                      title="Remove date"
                      onClick={() => removeDueDate(index)}
                      disabled={form.due_dates.length <= 1}
                      style={{ ...iconButtonStyle, color: '#f1556c' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDueDate}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                >
                  <Plus size={16} /> Add date
                </button>
              </div>
            </div>
          )}
          <p className={styles.sectionSubtitle}>
            {editingTask
              ? 'This updates this task only.'
              : weeklyPicker
                ? 'Select one or more weekdays. Each selected day is saved as its own weekly task.'
                : form.frequency === 'Daily'
                  ? 'Daily tasks start from one date and then repeat every day.'
                  : 'Each date is saved as its own task. Pick several dates in a month, quarter, or year.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : multipleDates && form.due_dates.filter(Boolean).length > 1 ? 'Save Tasks' : 'Save Task'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!confirmRequest}
        onClose={() => { if (!confirming) setConfirmRequest(null); }}
        title={confirmRequest?.title || ''}
        type={confirmRequest?.danger ? 'danger' : 'default'}
        width="460px"
      >
        <p style={{ margin: '0 0 20px', color: 'var(--text-main)', lineHeight: 1.5 }}>{confirmRequest?.message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setConfirmRequest(null)}
            disabled={confirming}
            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={runConfirm}
            disabled={confirming}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: confirmRequest?.danger ? '#f1556c' : 'var(--primary)', color: 'white', cursor: confirming ? 'wait' : 'pointer', fontWeight: 600 }}
          >
            {confirming && <Loader2 size={16} className={styles.spin} />}
            {confirming ? 'Please wait...' : confirmRequest?.confirmLabel}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!notice} onClose={() => setNotice('')} title="Checklist" width="460px">
        <p style={{ margin: '0 0 20px', color: 'var(--text-main)', lineHeight: 1.5 }}>{notice}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setNotice('')}
            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
          >
            OK
          </button>
        </div>
      </Modal>
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-light)',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '4px',
};

function statusStyle(status: string): React.CSSProperties {
  const completed = status === 'Completed';
  const overdue = status === 'Overdue';
  return {
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: 600,
    backgroundColor: completed ? 'rgba(16, 185, 129, 0.15)' : overdue ? 'rgba(241, 85, 108, 0.15)' : 'rgba(59, 175, 218, 0.15)',
    color: completed ? '#10b981' : overdue ? '#f1556c' : '#3bafda',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  };
}

function Pager({
  page,
  pageCount,
  pageSize,
  start,
  total,
  onPageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  start: number;
  total: number;
  onPageSize: (size: number) => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className={styles.sectionToolbar} style={{ justifyContent: 'flex-end' }}>
      <div className={styles.sectionPagination}>
        <span>Show</span>
        <select className={styles.pageSelect} value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span>{total > 0 ? `${start + 1}-${Math.min(start + pageSize, total)} of ${total}` : '0 entries'}</span>
        <button type="button" className={styles.pageBtn} disabled={page <= 1 || total === 0} onClick={() => onPage(page - 1)}>Prev</button>
        <button type="button" className={styles.pageBtn} disabled={page >= pageCount || total === 0} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
