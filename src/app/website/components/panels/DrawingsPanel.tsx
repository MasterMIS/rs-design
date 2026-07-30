'use client';

import React from 'react';
import { PenTool, Link2 } from 'lucide-react';
import { getModuleConfig } from '../../constants/clientModules';
import { computeDrawingProgress } from '../../utils/progressStats';
import { ModuleProgressCharts } from '../ModuleProgressCharts';
import { PanelShell, EmptyState, StatusBadge, formatDate } from '../PanelShell';
import styles from '../../website.module.css';
import type { MergedDrawingRow } from '../../types';

export function DrawingsPanel({ items }: { items: MergedDrawingRow[] }) {
  const config = getModuleConfig('drawings');
  const progress = computeDrawingProgress(items);

  return (
    <PanelShell title={config.label} subtitle={config.subtitle}>
      {items.length === 0 ? (
        <EmptyState
          icon={<PenTool size={32} />}
          message="No drawing schedule items available yet."
        />
      ) : (
        <>
          <ModuleProgressCharts title="Drawing Schedule" stats={progress} />
          <div className={styles.dataTableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Drawing</th>
                  <th>Category</th>
                  <th>Plan Start</th>
                  <th>Plan End</th>
                  <th>Actual Start</th>
                  <th>Actual End</th>
                  <th>RS Status</th>
                  <th>Client Status</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.drawingName}</strong>
                      <span className={styles.tableSub}>{item.drawingNo}</span>
                    </td>
                    <td>{item.category}</td>
                    <td>{formatDate(item.planStartDate)}</td>
                    <td>{formatDate(item.planEndDate)}</td>
                    <td>{formatDate(item.actualStartDate)}</td>
                    <td>{formatDate(item.actualEndDate)}</td>
                    <td><StatusBadge label={item.rsDesignStatus} tone="info" /></td>
                    <td><StatusBadge label={item.clientStatus} tone="warning" /></td>
                    <td>
                      {item.drawingImage ? (
                        <a
                          href={item.drawingImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.tableLink}
                        >
                          <Link2 size={12} /> View
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
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
