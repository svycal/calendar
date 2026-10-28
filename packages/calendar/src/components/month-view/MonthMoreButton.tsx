import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { Temporal } from 'temporal-polyfill';
import { formatDayOfWeek } from '@/lib/time';
import { DAYS_PER_WEEK, getMonthEventSpan } from '@/lib/month';
import type {
  CalendarEvent,
  MonthOverflowClickInfo,
  MonthOverflowPopoverRenderProps,
  MonthViewClassNames,
} from '@/types/calendar';
import { AnchoredPopover } from '../shared/AnchoredPopover';
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
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const setButtonRef = useCallback(
    (el: HTMLButtonElement | null) => {
      buttonRef.current = el;
      assignRef(anchorRef, el);
    },
    [anchorRef]
  );

  const close = useCallback(() => setOpen(false), []);

  // Center the popover over the day cell, clamped to the viewport
  const getPosition = ({
    width,
    height,
  }: {
    width: number;
    height: number;
  }) => {
    const week = weekRef.current?.getBoundingClientRect();
    if (!week) return null;
    const cellWidth = week.width / DAYS_PER_WEEK;
    const cellCenter = week.left + cellWidth * (col + 0.5);
    // Clamp the left margin last so a too-narrow viewport cuts off the right
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(
        cellCenter - width / 2,
        window.innerWidth - width - VIEWPORT_MARGIN
      )
    );
    const top = Math.max(
      VIEWPORT_MARGIN,
      Math.min(week.top, window.innerHeight - height - VIEWPORT_MARGIN)
    );
    return { top, left };
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && buttonRef.current) {
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
      {open && popoverContent && (
        <AnchoredPopover
          triggerRef={buttonRef}
          onClose={close}
          getPosition={getPosition}
          ariaLabel={dateLabel}
          className={cls('morePopover')}
        >
          {popoverContent}
        </AnchoredPopover>
      )}
    </>
  );
}
