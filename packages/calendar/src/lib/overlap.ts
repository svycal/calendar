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
  colSpan: number;
}

export interface OverflowGroup {
  id: string;
  events: TimedCalendarEvent[];
  top: number;
  height: number;
}

export const DEFAULT_EVENT_MIN_WIDTH = 80;

function compareEventId(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function eventPriority(event: { priority?: number }): number {
  return event.priority ?? 0;
}

function eventsOverlap(
  a: { startMin: number; endMin: number },
  b: { startMin: number; endMin: number }
): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

function positionedOverlap(
  a: { top: number; height: number },
  b: { top: number; height: number }
): boolean {
  return a.top < b.top + b.height && b.top < a.top + a.height;
}

function assignColSpans(entries: LayoutEntry[], totalCols: number): void {
  for (const entry of entries) {
    entry.totalSubColumns = totalCols;
    let span = 1;
    for (let col = entry.subColumn + 1; col < totalCols; col++) {
      const blocked = entries.some(
        (other) => other.subColumn === col && eventsOverlap(entry, other)
      );
      if (blocked) break;
      span++;
    }
    entry.colSpan = span;
  }
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
    .sort(
      (a, b) =>
        a.startMin - b.startMin ||
        a.endMin - b.endMin ||
        compareEventId(a.event.id, b.event.id)
    );

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
    const packOrder = [...group].sort((a, b) => {
      const priorityDelta = eventPriority(b.event) - eventPriority(a.event);
      if (priorityDelta !== 0) return priorityDelta;
      return (
        a.startMin - b.startMin ||
        a.endMin - b.endMin ||
        compareEventId(a.event.id, b.event.id)
      );
    });

    for (const item of packOrder) {
      // Find lowest available column
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        if (columns[col].endMin <= item.startMin) {
          columns[col].endMin = item.endMin;
          results.push({
            ...item,
            subColumn: col,
            totalSubColumns: 0,
            colSpan: 1,
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
          colSpan: 1,
        });
        columns.push({ endMin: item.endMin });
      }
    }

    const groupResults = results.slice(results.length - group.length);
    assignColSpans(groupResults, columns.length);
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
        colSpan: entry.colSpan,
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
    const end = event.endTime.withTimeZone(timeZone);
    const startDate = start.toPlainDate();
    const endDate = end.toPlainDate();
    const endMinutes = end.hour * 60 + end.minute;

    // If event ends exactly at midnight, the last meaningful date is the day before
    const lastDate = endMinutes === 0 ? endDate.subtract({ days: 1 }) : endDate;

    let current = startDate;
    while (Temporal.PlainDate.compare(current, lastDate) <= 0) {
      const key = current.toString();
      const list = map.get(key);
      if (list) {
        list.push(event);
      } else {
        map.set(key, [event]);
      }
      current = current.add({ days: 1 });
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

export interface PositionedAllDayEvent {
  event: AllDayCalendarEvent;
  gridColumnStart: number; // 1-based, relative to date columns
  gridColumnSpan: number;
  lane: number; // 0-based vertical row for stacking
  continuesBefore: boolean; // event starts before active range
  continuesAfter: boolean; // event ends after active range
}

export function layoutAllDayEvents(
  events: AllDayCalendarEvent[],
  dates: Temporal.PlainDate[]
): PositionedAllDayEvent[] {
  if (events.length === 0 || dates.length === 0) return [];

  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];

  // Filter events overlapping the visible range
  const overlapping = events.filter(
    (e) =>
      Temporal.PlainDate.compare(e.startDate, rangeEnd) <= 0 &&
      Temporal.PlainDate.compare(e.endDate, rangeStart) >= 0
  );

  // Sort: longest span first, then earliest start, then id for stability
  overlapping.sort((a, b) => {
    const spanA =
      a.endDate.since(a.startDate, { largestUnit: 'days' }).days + 1;
    const spanB =
      b.endDate.since(b.startDate, { largestUnit: 'days' }).days + 1;
    if (spanB !== spanA) return spanB - spanA;
    const startCmp = Temporal.PlainDate.compare(a.startDate, b.startDate);
    if (startCmp !== 0) return startCmp;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Build a date-to-column index map
  const dateToCol = new Map<string, number>();
  for (let i = 0; i < dates.length; i++) {
    dateToCol.set(dates[i].toString(), i);
  }

  // Greedy lane assignment
  // Each lane tracks which columns are occupied
  const lanes: boolean[][] = [];
  const result: PositionedAllDayEvent[] = [];

  for (const event of overlapping) {
    const continuesBefore =
      Temporal.PlainDate.compare(event.startDate, rangeStart) < 0;
    const continuesAfter =
      Temporal.PlainDate.compare(event.endDate, rangeEnd) > 0;

    const clampedStart = continuesBefore ? rangeStart : event.startDate;
    const clampedEnd = continuesAfter ? rangeEnd : event.endDate;

    const startCol = dateToCol.get(clampedStart.toString())!;
    const endCol = dateToCol.get(clampedEnd.toString())!;
    const span = endCol - startCol + 1;

    // Find first lane where columns startCol..endCol are all free
    let assignedLane = -1;
    for (let l = 0; l < lanes.length; l++) {
      let fits = true;
      for (let c = startCol; c <= endCol; c++) {
        if (lanes[l][c]) {
          fits = false;
          break;
        }
      }
      if (fits) {
        assignedLane = l;
        break;
      }
    }

    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push(new Array(dates.length).fill(false));
    }

    // Mark columns as occupied
    for (let c = startCol; c <= endCol; c++) {
      lanes[assignedLane][c] = true;
    }

    result.push({
      event,
      gridColumnStart: startCol + 1, // 1-based
      gridColumnSpan: span,
      lane: assignedLane,
      continuesBefore,
      continuesAfter,
    });
  }

  return result;
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
        colSpan: entry.colSpan,
      });
    }

    result.set(key, positioned);
  }

  return result;
}

