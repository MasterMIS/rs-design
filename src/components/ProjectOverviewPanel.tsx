'use client';

import React from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  Check,
  HardHat,
  MapPin,
} from 'lucide-react';
import styles from './ProjectOverviewPanel.module.css';

export interface ProjectOverviewData {
  name: string;
  locationLabel: string;
  category?: string;
  lastUpdated?: string;
  progressPercent: number;
  progressStatusLabel: string;
  targetCompletion?: string;
  daysRemaining: number | null;
  healthLabel: 'On Track' | 'At Risk' | 'Delayed';
  pendingApprovals: number;
  currentWorkTitle: string;
  currentWorkDetail: string;
  nextMilestoneTitle: string;
  nextMilestoneDue: string;
}

interface ProjectOverviewPanelProps {
  data: ProjectOverviewData;
  approvalsHref?: string;
}

export default function ProjectOverviewPanel({
  data,
  approvalsHref = '/quotations',
}: ProjectOverviewPanelProps) {
  const healthClass =
    data.healthLabel === 'On Track'
      ? styles.healthGood
      : data.healthLabel === 'At Risk'
        ? styles.healthWarn
        : styles.healthBad;

  const daysLabel =
    data.daysRemaining === null
      ? 'No target date'
      : data.daysRemaining < 0
        ? `${Math.abs(data.daysRemaining)} days overdue`
        : data.daysRemaining === 0
          ? 'Due today'
          : `${data.daysRemaining} Days Remaining`;

  return (
    <div className={styles.panel}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>{data.name}</h1>
          <div className={styles.subtitle}>
            {data.locationLabel ? (
              <>
                <MapPin size={14} />
                <span>
                  {data.locationLabel}
                  {data.category ? ` | ${data.category}` : ''}
                </span>
              </>
            ) : data.category ? (
              <span>{data.category}</span>
            ) : null}
          </div>
        </div>
        {data.lastUpdated ? (
          <div className={styles.lastUpdated}>Last Updated: {data.lastUpdated}</div>
        ) : null}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Project Progress</div>
          <div className={styles.progressValue}>{data.progressPercent}%</div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${data.progressPercent}%` }}
            />
          </div>
          <div className={styles.progressStatus}>{data.progressStatusLabel}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Target Completion</div>
          <div className={styles.targetValue}>{data.targetCompletion || '—'}</div>
          <div className={styles.statFooter}>{daysLabel}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Project Health</div>
          <div className={`${styles.healthBadge} ${healthClass}`}>
            <Check size={22} strokeWidth={3} />
          </div>
          <div className={`${styles.healthText} ${healthClass}`}>{data.healthLabel}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Pending Approvals</div>
          <div className={styles.approvalsValue}>{data.pendingApprovals}</div>
          <div className={styles.statFooter}>Items Awaiting Your Approval</div>
          <Link href={approvalsHref} className={styles.viewAllLink}>
            View All
          </Link>
        </div>
      </div>

      <div className={styles.infoRow}>
        <div className={styles.infoCard}>
          <div className={styles.statLabel}>Current Work</div>
          <div className={styles.infoBody}>
            <div className={`${styles.infoIcon} ${styles.workIcon}`}>
              <HardHat size={22} />
            </div>
            <div>
              <div className={styles.infoTitle}>{data.currentWorkTitle}</div>
              <div className={styles.infoDetail}>{data.currentWorkDetail}</div>
            </div>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.statLabel}>Next Milestone</div>
          <div className={styles.infoBody}>
            <div className={`${styles.infoIcon} ${styles.milestoneIcon}`}>
              <CalendarCheck size={22} />
            </div>
            <div>
              <div className={styles.infoTitle}>{data.nextMilestoneTitle}</div>
              <div className={styles.infoDetail}>
                Due Date:{' '}
                <span className={styles.dueDate}>{data.nextMilestoneDue}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
