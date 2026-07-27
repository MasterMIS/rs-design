'use client';

import React from 'react';
import { CalendarDays, MapPin, Link2 } from 'lucide-react';
import { getModuleConfig } from '../../constants/clientModules';
import { PanelShell, EmptyState, formatDate } from '../PanelShell';
import styles from '../../website.module.css';
import type { MOMEntry } from '../../types';

export function MomPanel({ items }: { items: MOMEntry[] }) {
  const config = getModuleConfig('mom');
  return (
    <PanelShell title={config.label} subtitle={config.subtitle}>
      {items.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={32} />}
          message="No meeting minutes shared for this project yet."
        />
      ) : (
        <div className={styles.momContainerList}>
          {items.map((mom) => (
            <div key={mom.id} className={styles.momBlockItem}>
              <div className={styles.momLeftMeta}>
                <span className={styles.momDateBox}>
                  {formatDate(mom.meetingDate).split(' ')[0]}
                </span>
                <span className={styles.momYearBox}>
                  {mom.meetingDate
                    ? new Date(mom.meetingDate).getFullYear()
                    : ''}
                </span>
              </div>
              <div className={styles.momRightContent}>
                <div className={styles.momItemHeader}>
                  <h3>{mom.purpose}</h3>
                  {mom.documents && (
                    <a
                      href={mom.documents}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.momDownloadBtn}
                    >
                      <Link2 size={13} /> Download MOM
                    </a>
                  )}
                </div>
                <div className={styles.momMetaBrief}>
                  <span className={styles.momBriefDetail}>
                    <MapPin size={12} /> {mom.location || 'Location not specified'}
                  </span>
                  <span className={styles.momBriefDetail}>
                    <CalendarDays size={12} /> {formatDate(mom.meetingDate)}
                  </span>
                </div>
                {mom.remarks && (
                  <div className={styles.momRemarksField}>
                    <strong>Discussion Notes</strong>
                    <p>{mom.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
