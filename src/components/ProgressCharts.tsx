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
import type { ProgressStats } from '@/lib/progressStats';
import styles from './ProgressCharts.module.css';

const PIE_COLORS = ['#10b981', '#cbd5e1'];

interface ProgressChartsProps {
  title: string;
  stats: ProgressStats;
  barColor?: string;
}

export function ProgressCharts({
  title,
  stats,
  barColor = '#3bafda',
}: ProgressChartsProps) {
  const barData = stats.categoryStats.map((cat) => ({
    name: cat.name,
    completed: cat.completed,
    pending: cat.pending,
    percent: cat.percent,
  }));

  return (
    <div className={styles.section}>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.title}>{title} — Overall</h3>
          <div className={styles.pieWrap}>
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
            <div className={styles.pieCenter}>
              <strong>{stats.percent}%</strong>
              <span>Complete</span>
            </div>
          </div>
          <p className={styles.caption}>
            {stats.completed} completed · {stats.pending} pending · {stats.total} total
          </p>
        </div>

        {barData.length > 0 && (
          <div className={styles.card}>
            <h3 className={styles.title}>{title} — By Category</h3>
            <div
              className={styles.barWrap}
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
                  <Bar dataKey="percent" fill={barColor} radius={[0, 6, 6, 0]} barSize={18}>
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
