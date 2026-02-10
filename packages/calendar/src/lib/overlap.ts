import { Temporal } from 'temporal-polyfill';
import type {
  AllDayCalendarEvent,
  TimedCalendarEvent,
  PositionedEvent,
} from '@/types/calendar';
import { getMinuteRange } from './time';

interface LayoutEntry {
  event: TimedCalendarEvent;
  startMin: number;
  endMin: number;
  subColumn: number;
  totalSubColumns: number;
}

export function groupByResource<T extends { resourceId: string }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.resourceId);
    if (list) {
      list.push(item);
    } else {
      map.set(item.resourceId, [item]);
    }
  }
  return map;
}

export function computeOverlapLayout(
  events: TimedCalendarEvent[],
  timeZone: string,
  viewDate: Temporal.PlainDate
): LayoutEntry[] {
  if (events.length === 0) return [];

  // Convert to minutes and sort by start time
  const items = events
    .map((event) => {
      const range = getMinuteRange(
        event.startTime,
        event.endTime,
        viewDate,
        timeZone
      );
      if (!range) return null;
      return { event, startMin: range.startMin, endMin: range.endMin };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  if (items.length === 0) return [];

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
  events: TimedCalendarEvent[],
  timeZone: string,
  viewDate: Temporal.PlainDate,
  startHour: number,
  endHour: number,
  hourHeight: number
): Map<string, PositionedEvent[]> {
  const byResource = groupByResource(events);
  const result = new Map<string, PositionedEvent[]>();
  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;
  const pixelsPerMinute = hourHeight / 60;

  for (const [resourceId, resourceEvents] of byResource) {
    const layout = computeOverlapLayout(resourceEvents, timeZone, viewDate);
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

export function groupByDate(
  events: TimedCalendarEvent[],
  timeZone: string
): Map<string, TimedCalendarEvent[]> {
  const map = new Map<string, TimedCalendarEvent[]>();
  for (const event of events) {
    const start = event.startTime.withTimeZone(timeZone);
    const key = start.toPlainDate().toString();
    const list = map.get(key);
    if (list) {
      list.push(event);
    } else {
      map.set(key, [event]);
    }
  }
  return map;
}

export function groupAllDayByDate(
  events: AllDayCalendarEvent[],
  dates: Temporal.PlainDate[]
): Map<string, AllDayCalendarEvent[]> {
  const map = new Map<string, AllDayCalendarEvent[]>();
  for (const date of dates) {
    map.set(date.toString(), []);
  }
  for (const event of events) {
    for (const date of dates) {
      if (
        Temporal.PlainDate.compare(date, event.startDate) >= 0 &&
        Temporal.PlainDate.compare(date, event.endDate) <= 0
      ) {
        map.get(date.toString())!.push(event);
      }
    }
  }
  return map;
}

export function computePositionedEventsByDate(
  events: TimedCalendarEvent[],
  timeZone: string,
  dates: Temporal.PlainDate[],
  startHour: number,
  endHour: number,
  hourHeight: number
): Map<string, PositionedEvent[]> {
  const byDate = groupByDate(events, timeZone);
  const result = new Map<string, PositionedEvent[]>();
  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;
  const pixelsPerMinute = hourHeight / 60;

  for (const date of dates) {
    const key = date.toString();
    const dateEvents = byDate.get(key) ?? [];
    const layout = computeOverlapLayout(dateEvents, timeZone, date);
    const positioned: PositionedEvent[] = [];

    for (const entry of layout) {
      if (entry.endMin <= axisStartMin || entry.startMin >= axisEndMin) {
        continue;
      }

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

    result.set(key, positioned);
  }

  return result;
}
