import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import type { MonthViewProps, TimedCalendarEvent } from '@/types/calendar';
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

function render(props: Partial<MonthViewProps> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  act(() =>
    root.render(
      <MonthView
        month={Temporal.PlainYearMonth.from('2026-10')}
        timeZone={TZ}
        events={[]}
        {...props}
      />
    )
  );
  return container;
}

function mouse(target: EventTarget, type: string, init: MouseEventInit = {}) {
  act(() => {
    target.dispatchEvent(
      new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
    );
  });
}

describe('MonthView drag selection', () => {
  function firstDayCell(container: HTMLElement) {
    return container.querySelector<HTMLElement>(
      '[data-month-week="0"] [data-popover-dismiss-only]'
    )!;
  }

  it('selects the pressed day', () => {
    const onSelect = vi.fn();
    const container = render({ onSelect });
    mouse(firstDayCell(container), 'mousedown');
    mouse(document, 'mouseup');
    expect(onSelect).toHaveBeenLastCalledWith({
      startDate: Temporal.PlainDate.from('2026-09-27'),
      endDate: Temporal.PlainDate.from('2026-09-27'),
    });
  });

  it('cancels on Escape without selecting', () => {
    const onSelect = vi.fn();
    const container = render({ onSelect });
    mouse(firstDayCell(container), 'mousedown');
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    mouse(document, 'mouseup');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('ignores ctrl-click, which opens the context menu on macOS', () => {
    const onSelect = vi.fn();
    const container = render({ onSelect });
    mouse(firstDayCell(container), 'mousedown', { ctrlKey: true });
    mouse(document, 'mouseup');
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('MonthView', () => {
  it('keeps "+N more" reachable when a selection fills the only lane', () => {
    const date = Temporal.PlainDate.from('2026-10-28');
    const container = render({
      events: [timed('standup', '2026-10-28T09:00', '2026-10-28T10:00')],
      maxEventRows: 1,
      selectedRange: { startDate: date, endDate: date },
    });
    const more = [...container.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('more')
    );
    expect(more.map((b) => b.textContent)).toEqual(['+1 more']);
  });
});
