'use client';

import React from 'react';
import { FileText, Link2 } from 'lucide-react';
import { getModuleConfig } from '../../constants/clientModules';
import { PanelShell, EmptyState, StatusBadge } from '../PanelShell';
import styles from '../../website.module.css';
import type { Quotation } from '../../types';

export function QuotationsPanel({ items }: { items: Quotation[] }) {
  const config = getModuleConfig('quotations');
  return (
    <PanelShell title={config.label} subtitle={config.subtitle}>
      {items.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          message="No quotations shared for this project yet."
        />
      ) : (
        <div className={styles.moduleCardGrid}>
          {items.map((item) => (
            <div key={item.id} className={styles.moduleCard}>
              <div className={styles.moduleCardHeader}>
                <StatusBadge label={`RS: ${item.statusRSDesign}`} tone="info" />
                <StatusBadge label={`Client: ${item.statusClient}`} tone="warning" />
              </div>
              <h3>{item.nameOfQuotation}</h3>
              <p className={styles.moduleCardSub}>Prepared for {item.nameOfPerson}</p>
              {item.remarks && <p className={styles.moduleCardBody}>{item.remarks}</p>}
              {item.documentUrl && (
                <div className={styles.moduleCardFooter}>
                  <a
                    href={item.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.clientFileLinkBtn}
                  >
                    <Link2 size={12} /> View Quotation
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
