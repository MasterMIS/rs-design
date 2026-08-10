'use client';

import React from 'react';
import type { ZoneCategoryRow } from '@/lib/dashboard-analytics';
import { formatProgressPercent } from '@/lib/progressStats';
import styles from './dashboard.module.css';

interface ZoneCategoryTableProps {
  title: string;
  rows: ZoneCategoryRow[];
}

export function ZoneCategoryTable({ title, rows }: ZoneCategoryTableProps) {
  return (
    <div>
      <h5 className={styles.subTableTitle}>{title}</h5>
      <div className={`${styles.tableWrap} ${styles.tableWrapZone}`}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>No {title.toLowerCase()} data.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Category</th>
                <th>Total</th>
                <th>Done</th>
                <th>In Progress</th>
                <th>Pending</th>
                <th>Due Today</th>
                <th>Overdue</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.zone}-${row.category}`}>
                  <td>{row.zone}</td>
                  <td>{row.category}</td>
                  <td>{row.total}</td>
                  <td>{row.completed}</td>
                  <td>{row.inProgress}</td>
                  <td>{row.pending}</td>
                  <td>{row.dueToday}</td>
                  <td className={row.overdue > 0 ? styles.overdueText : undefined}>
                    {row.overdue}
                  </td>
                  <td>
                    {formatProgressPercent(row.completed, row.total, row.percent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
