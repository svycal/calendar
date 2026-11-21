import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import type { SwipeDirection } from '@/types/calendar';
import { LONG_PRESS_MS, TOUCH_SLOP_PX } from './useTouchDrag';

/** Share of the page's width a drag must pass to turn the page on release. */
const COMMIT_FRACTION = 1 / 3;
/** Speed (px/ms) of a release that turns the page however short the drag. */
const FLING_VELOCITY = 0.3;
/** How far back (ms) to look for the release speed. */
const VELOCITY_WINDOW_MS = 100;
/** How long (ms) a turned page waits for the next period before going back. */
const PENDING_TIMEOUT_MS = 5000;

/** The page's horizontal offset, in px, set on the moving element. */
const OFFSET_VAR = '--cal-swipe-x';

interface SwipeNavigationOptions {
  /** The scroll container, which receives the touches. */
  rootRef: RefObject<HTMLElement | null>;
  /** The element that follows the finger. */
  gridRef: RefObject<HTMLElement | null>;
  /** A pinned column on the left, such as the time gutter, that isn't part of the page. */
  gutterRef?: RefObject<HTMLElement | null>;
  onSwipe?: (direction: SwipeDirection) => void;
  /** Identifies the shown period. A change completes a turned page. */
  periodKey: string;
}

/**
 * Swipe sideways with one finger to show the previous or next period, like
 * Google Calendar's mobile app. The page follows the finger, revealing a
 * neighbor that the view draws while `swiping` is true. Releasing past
 * `COMMIT_FRACTION` of the page, or flinging it, slides the neighbor into
 * place and calls `onSwipe`; the page stays there until `periodKey` changes,
 * then snaps back to show the new period where the neighbor was. Anything
 * else slides back.
 *
 * Vertical drags, long presses, and multi-touch are left to the browser and
 * the grid's other gestures. A grid wider than its container scrolls
 * sideways first, and the swipe takes over once it reaches the edge.
 */
