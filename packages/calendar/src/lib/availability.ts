import type { AvailabilityRange } from '@/types/calendar';
import { getMinutesFromMidnight } from './time';

export interface UnavailableBlock {
  top: number;
  height: number;
}

/**
 * Given available ranges for a single resource, compute the
 * unavailable blocks (the gaps) as pixel positions within the time axis.
 */
export function computeUnavailableBlocks(
  availableRanges: AvailabilityRange[],
  timeZone: string,
  startHour: number,
  endHour: number,
  hourHeight: number,
): UnavailableBlock[] {
  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;
  const pixelsPerMinute = hourHeight / 60;

  // Convert to minutes and clamp to axis
  const intervals = availableRanges
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
    .filter((i) => i.start < i.end)
    .sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const merged: { start: number; end: number }[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  // Walk gaps between merged available ranges
  const blocks: UnavailableBlock[] = [];
  let cursor = axisStartMin;

  for (const available of merged) {
    if (cursor < available.start) {
      blocks.push({
        top: (cursor - axisStartMin) * pixelsPerMinute,
        height: (available.start - cursor) * pixelsPerMinute,
      });
    }
    cursor = Math.max(cursor, available.end);
  }

  // Trailing gap after last available range
  if (cursor < axisEndMin) {
    blocks.push({
      top: (cursor - axisStartMin) * pixelsPerMinute,
      height: (axisEndMin - cursor) * pixelsPerMinute,
    });
  }

  return blocks;
}
