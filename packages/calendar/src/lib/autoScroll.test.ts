import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTO_SCROLL_EDGE_PX,
  AUTO_SCROLL_HORIZONTAL_MAX_PX_PER_SECOND,
  AUTO_SCROLL_MAX_PX_PER_SECOND,
  applyAutoScroll,
  computeAutoScrollIntensity,
  createAutoScroller,
  findVerticalScrollParent,
} from './autoScroll';

describe('computeAutoScrollIntensity', () => {
  const top = 100;
  const bottom = 500;

  it('is 0 in the middle of the viewport', () => {
    expect(computeAutoScrollIntensity(300, top, bottom)).toBe(0);
  });

  it('is 0 just outside the edge zone', () => {
    expect(
      computeAutoScrollIntensity(bottom - AUTO_SCROLL_EDGE_PX, top, bottom)
    ).toBe(0);
    expect(
      computeAutoScrollIntensity(top + AUTO_SCROLL_EDGE_PX, top, bottom)
    ).toBe(0);
  });

  it('ramps to 1 at the bottom edge and stays 1 past it', () => {
    expect(computeAutoScrollIntensity(bottom, top, bottom)).toBe(1);
    expect(computeAutoScrollIntensity(bottom + 40, top, bottom)).toBe(1);
    expect(
      computeAutoScrollIntensity(bottom - AUTO_SCROLL_EDGE_PX / 2, top, bottom)
    ).toBeCloseTo(0.5);
  });

  it('ramps to -1 at the top edge and stays -1 past it', () => {
    expect(computeAutoScrollIntensity(top, top, bottom)).toBe(-1);
    expect(computeAutoScrollIntensity(top - 40, top, bottom)).toBe(-1);
    expect(
      computeAutoScrollIntensity(top + AUTO_SCROLL_EDGE_PX / 2, top, bottom)
    ).toBeCloseTo(-0.5);
  });

  it('returns 0 for an empty viewport', () => {
    expect(computeAutoScrollIntensity(100, 100, 100)).toBe(0);
    expect(computeAutoScrollIntensity(100, 200, 100)).toBe(0);
  });

  it('shrinks overlapping zones on a short viewport and prefers the closer edge', () => {
    // Viewport is 40px; edge collapses to 20px per side.
    expect(computeAutoScrollIntensity(30, 0, 40, 48)).toBeCloseTo(0.5);
    expect(computeAutoScrollIntensity(10, 0, 40, 48)).toBeCloseTo(-0.5);
    expect(computeAutoScrollIntensity(20, 0, 40, 48)).toBe(0);
  });
});

describe('applyAutoScroll', () => {
  function makeScroller(init: {
    scrollTop: number;
    clientHeight: number;
    scrollHeight: number;
  }): HTMLElement {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', {
      configurable: true,
      get: () => init.clientHeight,
    });
    Object.defineProperty(el, 'scrollHeight', {
      configurable: true,
      get: () => init.scrollHeight,
    });
    el.scrollTop = init.scrollTop;
    return el;
  }

  it('scrolls down by intensity * speed * dt', () => {
    const el = makeScroller({
      scrollTop: 0,
      clientHeight: 400,
      scrollHeight: 2000,
    });
    const applied = applyAutoScroll(el, 'y', 1, 0.1);
    expect(applied).toBeCloseTo(AUTO_SCROLL_MAX_PX_PER_SECOND * 0.1);
    expect(el.scrollTop).toBeCloseTo(AUTO_SCROLL_MAX_PX_PER_SECOND * 0.1);
  });

  it('scrolls up with negative intensity', () => {
    const el = makeScroller({
      scrollTop: 200,
      clientHeight: 400,
      scrollHeight: 2000,
    });
    const applied = applyAutoScroll(el, 'y', -1, 0.1);
    expect(applied).toBeCloseTo(-AUTO_SCROLL_MAX_PX_PER_SECOND * 0.1);
    expect(el.scrollTop).toBeCloseTo(200 - AUTO_SCROLL_MAX_PX_PER_SECOND * 0.1);
  });

  it('clamps to the max scroll offset', () => {
    const el = makeScroller({
      scrollTop: 1580,
      clientHeight: 400,
      scrollHeight: 2000,
    });
    const applied = applyAutoScroll(el, 'y', 1, 1);
    expect(applied).toBe(20);
    expect(el.scrollTop).toBe(1600);
  });

  it('clamps to 0 when scrolling up past the top', () => {
    const el = makeScroller({
      scrollTop: 10,
      clientHeight: 400,
      scrollHeight: 2000,
    });
    const applied = applyAutoScroll(el, 'y', -1, 1);
    expect(applied).toBe(-10);
    expect(el.scrollTop).toBe(0);
  });

  it('is a no-op at intensity 0 or non-positive dt', () => {
    const el = makeScroller({
      scrollTop: 50,
      clientHeight: 400,
      scrollHeight: 2000,
    });
    expect(applyAutoScroll(el, 'y', 0, 0.1)).toBe(0);
    expect(applyAutoScroll(el, 'y', 1, 0)).toBe(0);
    expect(el.scrollTop).toBe(50);
  });

  it('scrolls sideways at the horizontal speed, clamped to the scroll width', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { get: () => 400 });
    Object.defineProperty(el, 'scrollWidth', { get: () => 1000 });
    el.scrollLeft = 0;

    expect(applyAutoScroll(el, 'x', 1, 0.1)).toBeCloseTo(
      AUTO_SCROLL_HORIZONTAL_MAX_PX_PER_SECOND * 0.1
    );
    expect(el.scrollTop).toBe(0);
    expect(applyAutoScroll(el, 'x', 1, 10)).toBeCloseTo(
      600 - AUTO_SCROLL_HORIZONTAL_MAX_PX_PER_SECOND * 0.1
    );
    expect(el.scrollLeft).toBe(600);
  });
});

