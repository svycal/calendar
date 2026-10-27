import { describe, expect, it } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import type {
  AllDayCalendarEvent,
  CalendarEvent,
  TimedCalendarEvent,
} from '@/types/calendar';
import {
  applyMonthOverflow,
  getMonthEventSpan,
  getMonthWeeks,
  layoutMonthWeek,
} from './month';

const TZ = 'America/Chicago';

function d(s: string) {
  return Temporal.PlainDate.from(s);
}

function allDay(id: string, start: string, end = start): AllDayCalendarEvent {
  return {
    id,
    title: id,
    resourceId: '',
    allDay: true,
    startDate: d(start),
    endDate: d(end),
  };
}

function timed(id: string, start: string, end: string): TimedCalendarEvent {
  return {
    id,
    title: id,
    resourceId: '',
    startTime: Temporal.PlainDateTime.from(start).toZonedDateTime(TZ),
    endTime: Temporal.PlainDateTime.from(end).toZonedDateTime(TZ),
  };
}

// Sun 2026-10-25 .. Sat 2026-10-31
const week = Array.from({ length: 7 }, (_, i) =>
  d('2026-10-25').add({ days: i })
);

function layout(events: CalendarEvent[]) {
  return layoutMonthWeek(
    events.map((e) => getMonthEventSpan(e, TZ)),
    week
  );
}

function byId<T extends { event: { id: string } }>(items: T[]) {
  return Object.fromEntries(items.map((i) => [i.event.id, i])) as Record<
    string,
    T
  >;
}

describe('getMonthWeeks', () => {
  it('pads to whole weeks starting on Sunday', () => {
    const weeks = getMonthWeeks(
      Temporal.PlainYearMonth.from('2026-10'),
      7,
      false
    );
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0].toString()).toBe('2026-09-27');
    expect(weeks[4][6].toString()).toBe('2026-10-31');
  });

  it('respects a Monday week start', () => {
    const weeks = getMonthWeeks(
      Temporal.PlainYearMonth.from('2026-10'),
      1,
      false
    );
    expect(weeks[0][0].toString()).toBe('2026-09-28');
    expect(weeks.at(-1)![6].toString()).toBe('2026-11-01');
  });

  it('shows four weeks for a February that fits exactly', () => {
    const weeks = getMonthWeeks(
      Temporal.PlainYearMonth.from('2026-02'),
      7,
      false
    );
    expect(weeks).toHaveLength(4);
  });

  it('always shows six weeks with fixedWeekCount', () => {
    const weeks = getMonthWeeks(
      Temporal.PlainYearMonth.from('2026-02'),
      7,
      true
    );
    expect(weeks).toHaveLength(6);
  });
});

describe('getMonthEventSpan', () => {
  it('treats single-day timed events as dot items', () => {
    const span = getMonthEventSpan(
      timed('a', '2026-10-27T09:00', '2026-10-27T10:00'),
      TZ
    );
    expect(span.isBar).toBe(false);
    expect(span.endDate.toString()).toBe('2026-10-27');
  });

  it('treats overnight timed events as bars', () => {
    const span = getMonthEventSpan(
      timed('a', '2026-10-27T22:00', '2026-10-28T02:00'),
      TZ
    );
    expect(span.isBar).toBe(true);
    expect(span.endDate.toString()).toBe('2026-10-28');
  });

  it('does not count a midnight end as the next day', () => {
    const span = getMonthEventSpan(
      timed('a', '2026-10-27T20:00', '2026-10-28T00:00'),
      TZ
    );
    expect(span.isBar).toBe(false);
    expect(span.endDate.toString()).toBe('2026-10-27');
  });

  it('resolves dates in the display time zone', () => {
    const event = timed('a', '2026-10-27T23:00', '2026-10-27T23:30');
    const span = getMonthEventSpan(event, 'America/New_York');
    expect(span.startDate.toString()).toBe('2026-10-28');
  });
});

