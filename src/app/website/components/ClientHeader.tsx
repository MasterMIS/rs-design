'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building, ShieldCheck, ArrowLeft, LogOut } from 'lucide-react';
import styles from '../website.module.css';
import type { Project } from '../types';

interface ClientHeaderProps {
  user: {
    role: string;
    name?: string;
    projectName?: string;
  } | null;
  projectsList: Project[];
  selectedProjectName: string;
  onProjectChange: (name: string) => void;
  onLogout: () => void;
}

export function ClientHeader({
  user,
  projectsList,
  selectedProjectName,
  onProjectChange,
  onLogout,
}: ClientHeaderProps) {
  const router = useRouter();

  return (
    <header className={styles.mainHeader}>
      <div className={styles.logoGroup}>
        <div className={styles.logoBox}>
          <img src="/logo.png" alt="RSDesign Logo" className={styles.brandLogo} />
        </div>
        <div className={styles.logoText}>
          <h1>Ramesh Singhal Design</h1>
          <span>Client Portal</span>
        </div>
      </div>

      <div className={styles.headerControls}>
        {user?.role !== 'Client' ? (
          <div className={styles.previewSelector}>
            <span className={styles.previewTag}>
              <ShieldCheck size={12} /> Admin Preview
            </span>
            <select
              value={selectedProjectName}
              onChange={(e) => onProjectChange(e.target.value)}
              className={styles.projectDropdown}
            >
              {projectsList.map((p) => (
                <option key={p.id} value={p.basicInfo.name}>
                  {p.basicInfo.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className={styles.clientBrandTitle}>
            <Building size={14} />
            <span>
              Project: <strong>{user.projectName}</strong>
            </span>
          </div>
        )}

        <div className={styles.headerActionBtns}>
          {user?.role !== 'Client' && (
            <button
              type="button"
              onClick={() => router.push('/')}
              className={styles.backToErpBtn}
            >
              <ArrowLeft size={14} />
              <span>Back to ERP</span>
            </button>
          )}
          <button type="button" onClick={onLogout} className={styles.logoutBtn}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
