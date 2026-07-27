'use client';

import React from 'react';
import type { ClientModuleId } from '../types';
import { RequirementsPanel } from './panels/RequirementsPanel';
import { SelectionsPanel } from './panels/SelectionsPanel';
import { MomPanel } from './panels/MomPanel';
import { DirectoryPanel } from './panels/DirectoryPanel';
import { QuotationsPanel } from './panels/QuotationsPanel';
import { AuditsPanel } from './panels/AuditsPanel';
import { DrawingsPanel } from './panels/DrawingsPanel';
import { TrackerPanel } from './panels/TrackerPanel';
import type {
  Audit,
  DirectoryEntry,
  MergedDrawingRow,
  MergedTrackerRow,
  MOMEntry,
  Quotation,
  Requirement,
  Selection,
} from '../types';

interface ModulePanelRouterProps {
  activeTab: ClientModuleId;
  filtered: {
    requirements: Requirement[];
    selections: Selection[];
    momList: MOMEntry[];
    directory: DirectoryEntry[];
    quotations: Quotation[];
    audits: Audit[];
  };
  mergedDrawings: MergedDrawingRow[];
  mergedTracker: MergedTrackerRow[];
}

export function ModulePanelRouter({
  activeTab,
  filtered,
  mergedDrawings,
  mergedTracker,
}: ModulePanelRouterProps) {
  switch (activeTab) {
    case 'requirements':
      return <RequirementsPanel items={filtered.requirements} />;
    case 'selections':
      return <SelectionsPanel items={filtered.selections} />;
    case 'mom':
      return <MomPanel items={filtered.momList} />;
    case 'directory':
      return <DirectoryPanel items={filtered.directory} />;
    case 'quotations':
      return <QuotationsPanel items={filtered.quotations} />;
    case 'audits':
      return <AuditsPanel items={filtered.audits} />;
    case 'drawings':
      return <DrawingsPanel items={mergedDrawings} />;
    case 'tracker':
      return <TrackerPanel items={mergedTracker} />;
    default:
      return null;
  }
}
