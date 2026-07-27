'use client';

import React from 'react';
import { MapPin, CalendarDays } from 'lucide-react';
import { ModuleProgressCharts } from './ModuleProgressCharts';
import styles from '../website.module.css';
import type { Project } from '../types';
import type { ProgressStats } from '../utils/progressStats';

interface ProjectHeroProps {
  project: Project | undefined;
  projectName: string;
  progressPercent: number;
  trackerProgress: ProgressStats;
  drawingProgress: ProgressStats;
}

export function ProjectHero({
  project,
  projectName,
  progressPercent,
  trackerProgress,
  drawingProgress,
}: ProjectHeroProps) {
  const primarySite = project?.sites?.[0];

  return (
    <>
      <section className={styles.projectHero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <span className={styles.projectCategoryBadge}>
              {project?.basicInfo?.category || 'Design Portfolio'}
            </span>
            <h2>{projectName ? projectName.toUpperCase() : 'NO ACTIVE PROJECT'}</h2>
            <p className={styles.projectDesc}>
              {project?.basicInfo?.description ||
                'Your dedicated project workspace for design, selections, and progress tracking.'}
            </p>
            <div className={styles.heroMetaGrid}>
              <div className={styles.metaBox}>
                <MapPin size={14} />
                <span>
                  {primarySite?.city || primarySite?.address || 'Site address pending'}
                </span>
              </div>
              <div className={styles.metaBox}>
                <CalendarDays size={14} />
                <span>
                  Est. Completion:{' '}
                  {project?.basicInfo?.expectedEndDate || 'Timeline unscheduled'}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.radialCard}>
              <div className={styles.radialInfo}>
                <h3>{progressPercent}%</h3>
                <p>Project Progress</p>
              </div>
              <div className={styles.radialProgressTrack}>
                <div
                  className={styles.radialProgressFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.heroProgressStrip}>
        <ModuleProgressCharts
          title="Project Tracker"
          stats={trackerProgress}
          compact
        />
        <ModuleProgressCharts
          title="Drawing Schedule"
          stats={drawingProgress}
          compact
        />
      </div>
    </>
  );
}
