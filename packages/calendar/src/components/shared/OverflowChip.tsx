import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  CalendarEvent,
  GridViewClassNames,
  OverflowClickInfo,
  OverflowPopoverRenderProps,
  TimedCalendarEvent,
} from '@/types/calendar';
import type { OverflowGroup } from '@/lib/overlap';
import { formatTimeRange } from '@/lib/time';
import { getEventLabel } from '@/lib/accessibility';

interface OverflowChipProps {
  group: OverflowGroup;
  timeZone: string;
  cls: (key: keyof GridViewClassNames) => string;
  onEventClick?: (event: CalendarEvent) => void;
  onOverflowClick?: (info: OverflowClickInfo) => void;
  renderOverflowPopover?: (
    props: OverflowPopoverRenderProps
  ) => React.ReactNode;
}

const POPOVER_WIDTH = 256;

export function OverflowChip({
  group,
  timeZone,
  cls,
  onEventClick,
  onOverflowClick,
  renderOverflowPopover,
}: OverflowChipProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const count = group.events.length;
  const label = `+${count}`;
  const ariaLabel = `${count} more event${count === 1 ? '' : 's'}`;

  const close = () => setOpen(false);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePos = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      let left = rect.right + 8;
      if (left + POPOVER_WIDTH > window.innerWidth - 8) {
        left = Math.max(8, rect.left - POPOVER_WIDTH - 8);
      }

      const estimatedHeight = Math.min(320, 16 + count * 52);
      let top = rect.top;
      if (top + estimatedHeight > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - estimatedHeight - 8);
      }

      setPos({ top, left });
    };

    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && buttonRef.current) {
      onOverflowClick?.({
        events: group.events,
        anchor: buttonRef.current,
      });
    }
  };

  const popoverContent = open
    ? (renderOverflowPopover?.({
        events: group.events,
        onClose: close,
        onEventClick,
      }) ?? (
        <DefaultOverflowPopover
          events={group.events}
          timeZone={timeZone}
          cls={cls}
          onEventClick={(event) => {
            onEventClick?.(event);
            close();
          }}
        />
      ))
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={cls('overflowChip')}
        style={{
          top: group.top,
          zIndex: 25,
          pointerEvents: 'auto',
        }}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={handleToggle}
      >
        <span className={cls('overflowChipLabel')}>{label}</span>
      </button>
      {open &&
        popoverContent &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={ariaLabel}
            className={cls('overflowPopover')}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: 50,
            }}
          >
            {popoverContent}
          </div>,
          document.body
        )}
    </>
  );
}

function DefaultOverflowPopover({
  events,
  timeZone,
  cls,
  onEventClick,
}: {
  events: TimedCalendarEvent[];
  timeZone: string;
  cls: (key: keyof GridViewClassNames) => string;
  onEventClick?: (event: CalendarEvent) => void;
}) {
  return (
    <div>
      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          className={cls('overflowPopoverEvent')}
          onClick={() => onEventClick?.(event)}
        >
          <div className={cls('overflowPopoverTitle')}>
            {getEventLabel(event)}
          </div>
          <div className={cls('overflowPopoverTime')}>
            {formatTimeRange(event.startTime, event.endTime, timeZone)}
          </div>
        </button>
      ))}
    </div>
  );
}
