import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { DayGridView } from '../day-grid-view/DayGridView';
import { ResourceGridView } from '../resource-grid-view/ResourceGridView';
import type {
  CalendarEvent,
  DayGridViewProps,
  ResourceGridViewProps,
} from '@/types/calendar';

// jsdom has no layout, so we mock the scroll container's measured height and
// drive useEffectiveHourHeight's ResizeObserver manually. With headerHeight and
// allDayHeight measuring 0, effectiveHourHeight resolves to the `hourHeight`
// minimum, so scrollTop is deterministic: (clamped - startHour) * hourHeight.
const HOUR_HEIGHT = 60;
const TZ = 'America/New_York';

// Controllable measured container height (0 simulates a hidden/zero-height
// container; a positive value simulates a laid-out, visible one).
let mockClientHeight = 600;
let clientHeightDescriptor: PropertyDescriptor | undefined;

// Controllable ResizeObserver so tests can simulate a resize/reveal re-measure.
let resizeCallbacks: ResizeObserverCallback[] = [];
let originalResizeObserver: typeof globalThis.ResizeObserver | undefined;

class ControllableResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    resizeCallbacks.push(cb);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function fireResize() {
  act(() => {
    for (const cb of resizeCallbacks) {
      cb([], {} as ResizeObserver);
    }
  });
}

beforeAll(() => {
  clientHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientHeight'
  );
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => mockClientHeight,
  });
  originalResizeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver =
    ControllableResizeObserver as unknown as typeof globalThis.ResizeObserver;
});

afterAll(() => {
  if (clientHeightDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      'clientHeight',
      clientHeightDescriptor
    );
  } else {
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  }
  if (originalResizeObserver) {
    globalThis.ResizeObserver = originalResizeObserver;
  }
});

beforeEach(() => {
  mockClientHeight = 600;
  resizeCallbacks = [];
});

const mounts: Array<{ root: Root; container: HTMLElement }> = [];

function render(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(ui);
  });
  mounts.push({ root, container });
  const rerender = (next: ReactElement) => act(() => root.render(next));
  return { rootEl: container.firstChild as HTMLDivElement, rerender };
}

afterEach(() => {
  while (mounts.length) {
    const { root, container } = mounts.pop()!;
    act(() => root.unmount());
    container.remove();
  }
});

const date = (iso: string) => Temporal.PlainDate.from(iso);

function dayProps(overrides: Partial<DayGridViewProps> = {}): DayGridViewProps {
  return {
    activeRange: { startDate: date('2026-06-08'), endDate: date('2026-06-08') },
    timeZone: TZ,
    events: [],
    hourHeight: HOUR_HEIGHT,
    ...overrides,
  };
}

function resourceProps(
  overrides: Partial<ResourceGridViewProps> = {}
): ResourceGridViewProps {
  return {
    date: date('2026-06-08'),
    timeZone: TZ,
    resources: [{ id: 'r1', name: 'Resource 1' }],
    events: [],
    hourHeight: HOUR_HEIGHT,
    ...overrides,
  };
}

