'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  CartesianGrid,
} from 'recharts';
import styles from '../website.module.css';
import type { ProgressStats } from '../utils/progressStats';

const PIE_COLORS = ['#10b981', '#cbd5e1'];

interface ModuleProgressChartsProps {
  title: string;
  stats: ProgressStats;
  compact?: boolean;
  showBar?: boolean;
}

export function ModuleProgressCharts({
  title,
  stats,
  compact = false,
  showBar = true,
}: ModuleProgressChartsProps) {
  const barData = stats.categoryStats.map((cat) => ({
    name: cat.name,
    completed: cat.completed,
    pending: cat.pending,
    percent: cat.percent,
  }));

  if (compact) {
    return (
      <div className={styles.progressCompactCard}>
        <div className={styles.progressCompactHeader}>
          <h4>{title}</h4>
          <span className={styles.progressCompactPercent}>{stats.percent}%</span>
        </div>
        <div className={styles.progressCompactChart}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={42}
                paddingAngle={2}
              >
                {stats.pieData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [value ?? 0, '']}
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className={styles.progressCompactMeta}>
          {stats.completed} of {stats.total} completed
        </p>
      </div>
    );
  }

  return (
    <div className={styles.progressChartsSection}>
      <div className={styles.progressChartsGrid}>
        <div className={styles.progressChartCard}>
          <h3 className={styles.progressChartTitle}>{title} — Overall</h3>
          <div className={styles.progressPieWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {stats.pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.progressPieCenter}>
              <strong>{stats.percent}%</strong>
              <span>Complete</span>
            </div>
          </div>
          <p className={styles.progressChartCaption}>
            {stats.completed} completed · {stats.pending} pending · {stats.total} total
          </p>
        </div>

        {showBar && barData.length > 0 && (
          <div className={styles.progressChartCard}>
            <h3 className={styles.progressChartTitle}>{title} — By Category</h3>
            <div
              className={styles.progressBarWrap}
              style={{ height: Math.max(220, barData.length * 36) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11, fill: '#475569' }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'percent') return [`${value ?? 0}%`, 'Completion'];
                      return [value ?? 0, name === 'completed' ? 'Completed' : 'Pending'];
                    }}
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Bar dataKey="percent" fill="#3bafda" radius={[0, 6, 6, 0]} barSize={18}>
                    <LabelList
                      dataKey="percent"
                      position="right"
                      formatter={(val) => `${val ?? 0}%`}
                      style={{ fontSize: 11, fontWeight: 700, fill: '#475569' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
