import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { AUTO_SCROLL_MAX_PX_PER_SECOND } from '@/lib/autoScroll';
import { SlotInteractionLayer } from './SlotInteractionLayer';

const TZ = 'UTC';
const date = Temporal.PlainDate.from('2026-06-08');
const HOUR_HEIGHT = 60;
const COLUMN_HEIGHT = 24 * HOUR_HEIGHT;
const VIEWPORT_HEIGHT = 400;

const mounts: Array<{ root: Root; scroller: HTMLElement }> = [];
let queuedFrames: FrameRequestCallback[] = [];

afterEach(() => {
  while (mounts.length) {
    const { root, scroller } = mounts.pop()!;
    act(() => root.unmount());
    scroller.remove();
  }
  queuedFrames = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function rect(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    left: 0,
    right: 200,
    width: 200,
    height,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function renderLayer(onSelect = vi.fn()) {
  queuedFrames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queuedFrames.push(cb);
    return queuedFrames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    void id;
  });

  const scroller = document.createElement('div');
  scroller.style.overflowY = 'auto';
  Object.defineProperty(scroller, 'clientHeight', {
    configurable: true,
    get: () => VIEWPORT_HEIGHT,
  });
  Object.defineProperty(scroller, 'scrollHeight', {
    configurable: true,
    get: () => COLUMN_HEIGHT,
  });
  scroller.scrollTop = 0;
  scroller.getBoundingClientRect = () => rect(0, VIEWPORT_HEIGHT);
  document.body.appendChild(scroller);

  let root!: Root;
  act(() => {
    root = createRoot(scroller);
    root.render(
      <SlotInteractionLayer
        columnId="col"
        column={1}
        date={date}
        timeZone={TZ}
        startHour={0}
        endHour={24}
        hourHeight={HOUR_HEIGHT}
        snapDuration={15}
        placeholderDuration={15}
        cls={() => ''}
        onSelect={onSelect}
      />
    );
  });
  mounts.push({ root, scroller });

  const layer = scroller.firstElementChild as HTMLElement;
  layer.getBoundingClientRect = () => rect(-scroller.scrollTop, COLUMN_HEIGHT);

  return { scroller, layer, onSelect };
}

function mouse(type: 'mousedown' | 'mousemove' | 'mouseup', clientY: number) {
  return new MouseEvent(type, {
    clientY,
    bubbles: true,
    cancelable: true,
  });
}

describe('SlotInteractionLayer auto-scroll', () => {
  it('scrolls the overflow parent when the pointer is held at the bottom edge', () => {
    const { scroller, layer } = renderLayer();

    act(() => {
      layer.dispatchEvent(mouse('mousedown', 80));
    });
    act(() => {
      document.dispatchEvent(mouse('mousemove', VIEWPORT_HEIGHT));
    });

    expect(queuedFrames).toHaveLength(1);
    act(() => {
      queuedFrames.shift()!(0);
    });

    expect(scroller.scrollTop).toBeCloseTo(AUTO_SCROLL_MAX_PX_PER_SECOND / 60);
  });

  it('does not auto-scroll when dragging in the middle of the viewport', () => {
    const { scroller, layer } = renderLayer();

    act(() => {
      layer.dispatchEvent(mouse('mousedown', 80));
    });
    act(() => {
      document.dispatchEvent(mouse('mousemove', 200));
    });

    expect(queuedFrames).toHaveLength(0);
    expect(scroller.scrollTop).toBe(0);
  });

  it('extends the selection as the grid scrolls under a stationary pointer', () => {
    const onSelect = vi.fn();
    const { scroller, layer } = renderLayer(onSelect);

    act(() => {
      layer.dispatchEvent(mouse('mousedown', 80));
    });
    act(() => {
      document.dispatchEvent(mouse('mousemove', VIEWPORT_HEIGHT));
    });

    // Advance enough frames that the pointer maps past the originally visible
    // bottom (~400 minutes without scroll).
    act(() => {
      let now = 0;
      while (queuedFrames.length > 0 && scroller.scrollTop < 240) {
        const tick = queuedFrames.shift()!;
        tick(now);
        now += 16;
      }
    });

    expect(scroller.scrollTop).toBeGreaterThan(200);

    act(() => {
      document.dispatchEvent(mouse('mouseup', VIEWPORT_HEIGHT));
    });

    expect(onSelect).toHaveBeenCalled();
    const last = onSelect.mock.calls.at(-1)?.[0] as {
      startTime: Temporal.ZonedDateTime;
      endTime: Temporal.ZonedDateTime;
    };
    const endMinutes = last.endTime.hour * 60 + last.endTime.minute;
    // Visible bottom without scroll is 400px = 400 minutes (6:40). After
    // scrolling ~200px the pointer maps to ~600 minutes (10:00).
    expect(endMinutes).toBeGreaterThan(400);
  });
});
