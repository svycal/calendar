import { Temporal } from 'temporal-polyfill';
import type { CalendarEvent } from '@/types/calendar';

export const DAYS_PER_WEEK = 7;

/** An event clipped to the days it covers in the display time zone. */
export interface MonthEventSpan {
  event: CalendarEvent;
  startDate: Temporal.PlainDate;
  /** Inclusive */
  endDate: Temporal.PlainDate;
  /** All-day and multi-day events render as spanning bars; single-day timed events render as dot items. */
  isBar: boolean;
  /** Epoch ms used to order events that start in the same column. */
  sortStart: number;
  /** Always takes the top lane (e.g. the selection placeholder). */
  pinned?: boolean;
}

export interface MonthEventSegment {
  event: CalendarEvent;
  /** 0-based column within the week row */
  startCol: number;
  span: number;
  lane: number;
  isBar: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
  pinned?: boolean;
}

export interface MonthDayLayout {
  date: Temporal.PlainDate;
  /** Every event touching this day, in visual (lane) order, excluding pinned placeholders. */
  events: CalendarEvent[];
  /** Number of events hidden behind the "+N more" button. */
  moreCount: number;
  /** Lane where the "+N more" button renders (only meaningful when moreCount > 0). */
  moreLane: number;
}

export interface MonthWeekLayout {
  dates: Temporal.PlainDate[];
  segments: MonthEventSegment[];
  visibleSegments: MonthEventSegment[];
  days: MonthDayLayout[];
}

/**
 * Returns the weeks to display for a month. Each week starts on
 * `weekStartsOn` (1 = Monday … 7 = Sunday, matching Temporal's dayOfWeek).
 */
export function getMonthWeeks(
  month: Temporal.PlainYearMonth,
  weekStartsOn: number,
  fixedWeekCount: boolean
): Temporal.PlainDate[][] {
  const firstOfMonth = month.toPlainDate({ day: 1 });
  const leading = (firstOfMonth.dayOfWeek - weekStartsOn + 7) % 7;
  const gridStart = firstOfMonth.subtract({ days: leading });
  const weekCount = fixedWeekCount
    ? 6
    : Math.ceil((leading + month.daysInMonth) / DAYS_PER_WEEK);

  const weeks: Temporal.PlainDate[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: Temporal.PlainDate[] = [];
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      week.push(gridStart.add({ days: w * DAYS_PER_WEEK + d }));
    }
    weeks.push(week);
  }
  return weeks;
}

function isMidnight(dt: Temporal.ZonedDateTime): boolean {
  return (
    dt.hour === 0 &&
    dt.minute === 0 &&
    dt.second === 0 &&
    dt.millisecond === 0 &&
    dt.microsecond === 0 &&
    dt.nanosecond === 0
  );
}

/** Resolves the inclusive dates an event covers in the display time zone. */
export function getMonthEventSpan(
  event: CalendarEvent,
  timeZone: string
): MonthEventSpan {
  if (event.allDay) {
    const endDate =
      Temporal.PlainDate.compare(event.endDate, event.startDate) < 0
        ? event.startDate
        : event.endDate;
    return {
      event,
      startDate: event.startDate,
      endDate,
      isBar: true,
      sortStart: event.startDate.toZonedDateTime(timeZone).epochMilliseconds,
    };
  }

  const start = event.startTime.withTimeZone(timeZone);
  const end = event.endTime.withTimeZone(timeZone);
  const startDate = start.toPlainDate();
  // An event ending exactly at midnight doesn't occupy the following day
  let endDate = end.toPlainDate();
  if (isMidnight(end) && Temporal.ZonedDateTime.compare(end, start) > 0) {
    endDate = endDate.subtract({ days: 1 });
  }
  if (Temporal.PlainDate.compare(endDate, startDate) < 0) endDate = startDate;

  return {
    event,
    startDate,
    endDate,
    isBar: Temporal.PlainDate.compare(endDate, startDate) > 0,
    sortStart: start.epochMilliseconds,
  };
}

interface SortableSegment extends MonthEventSegment {
  sortStart: number;
}

function compareSegments(a: SortableSegment, b: SortableSegment): number {
  if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
  if (a.startCol !== b.startCol) return a.startCol - b.startCol;
  if (a.isBar !== b.isBar) return a.isBar ? -1 : 1;
  if (a.span !== b.span) return b.span - a.span;
  if (a.sortStart !== b.sortStart) return a.sortStart - b.sortStart;
  return a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0;
}

