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
  lost_remark?: string;
}

export const SALES_MAX_STEP = 6;

export const SALES_PIPELINE_OPTS: PendingStepOptions = {
  maxStep: SALES_MAX_STEP,
};

export const SALES_STEP_NAMES: Record<number, string> = {
  1: 'Step-1 Send link',
  2: 'Step-2 Call and qualify',
  3: 'Step-3 Meeting and presentation',
  4: 'Step-4 Quotation and drawing',
  5: 'Step-5 Follow up',
  6: 'Step-6 Close - Win or Lost',
};

export const HRMS_STEP_NAMES: Record<number, string> = {
  1: 'Step-1 Calling followup',
  2: 'Step-2 Level 1 interview',
  3: 'Step-3 Level 2 interview',
  4: 'Step-4 Offer letter',
  5: 'Step-5 Joining',
};

export function getNextStepInfo(record: PipelineRecord, maxStep = 5) {
  if (!record.actual_1) return { step: 1, title: 'Step 1' };
  if (!record.actual_2) return { step: 2, title: 'Step 2' };
  if (!record.actual_3) return { step: 3, title: 'Step 3' };
  if (!record.actual_4) return { step: 4, title: 'Step 4' };
  if (!record.actual_5) return { step: 5, title: 'Step 5' };
  if (maxStep >= 6 && !record.actual_6) return { step: 6, title: 'Step 6' };
  return { step: maxStep + 1, title: 'Completed' };
}

export function isSalesLeadLost(record: PipelineRecord): boolean {
  return record.status_6 === 'Lost' || !!record.lost_remark?.trim();
}

export function isSalesLeadClosed(record: PipelineRecord): boolean {
  return !!record.actual_6?.trim();
}

export function isSalesLeadActive(record: PipelineRecord): boolean {
  return !isSalesLeadClosed(record) && !isSalesLeadLost(record);
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
  const diffHours = Math.floor((Math.abs(diffMs) / (1000 * 60 * 60)) % 24);
  const diffMinutes = Math.floor((Math.abs(diffMs) / (1000 * 60)) % 60);
  const diffSeconds = Math.floor((Math.abs(diffMs) / 1000) % 60);

  let timeText = '';
  if (diffDays > 0) timeText += `${diffDays}d `;
  if (diffHours > 0 || diffDays > 0) timeText += `${diffHours}h `;
  if (diffMinutes > 0 || diffHours > 0 || diffDays > 0) timeText += `${diffMinutes}m `;
  timeText += `${diffSeconds}s`;

  const isDelayed = diffMs < 0;

  const formattedPlannedDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(plannedDate);

  return {
    stepName: getStepName(step, stepNames),
    isDelayed,
    timeText: isDelayed ? `${timeText} delayed` : `${timeText} left`,
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
