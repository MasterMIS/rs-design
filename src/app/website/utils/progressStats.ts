import {
  computeProgress,
  isDrawingCompleted,
  isTrackerCompleted,
  type ProgressStats,
} from '@/lib/progressStats';
import type { MergedDrawingRow, MergedTrackerRow } from '../types';

export type { ProgressStats } from '@/lib/progressStats';

export function computeTrackerProgress(items: MergedTrackerRow[]): ProgressStats {
  return computeProgress(
    items.map((item) => ({
      category: item.category,
      completed: isTrackerCompleted(item.actualDate),
    }))
  );
}

export function computeDrawingProgress(items: MergedDrawingRow[]): ProgressStats {
  return computeProgress(
    items.map((item) => ({
      category: item.category,
      completed: isDrawingCompleted(item),
    }))
  );
}
