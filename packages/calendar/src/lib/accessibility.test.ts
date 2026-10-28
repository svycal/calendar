import { describe, expect, it } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import type { CalendarEvent } from '@/types/calendar';
import { describeEvent } from './accessibility';

const TZ = 'America/Chicago';

function zdt(s: string) {
  return Temporal.PlainDateTime.from(s).toZonedDateTime(TZ);
}

const standup: CalendarEvent = {
  id: 'standup',
  title: 'Standup',
  resourceId: '',
  startTime: zdt('2026-10-28T09:30'),
  endTime: zdt('2026-10-28T09:45'),
};

describe('describeEvent', () => {
  it('leaves out the date by default', () => {
    expect(describeEvent(standup, TZ)).toBe('Standup, 9:30 am to 9:45 am');
  });

  it('includes the date of a single-day event', () => {
    expect(describeEvent(standup, TZ, { includeDate: true })).toBe(
      'Standup, Wednesday, October 28, 9:30 am to 9:45 am'
    );
  });

  it('includes the date range of a multi-day event', () => {
    const launch: CalendarEvent = {
      id: 'launch',
      title: 'Launch week',
      resourceId: '',
      allDay: true,
      startDate: Temporal.PlainDate.from('2026-10-08'),
      endDate: Temporal.PlainDate.from('2026-10-14'),
    };
    expect(describeEvent(launch, TZ, { includeDate: true })).toBe(
      'Launch week, Thursday, October 8 to Wednesday, October 14, all day'
    );
  });

  it("doesn't count a midnight end as another day", () => {
    const late: CalendarEvent = {
      ...standup,
      title: 'Late deploy',
      startTime: zdt('2026-10-06T21:00'),
      endTime: zdt('2026-10-07T00:00'),
    };
    expect(describeEvent(late, TZ, { includeDate: true })).toBe(
      'Late deploy, Tuesday, October 6, 9 pm to 12 am'
    );
  });
});
