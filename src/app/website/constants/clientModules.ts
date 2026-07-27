import type { ClientModuleId } from '../types';

export interface ClientModuleConfig {
  id: ClientModuleId;
  label: string;
  shortLabel: string;
  subtitle: string;
  countKey: keyof import('../types').ModuleCounts;
}

export const CLIENT_MODULES: ClientModuleConfig[] = [
  {
    id: 'requirements',
    label: 'Requirement',
    shortLabel: 'Requirements',
    subtitle: 'View project requirements, categories, and shared attachments.',
    countKey: 'requirements',
  },
  {
    id: 'selections',
    label: 'Selection',
    shortLabel: 'Selections',
    subtitle: 'Review material and product selections by area and vendor.',
    countKey: 'selections',
  },
  {
    id: 'mom',
    label: 'MOM',
    shortLabel: 'Meetings',
    subtitle: 'Access minutes of meetings, locations, and discussion notes.',
    countKey: 'mom',
  },
  {
    id: 'directory',
    label: 'Directory',
    shortLabel: 'Directory',
    subtitle: 'Browse project contacts organized by team and company.',
    countKey: 'directory',
  },
  {
    id: 'quotations',
    label: 'Quotation',
    shortLabel: 'Quotations',
    subtitle: 'View shared quotations and approval status updates.',
    countKey: 'quotations',
  },
  {
    id: 'audits',
    label: 'Audit',
    shortLabel: 'Audits',
    subtitle: 'Review audit reports, attendees, and supporting documents.',
    countKey: 'audits',
  },
  {
    id: 'drawings',
    label: 'Drawing Schedule',
    shortLabel: 'Drawings',
    subtitle: 'Track drawing submissions, planned dates, and review status.',
    countKey: 'drawings',
  },
  {
    id: 'tracker',
    label: 'Project Tracker',
    shortLabel: 'Tracker',
    subtitle: 'Monitor project milestones, tasks, and completion dates.',
    countKey: 'tracker',
  },
];

export function getModuleConfig(id: ClientModuleId) {
  return CLIENT_MODULES.find((m) => m.id === id)!;
}
