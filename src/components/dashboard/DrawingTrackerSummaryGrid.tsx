'use client';

import React from 'react';
import {
  Activity,
  Briefcase,
  FolderKanban,
  Layers,
  MapPin,
  PenTool,
} from 'lucide-react';
import type { SummaryStatsRow } from '@/lib/dashboard-analytics';
import { SummaryStatsTable } from './SummaryStatsTable';
import styles from './dashboard.module.css';

export interface DrawingTrackerSummaryData {
  drawingByProject: SummaryStatsRow[];
  trackerByProject: SummaryStatsRow[];
  drawingByCategory: SummaryStatsRow[];
  trackerByCategory: SummaryStatsRow[];
  drawingByZone: SummaryStatsRow[];
  trackerByZone: SummaryStatsRow[];
}

interface DrawingTrackerSummaryGridProps {
  data: DrawingTrackerSummaryData;
}

const TABLE_THEMES = {
  drawingProject: {
    icon: <Briefcase size={18} />,
    accentColor: '#6366f1',
    accentBg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
  },
  trackerProject: {
    icon: <Activity size={18} />,
    accentColor: '#059669',
    accentBg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
  },
  drawingCategory: {
    icon: <Layers size={18} />,
    accentColor: '#7c3aed',
    accentBg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
  },
  trackerCategory: {
    icon: <FolderKanban size={18} />,
    accentColor: '#ea580c',
    accentBg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
  },
  drawingZone: {
    icon: <MapPin size={18} />,
    accentColor: '#0ea5e9',
    accentBg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
  },
  trackerZone: {
    icon: <PenTool size={18} />,
    accentColor: '#db2777',
    accentBg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
  },
} as const;

export function DrawingTrackerSummaryGrid({ data }: DrawingTrackerSummaryGridProps) {
  const rows = [
    {
      drawing: {
        title: 'Drawing',
        label: 'Project',
        rows: data.drawingByProject,
        theme: TABLE_THEMES.drawingProject,
      },
      tracker: {
        title: 'Tracker',
        label: 'Project',
        rows: data.trackerByProject,
        theme: TABLE_THEMES.trackerProject,
      },
    },
    {
      drawing: {
        title: 'Drawing',
        label: 'Category',
        rows: data.drawingByCategory,
        theme: TABLE_THEMES.drawingCategory,
      },
      tracker: {
        title: 'Tracker',
        label: 'Category',
        rows: data.trackerByCategory,
        theme: TABLE_THEMES.trackerCategory,
      },
    },
    {
      drawing: {
        title: 'Drawing',
        label: 'Zone',
        rows: data.drawingByZone,
        theme: TABLE_THEMES.drawingZone,
      },
      tracker: {
        title: 'Tracker',
        label: 'Zone',
        rows: data.trackerByZone,
        theme: TABLE_THEMES.trackerZone,
      },
    },
  ];

  return (
    <section className={styles.summaryGridSection}>
      <h3 className={styles.sectionTitle}>Drawing &amp; Tracker Overview</h3>
      <div className={styles.summaryGrid}>
        {rows.map((row, index) => (
          <div key={index} className={styles.summaryGridRow}>
            <SummaryStatsTable
              title={row.drawing.title}
              labelColumn={row.drawing.label}
              rows={row.drawing.rows}
              icon={row.drawing.theme.icon}
              accentColor={row.drawing.theme.accentColor}
              accentBg={row.drawing.theme.accentBg}
            />
            <SummaryStatsTable
              title={row.tracker.title}
              labelColumn={row.tracker.label}
              rows={row.tracker.rows}
              icon={row.tracker.theme.icon}
              accentColor={row.tracker.theme.accentColor}
              accentBg={row.tracker.theme.accentBg}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