describe('findVerticalScrollParent', () => {
  const nodes: HTMLElement[] = [];

  afterEach(() => {
    for (const node of nodes) node.remove();
    nodes.length = 0;
  });

  function mount(el: HTMLElement): HTMLElement {
    document.body.appendChild(el);
    nodes.push(el);
    return el;
  }

  it('returns the nearest overflow-y auto ancestor', () => {
    const outer = mount(document.createElement('div'));
    outer.style.overflowY = 'auto';
    const inner = document.createElement('div');
    inner.style.overflowY = 'visible';
    const child = document.createElement('div');
    inner.appendChild(child);
    outer.appendChild(inner);

    expect(findVerticalScrollParent(child)).toBe(outer);
  });

  it('accepts overflow-y scroll', () => {
    const scroller = mount(document.createElement('div'));
    scroller.style.overflowY = 'scroll';
    const child = document.createElement('div');
    scroller.appendChild(child);

    expect(findVerticalScrollParent(child)).toBe(scroller);
  });

  it('returns null when no ancestor scrolls', () => {
    const parent = mount(document.createElement('div'));
    parent.style.overflowY = 'visible';
    const child = document.createElement('div');
    parent.appendChild(child);

    expect(findVerticalScrollParent(child)).toBeNull();
  });
});

describe('createAutoScroller', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeScroller(): HTMLElement {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(el, 'scrollHeight', {
      configurable: true,
      get: () => 2000,
    });
    Object.defineProperty(el, 'clientWidth', { get: () => 200 });
    Object.defineProperty(el, 'scrollWidth', { get: () => 1000 });
    el.scrollTop = 0;
    el.scrollLeft = 100;
    el.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 400,
        left: 0,
        right: 200,
        width: 200,
        height: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    return el;
  }

  it('scrolls and remaps while the pointer stays in the bottom edge zone', () => {
    const el = makeScroller();
    const queued: FrameRequestCallback[] = [];
    const raf = vi.fn((cb: FrameRequestCallback) => {
      queued.push(cb);
      return queued.length;
    });
    const cancelRaf = vi.fn();
    const onScroll = vi.fn();

    const scroller = createAutoScroller({
      getPointerY: () => 400,
      getScrollParent: () => el,
      onScroll,
      raf: raf as unknown as typeof requestAnimationFrame,
      cancelRaf: cancelRaf as unknown as typeof cancelAnimationFrame,
    });

    scroller.ensure();
    expect(queued).toHaveLength(1);

    queued.shift()!(0);
    expect(el.scrollTop).toBeCloseTo(AUTO_SCROLL_MAX_PX_PER_SECOND / 60);
    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(queued).toHaveLength(1);

    queued.shift()!(16);
    expect(onScroll).toHaveBeenCalledTimes(2);

    scroller.stop();
    expect(cancelRaf).toHaveBeenCalled();
  });

  it('stops the loop when the pointer leaves the edge zone', () => {
    const el = makeScroller();
    let pointerY = 400;
    const queued: FrameRequestCallback[] = [];
    const raf = vi.fn((cb: FrameRequestCallback) => {
      queued.push(cb);
      return queued.length;
    });

    const scroller = createAutoScroller({
      getPointerY: () => pointerY,
      getScrollParent: () => el,
      onScroll: vi.fn(),
      raf: raf as unknown as typeof requestAnimationFrame,
      cancelRaf: vi.fn() as unknown as typeof cancelAnimationFrame,
    });

    scroller.ensure();
    queued.shift()!(0);
    expect(queued).toHaveLength(1);

    pointerY = 200;
    queued.shift()!(16);
    expect(queued).toHaveLength(0);
  });

  it('does not queue a second rAF when ensure is called while running', () => {
    const el = makeScroller();
    const raf = vi.fn((cb: FrameRequestCallback) => {
      void cb;
      return 1;
    });

    const scroller = createAutoScroller({
      getPointerY: () => 400,
      getScrollParent: () => el,
      onScroll: vi.fn(),
      raf: raf as unknown as typeof requestAnimationFrame,
      cancelRaf: vi.fn() as unknown as typeof cancelAnimationFrame,
    });

    scroller.ensure();
    scroller.ensure();
    expect(raf).toHaveBeenCalledTimes(1);
  });

  describe('horizontal', () => {
    function run(pointerX: number, viewportLeft?: number) {
      const el = makeScroller();
      const queued: FrameRequestCallback[] = [];
      createAutoScroller({
        getPointerY: () => 200,
        getScrollParent: () => el,
        horizontal: {
          getPointerX: () => pointerX,
          getViewportLeft: () => viewportLeft,
        },
        onScroll: vi.fn(),
        raf: ((cb: FrameRequestCallback) =>
          queued.push(cb)) as unknown as typeof requestAnimationFrame,
        cancelRaf: vi.fn() as unknown as typeof cancelAnimationFrame,
      }).ensure();
      queued.shift()!(0);
      return el;
    }

    it('scrolls right at the right edge without scrolling vertically', () => {
      const el = run(200);
      expect(el.scrollLeft).toBeCloseTo(
        100 + AUTO_SCROLL_HORIZONTAL_MAX_PX_PER_SECOND / 60
      );
      expect(el.scrollTop).toBe(0);
    });

    it('measures the left edge zone from the end of a sticky gutter', () => {
      // 40px in: inside the zone measured from the scroller's own edge (32px)
      // only once the zone starts at a 50px gutter
      expect(run(40).scrollLeft).toBe(100);
      expect(run(40, 50).scrollLeft).toBeCloseTo(
        100 - AUTO_SCROLL_HORIZONTAL_MAX_PX_PER_SECOND / 60
      );
    });
  });
});
