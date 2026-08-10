'use client';

import React from 'react';
import type { SummaryStatsRow } from '@/lib/dashboard-analytics';
import { formatProgressPercent } from '@/lib/progressStats';
import styles from './dashboard.module.css';

interface SummaryStatsTableProps {
  title: string;
  labelColumn: string;
  rows: SummaryStatsRow[];
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
}

export function SummaryStatsTable({
  title,
  labelColumn,
  rows,
  icon,
  accentColor,
  accentBg,
}: SummaryStatsTableProps) {
  return (
    <div
      className={styles.summaryTableBlock}
      style={{ borderTopColor: accentColor }}
    >
      <div
        className={styles.summaryTableHeader}
        style={{ background: accentBg }}
      >
        <div
          className={styles.summaryTableIcon}
          style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
        >
          {icon}
        </div>
        <div>
          <h5 className={styles.summaryTableTitle} style={{ color: accentColor }}>
            {title}
          </h5>
          <span className={styles.summaryTableSubtitle}>by {labelColumn}</span>
        </div>
      </div>
      <div className={`${styles.tableWrap} ${styles.tableWrapZone}`}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>No {title.toLowerCase()} data.</div>
        ) : (
          <table className={`${styles.table} ${styles.tableStatsCompact}`}>
            <colgroup>
              <col style={{ width: '36%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '22%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>{labelColumn}</th>
                <th className={styles.tableNum}>Total</th>
                <th className={styles.tableNum}>Done</th>
                <th className={styles.tableNum}>Pending</th>
                <th className={styles.tableNum}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td title={row.name}>{row.name}</td>
                  <td className={styles.tableNum}>{row.total}</td>
                  <td className={`${styles.tableNum} ${styles.doneCell}`}>
                    {row.completed}
                  </td>
                  <td className={styles.tableNum}>{row.pending}</td>
                  <td className={styles.tableNum}>
                    <div className={styles.statsProgressCell}>
                      <div className={styles.statsProgressTrack}>
                        <div
                          className={styles.statsProgressFill}
                          style={{
                            width: `${row.percent}%`,
                            background: accentColor,
                          }}
                        />
                      </div>
                      <span className={styles.statsProgressLabel}>
                        {formatProgressPercent(row.completed, row.total, row.percent)}
                      </span>
                    </div>
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
