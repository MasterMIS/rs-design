'use client';

import React from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface DashboardKpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  viewAllHref?: string;
}

export function DashboardKpiCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  viewAllHref,
}: DashboardKpiCardProps) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTop}>
        <div>
          <div className={styles.kpiValue}>{value}</div>
          <div className={styles.kpiLabel}>{label}</div>
        </div>
        <div
          className={styles.kpiIcon}
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      {viewAllHref ? (
        <div className={styles.kpiFooter}>
          <Link href={viewAllHref} className={styles.viewAllLink}>
            View all
          </Link>
        </div>
      ) : null}
    </div>
  );
}

interface KpiItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  viewAllHref?: string;
}

interface DashboardKpiGridProps {
  items: KpiItem[];
}

export function DashboardKpiGrid({ items }: DashboardKpiGridProps) {
  return (
    <div className={styles.kpiGrid}>
      {items.map((item) => (
        <DashboardKpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}
