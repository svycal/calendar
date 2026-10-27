import { describe, expect, it } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import type {
  AllDayCalendarEvent,
  PositionedEvent,
  TimedCalendarEvent,
} from '@/types/calendar';
import {
  applyEventOverflow,
  computeMaxVisibleColumns,
  computeOverlapLayout,
  layoutAllDayEvents,
} from './overlap';

const TZ = 'America/Chicago';
const date = Temporal.PlainDate.from('2026-03-15');

function timed(
  id: string,
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number
): TimedCalendarEvent {
  return {
    id,
    title: id,
    resourceId: 'r1',
    startTime: date
      .toPlainDateTime({ hour: startHour, minute: startMin })
      .toZonedDateTime(TZ),
    endTime: date
      .toPlainDateTime({ hour: endHour, minute: endMin })
      .toZonedDateTime(TZ),
  };
}

function byId<T extends { event: { id: string } }>(layout: T[]) {
  return Object.fromEntries(
    layout.map((entry) => [entry.event.id, entry])
  ) as Record<string, T>;
}

describe('computeOverlapLayout', () => {
  it('gives non-overlapping events full width', () => {
    const layout = computeOverlapLayout(
      [timed('a', 9, 0, 10, 0), timed('b', 11, 0, 12, 0)],
      TZ,
      date
    );
    const map = byId(layout);
    expect(map.a.subColumn).toBe(0);
    expect(map.a.totalSubColumns).toBe(1);
    expect(map.a.colSpan).toBe(1);
    expect(map.b.subColumn).toBe(0);
    expect(map.b.totalSubColumns).toBe(1);
    expect(map.b.colSpan).toBe(1);
  });

  it('splits two overlapping events into equal columns', () => {
    const layout = computeOverlapLayout(
      [timed('a', 9, 0, 10, 0), timed('b', 9, 15, 10, 0)],
      TZ,
      date
    );
    const map = byId(layout);
    expect(map.a.subColumn).toBe(0);
    expect(map.b.subColumn).toBe(1);
    expect(map.a.totalSubColumns).toBe(2);
    expect(map.b.totalSubColumns).toBe(2);
    expect(map.a.colSpan).toBe(1);
    expect(map.b.colSpan).toBe(1);
  });

  it('lets an event expand into unused columns to its right', () => {
    const layout = computeOverlapLayout(
      [
        timed('a', 7, 0, 17, 0),
        timed('b', 10, 0, 12, 0),
        timed('c', 10, 0, 11, 0),
        timed('d', 14, 0, 15, 0),
      ],
      TZ,
      date
    );
    const map = byId(layout);
    expect(map.a.subColumn).toBe(0);
    // Same start time: shorter end (C) is packed before B
    expect(map.c.subColumn).toBe(1);
    expect(map.b.subColumn).toBe(2);
    expect(map.d.subColumn).toBe(1);
    expect(map.a.totalSubColumns).toBe(3);
    expect(map.a.colSpan).toBe(1);
    expect(map.b.colSpan).toBe(1);
    expect(map.c.colSpan).toBe(1);
    // D reuses column 1 after C; column 2 is free during 14–15
    expect(map.d.colSpan).toBe(2);
  });

  it('does not give every event in a connected group the group max width', () => {
    const layout = computeOverlapLayout(
      [
        timed('long', 7, 0, 17, 0),
        timed('mid', 10, 30, 13, 0),
        timed('late', 15, 0, 15, 30),
      ],
      TZ,
      date
    );
    const map = byId(layout);
    expect(map.long.totalSubColumns).toBe(2);
    expect(map.mid.totalSubColumns).toBe(2);
    expect(map.late.totalSubColumns).toBe(2);
    expect(map.late.subColumn).toBe(1);
    expect(map.late.colSpan).toBe(1);
  });

  it('packs higher-priority events into earlier columns', () => {
    const booking = { ...timed('booking', 15, 0, 15, 30), priority: 1 };
    const block = timed('block', 7, 0, 17, 0);
    const layout = computeOverlapLayout([block, booking], TZ, date);
    const map = byId(layout);
    expect(map.booking.subColumn).toBe(0);
    expect(map.block.subColumn).toBe(1);
  });

  it('does not merge disconnected groups when priorities differ', () => {
    const late = { ...timed('late', 14, 0, 15, 0), priority: 1 };
    const early = timed('early', 8, 0, 9, 0);
    const layout = computeOverlapLayout([late, early], TZ, date);
    const map = byId(layout);
    expect(map.early.subColumn).toBe(0);
    expect(map.early.totalSubColumns).toBe(1);
    expect(map.late.subColumn).toBe(0);
    expect(map.late.totalSubColumns).toBe(1);
  });

  it('keeps higher-priority events visible when the stack is capped', () => {
    const booking = { ...timed('booking', 15, 0, 15, 30), priority: 1 };
    const layout = computeOverlapLayout(
      [
        timed('a', 7, 0, 17, 0),
        timed('b', 7, 0, 17, 0),
        timed('c', 7, 0, 17, 0),
        booking,
      ],
      TZ,
      date
    );
    expect(byId(layout).booking.subColumn).toBe(0);

    const positioned = layout.map((entry) => ({
      event: entry.event,
      top: entry.startMin,
      height: entry.endMin - entry.startMin,
      subColumn: entry.subColumn,
      totalSubColumns: entry.totalSubColumns,
      colSpan: entry.colSpan,
    }));
    const result = applyEventOverflow(positioned, 2);
    expect(result.visible.map((e) => e.event.id)).toContain('booking');
    expect(
      result.visible.find((e) => e.event.id === 'booking')?.subColumn
    ).toBe(0);
  });
});

