'use client';

import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { getModuleConfig } from '../../constants/clientModules';
import { PanelShell, EmptyState, FileLinks, formatDate } from '../PanelShell';
import styles from '../../website.module.css';
import type { Audit } from '../../types';

export function AuditsPanel({ items }: { items: Audit[] }) {
  const config = getModuleConfig('audits');
  return (
    <PanelShell title={config.label} subtitle={config.subtitle}>
      {items.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={32} />}
          message="No audit reports shared for this project yet."
        />
      ) : (
        <div className={styles.moduleCardGrid}>
          {items.map((item) => (
            <div key={item.id} className={styles.moduleCard}>
              <div className={styles.moduleCardHeader}>
                <span className={styles.moduleCardTag}>{item.auditType}</span>
                <span className={styles.moduleCardRef}>{formatDate(item.auditDate)}</span>
              </div>
              <h3>Auditor: {item.auditorName || 'N/A'}</h3>
              {item.presentInMeeting && (
                <p className={styles.moduleCardSub}>
                  Present: {item.presentInMeeting}
                </p>
              )}
              {item.remarks && <p className={styles.moduleCardBody}>{item.remarks}</p>}
              <div className={styles.moduleCardFooter}>
                <strong>Documents</strong>
                <FileLinks files={item.documents} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
