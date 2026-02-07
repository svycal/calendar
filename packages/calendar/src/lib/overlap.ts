import type { CalendarEvent, PositionedEvent } from '@/types/calendar';
import { getMinutesFromMidnight } from './time';

interface LayoutEntry {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  subColumn: number;
  totalSubColumns: number;
}

export function groupEventsByResource(
  events: CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = map.get(event.resourceId);
    if (list) {
      list.push(event);
    } else {
      map.set(event.resourceId, [event]);
    }
  }
  return map;
}

export function computeOverlapLayout(
  events: CalendarEvent[],
  timeZone: string,
): LayoutEntry[] {
  if (events.length === 0) return [];

  // Convert to minutes and sort by start time
  const items = events
    .map((event) => ({
      event,
      startMin: getMinutesFromMidnight(event.startTime, timeZone),
      endMin: getMinutesFromMidnight(event.endTime, timeZone),
    }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  // Find connected overlap groups
  const groups: (typeof items)[] = [];
  let currentGroup = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const groupEnd = Math.max(...currentGroup.map((g) => g.endMin));
    if (item.startMin < groupEnd) {
      currentGroup.push(item);
    } else {
      groups.push(currentGroup);
      currentGroup = [item];
    }
  }
  groups.push(currentGroup);

  // Assign sub-columns within each group
  const results: LayoutEntry[] = [];

  for (const group of groups) {
    const columns: { endMin: number }[] = [];

    for (const item of group) {
      // Find lowest available column
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        if (columns[col].endMin <= item.startMin) {
          columns[col].endMin = item.endMin;
          results.push({
            ...item,
            subColumn: col,
            totalSubColumns: 0, // filled in below
          });
          placed = true;
          break;
        }
      }
      if (!placed) {
        results.push({
          ...item,
          subColumn: columns.length,
          totalSubColumns: 0,
        });
        columns.push({ endMin: item.endMin });
      }
    }

    // Set totalSubColumns for all items in this group
    const totalCols = columns.length;
    for (const result of results) {
      if (group.some((g) => g.event.id === result.event.id)) {
        result.totalSubColumns = totalCols;
      }
    }
  }

  return results;
}

export function computePositionedEvents(
  events: CalendarEvent[],
  timeZone: string,
  startHour: number,
  endHour: number,
  hourHeight: number,
): Map<string, PositionedEvent[]> {
  const byResource = groupEventsByResource(events);
  const result = new Map<string, PositionedEvent[]>();
  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;
  const pixelsPerMinute = hourHeight / 60;

  for (const [resourceId, resourceEvents] of byResource) {
    const layout = computeOverlapLayout(resourceEvents, timeZone);
    const positioned: PositionedEvent[] = [];

    for (const entry of layout) {
      // Filter out events entirely outside the time axis
      if (entry.endMin <= axisStartMin || entry.startMin >= axisEndMin) {
        continue;
      }

      // Clamp to axis bounds
      const clampedStart = Math.max(entry.startMin, axisStartMin);
      const clampedEnd = Math.min(entry.endMin, axisEndMin);

      const top = (clampedStart - axisStartMin) * pixelsPerMinute;
      const height = (clampedEnd - clampedStart) * pixelsPerMinute;

      positioned.push({
        event: entry.event,
        top,
        height,
        subColumn: entry.subColumn,
        totalSubColumns: entry.totalSubColumns,
      });
    }

    result.set(resourceId, positioned);
  }

  return result;
}
