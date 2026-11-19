import { useCallback, useEffect, useRef, type RefObject } from 'react';

/** How long (ms) a touch must rest before it can drag. */
export const LONG_PRESS_MS = 400;

/** How far (px) a touch can wander during the long press before it counts as a scroll. */
export const TOUCH_SLOP_PX = 10;

/**
 * Style for an element a long press drags: keeps the press from selecting
 * text or opening the iOS callout. Safari ignores `user-select` without its
 * `-webkit-` prefix.
 */
export const TOUCH_DRAG_STYLE = {
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
} as const;

export interface TouchDragHandlers {
  /** The long press completed. Return `false` to not drag after all. */
  start: (clientX: number, clientY: number) => boolean | void;
  move: (clientX: number, clientY: number) => void;
  end: (clientX: number, clientY: number) => void;
  /** The browser took the touch back, for example to scroll. */
  cancel: () => void;
}

/**
 * Long-press drags for touch and pen. Call the returned `startTouchDrag` from
 * a pointerdown: it ignores the mouse and returns false. For a touch it
 * returns true and waits `LONG_PRESS_MS` before calling `start`. Moving more
 * than `TOUCH_SLOP_PX` before then leaves the touch to scroll, and lifting it
 * is a tap, which the browser reports as emulated mouse events and a click,
 * as it did before. Once a drag starts, the finger no longer scrolls, and no
 * emulated mouse events or click follow the touch.
 *
 * `containerRef` must contain every element whose pointerdown can start a
 * drag: it holds the touch listeners, which have to be in place before a
 * touch begins to be able to stop it scrolling.
 */
export function useTouchDrag(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  // True from the start of a drag until its touch ends
  const draggingRef = useRef(false);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = containerRef.current;
    if (!enabled || !el) return;
    const blockScroll = (e: TouchEvent) => {
      if (draggingRef.current) e.preventDefault();
    };
    // Cancelling touchend stops the emulated mouse events and click
    const blockEmulatedMouse = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      e.preventDefault();
    };
    el.addEventListener('touchmove', blockScroll, { passive: false });
    el.addEventListener('touchend', blockEmulatedMouse, { passive: false });
    return () => {
      el.removeEventListener('touchmove', blockScroll);
      el.removeEventListener('touchend', blockEmulatedMouse);
    };
  }, [containerRef, enabled]);

  useEffect(() => () => stopRef.current(), []);

  return useCallback(
    (e: React.PointerEvent, handlers: TouchDragHandlers): boolean => {
      if (e.pointerType === 'mouse' || !e.isPrimary) return false;
      stopRef.current();

      const { pointerId } = e;
      const originX = e.clientX;
      const originY = e.clientY;
      let x = originX;
      let y = originY;
      let started = false;

      const handleMove = (pe: PointerEvent) => {
        if (pe.pointerId !== pointerId) return;
        x = pe.clientX;
        y = pe.clientY;
        if (started) {
          handlers.move(x, y);
        } else if (Math.hypot(x - originX, y - originY) > TOUCH_SLOP_PX) {
          stop(); // A scroll, not a drag
        }
      };
      const handleUp = (pe: PointerEvent) => {
        if (pe.pointerId !== pointerId) return;
        stop();
        if (!started) return;
        if (pe.type === 'pointercancel') {
          // No touchend follows to reset this
          draggingRef.current = false;
          handlers.cancel();
        } else {
          handlers.end(x, y);
        }
      };
      // Keeps the long press from opening a context menu or selecting text
      const preventDefault = (ev: Event) => ev.preventDefault();

      const timer = setTimeout(() => {
        if (handlers.start(x, y) === false) {
          stop();
          return;
        }
        started = true;
        draggingRef.current = true;
        // Drop any text the press managed to select before the drag
        window.getSelection()?.removeAllRanges();
      }, LONG_PRESS_MS);

      const stop = () => {
        clearTimeout(timer);
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
        document.removeEventListener('pointercancel', handleUp);
        document.removeEventListener('contextmenu', preventDefault);
        document.removeEventListener('selectstart', preventDefault);
        stopRef.current = () => {};
      };
      stopRef.current = stop;

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
      document.addEventListener('pointercancel', handleUp);
      document.addEventListener('contextmenu', preventDefault);
      document.addEventListener('selectstart', preventDefault);
      return true;
    },
    []
  );
}
