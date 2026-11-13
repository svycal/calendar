import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { DayGridView } from './DayGridView';
import type { DayGridSelectedRange, DayGridViewProps } from '@/types/calendar';

// jsdom has no layout: the container measures 0, so hours stay HOUR_HEIGHT
// tall and a time's offset in a column is its minutes since midnight.
const HOUR_HEIGHT = 60;
const COLUMN_WIDTH = 100;
const TZ = 'America/Chicago';
const monday = Temporal.PlainDate.from('2026-03-02');
const wednesday = monday.add({ days: 2 });

const mounts: Array<{ root: Root; container: HTMLElement }> = [];

afterEach(() => {
  while (mounts.length) {
    const { root, container } = mounts.pop()!;
    act(() => root.unmount());
    container.remove();
  }
});

function at(date: Temporal.PlainDate, hour: number, minute = 0) {
  return date.toPlainDateTime({ hour, minute }).toZonedDateTime(TZ);
}

function render(props: Partial<DayGridViewProps> = {}): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ui: ReactElement = (
    <DayGridView
      activeRange={{ startDate: monday, endDate: monday.add({ days: 4 }) }}
      timeZone={TZ}
      events={[]}
      hourHeight={HOUR_HEIGHT}
      {...props}
    />
  );
  act(() => root.render(ui));
  mounts.push({ root, container });
  return container;
}

// Lays the slot columns out side by side, each a day tall.
function layOutColumns(container: HTMLElement) {
  const columns = container.querySelectorAll<HTMLElement>('[data-slot-column]');
  columns.forEach((column, i) => {
    column.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 24 * HOUR_HEIGHT,
        left: i * COLUMN_WIDTH,
        right: (i + 1) * COLUMN_WIDTH,
        width: COLUMN_WIDTH,
        height: 24 * HOUR_HEIGHT,
        x: i * COLUMN_WIDTH,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
  });
  return columns;
}

function mouse(target: EventTarget, type: string, x: number, y: number) {
  act(() => {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
      })
    );
  });
}

describe('DayGridView multi-day selection', () => {
  it.each([
    ['rightward', 0, 2],
    ['leftward', 2, 0],
  ])(
    'repeats the time window on each day when dragging %s',
    (_, fromColumn, toColumn) => {
      const onSelect = vi.fn<(range: DayGridSelectedRange | null) => void>();
      const container = render({
        snapDuration: 15,
        onSelect,
        multiDaySelection: true,
        classNames: { selectionHighlight: 'test-selection' },
      });
      const columns = layOutColumns(container);

      mouse(columns[fromColumn], 'mousedown', fromColumn * 100 + 50, 9 * 60);
      mouse(document, 'mousemove', toColumn * 100 + 50, 10 * 60 + 5);

      expect(container.querySelectorAll('.test-selection')).toHaveLength(3);

      mouse(document, 'mouseup', toColumn * 100 + 50, 10 * 60 + 5);

      const range = onSelect.mock.lastCall?.[0];
      expect(range?.startTime.toString()).toBe(at(monday, 9).toString());
      expect(range?.endTime.toString()).toBe(at(monday, 10, 15).toString());
      expect(range?.endDate?.toString()).toBe(wednesday.toString());
    }
  );

  it('keeps a drag in one column without multiDaySelection', () => {
    const onSelect = vi.fn<(range: DayGridSelectedRange | null) => void>();
    const container = render({ snapDuration: 15, onSelect });
    const columns = layOutColumns(container);

    mouse(columns[0], 'mousedown', 50, 9 * 60);
    mouse(document, 'mousemove', 250, 10 * 60);
    mouse(document, 'mouseup', 250, 10 * 60);

    const range = onSelect.mock.lastCall?.[0];
    expect(range?.startTime.toString()).toBe(at(monday, 9).toString());
    expect(range?.endDate).toBeUndefined();
  });

  it('draws a selection with endDate in every selected day', () => {
    const container = render({
      selectedRange: {
        startTime: at(monday, 9),
        endTime: at(monday, 10),
        endDate: wednesday,
      },
      classNames: { selectionHighlight: 'test-selection' },
    });

    const highlights = container.querySelectorAll('.test-selection');
    expect(highlights).toHaveLength(3);
  });
});

