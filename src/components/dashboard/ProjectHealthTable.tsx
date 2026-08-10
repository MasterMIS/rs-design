'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import type { HealthStatus, ProjectHealthRow } from '@/lib/dashboard-analytics';
import { DashboardTableCard } from './DashboardTableCard';
import styles from './dashboard.module.css';

interface ProjectHealthTableProps {
  rows: ProjectHealthRow[];
  onSelectProject?: (project: string) => void;
}

function StatusDot({ status }: { status: HealthStatus }) {
  const className =
    status === 'good'
      ? styles.statusGood
      : status === 'warning'
        ? styles.statusWarning
        : styles.statusCritical;

  return <span className={`${styles.statusDot} ${className}`} title={status} />;
}

export function ProjectHealthTable({ rows, onSelectProject }: ProjectHealthTableProps) {
  return (
    <DashboardTableCard
      title="Project Health Overview"
      icon={<Activity size={18} color="#64748b" />}
      viewAllHref="/projects"
    >
      <div className={styles.tableWrap}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>No projects in scope.</div>
        ) : (
          <table className={`${styles.table} ${styles.tableHealth}`}>
            <colgroup>
              <col className={styles.colLabelWide} />
              <col className={styles.colProgress} />
              <col className={styles.colStatusNarrow} span={4} />
            </colgroup>
            <thead>
              <tr>
                <th>Project</th>
                <th>Progress</th>
                <th className={styles.statusCenter}>Schedule</th>
                <th className={styles.statusCenter}>Drawings</th>
                <th className={styles.statusCenter}>Selections</th>
                <th className={styles.statusCenter}>Site</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.project}>
                  <td>
                    {onSelectProject ? (
                      <button
                        type="button"
                        className={styles.projectLinkBtn}
                        onClick={() => onSelectProject(row.project)}
                      >
                        {row.project}
                      </button>
                    ) : (
                      row.project
                    )}
                  </td>
                  <td>
                    <div className={styles.progressCell}>
                      <div className={styles.progressBarTrack}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${row.progressPercent}%` }}
                        />
                      </div>
                      <span className={styles.progressPercent}>{row.progressPercent}%</span>
                    </div>
                  </td>
                  <td className={styles.statusCenter}>
                    <StatusDot status={row.scheduleStatus} />
                  </td>
                  <td className={styles.statusCenter}>
                    <StatusDot status={row.drawingsStatus} />
                  </td>
                  <td className={styles.statusCenter}>
                    <StatusDot status={row.selectionsStatus} />
                  </td>
                  <td className={styles.statusCenter}>
                    <StatusDot status={row.siteStatus} />
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
