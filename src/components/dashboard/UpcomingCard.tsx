'use client';

import React from 'react';
import { CalendarDays, ClipboardCheck, FileText } from 'lucide-react';
import type { Upcoming7DayCounts } from '@/lib/dashboard-analytics';
import styles from './dashboard.module.css';

interface UpcomingCardProps {
  counts: Upcoming7DayCounts;
}

export function UpcomingCard({ counts }: UpcomingCardProps) {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.cardTitleRow}>
        <CalendarDays size={18} color="#7c3aed" />
        <h3 className={styles.cardTitle}>Upcoming 7 Days</h3>
      </div>
      <div className={styles.summaryItem}>
        <div className={styles.summaryItemLeft}>
          <FileText size={16} color="#7c3aed" />
          <span>Drawings Due</span>
        </div>
        <span className={styles.summaryItemValue}>{counts.drawingsDue}</span>
      </div>
      <div className={styles.summaryItem}>
        <div className={styles.summaryItemLeft}>
          <ClipboardCheck size={16} color="#ea580c" />
          <span>Selections</span>
        </div>
        <span className={styles.summaryItemValue}>{counts.selections}</span>
      </div>
    </div>
  );
}