describe('computeMaxVisibleColumns', () => {
  it('derives columns from width', () => {
    expect(computeMaxVisibleColumns(240, 80)).toBe(3);
    expect(computeMaxVisibleColumns(120, 80)).toBe(1);
    expect(computeMaxVisibleColumns(300, 80)).toBe(3);
  });

  it('applies a hard cap when set', () => {
    expect(computeMaxVisibleColumns(300, 80, 2)).toBe(2);
    expect(computeMaxVisibleColumns(120, 80, 5)).toBe(1);
  });

  it('ignores unmeasured width and disabled min width', () => {
    expect(computeMaxVisibleColumns(0, 80)).toBe(Number.POSITIVE_INFINITY);
    expect(computeMaxVisibleColumns(200, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it('uses the hard cap when width is not yet measured', () => {
    expect(computeMaxVisibleColumns(0, 80, 2)).toBe(2);
  });
});

function positioned(
  id: string,
  top: number,
  height: number,
  subColumn: number,
  totalSubColumns: number,
  colSpan = 1
): PositionedEvent {
  return {
    event: timed(id, 0, 0, 1, 0),
    top,
    height,
    subColumn,
    totalSubColumns,
    colSpan,
  };
}

describe('applyEventOverflow', () => {
  it('leaves events alone when they fit', () => {
    const events = [positioned('a', 0, 60, 0, 2), positioned('b', 0, 60, 1, 2)];
    const result = applyEventOverflow(events, 2);
    expect(result.visible).toHaveLength(2);
    expect(result.overflows).toHaveLength(0);
  });

  it('promotes a single hidden event instead of a +1 chip', () => {
    const events = [
      positioned('a', 0, 180, 0, 2, 1),
      positioned('b', 0, 60, 1, 2, 1),
    ];
    const result = applyEventOverflow(events, 1);
    expect(result.overflows).toHaveLength(0);
    expect(result.visible.map((e) => e.event.id)).toEqual(['a', 'b']);
    expect(result.visible[0].totalSubColumns).toBe(1);
    expect(result.visible[1].totalSubColumns).toBe(1);
    expect(result.visible[1].overlay).toBe(true);
  });

  it('clusters overlapping hidden events into one overflow chip', () => {
    const events = [
      positioned('a', 0, 400, 0, 3),
      positioned('b', 100, 80, 1, 3),
      positioned('c', 120, 80, 2, 3),
    ];
    const result = applyEventOverflow(events, 1);
    expect(result.visible.map((e) => e.event.id)).toEqual(['a']);
    expect(result.overflows).toHaveLength(1);
    expect(result.overflows[0].events.map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('keeps disconnected singleton overflows visible instead of +1 chips', () => {
    const events = [
      positioned('a', 0, 400, 0, 2),
      positioned('b', 40, 40, 1, 2),
      positioned('c', 200, 40, 1, 2),
    ];
    const result = applyEventOverflow(events, 1);
    expect(result.overflows).toHaveLength(0);
    expect(result.visible.map((e) => e.event.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('layoutAllDayEvents', () => {
  // Mon 2026-03-16 .. Sun 2026-03-22
  const week = Array.from({ length: 7 }, (_, i) =>
    Temporal.PlainDate.from('2026-03-16').add({ days: i })
  );

  function allDay(id: string, start: string, end = start): AllDayCalendarEvent {
    return {
      id,
      title: id,
      resourceId: 'r1',
      allDay: true,
      startDate: Temporal.PlainDate.from(start),
      endDate: Temporal.PlainDate.from(end),
    };
  }

  it('drops events outside the range', () => {
    const result = layoutAllDayEvents(
      [
        allDay('before', '2026-03-10', '2026-03-15'),
        allDay('after', '2026-03-23'),
      ],
      week
    );
    expect(result).toEqual([]);
  });

  it('clips to the range and flags continuation', () => {
    const result = byId(
      layoutAllDayEvents(
        [
          allDay('before', '2026-03-12', '2026-03-17'),
          allDay('after', '2026-03-21', '2026-03-25'),
          allDay('inside', '2026-03-18', '2026-03-19'),
        ],
        week
      )
    );
    expect(result.before).toMatchObject({
      gridColumnStart: 1,
      gridColumnSpan: 2,
      continuesBefore: true,
      continuesAfter: false,
    });
    expect(result.after).toMatchObject({
      gridColumnStart: 6,
      gridColumnSpan: 2,
      continuesBefore: false,
      continuesAfter: true,
    });
    expect(result.inside).toMatchObject({
      gridColumnStart: 3,
      gridColumnSpan: 2,
      continuesBefore: false,
      continuesAfter: false,
    });
  });

  it('packs the longest events (by full length) into the top lanes', () => {
    const result = byId(
      layoutAllDayEvents(
        [
          allDay('short', '2026-03-17'),
          // Only 2 days visible, but 8 days long, so it sorts first
          allDay('long-clipped', '2026-03-10', '2026-03-17'),
          allDay('mid', '2026-03-17', '2026-03-19'),
        ],
        week
      )
    );
    expect(result['long-clipped'].lane).toBe(0);
    expect(result.mid.lane).toBe(1);
    expect(result.short.lane).toBe(2);
  });

  it('reuses lanes for non-overlapping events and breaks ties by start then id', () => {
    const result = layoutAllDayEvents(
      [
        allDay('b', '2026-03-16'),
        allDay('a', '2026-03-16'),
        allDay('c', '2026-03-18'),
      ],
      week
    );
    expect(result.map((r) => [r.event.id, r.lane])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 0],
    ]);
  });
});
