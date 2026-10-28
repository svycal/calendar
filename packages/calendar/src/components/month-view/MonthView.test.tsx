import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import type { TimedCalendarEvent } from '@/types/calendar';
import { MonthView } from './MonthView';

const TZ = 'America/Chicago';

const mounts: Array<{ root: Root; container: HTMLElement }> = [];

afterEach(() => {
  while (mounts.length) {
    const { root, container } = mounts.pop()!;
    act(() => root.unmount());
    container.remove();
  }
});

function timed(id: string, start: string, end: string): TimedCalendarEvent {
  return {
    id,
    title: id,
    resourceId: '',
    startTime: Temporal.PlainDateTime.from(start).toZonedDateTime(TZ),
    endTime: Temporal.PlainDateTime.from(end).toZonedDateTime(TZ),
  };
}

describe('MonthView', () => {
  it('keeps "+N more" reachable when a selection fills the only lane', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    mounts.push({ root, container });
    const date = Temporal.PlainDate.from('2026-10-28');
    act(() =>
      root.render(
        <MonthView
          month={Temporal.PlainYearMonth.from('2026-10')}
          timeZone={TZ}
          events={[timed('standup', '2026-10-28T09:00', '2026-10-28T10:00')]}
          maxEventRows={1}
          selectedRange={{ startDate: date, endDate: date }}
        />
      )
    );
    const more = [...container.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('more')
    );
    expect(more.map((b) => b.textContent)).toEqual(['+1 more']);
  });
});
