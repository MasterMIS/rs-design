'use client';

import React from 'react';
import {
  CheckSquare,
  Layers3,
  CalendarDays,
  Users,
  FileText,
  ClipboardCheck,
  PenTool,
  Activity,
} from 'lucide-react';
import { CLIENT_MODULES } from '../constants/clientModules';
import styles from '../website.module.css';
import type { ClientModuleId, ModuleCounts } from '../types';

const MODULE_ICONS: Record<ClientModuleId, React.ReactNode> = {
  requirements: <CheckSquare size={18} />,
  selections: <Layers3 size={18} />,
  mom: <CalendarDays size={18} />,
  directory: <Users size={18} />,
  quotations: <FileText size={18} />,
  audits: <ClipboardCheck size={18} />,
  drawings: <PenTool size={18} />,
  tracker: <Activity size={18} />,
};

const MODULE_CARD_CLASS: Record<ClientModuleId, string> = {
  requirements: styles.statCardReq,
  selections: styles.statCardSel,
  mom: styles.statCardMom,
  directory: styles.statCardDir,
  quotations: styles.statCardQuo,
  audits: styles.statCardAud,
  drawings: styles.statCardDrw,
  tracker: styles.statCardTrk,
};

interface ModuleStatsRowProps {
  counts: ModuleCounts;
  activeTab: ClientModuleId;
  onSelect: (id: ClientModuleId) => void;
}

export function ModuleStatsRow({ counts, activeTab, onSelect }: ModuleStatsRowProps) {
  return (
    <div className={styles.statsSummaryRow}>
      {CLIENT_MODULES.map((mod) => (
        <button
          key={mod.id}
          type="button"
          className={`${styles.statCard} ${MODULE_CARD_CLASS[mod.id]} ${
            activeTab === mod.id ? styles.statCardActive : ''
          }`}
          onClick={() => onSelect(mod.id)}
        >
          <div className={styles.statIconBox}>{MODULE_ICONS[mod.id]}</div>
          <div className={styles.statData}>
            <h4>{counts[mod.countKey]}</h4>
            <p>{mod.shortLabel}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
