export type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface DatePeriodValue {
  active: boolean;
  period: PeriodType;
  anchorDate: Date;
}

export interface DatePeriodRange {
  start: Date;
  end: Date;
}

const MONTH_LABELS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export function getStartOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getEndOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getPeriodRange(period: PeriodType, anchorDate: Date): DatePeriodRange {
  const anchor = getStartOfDay(anchorDate);

  switch (period) {
    case 'day':
      return { start: anchor, end: getEndOfDay(anchor) };
    case 'week': {
      const weekStart = new Date(anchor);
      weekStart.setDate(anchor.getDate() - anchor.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return { start: getStartOfDay(weekStart), end: getEndOfDay(weekEnd) };
    }
    case 'month': {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { start: getStartOfDay(monthStart), end: getEndOfDay(monthEnd) };
    }
    case 'quarter': {
      const quarter = Math.floor(anchor.getMonth() / 3);
      const quarterStart = new Date(anchor.getFullYear(), quarter * 3, 1);
      const quarterEnd = new Date(anchor.getFullYear(), quarter * 3 + 3, 0);
      return { start: getStartOfDay(quarterStart), end: getEndOfDay(quarterEnd) };
    }
    case 'year': {
      const yearStart = new Date(anchor.getFullYear(), 0, 1);
      const yearEnd = new Date(anchor.getFullYear(), 11, 31);
      return { start: getStartOfDay(yearStart), end: getEndOfDay(yearEnd) };
    }
  }
}

export function shiftPeriodAnchor(
  period: PeriodType,
  anchorDate: Date,
  direction: -1 | 1
): Date {
  const next = new Date(anchorDate);

  switch (period) {
    case 'day':
      next.setDate(next.getDate() + direction);
      break;
    case 'week':
      next.setDate(next.getDate() + direction * 7);
      break;
    case 'month':
      next.setMonth(next.getMonth() + direction);
      break;
    case 'quarter':
      next.setMonth(next.getMonth() + direction * 3);
      break;
    case 'year':
      next.setFullYear(next.getFullYear() + direction);
      break;
  }

  return next;
}

export function formatPeriodLabel(period: PeriodType, anchorDate: Date, active: boolean): string {
  if (!active) return 'All Dates';

  const anchor = getStartOfDay(anchorDate);

  switch (period) {
    case 'day':
      return `${anchor.getDate()} ${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    case 'week': {
      const { start, end } = getPeriodRange('week', anchor);
      return `${start.getDate()} ${MONTH_LABELS[start.getMonth()]} - ${end.getDate()} ${MONTH_LABELS[end.getMonth()]} ${end.getFullYear()}`;
    }
    case 'month':
      return `${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    case 'quarter': {
      const quarter = Math.floor(anchor.getMonth() / 3) + 1;
      return `Q${quarter} ${anchor.getFullYear()}`;
    }
    case 'year':
      return `${anchor.getFullYear()}`;
  }
}

export function formatDisplayDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day} - ${month} - ${year}`;
}

export function formatPeriodRange(period: PeriodType, anchorDate: Date): string {
  const { start, end } = getPeriodRange(period, anchorDate);
  return `${formatDisplayDate(start)} TO ${formatDisplayDate(end)}`;
}

export const PERIOD_OPTIONS: { id: PeriodType; label: string }[] = [
  { id: 'day', label: 'DAY' },
  { id: 'week', label: 'WEEK' },
  { id: 'month', label: 'MONTH' },
  { id: 'quarter', label: 'QUARTERLY' },
  { id: 'year', label: 'YEARLY' },
];

export type QuickDatePreset = 'all' | 'lastWeek' | 'thisWeek' | 'thisMonth';

export const QUICK_DATE_PRESETS: { id: QuickDatePreset; label: string }[] = [
  { id: 'all', label: 'All Dates' },
  { id: 'lastWeek', label: 'Last Week' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'thisMonth', label: 'This Month' },
];

export function getQuickDatePeriod(preset: QuickDatePreset): DatePeriodValue {
  const today = new Date();

  switch (preset) {
    case 'all':
      return { active: false, period: 'month', anchorDate: today };
    case 'lastWeek': {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      return { active: true, period: 'week', anchorDate: lastWeek };
    }
    case 'thisWeek':
      return { active: true, period: 'week', anchorDate: today };
    case 'thisMonth':
      return { active: true, period: 'month', anchorDate: today };
  }
}

function rangesMatch(a: DatePeriodRange, b: DatePeriodRange): boolean {
  return a.start.getTime() === b.start.getTime() && a.end.getTime() === b.end.getTime();
}

export function matchQuickDatePreset(value: DatePeriodValue): QuickDatePreset | null {
  for (const preset of QUICK_DATE_PRESETS) {
    const expected = getQuickDatePeriod(preset.id);
    if (!expected.active && !value.active) return 'all';
    if (!expected.active || !value.active) continue;
    if (expected.period !== value.period) continue;

    const currentRange = getPeriodRange(value.period, value.anchorDate);
    const expectedRange = getPeriodRange(expected.period, expected.anchorDate);
    if (rangesMatch(currentRange, expectedRange)) return preset.id;
  }

  return value.active ? null : 'all';
}
