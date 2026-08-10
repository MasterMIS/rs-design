'use client';

import React from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface DashboardTableCardProps {
  title: string;
  icon?: React.ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardTableCard({
  title,
  icon,
  viewAllHref,
  viewAllLabel = 'View All',
  children,
  className,
}: DashboardTableCardProps) {
  return (
    <div className={`${styles.card} ${className || ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          {icon}
          <h3 className={styles.cardTitle}>{title}</h3>
        </div>
        {viewAllHref ? (
          <Link href={viewAllHref} className={styles.viewAllLink}>
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}