describe('DayGridView background events', () => {
  it('splits an event that crosses midnight across both days', () => {
    const container = render({
      backgroundEvents: [
        {
          id: 'late',
          startTime: at(monday, 22),
          endTime: at(monday.add({ days: 1 }), 2),
          className: 'test-bg',
        },
      ],
      renderBackgroundEvent: ({ height }) => <span>{height}</span>,
    });

    const blocks = [...container.querySelectorAll<HTMLElement>('.test-bg')].map(
      (el) => [el.style.top, el.style.height, el.textContent]
    );
    expect(blocks).toEqual([
      [`${22 * HOUR_HEIGHT}px`, `${2 * HOUR_HEIGHT}px`, '120'],
      ['0px', `${2 * HOUR_HEIGHT}px`, '120'],
    ]);
  });
});

describe('DayGridView onSlotHover', () => {
  it('reports the snapped slot under the pointer', () => {
    const onSlotHover = vi.fn();
    const container = render({
      snapDuration: 30,
      placeholderDuration: 30,
      onSlotHover,
    });
    const columns = layOutColumns(container);

    mouse(columns[2], 'mousemove', 250, 14 * 60 + 40);
    mouse(columns[2], 'mousemove', 250, 14 * 60 + 50);

    expect(onSlotHover).toHaveBeenCalledTimes(1);
    const info = onSlotHover.mock.lastCall?.[0];
    expect(info.date.toString()).toBe(wednesday.toString());
    expect(info.startTime.toString()).toBe(at(wednesday, 14, 30).toString());
    expect(info.endTime.toString()).toBe(at(wednesday, 15).toString());
  });
});

describe('DayGridView display-only events', () => {
  it('lets clicks through an event with interactive: false', () => {
    const onEventClick = vi.fn();
    const container = render({
      onEventClick,
      eventMinWidth: 0,
      events: [
        {
          id: 'busy',
          title: 'Busy',
          resourceId: '',
          startTime: at(monday, 9),
          endTime: at(monday, 10),
          interactive: false,
        },
      ],
    });

    const chip = [...container.querySelectorAll<HTMLElement>('div')].find(
      (el) => el.style.top === `${9 * HOUR_HEIGHT}px`
    );
    expect(chip?.style.pointerEvents).toBe('none');
    expect(chip?.textContent).toContain('Busy');
    expect(chip?.getAttribute('role')).toBeNull();
  });
});

describe('DayGridView scrollKey', () => {
  it('re-applies initialScrollHour when scrollKey changes', () => {
    const height = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'clientHeight'
    );
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 600,
    });

    try {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      mounts.push({ root, container });
      const renderAt = (scrollKey: string) =>
        act(() =>
          root.render(
            <DayGridView
              activeRange={{ startDate: monday, endDate: monday }}
              timeZone={TZ}
              events={[]}
              hourHeight={HOUR_HEIGHT}
              initialScrollHour={8}
              scrollKey={scrollKey}
            />
          )
        );

      renderAt('a');
      const scroller = container.firstElementChild as HTMLElement;
      expect(scroller.scrollTop).toBe(8 * HOUR_HEIGHT);

      scroller.scrollTop = 0;
      renderAt('a');
      expect(scroller.scrollTop).toBe(0);

      renderAt('b');
      expect(scroller.scrollTop).toBe(8 * HOUR_HEIGHT);
    } finally {
      if (height) {
        Object.defineProperty(HTMLElement.prototype, 'clientHeight', height);
      } else {
        delete (HTMLElement.prototype as { clientHeight?: number })
          .clientHeight;
      }
    }
  });
});
