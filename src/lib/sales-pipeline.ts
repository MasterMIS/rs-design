/** Shared pipeline fields used by Sales leads and HRMS candidates. */
export interface PipelineRecord {
  actual_1?: string;
  actual_2?: string;
  actual_3?: string;
  actual_4?: string;
  actual_5?: string;
  actual_6?: string;
  planned_1?: string;
  planned_2?: string;
  planned_3?: string;
  planned_4?: string;
  planned_5?: string;
  planned_6?: string;
  status_1?: string;
  status_2?: string;
  status_3?: string;
  status_4?: string;
  status_5?: string;
  status_6?: string;
  next_follow_up_date_1?: string;
  next_follow_up_date_2?: string;
  next_follow_up_date_3?: string;
  next_follow_up_date_4?: string;
  next_follow_up_date_5?: string;
  remark_5?: string;
  lost_remark?: string;
}

export const SALES_MAX_STEP = 5;

export function normalizeSalesFollowUpDate(dateStr: string): string {
  const raw = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T12:00:00.000Z`;
  }
  return raw;
}

export const SALES_PIPELINE_OPTS: PendingStepOptions = {
  maxStep: SALES_MAX_STEP,
  normalizeFollowUpDate: normalizeSalesFollowUpDate,
};

export const SALES_STEP_NAMES: Record<number, string> = {
  1: 'Step 1 — Leads Qualification call',
  2: 'Step 2 — WhatsApp / Email / Physical meeting',
  3: 'Step 3 — Presentation & Ask Design',
  4: 'Step 4 — Send Quotation',
  5: 'Step 5 — Closure',
};

export const HRMS_STEP_NAMES: Record<number, string> = {
  1: 'Step-1 Calling followup',
  2: 'Step-2 Level 1 interview',
  3: 'Step-3 Level 2 interview',
  4: 'Step-4 Offer letter',
  5: 'Step-5 Joining',
};

export function isSalesLeadDisqualified(record: PipelineRecord): boolean {
  return record.status_1 === 'Disqualified';
}

export function getNextStepInfo(record: PipelineRecord, maxStep = 5) {
  if (!record.actual_1) return { step: 1, title: 'Step 1' };
  if (isSalesLeadDisqualified(record)) {
    return { step: maxStep + 1, title: 'Completed' };
  }
  if (!record.actual_2) return { step: 2, title: 'Step 2' };
  if (!record.actual_3) return { step: 3, title: 'Step 3' };
  if (!record.actual_4) return { step: 4, title: 'Step 4' };
  if (!record.actual_5) return { step: 5, title: 'Step 5' };
  return { step: maxStep + 1, title: 'Completed' };
}

export function isSalesLeadLost(
  record: PipelineRecord & { remark_5?: string; lost_remark?: string }
): boolean {
  const s5 = (record.status_5 || '').trim();
  if (s5.toLowerCase() === 'lost') return true;
  if (record.status_6?.trim().toLowerCase() === 'lost') return true;
  if (record.lost_remark?.trim()) return true;
  const completed = getNextStepInfo(record, SALES_MAX_STEP).step > SALES_MAX_STEP;
  if (
    completed &&
    record.actual_5?.trim() &&
    record.remark_5?.trim() &&
    s5.toLowerCase() !== 'won'
  ) {
    return true;
  }
  return false;
}

export function isSalesLeadClosed(record: PipelineRecord): boolean {
  const s5 = (record.status_5 || '').trim();
  if (s5.toLowerCase() === 'won') return !!record.actual_5?.trim();
  if (record.status_6?.trim().toLowerCase() === 'won') return true;
  if (!record.actual_5?.trim()) return false;
  if (s5.toLowerCase() === 'done' && !record.remark_5?.trim()) return true;
  return false;
}

export type SalesLeadOutcome = 'disqualified' | 'lost' | 'won';

/** Terminal outcome for completed leads (UI badges, filters). */
export function getSalesLeadOutcome(
  record: PipelineRecord & { remark_5?: string; lost_remark?: string }
): SalesLeadOutcome | null {
  if (isSalesLeadDisqualified(record)) return 'disqualified';
  if (isSalesLeadLost(record)) return 'lost';
  if (isSalesLeadClosed(record)) return 'won';
  if (getNextStepInfo(record, SALES_MAX_STEP).step <= SALES_MAX_STEP) return null;
  const s5 = (record.status_5 || '').trim().toLowerCase();
  if (s5 === 'lost') return 'lost';
  if (s5 === 'won') return 'won';
  if (s5 === 'done') return record.remark_5?.trim() ? 'lost' : 'won';
  return null;
}

export function isSalesLeadActive(record: PipelineRecord): boolean {
  return (
    !isSalesLeadClosed(record) &&
    !isSalesLeadLost(record) &&
    !isSalesLeadDisqualified(record)
  );
}

export function getStepName(step: number, names: Record<number, string> = SALES_STEP_NAMES) {
  return names[step] || 'Completed';
}

export interface PendingStepStatus {
  stepName: string;
  isDelayed: boolean;
  timeText: string;
  plannedDate: Date;
  formattedPlannedDate: string;
  step: number;
  isFollowUp: boolean;
}

export interface PendingStepOptions {
  now?: Date;
  stepNames?: Record<number, string>;
  maxStep?: number;
  /** HRMS uses date-only follow-ups with a noon UTC suffix. */
  normalizeFollowUpDate?: (dateStr: string) => string;
}

export function getPendingStepStatus(
  record: PipelineRecord,
  options: PendingStepOptions = {}
): PendingStepStatus | null {
  const maxStep = options.maxStep ?? 5;
  const info = getNextStepInfo(record, maxStep);
  if (info.step > maxStep) return null;

  const step = info.step;
  const stepNames = options.stepNames || SALES_STEP_NAMES;
  const currentStatus = record[`status_${step}` as keyof PipelineRecord];
  const nextFollowUpDateStr = record[`next_follow_up_date_${step}` as keyof PipelineRecord];

  let plannedDateStr = record[`planned_${step}` as keyof PipelineRecord];
  let isFollowUp = false;

  if (currentStatus === 'Next Follow Up' && nextFollowUpDateStr) {
    const raw = String(nextFollowUpDateStr);
    plannedDateStr = options.normalizeFollowUpDate
      ? options.normalizeFollowUpDate(raw)
      : raw;
    isFollowUp = true;
  }

  if (!plannedDateStr) return null;

  const plannedDate = new Date(plannedDateStr as string);
  if (Number.isNaN(plannedDate.getTime())) return null;

  const now = options.now || new Date();
  const diffMs = plannedDate.getTime() - now.getTime();
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  const isDelayed = diffMs < 0;
  const dayLabel = diffDays === 1 ? 'day' : 'days';
  const timeText = isDelayed
    ? `${diffDays} ${dayLabel} delayed`
    : `${diffDays} ${dayLabel} left`;

  const formattedPlannedDate = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  }).format(plannedDate);

  return {
    stepName: getStepName(step, stepNames),
    isDelayed,
    timeText,
    plannedDate,
    formattedPlannedDate,
    step,
    isFollowUp,
  };
}

export function normalizeHrmsFollowUpDate(dateStr: string): string {
  if (dateStr.length === 10) {
    return `${dateStr}T12:30:00.000Z`;
  }
  return dateStr;
}
