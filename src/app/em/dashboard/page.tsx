'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Trophy, TrendingDown, Globe, PenTool, Hammer, LineChart as LineChartIcon, Briefcase, FileText, User, Calendar, Activity, LayoutGrid } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, LabelList } from 'recharts';
import styles from './dashboard.module.css';
import GlobalLoading from '@/components/GlobalLoading';
import MultiSelectFilter from '@/components/MultiSelectFilter';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
const STATUS_COLORS = { 'Completed': '#10b981', 'Pending': '#3b82f6', 'Delayed': '#ef4444' };

const parseDate = (dateStr?: string) => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
};

const getStartOfDay = (d: Date) => {
  const newD = new Date(d);
  newD.setHours(0, 0, 0, 0);
  return newD;
};

export default function EMDashboard() {
  const [designTasks, setDesignTasks] = useState<any[]>([]);
  const [executionTasks, setExecutionTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'All' | 'Design' | 'Execution'>('All');
  const [dateFilterType, setDateFilterType] = useState<'All' | 'Today' | 'This Week' | 'This Month' | 'Custom'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedDoers, setSelectedDoers] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [designRes, execRes] = await Promise.all([
          fetch('/api/em/design'),
          fetch('/api/em/execution')
        ]);
        const dData = await designRes.json();
        const eData = await execRes.json();

        if (Array.isArray(dData)) setDesignTasks(dData);
        if (Array.isArray(eData)) setExecutionTasks(eData);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const allProjects = Array.from(new Set([...designTasks, ...executionTasks].map(t => t.project_name).filter(Boolean))).sort();
  const allDoers = Array.from(new Set([...designTasks, ...executionTasks].map(t => t.doer_name || t.doer).filter(Boolean))).sort();
  const allStatuses = ['Completed', 'Pending', 'Hold', 'Cancelled'];

  const filteredData = useMemo(() => {
    let rawData: any[] = [];
    if (activeTab === 'All') {
      rawData = [...designTasks, ...executionTasks];
    } else if (activeTab === 'Design') {
      rawData = [...designTasks];
    } else {
      rawData = [...executionTasks];
    }

    const today = getStartOfDay(new Date());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); 
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    return rawData.filter(t => {
      if (selectedProjects.length > 0 && !selectedProjects.includes(t.project_name)) return false;
      const doer = t.doer_name || t.doer;
      if (selectedDoers.length > 0 && !selectedDoers.includes(doer)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.status || 'Pending')) return false;

      const pDate = parseDate(t.planned_date || t.work_from);
      
      if (dateFilterType === 'Today') {
        if (!pDate || pDate.getTime() !== today.getTime()) return false;
      } else if (dateFilterType === 'This Week') {
        if (!pDate || pDate < weekStart || pDate > today) return false;
      } else if (dateFilterType === 'This Month') {
        if (!pDate || pDate < monthStart || pDate > today) return false;
      } else if (dateFilterType === 'Custom' && (startDate || endDate)) {
        if (!pDate) return false;
        if (startDate && pDate < new Date(startDate)) return false;
        if (endDate && pDate > new Date(endDate)) return false;
      }

      return true;
    });
  }, [designTasks, executionTasks, activeTab, dateFilterType, startDate, endDate, selectedProjects, selectedDoers, selectedStatuses]);

  // Helpers
  const today = getStartOfDay(new Date());

  const getDelayDays = (t: any) => {
    const pDate = parseDate(t.planned_date || t.work_from);
    if (!pDate) return 0;
    
    if (t.status === 'Completed' && t.actual_date) {
      const aDate = parseDate(t.actual_date);
      if (!aDate) return 0;
      const diffTime = aDate.getTime() - pDate.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    
    const diffTime = today.getTime() - pDate.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const isDelayed = (t: any) => getDelayDays(t) > 0;

  // 1. Executive Summary
  const totalTasks = filteredData.length;
  const completedTasksList = filteredData.filter(t => t.status === 'Completed');
  const completedTasks = completedTasksList.length;
  const pendingTasks = filteredData.filter(t => t.status !== 'Completed').length;
  const delayedTasks = filteredData.filter(isDelayed).length;
  
  const onTimeCompleted = completedTasksList.filter(t => !isDelayed(t)).length;
  const onTimePercent = completedTasks === 0 ? 0 : Math.round((onTimeCompleted / completedTasks) * 100);

  // 2. Project Performance
  const projectMap = filteredData.reduce((acc, t) => {
    const proj = t.project_name || 'Unknown';
    if (!acc[proj]) acc[proj] = { name: proj, Completed: 0, Pending: 0, Delayed: 0, total: 0 };
    acc[proj].total += 1;
    
    if (isDelayed(t)) {
      acc[proj].Delayed += 1;
    } else if (t.status === 'Completed') {
      acc[proj].Completed += 1;
    } else {
      acc[proj].Pending += 1;
    }
    return acc;
  }, {} as Record<string, any>);
  const allProjectData = Object.values(projectMap).sort((a: any, b: any) => b.total - a.total);
  const projectData = allProjectData.slice(0, 15);

  // 3. Doer Performance
  const doerMap = filteredData.reduce((acc, t) => {
    const doer = t.doer_name || t.doer || 'Unknown';
    if (!acc[doer]) acc[doer] = { name: doer, total: 0, completed: 0, pending: 0, delayed: 0 };
    acc[doer].total += 1;
    if (t.status === 'Completed') acc[doer].completed += 1;
    else acc[doer].pending += 1;
    if (isDelayed(t)) acc[doer].delayed += 1;
    return acc;
  }, {} as Record<string, any>);
  
  const doerTable = Object.values(doerMap).map((d: any) => ({
    ...d, delayPercent: d.total === 0 ? 0 : Math.round((d.delayed / d.total) * 100)
  })).sort((a, b) => b.total - a.total);

  const topPerformers = [...doerTable].sort((a, b) => b.completed - a.completed).slice(0, 5);
  const delayRanking = [...doerTable].sort((a, b) => b.delayPercent - a.delayPercent).slice(0, 5);

  // 4. Timeline Performance
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendMap = filteredData.reduce((acc, t) => {
    const pDate = parseDate(t.planned_date || t.work_from);
    if (pDate) {
      const m = pDate.getMonth();
      const y = pDate.getFullYear();
      const key = `${m}-${y}`;
      if (!acc[key]) acc[key] = { label: `${monthNames[m]} ${y.toString().substring(2)}`, sortVal: y * 100 + m, Planned: 0, Completed: 0, Delayed: 0 };
      acc[key].Planned += 1;
      if (t.status === 'Completed') acc[key].Completed += 1;
      if (isDelayed(t)) acc[key].Delayed += 1;
    }
    return acc;
  }, {} as Record<string, any>);
  const trendData = Object.values(trendMap).sort((a: any, b: any) => a.sortVal - b.sortVal);

  // 5. Work Type Analysis
  const workTypeMap = filteredData.reduce((acc, t) => {
    const type = t.work_type || t.work_name || 'Unknown';
    if (!acc[type]) acc[type] = { name: type, total: 0, completed: 0 };
    acc[type].total += 1;
    if (t.status === 'Completed') acc[type].completed += 1;
    return acc;
  }, {} as Record<string, any>);
  
  const workTypeData = Object.values(workTypeMap).map((w: any) => ({
    ...w, completionPercent: Math.round((w.completed / w.total) * 100)
  })).sort((a, b) => b.total - a.total).slice(0, 10);

  // 6. Delay Analysis
  const delayBuckets = { 'On Time': 0, 'Minor (1-3d)': 0, 'Medium (4-7d)': 0, 'Critical (>7d)': 0 };
  filteredData.forEach(t => {
    const delay = getDelayDays(t);
    if (delay === 0) delayBuckets['On Time']++;
    else if (delay <= 3) delayBuckets['Minor (1-3d)']++;
    else if (delay <= 7) delayBuckets['Medium (4-7d)']++;
    else delayBuckets['Critical (>7d)']++;
  });
  
  const totalForDelay = filteredData.length;
  const delayAnalysis = Object.entries(delayBuckets).map(([name, count]) => ({
    name,
    count,
    percent: totalForDelay === 0 ? 0 : Math.round((count / totalForDelay) * 100)
  }));

  // 7. Daily Activity
  const todayTasks = filteredData.filter(t => {
    const pDate = parseDate(t.planned_date || t.work_from);
    return pDate && pDate.getTime() === today.getTime();
  });
  const todayPlanned = todayTasks.length;
  const todayCompleted = todayTasks.filter(t => t.status === 'Completed').length;
  const todayPending = todayTasks.filter(t => t.status !== 'Completed').length;

  // 8. Productivity Heatmap
  // Doer vs Month (Completed Tasks)
  const allMonthsSet = new Set<string>();
  const heatmapMap = filteredData.reduce((acc, t) => {
    if (t.status !== 'Completed') return acc;
    const aDate = parseDate(t.actual_date);
    if (!aDate) return acc;
    
    const m = aDate.getMonth();
    const y = aDate.getFullYear();
    const monthKey = `${monthNames[m]} ${y.toString().substring(2)}`;
    const sortVal = y * 100 + m;
    
    allMonthsSet.add(JSON.stringify({ key: monthKey, sortVal }));
    
    const doer = t.doer_name || t.doer || 'Unknown';
    if (!acc[doer]) acc[doer] = { doer, total: 0 };
    acc[doer][monthKey] = (acc[doer][monthKey] || 0) + 1;
    acc[doer].total += 1;
    
    return acc;
  }, {} as Record<string, any>);
  
  const heatmapMonths = Array.from(allMonthsSet).map(s => JSON.parse(s)).sort((a, b) => a.sortVal - b.sortVal).map(m => m.key);
  const heatmapData = Object.values(heatmapMap).sort((a: any, b: any) => b.total - a.total).slice(0, 10);

  // 9. Pending Work Tracker
  const pendingTracker = filteredData.filter(t => t.status !== 'Completed').map(t => {
    const pDate = parseDate(t.planned_date || t.work_from);
    const delay = getDelayDays(t);
    let priorityVal = 3; // Upcoming
    let priority = 'Upcoming';
    
    if (pDate) {
      if (pDate < today) { priority = 'Overdue'; priorityVal = 1; }
      else if (pDate.getTime() === today.getTime()) { priority = 'Due Today'; priorityVal = 2; }
    }
    
    return {
      project: t.project_name || '-',
      workName: t.work_name || t.work_type || '-',
      doer: t.doer_name || t.doer || '-',
      plannedDate: t.planned_date || t.work_from || '-',
      delay,
      status: t.status || 'Pending',
      priority,
      priorityVal
    };
  }).sort((a, b) => a.priorityVal - b.priorityVal || b.delay - a.delay).slice(0, 50);

  return (
    <div className={styles.container}>
      <GlobalLoading show={loading} text="Aggregating Deep Analytics..." />

      {/* HEADER & SLICERS */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Deep Analysis Dashboard</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <Link href="/em">EM</Link>
            <span className="separator">&gt;</span>
            <span className="current">Deep Analytics</span>
          </div>
        </div>
        
        <div className={styles.slicersContainer}>
          <div className={styles.slicersRow}>
            <MultiSelectFilter options={allProjects as string[]} selectedValues={selectedProjects} onChange={setSelectedProjects} label="Project Filter" />
            <MultiSelectFilter options={allDoers as string[]} selectedValues={selectedDoers} onChange={setSelectedDoers} label="Doer Filter" />
            <MultiSelectFilter options={allStatuses as string[]} selectedValues={selectedStatuses} onChange={setSelectedStatuses} label="Status Filter" />
            
            <div className={styles.dateFilterBox}>
              <select value={dateFilterType} onChange={e => setDateFilterType(e.target.value as any)} className={styles.dateSelect}>
                <option value="All">All Dates</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Custom">Custom</option>
              </select>
              {dateFilterType === 'Custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.dateInput} />
                  <span style={{color: '#94a3b8'}}>-</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.dateInput} />
                </div>
              )}
            </div>
            
            <Link href="/em" className={styles.backButton}>
              <ArrowLeft size={16} /> Back
            </Link>
          </div>
        </div>
      </div>
      
      <div className={styles.tabsContainer}>
        <button className={`${styles.tab} ${activeTab === 'All' ? styles.active : ''}`} onClick={() => setActiveTab('All')}><Globe size={18} /> All Modules</button>
        <button className={`${styles.tab} ${activeTab === 'Design' ? styles.active : ''}`} onClick={() => setActiveTab('Design')}><PenTool size={18} /> Design</button>
        <button className={`${styles.tab} ${activeTab === 'Execution' ? styles.active : ''}`} onClick={() => setActiveTab('Execution')}><Hammer size={18} /> Execution</button>
      </div>

      {/* 1. EXECUTIVE SUMMARY */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}><LayoutGrid size={28} /></div>
          <div className={styles.kpiInfo}><h4>Total Tasks</h4><p>{totalTasks}</p></div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}><CheckCircle2 size={28} /></div>
          <div className={styles.kpiInfo}><h4>Completed</h4><p>{completedTasks}</p></div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}><Clock size={28} /></div>
          <div className={styles.kpiInfo}><h4>Pending</h4><p>{pendingTasks}</p></div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}><AlertCircle size={28} /></div>
          <div className={styles.kpiInfo}><h4>Delayed</h4><p>{delayedTasks}</p></div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}><Trophy size={28} /></div>
          <div className={styles.kpiInfo}><h4>On Time %</h4><p>{onTimePercent}%</p></div>
        </div>
      </div>

      {/* 2. PROJECT PERFORMANCE DASHBOARD */}
      <div className={styles.chartsGrid}>
        <div className={`${styles.chartCard} ${styles.fullWidthChart}`}>
          <h3><Briefcase size={22} color="#4f46e5" /> Project Performance (Stacked Status)</h3>
          <div style={{ height: 350, width: '100%', minWidth: 0, minHeight: 0 }}>
            {projectData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Completed" stackId="a" fill={STATUS_COLORS['Completed']} radius={[0, 0, 4, 4]} barSize={32} />
                  <Bar dataKey="Pending" stackId="a" fill={STATUS_COLORS['Pending']} />
                  <Bar dataKey="Delayed" stackId="a" fill={STATUS_COLORS['Delayed']} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className={styles.noData}>No project data</div>}
          </div>
        </div>

        <div className={`${styles.chartCard} ${styles.fullWidthChart}`}>
          <h3><FileText size={22} color="#3b82f6" /> Project Performance Report</h3>
          <div className={styles.tableWrapper} style={{ maxHeight: '400px' }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Total Tasks</th>
                  <th>Completed</th>
                  <th>Pending</th>
                  <th>Delayed</th>
                </tr>
              </thead>
              <tbody>
                {allProjectData.map((p: any, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.total}</td>
                    <td><span style={{ color: '#10b981', fontWeight: 600 }}>{p.Completed}</span></td>
                    <td><span style={{ color: '#3b82f6', fontWeight: 600 }}>{p.Pending}</span></td>
                    <td>
                      {p.Delayed > 0 ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{p.Delayed}</span> : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. DOER PERFORMANCE & 5. WORK TYPE */}
      <div className={styles.grid2Col}>
        
        {/* Doer Table */}
        <div className={styles.chartCard} style={{ gridRow: 'span 2' }}>
          <h3><User size={22} color="#14b8a6" /> Doer Performance</h3>
          <div className={styles.tableWrapper} style={{ maxHeight: '600px' }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Doer</th>
                  <th>Total</th>
                  <th>Done</th>
                  <th>Pending</th>
                  <th>Delay %</th>
                </tr>
              </thead>
              <tbody>
                {doerTable.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td>{d.total}</td>
                    <td>{d.completed}</td>
                    <td>{d.pending}</td>
                    <td>
                      <span className={d.delayPercent > 20 ? styles.badgeDanger : d.delayPercent > 0 ? styles.badgeWarning : styles.badgeSuccess}>
                        {d.delayPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Work Type Table/Chart */}
        <div className={styles.chartCard}>
          <h3><FileText size={22} color="#f59e0b" /> Work Type Analysis</h3>
          <div className={styles.tableWrapper} style={{ maxHeight: '250px' }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Work Type</th>
                  <th>Count</th>
                  <th>Completion %</th>
                </tr>
              </thead>
              <tbody>
                {workTypeData.map((w, i) => (
                  <tr key={i}>
                    <td>{w.name}</td>
                    <td>{w.total}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                          <div style={{ width: `${w.completionPercent}%`, height: '100%', background: '#10b981', borderRadius: '3px' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{w.completionPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delay Ranking Chart */}
        <div className={styles.chartCard}>
          <h3><TrendingDown size={22} color="#ef4444" /> Delay Ranking (Top 5)</h3>
          <div style={{ height: 250, width: '100%', minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={delayRanking} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(val: any) => [`${val}%`, 'Delay Rate']} />
                <Bar dataKey="delayPercent" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20}>
                  <LabelList dataKey="delayPercent" position="right" formatter={(v: any) => `${v}%`} style={{ fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. TIMELINE PERFORMANCE & 6. DELAY ANALYSIS */}
      <div className={styles.grid2Col2}>
        
        {/* Timeline */}
        <div className={styles.chartCard} style={{ gridColumn: '1 / 3' }}>
          <h3><LineChartIcon size={22} color="#8b5cf6" /> Monthly Trend</h3>
          <div style={{ height: 320, width: '100%', minWidth: 0, minHeight: 0 }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Line name="Planned Tasks" type="monotone" dataKey="Planned" stroke="#94a3b8" strokeWidth={3} dot={{ r: 4 }} />
                  <Line name="Completed Tasks" type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={4} dot={{ r: 5 }} />
                  <Line name="Delayed Tasks" type="monotone" dataKey="Delayed" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className={styles.noData}>No timeline data</div>}
          </div>
        </div>

      </div>

      <div className={styles.grid3Col}>
        
        {/* Delay Analysis */}
        <div className={styles.chartCard}>
          <h3><Calendar size={22} color="#f97316" /> Delay Analysis</h3>
          <div className={styles.delayBlocks}>
            {delayAnalysis.map((d, i) => (
              <div key={i} className={styles.delayBlock}>
                <div className={styles.delayBlockHeader}>
                  <span className={styles.delayDot} style={{ background: COLORS[i] }}></span>
                  <span className={styles.delayLabel}>{d.name}</span>
                </div>
                <div className={styles.delayValue}>{d.percent}%</div>
                <div className={styles.delayCount}>{d.count} tasks</div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activity */}
        <div className={styles.chartCard}>
          <h3><Activity size={22} color="#3b82f6" /> Daily Activity (Today)</h3>
          <div className={styles.dailyGrid}>
            <div className={styles.dailyItem}>
              <span className={styles.dailyLabel}>Planned</span>
              <span className={styles.dailyVal}>{todayPlanned}</span>
            </div>
            <div className={styles.dailyItem}>
              <span className={styles.dailyLabel}>Completed</span>
              <span className={styles.dailyVal} style={{color: '#10b981'}}>{todayCompleted}</span>
            </div>
            <div className={styles.dailyItem}>
              <span className={styles.dailyLabel}>Pending</span>
              <span className={styles.dailyVal} style={{color: '#f59e0b'}}>{todayPending}</span>
            </div>
          </div>
        </div>
        
        {/* Top Performer Chart */}
        <div className={styles.chartCard}>
          <h3><Trophy size={22} color="#10b981" /> Top Performers</h3>
          <div style={{ height: 200, width: '100%', minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="completed" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                  <LabelList dataKey="completed" position="right" style={{ fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 8. PRODUCTIVITY HEATMAP */}
      <div className={`${styles.chartCard} ${styles.fullWidthChart}`} style={{ marginTop: '24px' }}>
        <h3><LayoutGrid size={22} color="#6366f1" /> Productivity Heatmap (Completed)</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Doer Name</th>
                {heatmapMonths.map(m => <th key={m} style={{ textAlign: 'center' }}>{m}</th>)}
                <th style={{ textAlign: 'center' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((d: any, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{d.doer}</td>
                  {heatmapMonths.map(m => {
                    const val = d[m] || 0;
                    const opacity = Math.min(val / 30, 1); // rough scaling
                    return (
                      <td key={m} style={{ textAlign: 'center', background: val > 0 ? `rgba(16, 185, 129, ${opacity * 0.8 + 0.1})` : 'transparent' }}>
                        {val > 0 ? <span style={{ fontWeight: 'bold', color: val > 15 ? 'white' : '#0f172a' }}>{val}</span> : '-'}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{d.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. PENDING WORK TRACKER */}
      <div className={`${styles.chartCard} ${styles.fullWidthChart}`} style={{ marginTop: '24px' }}>
        <h3><Clock size={22} color="#f59e0b" /> Pending Work Tracker</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Project</th>
                <th>Work Name</th>
                <th>Doer</th>
                <th>Planned Date</th>
                <th>Delay Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingTracker.length > 0 ? pendingTracker.map((p, i) => (
                <tr key={i}>
                  <td>
                    <span className={
                      p.priority === 'Overdue' ? styles.badgeDanger : 
                      p.priority === 'Due Today' ? styles.badgeWarning : 
                      styles.badgeInfo
                    }>
                      {p.priority}
                    </span>
                  </td>
                  <td>{p.project}</td>
                  <td>{p.workName}</td>
                  <td>{p.doer}</td>
                  <td>{p.plannedDate}</td>
                  <td>
                    {p.delay > 0 ? <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{p.delay} Days</span> : '-'}
                  </td>
                  <td>{p.status}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No pending tasks found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
