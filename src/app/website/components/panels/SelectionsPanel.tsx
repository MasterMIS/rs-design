'use client';

import React from 'react';
import { Layers3 } from 'lucide-react';
import { getModuleConfig } from '../../constants/clientModules';
import { PanelShell, EmptyState, FileLinks } from '../PanelShell';
import styles from '../../website.module.css';
import type { Selection } from '../../types';

export function SelectionsPanel({ items }: { items: Selection[] }) {
  const config = getModuleConfig('selections');
  return (
    <PanelShell title={config.label} subtitle={config.subtitle}>
      {items.length === 0 ? (
        <EmptyState
          icon={<Layers3 size={32} />}
          message="No selections shared for this project yet."
        />
      ) : (
        <div className={styles.moduleCardGrid}>
          {items.map((item) => (
            <div key={item.id} className={styles.moduleCard}>
              <div className={styles.moduleCardHeader}>
                <span className={styles.moduleCardTag}>{item.areaName}</span>
                <span className={styles.moduleCardRef}>{item.vendor || 'Vendor TBD'}</span>
              </div>
              <h3>{item.productName}</h3>
              {item.remarks && <p className={styles.moduleCardBody}>{item.remarks}</p>}
              <div className={styles.moduleCardFooter}>
                <strong>Attachments</strong>
                <FileLinks files={item.files} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
