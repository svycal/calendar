/** Distance from a scroll viewport edge that starts auto-scroll, in px. */
export const AUTO_SCROLL_EDGE_PX = 48;

/** Peak auto-scroll speed while the pointer is at or past an edge. */
export const AUTO_SCROLL_MAX_PX_PER_SECOND = 400;

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
 * Scroll `scrollParent` by `intensity * maxPxPerSecond * deltaSeconds`.
 * Returns the actual delta applied after clamping to the scroll range.
 */
export function applyVerticalAutoScroll(
  scrollParent: HTMLElement,
  intensity: number,
  deltaSeconds: number,
  maxPxPerSecond: number = AUTO_SCROLL_MAX_PX_PER_SECOND
): number {
  if (intensity === 0 || deltaSeconds <= 0) return 0;

  const delta = intensity * maxPxPerSecond * deltaSeconds;
  const maxScroll = Math.max(
    0,
    scrollParent.scrollHeight - scrollParent.clientHeight
  );
  const prev = scrollParent.scrollTop;
  const next = Math.min(maxScroll, Math.max(0, prev + delta));
  scrollParent.scrollTop = next;
  return next - prev;
}

export interface VerticalAutoScroller {
  /** Start the rAF loop if it isn't already running. */
  ensure: () => void;
  /** Cancel the rAF loop. Safe to call more than once. */
  stop: () => void;
}

interface CreateVerticalAutoScrollerOptions {
  getPointerY: () => number;
  getScrollParent: () => HTMLElement | null;
  /** Called after the scroller actually moves, so the caller can remap the pointer. */
  onScroll: () => void;
  raf?: typeof requestAnimationFrame;
  cancelRaf?: typeof cancelAnimationFrame;
}

/**
 * rAF loop that auto-scrolls while the pointer sits in an edge zone. The
 * loop stops on its own when intensity hits 0 or the scroller can't move
 * further; call `ensure()` again to resume.
 */
export function createVerticalAutoScroller({
  getPointerY,
  getScrollParent,
  onScroll,
  raf = requestAnimationFrame,
  cancelRaf = cancelAnimationFrame,
}: CreateVerticalAutoScrollerOptions): VerticalAutoScroller {
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
    const intensity = computeAutoScrollIntensity(
      getPointerY(),
      rect.top,
      rect.bottom
    );
    if (intensity === 0) {
      lastTs = null;
      return;
    }

    const dt = lastTs == null ? 1 / 60 : Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;

    const scrolled = applyVerticalAutoScroll(scrollParent, intensity, dt);
    if (scrolled === 0) {
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