export function computeMaxVisibleColumns(
  columnWidth: number,
  eventMinWidth: number,
  eventMaxStack?: number
): number {
  let byWidth = Number.POSITIVE_INFINITY;
  if (columnWidth > 0 && eventMinWidth > 0) {
    byWidth = Math.max(1, Math.floor(columnWidth / eventMinWidth));
  }

  if (eventMaxStack == null || eventMaxStack < 1) {
    return byWidth;
  }

  if (!Number.isFinite(byWidth)) {
    return Math.max(1, eventMaxStack);
  }

  return Math.max(1, Math.min(eventMaxStack, byWidth));
}

function reexpandVisible(
  events: PositionedEvent[],
  columnCount: number
): PositionedEvent[] {
  return events.map((event) => {
    let span = 1;
    for (let col = event.subColumn + 1; col < columnCount; col++) {
      const blocked = events.some(
        (other) => other.subColumn === col && positionedOverlap(event, other)
      );
      if (blocked) break;
      span++;
    }
    return {
      ...event,
      colSpan: span,
      totalSubColumns: columnCount,
    };
  });
}

function groupHiddenEvents(hidden: PositionedEvent[]): OverflowGroup[] {
  if (hidden.length === 0) return [];

  const sorted = [...hidden].sort(
    (a, b) => a.top - b.top || a.subColumn - b.subColumn
  );

  const groups: PositionedEvent[][] = [];
  let current = [sorted[0]];
  let currentEnd = sorted[0].top + sorted[0].height;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (item.top < currentEnd) {
      current.push(item);
      currentEnd = Math.max(currentEnd, item.top + item.height);
    } else {
      groups.push(current);
      current = [item];
      currentEnd = item.top + item.height;
    }
  }
  groups.push(current);

  return groups.map((group) => {
    const top = Math.min(...group.map((e) => e.top));
    const bottom = Math.max(...group.map((e) => e.top + e.height));
    return {
      id: `overflow-${group[0].event.id}`,
      events: group.map((e) => e.event),
      top,
      height: bottom - top,
    };
  });
}

export function applyEventOverflow(
  positioned: PositionedEvent[],
  maxVisible: number
): { visible: PositionedEvent[]; overflows: OverflowGroup[] } {
  if (positioned.length === 0) {
    return { visible: [], overflows: [] };
  }

  let usedColumns = 0;
  for (const event of positioned) {
    usedColumns = Math.max(usedColumns, event.subColumn + 1);
  }

  if (!Number.isFinite(maxVisible) || maxVisible >= usedColumns) {
    return { visible: positioned, overflows: [] };
  }

  const visibleLimit = Math.max(1, maxVisible);
  const visible = positioned.filter((event) => event.subColumn < visibleLimit);
  const hidden = positioned.filter((event) => event.subColumn >= visibleLimit);
  const reexpanded = reexpandVisible(visible, visibleLimit);

  // A "+1 more" chip is worse than showing the event. Promote singleton
  // overflow groups back onto the grid as full-width overlays.
  const promoted: PositionedEvent[] = [];
  const overflows: OverflowGroup[] = [];
  const hiddenById = new Map(hidden.map((event) => [event.event.id, event]));

  for (const group of groupHiddenEvents(hidden)) {
    if (group.events.length === 1) {
      const original = hiddenById.get(group.events[0].id);
      if (original) {
        promoted.push({
          ...original,
          subColumn: 0,
          totalSubColumns: 1,
          colSpan: 1,
          overlay: true,
        });
      }
    } else {
      overflows.push(group);
    }
  }

  return {
    visible: [...reexpanded, ...promoted],
    overflows,
  };
}
