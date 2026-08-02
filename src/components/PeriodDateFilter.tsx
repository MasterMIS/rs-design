'use client';

import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  formatPeriodLabel,
  formatPeriodRange,
  PERIOD_OPTIONS,
  shiftPeriodAnchor,
  type DatePeriodValue,
  type PeriodType,
} from '@/lib/date-period';
import styles from './PeriodDateFilter.module.css';

interface PeriodDateFilterProps {
  value: DatePeriodValue;
  onChange: (value: DatePeriodValue) => void;
}

export default function PeriodDateFilter({ value, onChange }: PeriodDateFilterProps) {
  const handlePeriodChange = (period: PeriodType) => {
    onChange({
      active: true,
      period,
      anchorDate: value.anchorDate,
    });
  };

  const handleNavigate = (direction: -1 | 1) => {
    if (!value.active) return;
    onChange({
      ...value,
      anchorDate: shiftPeriodAnchor(value.period, value.anchorDate, direction),
    });
  };

  const handleClear = () => {
    onChange({
      active: false,
      period: value.period,
      anchorDate: new Date(),
    });
  };

  const handleActivate = () => {
    if (value.active) return;
    onChange({
      active: true,
      period: value.period,
      anchorDate: new Date(),
    });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.periodTabs}>
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`${styles.periodTab} ${
              value.active && value.period === option.id ? styles.periodTabActive : ''
            }`}
            onClick={() => handlePeriodChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={styles.navigator}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => handleNavigate(-1)}
          disabled={!value.active}
          aria-label="Previous period"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className={styles.navLabel}
          onClick={handleActivate}
          style={{ border: 'none', background: 'transparent', cursor: value.active ? 'default' : 'pointer' }}
        >
          {formatPeriodLabel(value.period, value.anchorDate, value.active)}
        </button>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => handleNavigate(1)}
          disabled={!value.active}
          aria-label="Next period"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={styles.rangeBox}>
        <Calendar size={16} className={styles.calendarIcon} />
        <span className={value.active ? styles.rangeText : `${styles.rangeText} ${styles.rangeTextMuted}`}>
          {value.active
            ? formatPeriodRange(value.period, value.anchorDate)
            : 'All dates included'}
        </span>
        <Calendar size={16} className={styles.calendarIcon} />
        {value.active && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Clear date filter"
            title="Show all dates"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
