'use client';

import React from 'react';
import { CLIENT_MODULES } from '../constants/clientModules';
import styles from '../website.module.css';
import type { ClientModuleId, ModuleCounts } from '../types';

interface ModuleNavProps {
  activeTab: ClientModuleId;
  counts: ModuleCounts;
  onSelect: (id: ClientModuleId) => void;
}

export function ModuleNav({ activeTab, counts, onSelect }: ModuleNavProps) {
  return (
    <nav className={styles.moduleNav}>
      <div className={styles.moduleNavInner}>
        {CLIENT_MODULES.map((mod) => (
          <button
            key={mod.id}
            type="button"
            className={`${styles.moduleNavBtn} ${
              activeTab === mod.id ? styles.moduleNavBtnActive : ''
            }`}
            onClick={() => onSelect(mod.id)}
          >
            {mod.label}
            <span className={styles.moduleNavCount}>{counts[mod.countKey]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
