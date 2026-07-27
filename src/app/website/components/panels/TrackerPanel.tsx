'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { getModuleConfig } from '../../constants/clientModules';
import { computeTrackerProgress } from '../../utils/progressStats';
import { ModuleProgressCharts } from '../ModuleProgressCharts';
import { PanelShell, EmptyState, formatDate } from '../PanelShell';
import styles from '../../website.module.css';
import type { MergedTrackerRow } from '../../types';

export function TrackerPanel({ items }: { items: MergedTrackerRow[] }) {
  const config = getModuleConfig('tracker');
  const progress = computeTrackerProgress(items);

  return (
    <PanelShell title={config.label} subtitle={config.subtitle}>
      {items.length === 0 ? (
        <EmptyState
          icon={<Activity size={32} />}
          message="No project tracker milestones available yet."
        />
      ) : (
        <>
          <ModuleProgressCharts title="Project Tracker" stats={progress} />
          <div className={styles.dataTableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Area</th>
                  <th>Category</th>
                  <th>TAT (days)</th>
                  <th>Planned Start</th>
                  <th>Planned End</th>
                  <th>Actual Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.taskName}</strong>
                      <span className={styles.tableSub}>{item.trackerId}</span>
                    </td>
                    <td>{item.areaName}</td>
                    <td>{item.category}</td>
                    <td>{item.tat || '—'}</td>
                    <td>{formatDate(item.startDate)}</td>
                    <td>{formatDate(item.endDate)}</td>
                    <td>{formatDate(item.actualDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PanelShell>
  );
}