describe('DayGridView initialScrollHour', () => {
  it('scrolls 7 AM to the top of the timed area on a full day', () => {
    const { rootEl } = render(
      <DayGridView {...dayProps({ initialScrollHour: 7 })} />
    );
    expect(rootEl.scrollTop).toBe(7 * HOUR_HEIGHT);
  });

  it('supports fractional hours', () => {
    const { rootEl } = render(
      <DayGridView {...dayProps({ initialScrollHour: 1.5 })} />
    );
    expect(rootEl.scrollTop).toBe(1.5 * HOUR_HEIGHT);
  });

  it('does nothing when the prop is omitted', () => {
    const { rootEl } = render(<DayGridView {...dayProps()} />);
    expect(rootEl.scrollTop).toBe(0);
  });

  it('does not scroll for a non-finite value (NaN)', () => {
    const { rootEl } = render(
      <DayGridView {...dayProps({ initialScrollHour: NaN })} />
    );
    expect(rootEl.scrollTop).toBe(0);
  });

  it('clamps to the top when below a narrowed startHour (no negative scroll)', () => {
    const { rootEl } = render(
      <DayGridView
        {...dayProps({ initialScrollHour: 7, timeAxis: { startHour: 8 } })}
      />
    );
    expect(rootEl.scrollTop).toBe(0);
  });

  it('clamps to the bottom when past endHour', () => {
    const { rootEl } = render(
      <DayGridView
        {...dayProps({ initialScrollHour: 30, timeAxis: { endHour: 20 } })}
      />
    );
    // clamp(30, 0, 20) -> 20; (20 - 0) * 60
    expect(rootEl.scrollTop).toBe(20 * HOUR_HEIGHT);
  });

  it('does not re-scroll when an unrelated prop changes after the user scrolls', () => {
    const { rootEl, rerender } = render(
      <DayGridView {...dayProps({ initialScrollHour: 7 })} />
    );
    expect(rootEl.scrollTop).toBe(7 * HOUR_HEIGHT);

    // Simulate the user manually scrolling.
    rootEl.scrollTop = 100;

    // An unrelated re-render (new events array, same date) must not reset it.
    const newEvents: CalendarEvent[] = [];
    rerender(
      <DayGridView {...dayProps({ initialScrollHour: 7, events: newEvents })} />
    );
    expect(rootEl.scrollTop).toBe(100);
  });

  it('does not re-scroll on a resize re-measure after the user scrolls', () => {
    const { rootEl } = render(
      <DayGridView {...dayProps({ initialScrollHour: 7 })} />
    );
    expect(rootEl.scrollTop).toBe(7 * HOUR_HEIGHT);

    rootEl.scrollTop = 100;
    // A resize re-measures effectiveHourHeight/containerHeight but must not
    // re-scroll the same date.
    fireResize();
    expect(rootEl.scrollTop).toBe(100);
  });

  it('re-scrolls when the active range changes', () => {
    const { rootEl, rerender } = render(
      <DayGridView {...dayProps({ initialScrollHour: 7 })} />
    );
    rootEl.scrollTop = 100;

    rerender(
      <DayGridView
        {...dayProps({
          initialScrollHour: 7,
          activeRange: {
            startDate: date('2026-06-09'),
            endDate: date('2026-06-09'),
          },
        })}
      />
    );
    expect(rootEl.scrollTop).toBe(7 * HOUR_HEIGHT);
  });

  it('defers the scroll until a hidden container is revealed', () => {
    // Mount in a hidden / zero-height container.
    mockClientHeight = 0;
    const { rootEl } = render(
      <DayGridView {...dayProps({ initialScrollHour: 7 })} />
    );
    // Nothing scrolled yet — the container can't honor it.
    expect(rootEl.scrollTop).toBe(0);

    // Reveal it: the container now measures a real height and the
    // ResizeObserver fires a re-measure.
    mockClientHeight = 600;
    fireResize();
    expect(rootEl.scrollTop).toBe(7 * HOUR_HEIGHT);
  });
});

describe('ResourceGridView initialScrollHour', () => {
  it('scrolls 7 AM to the top of the timed area on a full day', () => {
    const { rootEl } = render(
      <ResourceGridView {...resourceProps({ initialScrollHour: 7 })} />
    );
    expect(rootEl.scrollTop).toBe(7 * HOUR_HEIGHT);
  });

  it('does nothing when the prop is omitted', () => {
    const { rootEl } = render(<ResourceGridView {...resourceProps()} />);
    expect(rootEl.scrollTop).toBe(0);
  });

  it('does not re-scroll when an unrelated prop changes after the user scrolls', () => {
    const { rootEl, rerender } = render(
      <ResourceGridView {...resourceProps({ initialScrollHour: 7 })} />
    );
    rootEl.scrollTop = 100;

    rerender(
      <ResourceGridView
        {...resourceProps({ initialScrollHour: 7, events: [] })}
      />
    );
    expect(rootEl.scrollTop).toBe(100);
  });

  it('re-scrolls when the active date changes', () => {
    const { rootEl, rerender } = render(
      <ResourceGridView {...resourceProps({ initialScrollHour: 7 })} />
    );
    rootEl.scrollTop = 100;

    rerender(
      <ResourceGridView
        {...resourceProps({ initialScrollHour: 7, date: date('2026-06-09') })}
      />
    );
    expect(rootEl.scrollTop).toBe(7 * HOUR_HEIGHT);
  });

  it('defers the scroll until a hidden container is revealed', () => {
    mockClientHeight = 0;
    const { rootEl } = render(
      <ResourceGridView {...resourceProps({ initialScrollHour: 7 })} />
    );
    expect(rootEl.scrollTop).toBe(0);

    mockClientHeight = 600;
    fireResize();
    expect(rootEl.scrollTop).toBe(7 * HOUR_HEIGHT);
  });
});
