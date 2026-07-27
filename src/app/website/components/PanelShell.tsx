'use client';

import React from 'react';
import styles from '../website.module.css';

interface PanelShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function PanelShell({ title, subtitle, children }: PanelShellProps) {
  return (
    <div className={styles.tabSection}>
      <div className={styles.sectionHeader}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className={styles.emptyContentState}>
      {icon}
      <p>{message}</p>
    </div>
  );
}

interface FileLinksProps {
  files: Array<{ title?: string; name?: string; url: string }>;
}

export function FileLinks({ files }: FileLinksProps) {
  if (!files?.length) {
    return <span className={styles.noFilesText}>No files attached</span>;
  }
  return (
    <div className={styles.docFilesContainer}>
      {files.map((file, idx) => (
        <a
          key={idx}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.clientFileLinkBtn}
        >
          {file.title || file.name || 'Download'}
        </a>
      ))}
    </div>
  );
}

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'success' | 'warning' | 'neutral' | 'info';
}) {
  return (
    <span className={`${styles.statusBadge} ${styles[`statusBadge_${tone}`]}`}>
      {label}
    </span>
  );
}

export function formatDate(dateStr?: string) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
