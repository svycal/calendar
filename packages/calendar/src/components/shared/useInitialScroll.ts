import { useLayoutEffect, useRef, type RefObject } from 'react';

interface UseInitialScrollArgs {
  /** The scroll container (`classNames.root`, `overflow-auto`). */
  rootRef: RefObject<HTMLDivElement | null>;
  /** Hour to bring to the top of the timed area, or undefined to do nothing. */
  initialScrollHour: number | undefined;
  /** `timeAxis.startHour ?? 0`. */
  startHour: number;
  /** `timeAxis.endHour ?? 24`. */
  endHour: number;
  /** Resolved hour height from `useEffectiveHourHeight`. */
  effectiveHourHeight: number;
  /**
   * Measured height of the scroll container from `useEffectiveHourHeight`. Used
   * to defer the scroll until the grid is actually laid out — a hidden or
   * zero-height container reports 0 and can't honor a scroll.
   */
  containerHeight: number;
  /** Stable identity of the active date/range; a change re-applies the scroll. */
  scrollKey: string;
}

/**
 * Scrolls the grid so `initialScrollHour` sits at the top of the visible timed
 * area on initial mount and whenever the active date/range changes.
 *
 * The header and all-day lane are both `position: sticky` inside the scroll
 * container, so they stay pinned and don't factor into `scrollTop`:
 *
 *   clamped   = clamp(initialScrollHour, startHour, endHour)
 *   scrollTop = (clamped - startHour) * effectiveHourHeight
 *
 * It only repositions on a `scrollKey` change — not on unrelated re-renders
 * (events/availability arriving, selection, hover) or a resize re-measuring
 * `effectiveHourHeight` — so it never fights the user's manual scrolling.
 *
 * When the grid first mounts in a hidden or zero-height container (an inactive
 * tab, a collapsed panel, a `display: none` modal) the scroll is deferred until
 * the container is laid out: `containerHeight` goes from 0 to its measured value
 * on reveal, which re-runs this effect and applies the scroll then.
 */
export function useInitialScroll({
  rootRef,
  initialScrollHour,
  startHour,
  endHour,
  effectiveHourHeight,
  containerHeight,
  scrollKey,
}: UseInitialScrollArgs): void {
  // The last date/range we actually scrolled for. Guards against re-scrolling
  // when the effect fires for unrelated reasons (e.g. a resize re-measure).
  const lastScrolledKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    // Ignore an omitted prop, and reject non-finite values (NaN/Infinity) so a
    // bad computed hour can't silently scroll to 0 and arm the guard.
    if (initialScrollHour == null || !Number.isFinite(initialScrollHour))
      return;
    const root = rootRef.current;
    if (!root) return;
    // Wait until the container has been laid out — a hidden/zero-height
    // container can't honor a scroll. This also guarantees we scroll against a
    // settled `effectiveHourHeight` rather than its pre-measurement seed.
    if (containerHeight <= 0) return;
    // Only (re)scroll when navigating to a new date/range.
    if (lastScrolledKey.current === scrollKey) return;

    const clamped = Math.min(Math.max(initialScrollHour, startHour), endHour);
    root.scrollTop = (clamped - startHour) * effectiveHourHeight;
    lastScrolledKey.current = scrollKey;
  }, [
    rootRef,
    initialScrollHour,
    startHour,
    endHour,
    effectiveHourHeight,
    containerHeight,
    scrollKey,
  ]);
}
