export const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'] as const;

export const CHECKLIST_CATEGORIES = [
  'Tax & statutory',
  'Licences & registrations',
  'Corporation',
  'Electricity bill payment',
  'Property & utilities',
  'Khajna payment',
  'Insurance',
  'Insurance renewal',
  'Vehicles',
  'Banking & finance',
  'SIP payment',
  'Domain name renewal',
  'IT & subscriptions',
  'Marketing',
  'Administration & reviews',
  'Personal & fees',
] as const;

export function allowsMultipleDueDates(frequency?: string): boolean {
  return frequency === 'Weekly' || frequency === 'Monthly' || frequency === 'Quarterly' || frequency === 'Yearly';
}

export type Frequency = (typeof FREQUENCIES)[number];

export const MASTER_HEADERS = [
  'task_id',
  'category',
  'task',
  'doer_name',
  'department',
  'frequency',
  'due_date',
  'created_at',
] as const;

export const CHECKLIST_HEADERS = [
  'task_id',
  'occurrence_date',
  'completed_at',
  'completed_by',
  'status',
] as const;

export type MasterTask = {
  rowIndex: number;
  task_id: string;
  category: string;
  task: string;
  doer_name: string;
  department: string;
  frequency: string;
  due_date: string;
  created_at: string;
};

export type CompletionRecord = {
  rowIndex: number;
  task_id: string;
  occurrence_date: string;
  completed_at: string;
  completed_by: string;
  status: string;
};

export type ChecklistViewRow = {
  task_id: string;
  category: string;
  task: string;
  doer_name: string;
  department: string;
  frequency: string;
  occurrence_date: string;
  status: 'Pending' | 'Overdue' | 'Completed';
  completed_at: string;
  completed_by: string;
  completionRowIndex: number | null;
  isCurrent: boolean;
};

export function normalizeFrequency(value?: string): Frequency | null {
  const match = FREQUENCIES.find((item) => item.toLowerCase() === value?.trim().toLowerCase());
  return match ?? null;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseSheetDate(dateStr?: string): Date | null {
  if (!dateStr?.trim()) return null;
  const trimmed = dateStr.trim();

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return validDate(Number(slash[3]), Number(slash[2]), Number(slash[1]));
  }

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  return null;
}

function validDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatSheetDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${yearOf(date)}`;
}

export function formatDisplayDate(dateStr?: string): string {
  const parsed = parseSheetDate(dateStr);
  if (!parsed) return dateStr?.trim() || '';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = MONTHS[parsed.getMonth()];
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

export function formatCompletedAt(value?: string): string {
  if (!value?.trim()) return '';
  const match = value.trim().match(/^(\d{1,2}\/\d{1,2}\/\d{4})([\s\S]*)$/);
  if (!match) return value.trim();
  return `${formatDisplayDate(match[1])}${match[2]}`;
}

function yearOf(date: Date) {
  return date.getFullYear();
}

export function sheetDateToIso(dateStr?: string): string {
  const parsed = parseSheetDate(dateStr);
  if (!parsed) return '';
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
}

export function datesMatch(left?: string, right?: string): boolean {
  const a = parseSheetDate(left);
  const b = parseSheetDate(right);
  if (!a || !b) return (left || '').trim() === (right || '').trim() && !!(left || '').trim();
  return a.getTime() === b.getTime();
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const targetMonth = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(day, lastDay));
}

function avoidSunday(date: Date, frequency: Frequency): Date {
  if (frequency !== 'Monthly' && frequency !== 'Quarterly' && frequency !== 'Yearly') return date;
  if (date.getDay() !== 0) return date;
  return addDays(date, -1);
}

function occurrenceAt(anchor: Date, frequency: Frequency, stepIndex: number): Date {
  switch (frequency) {
    case 'Daily':
      return addDays(anchor, stepIndex);
    case 'Weekly':
      return addDays(anchor, stepIndex * 7);
    case 'Monthly':
      return addMonthsClamped(anchor, stepIndex);
    case 'Quarterly':
      return addMonthsClamped(anchor, stepIndex * 3);
    case 'Yearly':
      return addMonthsClamped(anchor, stepIndex * 12);
  }
}

export function occurrenceDates(anchor: Date, frequency: string, today = new Date()): Date[] {
  const normalized = normalizeFrequency(frequency);
  if (!normalized) return [];

  const start = startOfDay(anchor);
  const end = startOfDay(today);
  const dates: Date[] = [];

  for (let step = 0; step < 20000; step += 1) {
    const next = avoidSunday(occurrenceAt(start, normalized, step), normalized);
    if (next > end) {
      if (dates.length === 0) return [next];
      break;
    }
    if (dates.some((date) => date.getTime() === next.getTime())) continue;
    dates.push(next);
  }
  return dates;
}

export function currentOccurrenceDate(anchor: Date, frequency: string, today = new Date()): Date | null {
  const dates = occurrenceDates(anchor, frequency, today);
  return dates.length ? dates[dates.length - 1] : null;
}

export function createTaskId(index = 0): string {
  return `UCL-${Date.now().toString(36)}-${index.toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

function masterFields(master: MasterTask) {
  return {
    task_id: master.task_id,
    category: master.category,
    task: master.task,
    doer_name: master.doer_name,
    department: master.department,
    frequency: master.frequency,
  };
}

export function buildChecklistRows(
  masters: MasterTask[],
  completions: CompletionRecord[],
  today = new Date()
): ChecklistViewRow[] {
  const rows: ChecklistViewRow[] = [];

  for (const master of masters) {
    if (!master.task_id) continue;

    const taskCompletions = completions.filter((item) => item.task_id === master.task_id);
    const anchor = parseSheetDate(master.due_date);
    const dates = anchor ? occurrenceDates(anchor, master.frequency, today) : [];
    const todayStart = startOfDay(today);

    for (const date of dates) {
      const label = formatSheetDate(date);
      const completion = taskCompletions.find((item) => datesMatch(item.occurrence_date, label));
      rows.push({
        ...masterFields(master),
        occurrence_date: label,
        status: completion ? 'Completed' : date < todayStart ? 'Overdue' : 'Pending',
        completed_at: completion?.completed_at || '',
        completed_by: completion?.completed_by || '',
        completionRowIndex: completion?.rowIndex ?? null,
        isCurrent: date.getTime() === todayStart.getTime() || (date > todayStart && dates.length === 1),
      });
    }

    for (const completion of taskCompletions) {
      if (dates.some((date) => datesMatch(formatSheetDate(date), completion.occurrence_date))) continue;
      const parsed = parseSheetDate(completion.occurrence_date);
      rows.push({
        ...masterFields(master),
        occurrence_date: parsed ? formatSheetDate(parsed) : completion.occurrence_date,
        status: 'Completed',
        completed_at: completion.completed_at,
        completed_by: completion.completed_by,
        completionRowIndex: completion.rowIndex,
        isCurrent: false,
      });
    }
  }

  return rows.sort((left, right) => {
    const leftDate = parseSheetDate(left.occurrence_date)?.getTime() ?? 0;
    const rightDate = parseSheetDate(right.occurrence_date)?.getTime() ?? 0;
    if (leftDate !== rightDate) return rightDate - leftDate;
    return left.task.localeCompare(right.task);
  });
}
