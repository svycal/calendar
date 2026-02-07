import type { AvailabilityRange } from '@/types/calendar';
import { getMinutesFromMidnight } from './time';

export interface UnavailableBlock {
  top: number;
  height: number;
}

interface Interval {
  start: number;
  end: number;
}

function toIntervals(
  ranges: AvailabilityRange[],
  timeZone: string,
  axisStartMin: number,
  axisEndMin: number,
): Interval[] {
  return ranges
    .map((r) => ({
      start: Math.max(
        getMinutesFromMidnight(r.startTime, timeZone),
        axisStartMin,
      ),
      end: Math.min(
        getMinutesFromMidnight(r.endTime, timeZone),
        axisEndMin,
      ),
    }))
    .filter((i) => i.start < i.end);
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }

  return merged;
}

function invertIntervals(
  available: Interval[],
  axisStartMin: number,
  axisEndMin: number,
): Interval[] {
  const merged = mergeIntervals(available);
  const gaps: Interval[] = [];
  let cursor = axisStartMin;

  for (const interval of merged) {
    if (cursor < interval.start) {
      gaps.push({ start: cursor, end: interval.start });
    }
    cursor = Math.max(cursor, interval.end);
  }

  if (cursor < axisEndMin) {
    gaps.push({ start: cursor, end: axisEndMin });
  }

  return gaps;
}

/**
 * Compute unavailable blocks for a single resource by merging the inverse
 * of available ranges with explicit unavailable ranges.
 */
export function computeUnavailableBlocks(
  availableRanges: AvailabilityRange[] | undefined,
  unavailableRanges: AvailabilityRange[] | undefined,
  timeZone: string,
  startHour: number,
  endHour: number,
  hourHeight: number,
): UnavailableBlock[] {
  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;
  const pixelsPerMinute = hourHeight / 60;

  const unavailableIntervals: Interval[] = [];

  // Invert available ranges to get unavailable gaps
  if (availableRanges && availableRanges.length > 0) {
    const available = toIntervals(availableRanges, timeZone, axisStartMin, axisEndMin);
    unavailableIntervals.push(...invertIntervals(available, axisStartMin, axisEndMin));
  }

  // Add explicit unavailable ranges
  if (unavailableRanges && unavailableRanges.length > 0) {
    unavailableIntervals.push(
      ...toIntervals(unavailableRanges, timeZone, axisStartMin, axisEndMin),
    );
  }

  // Merge all unavailable intervals and convert to pixel positions
  return mergeIntervals(unavailableIntervals).map((interval) => ({
    top: (interval.start - axisStartMin) * pixelsPerMinute,
    height: (interval.end - interval.start) * pixelsPerMinute,
  }));
}
