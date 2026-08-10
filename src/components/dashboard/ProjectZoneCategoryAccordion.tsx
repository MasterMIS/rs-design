'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ProjectZoneCategoryBlock } from '@/lib/dashboard-analytics';
import { ZoneCategoryTable } from './ZoneCategoryTable';
import styles from './dashboard.module.css';

interface ProjectZoneCategoryAccordionProps {
  blocks: ProjectZoneCategoryBlock[];
  collapsible?: boolean;
}

export function ProjectZoneCategoryAccordion({
  blocks,
  collapsible = true,
}: ProjectZoneCategoryAccordionProps) {
  const defaultOpen = useMemo(() => {
    const set = new Set<string>();
    const limit = blocks.length <= 5 ? blocks.length : 3;
    blocks.slice(0, limit).forEach((b) => set.add(b.project));
    return set;
  }, [blocks]);

  const [openProjects, setOpenProjects] = useState<Set<string>>(defaultOpen);

  useEffect(() => {
    setOpenProjects(defaultOpen);
  }, [defaultOpen]);

  const toggle = (project: string) => {
    if (!collapsible) return;
    setOpenProjects((prev) => {
      const next = new Set(prev);
      if (next.has(project)) next.delete(project);
      else next.add(project);
      return next;
    });
  };

  if (blocks.length === 0) {
    return <div className={styles.emptyState}>No project data available.</div>;
  }

  return (
    <div className={styles.accordionList}>
      {blocks.map((block) => {
        const isOpen = !collapsible || openProjects.has(block.project);
        return (
          <div key={block.project} className={styles.projectBlock}>
            <div
              className={styles.projectBlockHeader}
              onClick={() => toggle(block.project)}
              role={collapsible ? 'button' : undefined}
              tabIndex={collapsible ? 0 : undefined}
              onKeyDown={(e) => {
                if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  toggle(block.project);
                }
              }}
            >
              <h4>{block.project}</h4>
              {collapsible ? (
                <ChevronDown
                  size={18}
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
              ) : null}
            </div>
            {isOpen ? (
              <div className={styles.projectBlockBody}>
                <ZoneCategoryTable title="Drawing Schedule" rows={block.drawingRows} />
                <ZoneCategoryTable title="Project Tracker" rows={block.trackerRows} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
