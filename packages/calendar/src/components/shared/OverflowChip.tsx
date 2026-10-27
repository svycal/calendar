import { useRef, useState } from 'react';
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
import { AnchoredPopover } from './AnchoredPopover';

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

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;

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

  const count = group.events.length;
  const label = `+${count}`;
  const ariaLabel = `${count} more event${count === 1 ? '' : 's'}`;

  const close = () => setOpen(false);

  // Beside the chip, flipping to the left when it would overflow the viewport
  const getPosition = ({
    width,
    height,
  }: {
    width: number;
    height: number;
  }) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;
    let left = rect.right + ANCHOR_GAP;
    if (left + width > window.innerWidth - VIEWPORT_MARGIN) {
      left = Math.max(VIEWPORT_MARGIN, rect.left - width - ANCHOR_GAP);
    }
    let top = rect.top;
    if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
      top = Math.max(
        VIEWPORT_MARGIN,
        window.innerHeight - height - VIEWPORT_MARGIN
      );
    }
    return { top, left };
  };

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
      {open && popoverContent && (
        <AnchoredPopover
          triggerRef={buttonRef}
          onClose={close}
          getPosition={getPosition}
          ariaLabel={ariaLabel}
          className={cls('overflowPopover')}
        >
          {popoverContent}
        </AnchoredPopover>
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
