import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Temporal } from 'temporal-polyfill';
import { formatDayOfWeek } from '@/lib/time';
import { DAYS_PER_WEEK, getMonthEventSpan } from '@/lib/month';
import type {
  CalendarEvent,
  MonthOverflowClickInfo,
  MonthOverflowPopoverRenderProps,
  MonthViewClassNames,
} from '@/types/calendar';
import { MonthEventItem } from './MonthEventItem';

const VIEWPORT_MARGIN = 8;

interface MonthMoreButtonProps {
  date: Temporal.PlainDate;
  events: CalendarEvent[];
  count: number;
  col: number;
  weekRef: RefObject<HTMLDivElement | null>;
  timeZone: string;
  cls: (key: keyof MonthViewClassNames) => string;
  onEventClick?: (event: CalendarEvent) => void;
  onOverflowClick?: (info: MonthOverflowClickInfo) => void;
  renderOverflowPopover?: (props: MonthOverflowPopoverRenderProps) => ReactNode;
  selectedEventId?: string | null;
  /** Receives the button when it stands in for a hidden selected event. */
  anchorRef?: Ref<HTMLElement>;
  style?: CSSProperties;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

export function MonthMoreButton({
  date,
  events,
  count,
  col,
  weekRef,
  timeZone,
  cls,
  onEventClick,
  onOverflowClick,
  renderOverflowPopover,
  selectedEventId,
  anchorRef,
  style,
}: MonthMoreButtonProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const setButtonRef = useCallback(
    (el: HTMLButtonElement | null) => {
      buttonRef.current = el;
      assignRef(anchorRef, el);
    },
    [anchorRef]
  );

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  // Center the popover over the day cell, clamped to the viewport
  useLayoutEffect(() => {
    if (!open) return;

    const updatePos = () => {
      const week = weekRef.current?.getBoundingClientRect();
      const popover = popoverRef.current;
      if (!week || !popover) return;
      const cellWidth = week.width / DAYS_PER_WEEK;
      const cellCenter = week.left + cellWidth * (col + 0.5);
      const { offsetWidth: width, offsetHeight: height } = popover;

      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, cellCenter - width / 2),
        window.innerWidth - width - VIEWPORT_MARGIN
      );
      const top = Math.max(
        VIEWPORT_MARGIN,
        Math.min(week.top, window.innerHeight - height - VIEWPORT_MARGIN)
      );
      setPos({ top, left });
    };

    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, col, weekRef]);

  // Move focus in once positioned; a visibility: hidden element can't take focus
  const isPositioned = pos !== null;
  useEffect(() => {
    if (open && isPositioned)
      popoverRef.current?.focus({ preventScroll: true });
  }, [open, isPositioned]);

  useEffect(() => {
    if (!open) return;
    // Capture on window so Escape closes only this popover, before it
    // reaches the view's (or the app's) own Escape handlers.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element;
      if (
        buttonRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      // A press on a day cell only dismisses the popover. Canceling
      // pointerdown suppresses the mousedown that would start a selection.
      if (target.closest?.('[data-month-day-cell]')) e.preventDefault();
      close();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, close]);

  const handleToggle = () => {
    if (open) {
      close();
      return;
    }
    // Portal into the calendar root so the popover inherits theme classes
    // (e.g. a `.dark` ancestor) while still escaping the cell's clipping.
    setPortalTarget(
      buttonRef.current?.closest<HTMLElement>('[data-month-view]') ??
        document.body
    );
    setOpen(true);
    if (buttonRef.current) {
      onOverflowClick?.({ date, events, anchor: buttonRef.current });
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    onEventClick?.(event);
    close();
  };

  const label = `${count} more event${count === 1 ? '' : 's'}`;
  const dateLabel = date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const popoverContent = open
    ? (renderOverflowPopover?.({
        date,
        events,
        onClose: close,
        onEventClick,
      }) ?? (
        <>
          <div className={cls('morePopoverHeader')}>
            <span className={cls('morePopoverWeekday')}>
              {formatDayOfWeek(date)}
            </span>
            <span className={cls('morePopoverDayNumber')}>{date.day}</span>
          </div>
          <div className={cls('morePopoverEvents')}>
            {events.map((event) => {
              const span = getMonthEventSpan(event, timeZone);
              return (
                <MonthEventItem
                  key={event.id}
                  event={event}
                  isBar={span.isBar}
                  continuesBefore={
                    Temporal.PlainDate.compare(span.startDate, date) < 0
                  }
                  continuesAfter={
                    Temporal.PlainDate.compare(span.endDate, date) > 0
                  }
                  timeZone={timeZone}
                  cls={cls}
                  onClick={handleEventClick}
                  isSelected={event.id === selectedEventId}
                  style={{ height: 22, marginLeft: 0, marginRight: 0 }}
                />
              );
            })}
          </div>
        </>
      ))
    : null;

  return (
    <>
      <button
        ref={setButtonRef}
        type="button"
        className={cls('moreButton')}
        style={{ marginLeft: 4, marginRight: 4, ...style }}
        aria-label={`${label} on ${dateLabel}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleToggle}
      >
        +{count} more
      </button>
      {open &&
        popoverContent &&
        portalTarget &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={dateLabel}
            tabIndex={-1}
            className={cls('morePopover')}
            style={{
              position: 'fixed',
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              visibility: pos ? undefined : 'hidden',
              zIndex: 50,
            }}
          >
            {popoverContent}
          </div>,
          portalTarget
        )}
    </>
  );
}
