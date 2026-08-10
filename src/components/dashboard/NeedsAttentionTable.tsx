'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatOverdueDays } from '@/lib/pc-dashboard';
import type { NeedsAttentionRow } from '@/lib/dashboard-analytics';
import { DashboardTableCard } from './DashboardTableCard';
import styles from './dashboard.module.css';

interface NeedsAttentionTableProps {
  rows: NeedsAttentionRow[];
}

export function NeedsAttentionTable({ rows }: NeedsAttentionTableProps) {
  return (
    <DashboardTableCard
      title="Needs Attention Today"
      icon={<AlertTriangle size={18} color="#dc2626" />}
      viewAllHref="/pc-dashboard"
    >
      <div className={styles.tableWrap}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>No delayed items need attention today.</div>
        ) : (
          <table className={`${styles.table} ${styles.tableAttention}`}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Project</th>
                <th>Issue</th>
                <th>Owner</th>
                <th className={styles.tableDelay}>Delay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.project}-${row.issue}-${index}`}>
                  <td title={row.project}>{row.project}</td>
                  <td title={row.issue}>{row.issue}</td>
                  <td>{row.owner}</td>
                  <td className={`${styles.tableDelay} ${styles.overdueText}`}>
                    {formatOverdueDays(row.delayDays)}
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
