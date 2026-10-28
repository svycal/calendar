import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/**
 * Marks empty grid surfaces (time slots, day cells). While a popover is
 * open, a press on one only dismisses the popover; it doesn't also start
 * a selection or fire a slot click underneath.
 */
export const DISMISS_ONLY_ATTR = 'data-popover-dismiss-only';

/** Swallows the click that follows a dismiss-only press. */
function swallowNextClick() {
  const swallow = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    cleanup();
  };
  // If the press never becomes a click (e.g. a drag), stop waiting at the
  // next press or key, so a keyboard-triggered click isn't eaten
  const cleanup = () => {
    window.removeEventListener('click', swallow, true);
    window.removeEventListener('pointerdown', cleanup, true);
    window.removeEventListener('keydown', cleanup, true);
  };
  window.addEventListener('click', swallow, true);
  window.addEventListener('pointerdown', cleanup, true);
  window.addEventListener('keydown', cleanup, true);
}

interface PopoverPosition {
  top: number;
  left: number;
}

interface AnchoredPopoverProps {
  /** The element that opened the popover. Presses on it aren't treated as outside presses, and focus returns to it on Escape. */
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Viewport position for the popover, given its rendered size. */
  getPosition: (size: {
    width: number;
    height: number;
  }) => PopoverPosition | null;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}

/**
 * A fixed-position dialog for overflow lists. Mount it while open. It
 * portals to document.body so no ancestor's clipping, stacking, or
 * transform can trap it, and copies the `.dark` class when the trigger
 * is inside a dark-mode scope. Escape closes only this popover; focus
 * moves in on open and back to the trigger on Escape or when the popover
 * unmounts with focus inside.
 */
export function AnchoredPopover({
  triggerRef,
  onClose,
  getPosition,
  ariaLabel,
  className,
  children,
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  // null until the trigger's theme is known on mount
  const [isDark, setIsDark] = useState<boolean | null>(null);
  const [pos, setPos] = useState<PopoverPosition | null>(null);

  const onCloseRef = useRef(onClose);
  const getPositionRef = useRef(getPosition);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    getPositionRef.current = getPosition;
  });

  useLayoutEffect(() => {
    setIsDark(!!triggerRef.current?.closest('.dark'));
  }, [triggerRef]);

  const isReady = isDark !== null;
  useLayoutEffect(() => {
    if (!isReady) return;
    const updatePos = () => {
      const popover = popoverRef.current;
      if (!popover) return;
      setPos(
        getPositionRef.current({
          width: popover.offsetWidth,
          height: popover.offsetHeight,
        })
      );
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    // Content can grow after mount (async render, live updates)
    const observer = new ResizeObserver(updatePos);
    if (popoverRef.current) observer.observe(popoverRef.current);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
      observer.disconnect();
    };
  }, [isReady]);

  // Unmounting with focus inside (e.g. after a dismiss-only press or an
  // event click) would drop focus to <body>; hand it back to the trigger.
  useLayoutEffect(() => {
    if (!isReady) return;
    const popover = popoverRef.current;
    const trigger = triggerRef.current;
    return () => {
      if (popover?.contains(document.activeElement)) {
        trigger?.focus({ preventScroll: true });
      }
    };
  }, [isReady, triggerRef]);

  // A visibility: hidden element can't take focus, so wait until positioned
  const isPositioned = pos !== null;
  useEffect(() => {
    if (isPositioned) popoverRef.current?.focus({ preventScroll: true });
  }, [isPositioned]);

  useEffect(() => {
    // Capture on window so Escape closes only this popover, before it
    // reaches the view's (or the app's) own Escape handlers.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCloseRef.current();
      triggerRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      if (target.closest?.(`[${DISMISS_ONLY_ATTR}]`)) {
        // Canceling pointerdown suppresses the mousedown that would start
        // a selection; the click that follows is swallowed separately.
        e.preventDefault();
        // Only a primary-button press is followed by a click
        if (e.button === 0) swallowNextClick();
      }
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [triggerRef]);

  if (!isReady) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={ariaLabel}
      tabIndex={-1}
      className={cn(className, isDark && 'dark')}
      style={{
        position: 'fixed',
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? undefined : 'hidden',
        zIndex: 50,
        outline: 'none',
      }}
    >
      {children}
    </div>,
    document.body
  );
}
