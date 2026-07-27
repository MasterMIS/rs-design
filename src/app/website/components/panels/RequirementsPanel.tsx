'use client';

import React from 'react';
import { CheckSquare } from 'lucide-react';
import { getModuleConfig } from '../../constants/clientModules';
import { PanelShell, EmptyState, FileLinks } from '../PanelShell';
import styles from '../../website.module.css';
import type { Requirement } from '../../types';

export function RequirementsPanel({ items }: { items: Requirement[] }) {
  const config = getModuleConfig('requirements');
  return (
    <PanelShell title={config.label} subtitle={config.subtitle}>
      {items.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={32} />}
          message="No requirements shared for this project yet."
        />
      ) : (
        <div className={styles.moduleCardGrid}>
          {items.map((item) => (
            <div key={item.id} className={styles.moduleCard}>
              <div className={styles.moduleCardHeader}>
                <span className={styles.moduleCardTag}>{item.category}</span>
                {item.requirementNo && (
                  <span className={styles.moduleCardRef}>{item.requirementNo}</span>
                )}
              </div>
              <h3>{item.title}</h3>
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
