'use client';

import React from 'react';
import { CalendarDays, ClipboardCheck, FileText, MapPin, Users } from 'lucide-react';
import type { TodayPlanCounts } from '@/lib/dashboard-analytics';
import styles from './dashboard.module.css';

interface TodayPlanCardProps {
  counts: TodayPlanCounts;
}

export function TodayPlanCard({ counts }: TodayPlanCardProps) {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.cardTitleRow}>
        <CalendarDays size={18} color="#7c3aed" />
        <h3 className={styles.cardTitle}>Today&apos;s Plan</h3>
      </div>
      <div className={styles.summaryItem}>
        <div className={styles.summaryItemLeft}>
          <MapPin size={16} color="#2563eb" />
          <span>Site Visits</span>
        </div>
        <span className={styles.summaryItemValue}>{counts.siteVisits}</span>
      </div>
      <div className={styles.summaryItem}>
        <div className={styles.summaryItemLeft}>
          <Users size={16} color="#16a34a" />
          <span>Client Meetings</span>
        </div>
        <span className={styles.summaryItemValue}>{counts.clientMeetings}</span>
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
          <span>Selections Due</span>
        </div>
        <span className={styles.summaryItemValue}>{counts.selectionsDue}</span>
      </div>
    </div>
  );
}