describe('layoutMonthWeek', () => {
  it('clips bars to the week and flags continuation', () => {
    const segs = byId(
      layout([
        allDay('before', '2026-10-20', '2026-10-26'),
        allDay('after', '2026-10-30', '2026-11-03'),
      ])
    );
    expect(segs.before).toMatchObject({
      startCol: 0,
      span: 2,
      continuesBefore: true,
      continuesAfter: false,
    });
    expect(segs.after).toMatchObject({
      startCol: 5,
      span: 2,
      continuesBefore: false,
      continuesAfter: true,
    });
  });

  it('stacks bars above timed items on the same day', () => {
    const segs = byId(
      layout([
        timed('meeting', '2026-10-27T09:00', '2026-10-27T10:00'),
        allDay('holiday', '2026-10-27'),
      ])
    );
    expect(segs.holiday.lane).toBe(0);
    expect(segs.meeting.lane).toBe(1);
  });

  it('places longer bars first and fills gaps', () => {
    const segs = byId(
      layout([
        allDay('short', '2026-10-26', '2026-10-27'),
        allDay('long', '2026-10-26', '2026-10-29'),
        timed('thu', '2026-10-30T09:00', '2026-10-30T10:00'),
      ])
    );
    expect(segs.long.lane).toBe(0);
    expect(segs.short.lane).toBe(1);
    expect(segs.thu.lane).toBe(0);
  });

  it('orders timed items by start time', () => {
    const segs = byId(
      layout([
        timed('late', '2026-10-27T15:00', '2026-10-27T16:00'),
        timed('early', '2026-10-27T08:00', '2026-10-27T09:00'),
      ])
    );
    expect(segs.early.lane).toBe(0);
    expect(segs.late.lane).toBe(1);
  });
});

describe('pinned spans', () => {
  it('take the top lane even when starting later in the week', () => {
    const spans = [
      allDay('bar', '2026-10-25', '2026-10-31'),
      timed('wed', '2026-10-28T09:00', '2026-10-28T10:00'),
    ].map((e) => getMonthEventSpan(e, TZ));
    spans.push({
      ...getMonthEventSpan(allDay('placeholder', '2026-10-28'), TZ),
      pinned: true,
    });
    const segs = byId(layoutMonthWeek(spans, week));
    expect(segs.placeholder.lane).toBe(0);
    expect(segs.bar.lane).toBe(1);
    expect(segs.wed.lane).toBe(2);

    const result = applyMonthOverflow(Object.values(segs), week, 4);
    expect(result.days[3].events.map((e) => e.id)).toEqual(['bar', 'wed']);
  });

  it('stay visible and uncounted when only one lane fits', () => {
    const spans = [timed('a', '2026-10-28T09:00', '2026-10-28T10:00')].map(
      (e) => getMonthEventSpan(e, TZ)
    );
    spans.push({
      ...getMonthEventSpan(allDay('placeholder', '2026-10-28'), TZ),
      pinned: true,
    });
    const result = applyMonthOverflow(layoutMonthWeek(spans, week), week, 1);
    expect(result.visibleSegments.map((s) => s.event.id)).toEqual([
      'placeholder',
    ]);
    expect(result.days[3]).toMatchObject({ moreCount: 1, moreLane: 1 });
    expect(result.days[3].events.map((e) => e.id)).toEqual(['a']);
  });
});

describe('applyMonthOverflow', () => {
  it('shows everything when it fits', () => {
    const segs = layout([
      timed('a', '2026-10-27T08:00', '2026-10-27T09:00'),
      timed('b', '2026-10-27T09:00', '2026-10-27T10:00'),
    ]);
    const result = applyMonthOverflow(segs, week, 2);
    expect(result.visibleSegments).toHaveLength(2);
    expect(result.days[2].moreCount).toBe(0);
  });

  it('reserves the last row for "+N more" when a day overflows', () => {
    const segs = layout(
      ['a', 'b', 'c', 'd'].map((id, i) =>
        timed(id, `2026-10-27T0${i + 1}:00`, `2026-10-27T0${i + 1}:30`)
      )
    );
    const result = applyMonthOverflow(segs, week, 3);
    expect(result.visibleSegments.map((s) => s.event.id)).toEqual(['a', 'b']);
    expect(result.days[2]).toMatchObject({ moreCount: 2, moreLane: 2 });
    expect(result.days[2].events.map((e) => e.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('hides a bar on every day when it overflows on one, and counts it there', () => {
    const segs = layout([
      allDay('x', '2026-10-26'),
      allDay('y', '2026-10-26'),
      allDay('bar', '2026-10-26', '2026-10-28'),
      timed('t1', '2026-10-26T09:00', '2026-10-26T10:00'),
    ]);
    // bar takes lane 0; x and y lanes 1 and 2; t1 lane 3 → Monday overflows
    const result = applyMonthOverflow(segs, week, 2);
    const visible = result.visibleSegments.map((s) => s.event.id);
    expect(visible).toEqual(['bar']);
    expect(result.days[1].moreCount).toBe(3);

    const tighter = applyMonthOverflow(segs, week, 1);
    expect(tighter.visibleSegments).toHaveLength(0);
    // Tuesday and Wednesday fit on their own, but the hidden bar forces "+1 more"
    expect(tighter.days[2]).toMatchObject({ moreCount: 1, moreLane: 0 });
    expect(tighter.days[3]).toMatchObject({ moreCount: 1, moreLane: 0 });
  });
});
