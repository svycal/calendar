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

function mockRect(el: Element, left: number, right: number) {
  el.getBoundingClientRect = () =>
    ({
      top: 0,
      bottom: 24 * HOUR_HEIGHT,
      left,
      right,
      width: right - left,
      height: 24 * HOUR_HEIGHT,
      x: left,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

// Lays the day columns out side by side, each a day tall, inside a scroller
// that shows all of them. Returns the slot columns.
function layOutColumns(container: HTMLElement) {
  const columns = container.querySelectorAll<HTMLElement>('[data-slot-column]');
  const days = container.querySelectorAll<HTMLElement>('[data-day-column]');
  [columns, days].forEach((list) =>
    list.forEach((el, i) =>
      mockRect(el, i * COLUMN_WIDTH, (i + 1) * COLUMN_WIDTH)
    )
  );
  mockRect(container.firstElementChild!, 0, days.length * COLUMN_WIDTH);
  return columns;
}

function mouse(
  target: EventTarget,
  type: string,
  x: number,
  y: number,
  buttons = 0
) {
  act(() => {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
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

  it('stops at the last visible column when dragging past the edge', () => {
    const onSelect = vi.fn<(range: DayGridSelectedRange | null) => void>();
    const container = render({
      snapDuration: 15,
      onSelect,
      multiDaySelection: true,
    });
    const columns = layOutColumns(container);
    // Scrolled so only Mon and Tue are visible
    mockRect(container.firstElementChild!, 0, 2 * COLUMN_WIDTH);

    mouse(columns[0], 'mousedown', 50, 9 * 60);
    mouse(document, 'mousemove', 450, 9 * 60);
    mouse(document, 'mouseup', 450, 9 * 60);

    const range = onSelect.mock.lastCall?.[0];
    expect(range?.endDate?.toString()).toBe(monday.add({ days: 1 }).toString());
  });

  it('selects whole days by dragging across the all-day row', () => {
    const onSelect = vi.fn<(range: DayGridSelectedRange | null) => void>();
    const container = render({
      snapDuration: 15,
      onSelect,
      multiDaySelection: true,
    });
    layOutColumns(container);
    const days = container.querySelectorAll('[data-day-column]');

    mouse(days[2], 'mousedown', 250, 0);
    expect(onSelect).toHaveBeenLastCalledWith(null);
    mouse(document, 'mousemove', 50, 0);
    mouse(document, 'mouseup', 50, 0);

    const range = onSelect.mock.lastCall?.[0];
    expect(range?.allDay).toBe(true);
    expect(range?.startTime.toString()).toBe(at(monday, 0).toString());
    expect(range?.endTime.toString()).toBe(
      at(monday.add({ days: 1 }), 0).toString()
    );
    expect(range?.endDate?.toString()).toBe(wednesday.toString());
  });

  it('draws an all-day selection in the all-day row only', () => {
    const container = render({
      selectedRange: {
        startTime: at(monday, 0),
        endTime: at(monday.add({ days: 1 }), 0),
        endDate: wednesday,
        allDay: true,
      },
      classNames: { selectionHighlight: 'test-selection' },
    });

    const highlights =
      container.querySelectorAll<HTMLElement>('.test-selection');
    expect(highlights).toHaveLength(1);
    expect(highlights[0].style.gridColumn).toBe('1 / 4');
  });

  it('clips a selection to the time axis', () => {
    const container = render({
      timeAxis: { startHour: 8, endHour: 18 },
      selectedRange: {
        startTime: at(monday, 0),
        endTime: at(monday.add({ days: 1 }), 0),
      },
      classNames: { selectionHighlight: 'test-selection' },
    });

    const box = container.querySelector('.test-selection')!
      .parentElement as HTMLElement;
    expect(box.style.top).toBe('0px');
    expect(box.style.height).toBe(`${10 * HOUR_HEIGHT}px`);
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

  it('reports nothing while a drag crosses other columns', () => {
    const onSlotHover = vi.fn();
    const container = render({
      snapDuration: 30,
      onSlotHover,
      onSelect: () => {},
      multiDaySelection: true,
    });
    const columns = layOutColumns(container);

    mouse(columns[0], 'mousemove', 50, 9 * 60);
    mouse(columns[0], 'mousedown', 50, 9 * 60);
    expect(onSlotHover).toHaveBeenLastCalledWith(null);
    onSlotHover.mockClear();

    mouse(columns[1], 'mousemove', 150, 10 * 60, 1);
    mouse(document, 'mouseup', 150, 10 * 60);

    expect(onSlotHover).not.toHaveBeenCalled();
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
