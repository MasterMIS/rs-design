'use client';

import React from 'react';
import { Users } from 'lucide-react';
import type { TeamWorkloadRow } from '@/lib/dashboard-analytics';
import { DashboardTableCard } from './DashboardTableCard';
import styles from './dashboard.module.css';

interface TeamWorkloadTableProps {
  rows: TeamWorkloadRow[];
}

export function TeamWorkloadTable({ rows }: TeamWorkloadTableProps) {
  return (
    <DashboardTableCard title="Team Workload" icon={<Users size={18} color="#7c3aed" />}>
      <div className={styles.tableWrap}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>No workload data available.</div>
        ) : (
          <table className={`${styles.table} ${styles.tableWorkload}`}>
            <colgroup>
              <col className={styles.colMember} />
              <col span={3} />
            </colgroup>
            <thead>
              <tr>
                <th>Team Member</th>
                <th className={styles.tableNum}>Open Tasks</th>
                <th className={styles.tableNum}>Due Today</th>
                <th className={styles.tableNum}>Overdue</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((row) => (
                <tr key={row.doer}>
                  <td title={row.doer}>{row.doer}</td>
                  <td className={styles.tableNum}>{row.openTasks}</td>
                  <td className={styles.tableNum}>{row.dueToday}</td>
                  <td
                    className={`${styles.tableNum} ${row.overdue > 0 ? styles.overdueText : ''}`}
                  >
                    {row.overdue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardTableCard>
  );
}
