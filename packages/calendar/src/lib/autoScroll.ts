/** Distance from a scroll viewport edge that starts auto-scroll, in px. */
export const AUTO_SCROLL_EDGE_PX = 48;

/** Peak auto-scroll speed while the pointer is at or past an edge. */
export const AUTO_SCROLL_MAX_PX_PER_SECOND = 400;

/**
 * Sideways edge zone, in px. Narrower than the vertical one, which would
 * take a quarter of a phone's width.
 */
export const AUTO_SCROLL_HORIZONTAL_EDGE_PX = 32;

/**
 * Peak sideways speed. Slower than vertical, since one column can be most of
 * the viewport and is easy to overshoot.
 */
export const AUTO_SCROLL_HORIZONTAL_MAX_PX_PER_SECOND = 250;

function isScrollableOverflowY(value: string): boolean {
  return value === 'auto' || value === 'scroll' || value === 'overlay';
}

/**
 * Nearest ancestor that scrolls vertically (overflow-y auto/scroll/overlay).
 * The calendar root is `overflow-auto`, so this is the grid's own scroller.
 */
export function findVerticalScrollParent(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el.parentElement;
  while (current) {
    if (isScrollableOverflowY(getComputedStyle(current).overflowY)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Signed intensity in [-1, 1] for pointer-driven vertical auto-scroll.
 * Negative scrolls up, positive scrolls down, 0 means the pointer is outside
 * the edge zones. Intensity ramps from 0 at `edgePx` away from the edge to 1
 * at the edge (and stays 1 past it). On a short viewport the zones are shrunk
 * so they don't overlap; if they still meet, the closer edge wins.
 */
export function computeAutoScrollIntensity(
  pointerY: number,
  viewportTop: number,
  viewportBottom: number,
  edgePx: number = AUTO_SCROLL_EDGE_PX
): number {
  const height = viewportBottom - viewportTop;
  if (height <= 0) return 0;

  const edge = Math.min(edgePx, height / 2);
  if (edge <= 0) return 0;

  const distBottom = viewportBottom - pointerY;
  const distTop = pointerY - viewportTop;

  if (distBottom < edge && distBottom <= distTop) {
    return Math.min(1, (edge - distBottom) / edge);
  }
  if (distTop < edge) {
    return -Math.min(1, (edge - distTop) / edge);
  }
  return 0;
}

/**
 * Scroll `scrollParent` along `axis` by
 * `intensity * maxPxPerSecond * deltaSeconds`. Returns the actual delta
 * applied after clamping to the scroll range.
 */
export function applyAutoScroll(
  scrollParent: HTMLElement,
  axis: 'x' | 'y',
  intensity: number,
  deltaSeconds: number,
  maxPxPerSecond: number = axis === 'y'
    ? AUTO_SCROLL_MAX_PX_PER_SECOND
    : AUTO_SCROLL_HORIZONTAL_MAX_PX_PER_SECOND
): number {
  if (intensity === 0 || deltaSeconds <= 0) return 0;

  const delta = intensity * maxPxPerSecond * deltaSeconds;
  const maxScroll = Math.max(
    0,
    axis === 'y'
      ? scrollParent.scrollHeight - scrollParent.clientHeight
      : scrollParent.scrollWidth - scrollParent.clientWidth
  );
  const key = axis === 'y' ? 'scrollTop' : 'scrollLeft';
  const prev = scrollParent[key];
  const next = Math.min(maxScroll, Math.max(0, prev + delta));
  scrollParent[key] = next;
  return next - prev;
}

export interface AutoScroller {
  /** Start the rAF loop if it isn't already running. */
  ensure: () => void;
  /** Cancel the rAF loop. Safe to call more than once. */
  stop: () => void;
}

interface CreateAutoScrollerOptions {
  /** Omit to scroll sideways only. */
  getPointerY?: () => number;
  getScrollParent: () => HTMLElement | null;
  /** Also scroll sideways when the pointer nears the left or right edge. */
  horizontal?: {
    getPointerX: () => number;
    /**
     * Left edge of the visible area, such as the right edge of a sticky
     * gutter that covers the first column. Default: the scroller's left edge.
     */
    getViewportLeft?: () => number | undefined;
  };
  /** Called after the scroller actually moves, so the caller can remap the pointer. */
  onScroll: () => void;
  raf?: typeof requestAnimationFrame;
  cancelRaf?: typeof cancelAnimationFrame;
}

/**
 * rAF loop that auto-scrolls while the pointer sits in an edge zone. The
 * loop stops on its own when the pointer leaves the edge zones or the
 * scroller can't move further; call `ensure()` again to resume.
 */
export function createAutoScroller({
  getPointerY,
  getScrollParent,
  horizontal,
  onScroll,
  raf = requestAnimationFrame,
  cancelRaf = cancelAnimationFrame,
}: CreateAutoScrollerOptions): AutoScroller {
  let rafId: number | null = null;
  let lastTs: number | null = null;
  let stopped = false;

  const tick = (now: number) => {
    if (stopped) return;
    rafId = null;

    const scrollParent = getScrollParent();
    if (!scrollParent) {
      lastTs = null;
      return;
    }

    const rect = scrollParent.getBoundingClientRect();
    const intensityY = getPointerY
      ? computeAutoScrollIntensity(getPointerY(), rect.top, rect.bottom)
      : 0;
    const intensityX = horizontal
      ? computeAutoScrollIntensity(
          horizontal.getPointerX(),
          horizontal.getViewportLeft?.() ?? rect.left,
          rect.right,
          AUTO_SCROLL_HORIZONTAL_EDGE_PX
        )
      : 0;
    if (intensityX === 0 && intensityY === 0) {
      lastTs = null;
      return;
    }

    const dt = lastTs == null ? 1 / 60 : Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;

    const scrolledY = applyAutoScroll(scrollParent, 'y', intensityY, dt);
    const scrolledX = applyAutoScroll(scrollParent, 'x', intensityX, dt);
    if (scrolledX === 0 && scrolledY === 0) {
      lastTs = null;
      return;
    }

    onScroll();
    rafId = raf(tick);
  };

  return {
    ensure: () => {
      if (stopped || rafId != null) return;
      rafId = raf(tick);
    },
    stop: () => {
      stopped = true;
      if (rafId != null) {
        cancelRaf(rafId);
        rafId = null;
      }
      lastTs = null;
    },
  };
}