export function useSwipeNavigation({
  rootRef,
  gridRef,
  gutterRef,
  onSwipe,
  periodKey,
}: SwipeNavigationOptions) {
  const [swiping, setSwiping] = useState(false);
  const onSwipeRef = useRef(onSwipe);
  const periodKeyRef = useRef(periodKey);
  useEffect(() => {
    onSwipeRef.current = onSwipe;
    periodKeyRef.current = periodKey;
  });

  // From the start of a swipe until the page is back at rest
  const busyRef = useRef(false);
  // A turned page waiting for the period to change
  const pendingRef = useRef<{ direction: SwipeDirection; key: string } | null>(
    null
  );
  // Where to scroll sideways once the new period shows
  const scrollToRef = useRef<SwipeDirection | null>(null);
  // Whether a swipe brought in the shown period
  const swipedRef = useRef(false);
  const frameRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const enabled = !!onSwipe;

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;

    let track: {
      id: number;
      startX: number;
      startY: number;
      startTime: number;
      /** The finger moves sideways, not down or up */
      sideways: boolean;
      canPrevious: boolean;
      canNext: boolean;
      engaged: boolean;
      originX: number;
      width: number;
      offset: number;
      samples: { time: number; x: number }[];
    } | null = null;

    const setOffset = (x: number) =>
      gridRef.current?.style.setProperty(OFFSET_VAR, `${x}px`);

    const finish = () => {
      clearTimeout(timeoutRef.current);
      pendingRef.current = null;
      busyRef.current = false;
      gridRef.current?.style.removeProperty(OFFSET_VAR);
      setSwiping(false);
    };

    const animate = (
      from: number,
      to: number,
      velocity: number,
      done: () => void
    ) => {
      cancelAnimationFrame(frameRef.current);
      const distance = Math.abs(to - from);
      if (
        distance < 1 ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        setOffset(to);
        done();
        return;
      }
      // Carry on at the release speed, easing out
      const duration = Math.min(
        300,
        Math.max(120, distance / Math.max(Math.abs(velocity), 1))
      );
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 3;
        setOffset(from + (to - from) * eased);
        if (t < 1) {
          frameRef.current = requestAnimationFrame(step);
        } else {
          done();
        }
      };
      frameRef.current = requestAnimationFrame(step);
    };

    const settleBack = (from: number, velocity = 0) =>
      animate(from, 0, velocity, finish);

    const release = (commit: boolean) => {
      if (!track) return;
      const { offset, width, samples } = track;
      track = null;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const velocity =
        first && last && last.time > first.time
          ? (last.x - first.x) / (last.time - first.time)
          : 0;
      const sameWay = Math.sign(velocity) === Math.sign(offset);
      const turns =
        commit &&
        offset !== 0 &&
        (Math.abs(offset) > width * COMMIT_FRACTION ||
          (sameWay && Math.abs(velocity) > FLING_VELOCITY)) &&
        // A fling back toward the start cancels however far it went
        !(!sameWay && Math.abs(velocity) > FLING_VELOCITY);

      if (!turns) {
        settleBack(offset, velocity);
        return;
      }

      const direction: SwipeDirection = offset < 0 ? 'next' : 'previous';
      const target = offset < 0 ? -width : width;
      animate(offset, target, velocity, () => {
        pendingRef.current = { direction, key: periodKeyRef.current };
        timeoutRef.current = setTimeout(
          () => settleBack(target),
          PENDING_TIMEOUT_MS
        );
        onSwipeRef.current?.(direction);
      });
    };

    const findTouch = (list: TouchList) =>
      track && Array.from(list).find((touch) => touch.identifier === track!.id);

    const handleStart = (e: TouchEvent) => {
      // A second finger, as in a pinch, ends the swipe
      if (track?.engaged) {
        const { offset } = track;
        track = null;
        settleBack(offset);
        return;
      }
      if (busyRef.current || e.touches.length !== 1) {
        track = null;
        return;
      }
      const touch = e.touches[0];
      track = {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: e.timeStamp,
        sideways: false,
        canPrevious: false,
        canNext: false,
        engaged: false,
        originX: touch.clientX,
        width: 0,
        offset: 0,
        samples: [],
      };
    };

    const handleMove = (e: TouchEvent) => {
      const touch = findTouch(e.changedTouches);
      if (!track || !touch) return;

      if (!track.engaged) {
        const dx = touch.clientX - track.startX;
        const dy = touch.clientY - track.startY;
        if (!track.sideways) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) < TOUCH_SLOP_PX) return;
          // A scroll down or up, or a drag a long press started
          if (
            Math.abs(dx) <= Math.abs(dy) ||
            e.defaultPrevented ||
            e.timeStamp - track.startTime >= LONG_PRESS_MS
          ) {
            track = null;
            return;
          }
          track.sideways = true;
        }
        // A grid wider than its container scrolls sideways first, and the
        // page turns once it reaches the edge
        const maxScrollLeft = root.scrollWidth - root.clientWidth;
        track.canPrevious = root.scrollLeft <= 1;
        track.canNext = root.scrollLeft >= maxScrollLeft - 1;
        if (!(dx > 0 ? track.canPrevious : track.canNext)) return;
        track.engaged = true;
        track.originX = touch.clientX;
        track.width = root.clientWidth - (gutterRef?.current?.offsetWidth ?? 0);
        busyRef.current = true;
        setSwiping(true);
      }

      // Once the browser is scrolling, it can't be stopped
      if (e.cancelable) e.preventDefault();
      let offset = touch.clientX - track.originX;
      if ((offset > 0 && !track.canPrevious) || (offset < 0 && !track.canNext))
        offset = 0;
      track.offset = offset;
      track.samples.push({ time: e.timeStamp, x: touch.clientX });
      while (track.samples[0].time < e.timeStamp - VELOCITY_WINDOW_MS) {
        track.samples.shift();
      }
      setOffset(offset);
    };

    const handleEnd = (e: TouchEvent) => {
      if (!track || !findTouch(e.changedTouches)) return;
      if (!track.engaged) {
        track = null;
        return;
      }
      // Keeps the lifted finger from clicking what's under it
      if (e.cancelable) e.preventDefault();
      release(e.type === 'touchend');
    };

    root.addEventListener('touchstart', handleStart, { passive: true });
    root.addEventListener('touchmove', handleMove, { passive: false });
    root.addEventListener('touchend', handleEnd, { passive: false });
    root.addEventListener('touchcancel', handleEnd);
    return () => {
      root.removeEventListener('touchstart', handleStart);
      root.removeEventListener('touchmove', handleMove);
      root.removeEventListener('touchend', handleEnd);
      root.removeEventListener('touchcancel', handleEnd);
      if (track?.engaged) {
        track = null;
        cancelAnimationFrame(frameRef.current);
        finish();
      }
    };
  }, [enabled, rootRef, gridRef, gutterRef]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      clearTimeout(timeoutRef.current);
    },
    []
  );

  // The new period takes the neighbor's place before it paints
  useLayoutEffect(() => {
    const pending = pendingRef.current;
    swipedRef.current = !!pending && pending.key !== periodKey;
    if (!pending || pending.key === periodKey) return;
    clearTimeout(timeoutRef.current);
    pendingRef.current = null;
    busyRef.current = false;
    scrollToRef.current = pending.direction;
    gridRef.current?.style.removeProperty(OFFSET_VAR);
    setSwiping(false);
  }, [periodKey, gridRef]);

  // A grid wider than its container shows the side the neighbor came in on
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (swiping || !scrollToRef.current || !root) return;
    root.scrollLeft = scrollToRef.current === 'next' ? 0 : root.scrollWidth;
    scrollToRef.current = null;
  }, [swiping, rootRef]);

  return {
    /** True while the page is off its resting place: draw the neighbors. */
    swiping,
    /** True when a swipe brought in the shown period. Read in effects declared after this hook. */
    swipedRef,
    /** For the scroll container: keeps the moving page from scrolling it. */
    rootStyle: swiping ? ({ overflowX: 'hidden' } as CSSProperties) : undefined,
    /** For the element that follows the finger. */
    gridStyle: swiping
      ? ({ translate: `var(${OFFSET_VAR}, 0px) 0` } as CSSProperties)
      : undefined,
    /** For pinned elements inside it, such as the time gutter, to stay put. */
    pinnedStyle: swiping
      ? ({ translate: `calc(var(${OFFSET_VAR}, 0px) * -1) 0` } as CSSProperties)
      : undefined,
  };
}
