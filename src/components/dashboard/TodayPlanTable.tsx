'use client';

import React from 'react';
import { CalendarDays } from 'lucide-react';
import type { TodayPlanRow } from '@/lib/dashboard-analytics';
import { DashboardTableCard } from './DashboardTableCard';
import styles from './dashboard.module.css';

interface TodayPlanTableProps {
  rows: TodayPlanRow[];
}

export function TodayPlanTable({ rows }: TodayPlanTableProps) {
  return (
    <DashboardTableCard
      title="Today's Plan"
      icon={<CalendarDays size={18} color="#7c3aed" />}
    >
      <div className={styles.tableWrap}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>Nothing scheduled for today.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Project</th>
                <th>Detail</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.type}-${row.project}-${index}`}>
                  <td>{row.type}</td>
                  <td>{row.project}</td>
                  <td>{row.detail}</td>
                  <td>{row.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardTableCard>
  );
}
