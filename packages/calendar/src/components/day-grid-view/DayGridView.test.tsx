import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { DayGridView } from './DayGridView';
import type {
  DayGridSelectedRange,
  DayGridViewProps,
  EventDrop,
} from '@/types/calendar';

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
  el.getBoundingClientRect = () => fakeRect(left, right);
}

function fakeRect(left: number, right: number): DOMRect {
  return {
    top: 0,
    bottom: 24 * HOUR_HEIGHT,
    left,
    right,
    width: right - left,
    height: 24 * HOUR_HEIGHT,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

// Lays the day columns out side by side, each a day tall, inside a scroller
// that shows all of them. Returns the slot columns.
function layOutColumns(container: HTMLElement) {
  const columns = container.querySelectorAll<HTMLElement>('[data-slot-column]');
  const days = container.querySelectorAll<HTMLElement>('[data-day-column]');
  const eventColumns = container.querySelectorAll<HTMLElement>(
    '[data-event-column]'
  );
  [columns, days, eventColumns].forEach((list) =>
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
        // A pointer's click counts its presses; a keyboard click's is 0
        detail: type === 'click' ? 1 : 0,
      })
    );
  });
}

function pointer(
  target: EventTarget,
  type: string,
  x: number,
  y: number,
  { pointerType = 'mouse' }: { pointerType?: string } = {}
) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        pointerId: 1,
        pointerType,
        isPrimary: true,
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

describe('DayGridView all-day events', () => {
  it('keeps long titles from widening the columns', () => {
    const title = 'A very long all-day event title '.repeat(4);
    const allDay = (id: string, interactive?: boolean) => ({
      id,
      title,
      resourceId: '',
      allDay: true as const,
      startDate: monday,
      endDate: monday,
      ...(interactive === undefined ? {} : { interactive }),
    });
    const container = render({
      events: [
        allDay('plain'),
        allDay('display-only', false),
        allDay('picked'),
      ],
      selectedEventId: 'picked',
    });

    // The grid sizes its columns to their content. Every chip, including the
    // selected one's wrapper, must contain its own width so the title
    // truncates instead.
    const chips = [
      ...container.querySelectorAll<HTMLElement>('[style*="grid-row"]'),
    ].filter((el) => el.textContent === title && el.style.gridColumn);
    expect(chips).toHaveLength(3);
    chips.forEach((chip) => expect(chip.style.contain).toBe('inline-size'));
  });
});

