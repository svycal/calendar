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
  /** Outside presses on elements matching this selector only dismiss the popover; the press itself is canceled. */
  dismissOnlySelector?: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}

/**
 * A fixed-position dialog for overflow lists. Mount it while open. It
 * portals to document.body so no ancestor's clipping, stacking, or
 * transform can trap it, and copies the `.dark` class when the trigger
 * is inside a dark-mode scope. Escape closes only this popover; focus
 * moves in on open and back to the trigger on Escape.
 */
export function AnchoredPopover({
  triggerRef,
  onClose,
  getPosition,
  dismissOnlySelector,
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
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [isReady]);

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
      // Canceling pointerdown suppresses the mousedown that follows, so
      // the press can't also start a selection underneath.
      if (dismissOnlySelector && target.closest?.(dismissOnlySelector)) {
        e.preventDefault();
      }
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [triggerRef, dismissOnlySelector]);

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