/**
 * Clips spans to a week and greedily assigns each segment the first lane
 * that's free across every day it covers. Bars sort ahead of timed items
 * that start the same day, so they stack at the top of each cell.
 */
export function layoutMonthWeek(
  spans: MonthEventSpan[],
  dates: Temporal.PlainDate[]
): MonthEventSegment[] {
  const weekStart = dates[0];
  const weekEnd = dates[dates.length - 1];

  const segments: SortableSegment[] = [];
  for (const s of spans) {
    if (
      Temporal.PlainDate.compare(s.startDate, weekEnd) > 0 ||
      Temporal.PlainDate.compare(s.endDate, weekStart) < 0
    ) {
      continue;
    }
    const continuesBefore =
      Temporal.PlainDate.compare(s.startDate, weekStart) < 0;
    const continuesAfter = Temporal.PlainDate.compare(s.endDate, weekEnd) > 0;
    const startCol = continuesBefore
      ? 0
      : s.startDate.since(weekStart, { largestUnit: 'days' }).days;
    const endCol = continuesAfter
      ? dates.length - 1
      : s.endDate.since(weekStart, { largestUnit: 'days' }).days;
    segments.push({
      event: s.event,
      startCol,
      span: endCol - startCol + 1,
      lane: 0,
      isBar: s.isBar,
      continuesBefore,
      continuesAfter,
      sortStart: s.sortStart,
      pinned: s.pinned,
    });
  }

  segments.sort(compareSegments);

  const lanes: boolean[][] = [];
  for (const seg of segments) {
    const endCol = seg.startCol + seg.span - 1;
    let lane = lanes.findIndex((occupied) => {
      for (let c = seg.startCol; c <= endCol; c++) {
        if (occupied[c]) return false;
      }
      return true;
    });
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(new Array(dates.length).fill(false));
    }
    for (let c = seg.startCol; c <= endCol; c++) lanes[lane][c] = true;
    seg.lane = lane;
  }

  return segments.map((seg) => ({
    event: seg.event,
    startCol: seg.startCol,
    span: seg.span,
    lane: seg.lane,
    isBar: seg.isBar,
    continuesBefore: seg.continuesBefore,
    continuesAfter: seg.continuesAfter,
    pinned: seg.pinned,
  }));
}

function coversCol(seg: MonthEventSegment, col: number): boolean {
  return col >= seg.startCol && col < seg.startCol + seg.span;
}

/**
 * Decides which segments fit in `maxLanes` rows per day. When a day needs
 * more rows than fit, its last row becomes a "+N more" button. A bar is
 * shown only if its lane fits on every day it covers; hiding it on a day
 * that otherwise fit forces that day to show "+N more" too, so we iterate
 * until the per-day limits settle.
 */
export function applyMonthOverflow(
  segments: MonthEventSegment[],
  dates: Temporal.PlainDate[],
  maxLanes: number
): MonthWeekLayout {
  const cols = dates.length;
  const extent = new Array<number>(cols).fill(0);
  for (const seg of segments) {
    for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
      extent[c] = Math.max(extent[c], seg.lane + 1);
    }
  }

  const reduced = Math.max(0, maxLanes - 1);
  const limit = extent.map((e) => (e <= maxLanes ? maxLanes : reduced));

  const isHidden = (seg: MonthEventSegment) => {
    // The selection placeholder always stays visible
    if (seg.pinned) return false;
    for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
      if (seg.lane >= limit[c]) return true;
    }
    return false;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const seg of segments) {
      if (!isHidden(seg)) continue;
      for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
        if (limit[c] !== reduced) {
          limit[c] = reduced;
          changed = true;
        }
      }
    }
  }

  const byLane = [...segments].sort((a, b) => a.lane - b.lane);
  const visibleSegments = segments.filter((seg) => !isHidden(seg));
  const days: MonthDayLayout[] = dates.map((date, col) => {
    const covering = byLane.filter((seg) => coversCol(seg, col));
    return {
      date,
      events: covering.filter((seg) => !seg.pinned).map((seg) => seg.event),
      moreCount: covering.filter(isHidden).length,
      // Keep "+N more" below a pinned placeholder in the top lane
      moreLane: Math.max(
        limit[col],
        covering.some((seg) => seg.pinned) ? 1 : 0
      ),
    };
  });

  return { dates, segments, visibleSegments, days };
}