describe('DayGridView hiddenDates', () => {
  const tuesday = monday.add({ days: 1 });
  const thursday = monday.add({ days: 3 });
  const allDay = (id: string, start: Temporal.PlainDate, end = start) => ({
    id,
    title: id,
    resourceId: '',
    allDay: true as const,
    startDate: start,
    endDate: end,
  });
  const chipColumn = (container: HTMLElement, title: string) =>
    [...container.querySelectorAll<HTMLElement>('[style*="grid-column"]')]
      .filter((el) => el.textContent === title)
      .pop()?.style.gridColumn;

  it('leaves out hidden days and lays out the rest side by side', () => {
    const container = render({
      hiddenDates: [wednesday],
      events: [
        allDay('tue-thu', tuesday, thursday),
        allDay('wed-only', wednesday),
        {
          id: 'thu-timed',
          title: 'thu-timed',
          resourceId: '',
          startTime: at(thursday, 9),
          endTime: at(thursday, 10),
        },
      ],
      selectedRange: {
        startTime: at(tuesday, 0),
        endTime: at(wednesday, 0),
        endDate: thursday,
        allDay: true,
      },
      classNames: { selectionHighlight: 'test-selection' },
    });

    const headers = [
      ...container.querySelectorAll<HTMLElement>('[role="columnheader"]'),
    ];
    expect(headers.map((h) => h.textContent)).toEqual([
      'Mon2',
      'Tue3',
      'Thu5',
      'Fri6',
    ]);
    expect(
      [...container.querySelectorAll<HTMLElement>('[data-day-column]')].map(
        (el) => el.dataset.dayColumn
      )
    ).toEqual(['2026-03-02', '2026-03-03', '2026-03-05', '2026-03-06']);

    // Tuesday and Thursday are the second and third columns.
    expect(chipColumn(container, 'tue-thu')).toBe('2 / span 2');
    expect(chipColumn(container, 'wed-only')).toBeUndefined();
    expect(
      container.querySelector<HTMLElement>('.test-selection')?.style.gridColumn
    ).toBe('2 / 4');
    const thuColumn = container.querySelector<HTMLElement>(
      '[data-event-column="2026-03-05"]'
    );
    expect(thuColumn?.textContent).toContain('thu-timed');
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

describe('DayGridView custom-rendered events', () => {
  it('handles clicks and keys on events drawn by renderEvent, as on default chips', () => {
    const onEventClick = vi.fn();
    const container = render({
      onEventClick,
      renderEvent: ({ event }) => <span>{event.title} (custom)</span>,
      events: [
        {
          id: 'custom',
          title: 'Custom',
          resourceId: '',
          startTime: at(monday, 9),
          endTime: at(monday, 10),
        },
        {
          id: 'busy',
          title: 'Busy',
          resourceId: '',
          startTime: at(wednesday, 9),
          endTime: at(wednesday, 10),
          interactive: false,
        },
      ],
    });

    const wrapperOf = (text: string) =>
      [...container.querySelectorAll('span')].find(
        (span) => span.textContent === text
      )!.parentElement!;

    const custom = wrapperOf('Custom (custom)');
    expect(custom.getAttribute('role')).toBe('button');
    expect(custom.tabIndex).toBe(0);
    expect(custom.getAttribute('aria-label')).toMatch(/^Custom, /);

    act(() => custom.click());
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick.mock.calls[0][0].id).toBe('custom');

    act(() => {
      custom.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    expect(onEventClick).toHaveBeenCalledTimes(2);

    const busy = wrapperOf('Busy (custom)');
    expect(busy.getAttribute('role')).toBeNull();
    expect(busy.style.pointerEvents).toBe('none');
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
      const initialScrollTop = scroller.scrollTop;
      expect(initialScrollTop).toBeGreaterThan(0);

      scroller.scrollTop = 0;
      renderAt('a');
      expect(scroller.scrollTop).toBe(0);

      renderAt('b');
      expect(scroller.scrollTop).toBe(initialScrollTop);
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

describe('DayGridView outlined events', () => {
  const RED = 'rgb(239, 68, 68)';

  it('draws outlined timed and all-day events in their color, without a fill or color bar', () => {
    const container = render({
      events: [
        {
          id: 'invite',
          title: 'Invite',
          resourceId: '',
          color: '#ef4444',
          appearance: 'outline',
          startTime: at(monday, 9),
          endTime: at(monday, 10),
        },
        {
          id: 'offsite',
          title: 'Offsite',
          resourceId: '',
          color: '#ef4444',
          appearance: 'outline',
          allDay: true,
          startDate: monday,
          endDate: monday,
        },
        {
          id: 'filled',
          title: 'Filled',
          resourceId: '',
          color: '#ef4444',
          startTime: at(wednesday, 9),
          endTime: at(wednesday, 10),
        },
      ],
    });

    const chip = (label: string) =>
      container.querySelector<HTMLElement>(`[aria-label^="${label}"]`)!;
    const hasColorBar = (el: HTMLElement) =>
      Array.from(el.querySelectorAll<HTMLElement>('*')).some(
        (child) => child.style.backgroundColor === RED
      );

    for (const outlined of [chip('Invite'), chip('Offsite, all day')]) {
      expect(outlined.style.getPropertyValue('--cal-event-color')).toBe(
        '#ef4444'
      );
      expect(outlined.className).toContain('ring-cal-event-outline');
      expect(outlined.className).toContain('bg-cal-surface');
      expect(outlined.className).not.toContain('bg-cal-event-bg');
      expect(hasColorBar(outlined)).toBe(false);
    }

    const filled = chip('Filled');
    expect(filled.style.getPropertyValue('--cal-event-color')).toBe('');
    expect(filled.className).not.toContain('ring-cal-event-outline');
    expect(hasColorBar(filled)).toBe(true);
  });
});

describe('DayGridView event drag and drop', () => {
  const standup = {
    id: 'standup',
    title: 'Standup',
    resourceId: 'r1',
    startTime: at(monday, 9),
    endTime: at(monday, 9, 45),
  };

  function renderDraggable(props: Partial<DayGridViewProps> = {}) {
    const onEventDrop = vi.fn<(drop: EventDrop) => void>();
    const onEventClick = vi.fn();
    const container = render({
      events: [standup],
      snapDuration: 15,
      onEventDrop,
      onEventClick,
      classNames: { event: 'test-event', eventDragSource: 'test-dragged' },
      ...props,
    });
    layOutColumns(container);
    const chip = container.querySelector<HTMLElement>(
      '.test-event[role="button"]'
    )!;
    return { container, chip, onEventDrop, onEventClick };
  }

  it('reports where the event was dropped, keeping the grab point and duration, without clicking it', () => {
    const { container, chip, onEventDrop, onEventClick } = renderDraggable();

    // Grab the event 20 minutes below its start, drop it on Wednesday
    pointer(chip, 'pointerdown', 50, 9 * 60 + 20);
    pointer(document, 'pointermove', 250, 11 * 60 + 23);

    // While dragging, the event is dimmed in place and drawn at 11:00
    expect(chip.classList).toContain('test-dragged');
    const previews = container.querySelectorAll('.test-event:not([role])');
    expect(previews).toHaveLength(1);
    expect(previews[0].textContent).toContain('11 am');

    pointer(document, 'pointerup', 250, 11 * 60 + 23);
    mouse(chip, 'click', 250, 11 * 60 + 23);

    expect(onEventClick).not.toHaveBeenCalled();
    expect(onEventDrop).toHaveBeenCalledTimes(1);
    const drop = onEventDrop.mock.lastCall![0];
    expect(drop.event).toBe(standup);
    expect(drop.resourceId).toBe('r1');
    expect(drop.startTime.toString()).toBe(at(wednesday, 11).toString());
    expect(drop.endTime.toString()).toBe(at(wednesday, 11, 45).toString());

    // Without a pendingDrop, the grid doesn't move the event itself
    expect(container.querySelectorAll('.test-event:not([role])')).toHaveLength(
      0
    );
    expect(chip.classList).not.toContain('test-dragged');
  });

  it('lets a dragged event run past the end of the day, keeping a snap of it on the axis', () => {
    const { chip, onEventDrop } = renderDraggable();

    pointer(chip, 'pointerdown', 50, 9 * 60);
    pointer(document, 'pointermove', 50, 26 * 60);
    pointer(document, 'pointerup', 50, 26 * 60);

    const drop = onEventDrop.mock.lastCall![0];
    expect(drop.startTime.toString()).toBe(at(monday, 23, 45).toString());
    expect(drop.endTime.toString()).toBe(
      at(monday.add({ days: 1 }), 0, 30).toString()
    );
  });

  it('moves an event that crosses midnight from its second day without shifting it', () => {
    const lateShift = {
      ...standup,
      startTime: at(monday, 23),
      endTime: at(monday.add({ days: 1 }), 1),
    };
    const { container, onEventDrop } = renderDraggable({ events: [lateShift] });
    // Its Tuesday part, midnight to 1 am
    const tuesdayPart = container.querySelectorAll<HTMLElement>(
      '.test-event[role="button"]'
    )[1];

    pointer(tuesdayPart, 'pointerdown', 150, 30);
    pointer(document, 'pointermove', 150, 35);
    pointer(document, 'pointerup', 150, 35);
    expect(onEventDrop).not.toHaveBeenCalled();

    pointer(tuesdayPart, 'pointerdown', 150, 30);
    pointer(document, 'pointermove', 150, 90);
    pointer(document, 'pointerup', 150, 90);
    const drop = onEventDrop.mock.lastCall![0];
    expect(drop.startTime.toString()).toBe(
      at(monday.add({ days: 1 }), 0).toString()
    );
  });

  it('reports nothing when an event in another time zone is dropped where it started', () => {
    const { chip, onEventDrop } = renderDraggable({
      events: [
        {
          ...standup,
          startTime: standup.startTime.withTimeZone('UTC'),
          endTime: standup.endTime.withTimeZone('UTC'),
        },
      ],
    });

    pointer(chip, 'pointerdown', 50, 9 * 60);
    pointer(document, 'pointermove', 250, 12 * 60);
    pointer(document, 'pointermove', 50, 9 * 60 + 5);
    pointer(document, 'pointerup', 50, 9 * 60 + 5);

    expect(onEventDrop).not.toHaveBeenCalled();
  });

  it('keeps a drag in a column while the pointer is in the gap after its events', () => {
    const { container, chip, onEventDrop } = renderDraggable();
    // Event columns end 12px short of the next day, as `mr-3` lays them out
    container
      .querySelectorAll<HTMLElement>('[data-event-column]')
      .forEach((el, i) => mockRect(el, i * 100, i * 100 + 88));

    pointer(chip, 'pointerdown', 50, 9 * 60);
    pointer(document, 'pointermove', 95, 10 * 60);
    pointer(document, 'pointerup', 95, 10 * 60);

    const drop = onEventDrop.mock.lastCall![0];
    expect(drop.startTime.toString()).toBe(at(monday, 10).toString());
  });

  it('treats a press without movement as a click', () => {
    const { chip, onEventDrop, onEventClick } = renderDraggable();

    pointer(chip, 'pointerdown', 50, 9 * 60 + 10);
    pointer(document, 'pointermove', 52, 9 * 60 + 11);
    pointer(document, 'pointerup', 52, 9 * 60 + 11);
    mouse(chip, 'click', 52, 9 * 60 + 11);

    expect(onEventDrop).not.toHaveBeenCalled();
    expect(onEventClick).toHaveBeenCalledWith(standup);
  });

  it('reports nothing when the drag is cancelled or ends where it started', () => {
    const { container, chip, onEventDrop, onEventClick } = renderDraggable();

    pointer(chip, 'pointerdown', 50, 9 * 60);
    pointer(document, 'pointermove', 250, 12 * 60);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    expect(container.querySelectorAll('.test-event:not([role])')).toHaveLength(
      0
    );
    pointer(document, 'pointermove', 150, 13 * 60);
    pointer(document, 'pointerup', 150, 13 * 60);
    mouse(chip, 'click', 150, 13 * 60);

    pointer(chip, 'pointerdown', 50, 9 * 60);
    pointer(document, 'pointermove', 250, 12 * 60);
    pointer(document, 'pointermove', 50, 9 * 60 + 5);
    pointer(document, 'pointerup', 50, 9 * 60 + 5);

    expect(onEventDrop).not.toHaveBeenCalled();
    expect(onEventClick).not.toHaveBeenCalled();
  });

  it('draws a pending drop at its new place until it is cleared', () => {
    const pendingDropRef = vi.fn();
    const pendingDrop: EventDrop = {
      event: standup,
      resourceId: 'r1',
      startTime: at(wednesday, 14),
      endTime: at(wednesday, 14, 45),
    };
    const { container, chip } = renderDraggable({
      pendingDrop,
      pendingDropRef,
    });

    expect(chip.classList).toContain('test-dragged');
    const moved = container.querySelector<HTMLElement>(
      '.test-event:not([role])'
    )!;
    expect(moved.textContent).toContain('Standup');
    expect(moved.textContent).toContain('2 pm');
    // On Wednesday, the third day column, 14 hours down
    const anchor = pendingDropRef.mock.lastCall![0] as HTMLElement;
    expect(anchor.contains(moved)).toBe(true);
    expect(anchor.style.top).toBe(`${14 * HOUR_HEIGHT}px`);
    expect((anchor.parentElement as HTMLElement).style.gridColumn).toBe('4');
  });

  describe('on touch', () => {
    afterEach(() => vi.useRealTimers());

    function touchMove(target: EventTarget) {
      const move = new Event('touchmove', { bubbles: true, cancelable: true });
      act(() => {
        target.dispatchEvent(move);
      });
      return move;
    }

    it('drags after a long press and keeps the finger from scrolling', () => {
      vi.useFakeTimers();
      const { container, chip, onEventDrop } = renderDraggable();
      const touch = { pointerType: 'touch' };

      pointer(chip, 'pointerdown', 50, 9 * 60 + 20, touch);
      // Before the long press completes, the grid still scrolls
      expect(touchMove(chip).defaultPrevented).toBe(false);
      expect(chip.classList).not.toContain('test-dragged');

      act(() => vi.advanceTimersByTime(400));
      expect(chip.classList).toContain('test-dragged');
      expect(touchMove(chip).defaultPrevented).toBe(true);

      pointer(document, 'pointermove', 250, 11 * 60 + 23, touch);
      pointer(document, 'pointerup', 250, 11 * 60 + 23, touch);

      const drop = onEventDrop.mock.lastCall![0];
      expect(drop.startTime.toString()).toBe(at(wednesday, 11).toString());
      expect(touchMove(container).defaultPrevented).toBe(false);
    });

    it('lets a swipe across an event scroll instead of dragging it', () => {
      vi.useFakeTimers();
      const { chip, onEventDrop, onEventClick } = renderDraggable();
      const touch = { pointerType: 'touch' };

      pointer(chip, 'pointerdown', 50, 9 * 60 + 20, touch);
      pointer(document, 'pointermove', 50, 9 * 60 + 40, touch);
      act(() => vi.advanceTimersByTime(1000));
      expect(chip.classList).not.toContain('test-dragged');
      expect(touchMove(chip).defaultPrevented).toBe(false);
      pointer(document, 'pointerup', 50, 9 * 60 + 40, touch);

      // A quick tap still opens the event
      pointer(chip, 'pointerdown', 50, 9 * 60 + 20, touch);
      pointer(document, 'pointerup', 50, 9 * 60 + 20, touch);
      mouse(chip, 'click', 50, 9 * 60 + 20);

      expect(onEventDrop).not.toHaveBeenCalled();
      expect(onEventClick).toHaveBeenCalledWith(standup);
    });

    it('drops nothing when the browser cancels the touch', () => {
      vi.useFakeTimers();
      const { chip, onEventDrop } = renderDraggable();
      const touch = { pointerType: 'touch' };

      pointer(chip, 'pointerdown', 50, 9 * 60, touch);
      act(() => vi.advanceTimersByTime(400));
      pointer(document, 'pointermove', 250, 12 * 60, touch);
      pointer(document, 'pointercancel', 250, 12 * 60, touch);

      expect(onEventDrop).not.toHaveBeenCalled();
      expect(chip.classList).not.toContain('test-dragged');
    });
  });
});

describe('DayGridView sideways auto-scroll during drag selection', () => {
  let frames: FrameRequestCallback[] = [];

  afterEach(() => {
    frames = [];
    vi.unstubAllGlobals();
  });

  // Shows two of the five 100px day columns in a root that scrolls
  // sideways; column positions follow its scrollLeft.
  function renderScrollable(props: Partial<DayGridViewProps>) {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      frames.push(cb)
    );
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const container = render({ snapDuration: 15, ...props });
    const root = container.firstElementChild as HTMLElement;
    root.style.overflowX = 'auto';
    root.style.overflowY = 'auto';
    Object.defineProperty(root, 'clientWidth', { get: () => 200 });
    Object.defineProperty(root, 'scrollWidth', { get: () => 500 });
    Object.defineProperty(root, 'clientHeight', { get: () => 24 * 60 });
    Object.defineProperty(root, 'scrollHeight', { get: () => 24 * 60 });
    mockRect(root, 0, 200);
    for (const selector of ['[data-slot-column]', '[data-day-column]']) {
      container.querySelectorAll<HTMLElement>(selector).forEach((el, i) => {
        el.getBoundingClientRect = () => {
          const left = i * COLUMN_WIDTH - root.scrollLeft;
          return fakeRect(left, left + COLUMN_WIDTH);
        };
      });
    }
    return { container, root };
  }

  // Runs animation frames until the root has scrolled `px` sideways
  function scrollUntil(root: HTMLElement, px: number) {
    act(() => {
      let now = 0;
      while (frames.length > 0 && root.scrollLeft < px) {
        frames.shift()!((now += 16));
      }
    });
  }

  // The day under x = 195 once the root has scrolled
  function dayUnderRightEdge(root: HTMLElement) {
    return monday.add({
      days: Math.floor((195 + root.scrollLeft) / COLUMN_WIDTH),
    });
  }

  it('scrolls sideways and extends a multi-day selection to newly shown days', () => {
    const onSelect = vi.fn<(range: DayGridSelectedRange | null) => void>();
    const { container, root } = renderScrollable({
      onSelect,
      multiDaySelection: true,
    });
    const columns = container.querySelectorAll('[data-slot-column]');

    mouse(columns[0], 'mousedown', 50, 9 * 60);
    mouse(document, 'mousemove', 195, 10 * 60, 1);
    scrollUntil(root, 150);
    mouse(document, 'mouseup', 195, 10 * 60);

    expect(root.scrollLeft).toBeGreaterThanOrEqual(150);
    const range = onSelect.mock.lastCall?.[0];
    expect(range?.endDate?.toString()).toBe(dayUnderRightEdge(root).toString());
    expect(root.scrollTop).toBe(0);
  });

  it('does not scroll sideways for a selection kept in one column', () => {
    const { container, root } = renderScrollable({ onSelect: vi.fn() });
    const columns = container.querySelectorAll('[data-slot-column]');

    mouse(columns[0], 'mousedown', 50, 9 * 60);
    mouse(document, 'mousemove', 195, 10 * 60, 1);
    scrollUntil(root, 150);
    mouse(document, 'mouseup', 195, 10 * 60);

    expect(root.scrollLeft).toBe(0);
  });

  it('scrolls sideways while dragging days across the all-day row', () => {
    const onSelect = vi.fn<(range: DayGridSelectedRange | null) => void>();
    const { container, root } = renderScrollable({
      onSelect,
      multiDaySelection: true,
    });
    const days = container.querySelectorAll('[data-day-column]');

    mouse(days[0], 'mousedown', 50, 0);
    mouse(document, 'mousemove', 195, 0, 1);
    scrollUntil(root, 150);
    mouse(document, 'mouseup', 195, 0);

    expect(root.scrollLeft).toBeGreaterThanOrEqual(150);
    const range = onSelect.mock.lastCall?.[0];
    expect(range?.allDay).toBe(true);
    expect(range?.endDate?.toString()).toBe(dayUnderRightEdge(root).toString());
  });
});

describe('DayGridView drag selection on touch', () => {
  const touch = { pointerType: 'touch' };

  afterEach(() => vi.useRealTimers());

  function touchMoveBlocked(target: EventTarget) {
    const move = new Event('touchmove', { bubbles: true, cancelable: true });
    act(() => {
      target.dispatchEvent(move);
    });
    return move.defaultPrevented;
  }

  it('selects across days after a long press, keeping the finger from scrolling', () => {
    vi.useFakeTimers();
    const onSelect = vi.fn<(range: DayGridSelectedRange | null) => void>();
    const container = render({
      snapDuration: 15,
      onSelect,
      multiDaySelection: true,
    });
    const columns = layOutColumns(container);

    pointer(columns[0], 'pointerdown', 50, 9 * 60, touch);
    expect(touchMoveBlocked(columns[0])).toBe(false);
    act(() => vi.advanceTimersByTime(400));
    expect(touchMoveBlocked(columns[0])).toBe(true);
    pointer(document, 'pointermove', 250, 10 * 60 + 5, touch);
    pointer(document, 'pointerup', 250, 10 * 60 + 5, touch);

    const range = onSelect.mock.lastCall?.[0];
    expect(range?.startTime.toString()).toBe(at(monday, 9).toString());
    expect(range?.endTime.toString()).toBe(at(monday, 10, 15).toString());
    expect(range?.endDate?.toString()).toBe(wednesday.toString());
  });

  it('lets a swipe scroll instead of selecting, and selects nothing when the touch is cancelled', () => {
    vi.useFakeTimers();
    const onSelect = vi.fn<(range: DayGridSelectedRange | null) => void>();
    const container = render({ snapDuration: 15, onSelect });
    const columns = layOutColumns(container);

    pointer(columns[0], 'pointerdown', 50, 9 * 60, touch);
    pointer(document, 'pointermove', 50, 9 * 60 + 30, touch);
    act(() => vi.advanceTimersByTime(1000));
    expect(touchMoveBlocked(columns[0])).toBe(false);
    pointer(document, 'pointerup', 50, 9 * 60 + 30, touch);
    expect(onSelect).not.toHaveBeenCalled();

    pointer(columns[0], 'pointerdown', 50, 9 * 60, touch);
    act(() => vi.advanceTimersByTime(400));
    pointer(document, 'pointermove', 50, 11 * 60, touch);
    pointer(document, 'pointercancel', 50, 11 * 60, touch);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('keeps a touch press from starting a native text selection', () => {
    vi.useFakeTimers();
    const container = render({ snapDuration: 15, onSelect: vi.fn() });
    const columns = layOutColumns(container);
    const selectStartBlocked = () => {
      const e = new Event('selectstart', { bubbles: true, cancelable: true });
      act(() => {
        columns[0].dispatchEvent(e);
      });
      return e.defaultPrevented;
    };

    pointer(columns[0], 'pointerdown', 50, 9 * 60, touch);
    expect(selectStartBlocked()).toBe(true);
    act(() => vi.advanceTimersByTime(400));
    expect(selectStartBlocked()).toBe(true);
    pointer(document, 'pointerup', 50, 9 * 60, touch);
    expect(selectStartBlocked()).toBe(false);
  });

  it('selects whole days by long-pressing and dragging across the all-day row', () => {
    vi.useFakeTimers();
    const onSelect = vi.fn<(range: DayGridSelectedRange | null) => void>();
    const container = render({
      snapDuration: 15,
      onSelect,
      multiDaySelection: true,
    });
    layOutColumns(container);
    const days = container.querySelectorAll('[data-day-column]');

    pointer(days[0], 'pointerdown', 50, 0, touch);
    act(() => vi.advanceTimersByTime(400));
    expect(touchMoveBlocked(days[0])).toBe(true);
    pointer(document, 'pointermove', 250, 0, touch);
    pointer(document, 'pointerup', 250, 0, touch);

    const range = onSelect.mock.lastCall?.[0];
    expect(range?.allDay).toBe(true);
    expect(range?.endDate?.toString()).toBe(wednesday.toString());
  });
});

describe('DayGridView swipe navigation', () => {
  const nextWeek = monday.add({ days: 7 });

  afterEach(() => vi.unstubAllGlobals());

  // A phone-width grid, scrolled to `scrollLeft` of `scrollWidth`. Reduced
  // motion turns the page without animating.
  function renderSwipeable(
    onSwipe: DayGridViewProps['onSwipe'],
    { scrollLeft = 0, scrollWidth = 400 } = {}
  ) {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const container = render({ onSwipe });
    const root = container.firstElementChild as HTMLElement;
    Object.defineProperty(root, 'clientWidth', { value: 400 });
    Object.defineProperty(root, 'scrollWidth', { value: scrollWidth });
    root.scrollLeft = scrollLeft;
    return { container, root };
  }

  function fireTouch(
    target: Element,
    type: string,
    [x, y, time]: [number, number, number]
  ) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    const point = { identifier: 1, clientX: x, clientY: y };
    Object.defineProperties(event, {
      touches: { value: type === 'touchend' ? [] : [point] },
      changedTouches: { value: [point] },
      timeStamp: { value: time },
    });
    act(() => {
      target.dispatchEvent(event);
    });
    return event;
  }

  // Each point is [x, y, ms since the touch started]
  function drag(target: Element, path: [number, number, number][]) {
    const [start, ...rest] = path;
    fireTouch(target, 'touchstart', start);
    const moves = rest.map((point) => fireTouch(target, 'touchmove', point));
    fireTouch(target, 'touchend', path[path.length - 1]);
    return moves;
  }

  it('turns the page for a swipe past a third of the width, and shows the new range in place', () => {
    const onSwipe = vi.fn();
    const { container, root } = renderSwipeable(onSwipe);
    const grid = root.firstElementChild as HTMLElement;

    // The page starts moving after the touch slop, so it moves 150px of 400
    const moves = drag(grid, [
      [300, 300, 0],
      [280, 302, 50],
      [130, 305, 300],
    ]);
    expect(moves.every((move) => move.defaultPrevented)).toBe(true);
    expect(onSwipe).toHaveBeenCalledExactlyOnceWith('next');
    expect(grid.style.translate).not.toBe('');

    act(() =>
      mounts[0].root.render(
        <DayGridView
          activeRange={{
            startDate: nextWeek,
            endDate: nextWeek.add({ days: 4 }),
          }}
          timeZone={TZ}
          events={[]}
          hourHeight={HOUR_HEIGHT}
          onSwipe={onSwipe}
        />
      )
    );
    expect(grid.style.translate).toBe('');
    expect(
      container.querySelector('[aria-hidden="true"] [role="columnheader"]')
    ).toBeNull();
  });

  it('leaves short swipes, swipes down, and swipes the grid can still scroll to the browser', () => {
    const onSwipe = vi.fn();
    const { root } = renderSwipeable(onSwipe);
    const grid = root.firstElementChild as HTMLElement;

    // 110px of 400, held still before letting go
    drag(grid, [
      [300, 300, 0],
      [280, 300, 50],
      [170, 300, 300],
      [170, 300, 600],
    ]);
    expect(grid.style.translate).toBe('');
    const down = drag(grid, [
      [300, 300, 0],
      [295, 330, 50],
      [100, 600, 100],
    ]);
    expect(down.some((move) => move.defaultPrevented)).toBe(false);
    expect(onSwipe).not.toHaveBeenCalled();

    // Scrolled to the left edge of a wider grid: only a swipe right turns
    const wide = renderSwipeable(onSwipe, { scrollWidth: 800 });
    const wideGrid = wide.root.firstElementChild as HTMLElement;
    drag(wideGrid, [
      [300, 300, 0],
      [280, 300, 50],
      [50, 300, 100],
    ]);
    expect(onSwipe).not.toHaveBeenCalled();
    drag(wideGrid, [
      [100, 300, 0],
      [120, 300, 50],
      [350, 300, 100],
    ]);
    expect(onSwipe).toHaveBeenCalledExactlyOnceWith('previous');
  });
});
