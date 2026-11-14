import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { Temporal } from 'temporal-polyfill';
import type {
  GridViewClassNames,
  PositionedEvent,
  SelectionAppearance,
  TimedCalendarEvent,
} from '@/types/calendar';
import {
  computeAutoScrollIntensity,
  createVerticalAutoScroller,
  findVerticalScrollParent,
  type VerticalAutoScroller,
} from '@/lib/autoScroll';
import { buildSyntheticEvent } from '@/lib/selection';
import { minutesToZonedDateTime } from '@/lib/time';
import { EventChip } from './EventChip';
import { DISMISS_ONLY_ATTR } from './AnchoredPopover';

export interface SlotRange {
  columnId: string;
  /** The column the drag ended in, when the drag can span columns. */
  endColumnId?: string;
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
}

export interface DragPreview {
  columnId: string;
  endColumnId: string;
  startMin: number;
  endMin: number;
}

interface SlotInteractionLayerProps {
  columnId: string;
  fallbackColor?: string;
  column: number;
  date: Temporal.PlainDate;
  timeZone: string;
  startHour: number;
  endHour: number;
  hourHeight: number;
  snapDuration: number;
  placeholderDuration: number;
  cls: (key: keyof GridViewClassNames) => string;
  onSlotClick?: (info: {
    columnId: string;
    startTime: Temporal.ZonedDateTime;
    endTime: Temporal.ZonedDateTime;
  }) => void;
  onSelect?: (range: SlotRange | null) => void;
  onSlotHover?: (range: SlotRange | null) => void;
  /**
   * Finds the column under the pointer, letting a drag span columns. The
   * layer then reports its drag preview through `onDragPreviewChange` and
   * draws `previewRange` instead of its own preview.
   */
  resolveColumnId?: (clientX: number) => string | null;
  onDragPreviewChange?: (preview: DragPreview | null) => void;
  /** This column's part of a drag preview that spans columns. */
  previewRange?: { startMin: number; endMin: number } | null;
  dragPreviewAppearance?: SelectionAppearance;
  renderEvent?: (props: {
    event: TimedCalendarEvent;
    position: PositionedEvent;
  }) => React.ReactNode;
}

interface DragState {
  anchorSlotStart: number;
  currentColumnId: string;
  currentStartMin: number;
  currentEndMin: number;
  moved: boolean;
}

export const SlotInteractionLayer = memo(function SlotInteractionLayer({
  columnId,
  fallbackColor,
  column,
  date,
  timeZone,
  startHour,
  endHour,
  hourHeight,
  snapDuration,
  placeholderDuration,
  cls,
  onSlotClick,
  onSelect,
  onSlotHover,
  resolveColumnId,
  onDragPreviewChange,
  previewRange,
  dragPreviewAppearance = 'highlight',
  renderEvent,
}: SlotInteractionLayerProps) {
  const [hoveredSlotStart, setHoveredSlotStart] = useState<number | null>(null);
  const [ownDragPreview, setDragPreview] = useState<{
    startMin: number;
    endMin: number;
  } | null>(null);
  const dragPreview = onDragPreviewChange ? previewRange : ownDragPreview;
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const lastClientYRef = useRef(0);
  const lastClientXRef = useRef(0);
  const hoveredSlotRef = useRef<number | null>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const autoScrollerRef = useRef<VerticalAutoScroller | null>(null);
  const applyDragFromPointerRef = useRef<
    (clientX: number, clientY: number) => void
  >(() => {});

  // Stable refs for document-level handlers
  const onSelectRef = useRef(onSelect);
  const resolveColumnIdRef = useRef(resolveColumnId);
  const onDragPreviewChangeRef = useRef(onDragPreviewChange);
  const columnIdRef = useRef(columnId);
  const dateRef = useRef(date);
  const timeZoneRef = useRef(timeZone);

  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;
  const pixelsPerMinute = hourHeight / 60;

  const snapToSlot = useCallback(
    (yOffset: number): number | null => {
      const minutesFromStart = yOffset / pixelsPerMinute;
      const snappedMinutes =
        Math.floor(minutesFromStart / snapDuration) * snapDuration;
      const absoluteMinutes = axisStartMin + snappedMinutes;

      if (absoluteMinutes + placeholderDuration > axisEndMin) return null;
      if (absoluteMinutes < axisStartMin) return null;

      return absoluteMinutes;
    },
    [
      pixelsPerMinute,
      snapDuration,
      placeholderDuration,
      axisStartMin,
      axisEndMin,
    ]
  );

  // Store values in refs for document handlers
  const snapToSlotRef = useRef(snapToSlot);
  const axisEndMinRef = useRef(axisEndMin);
  const snapDurationRef = useRef(snapDuration);
  const placeholderDurationRef = useRef(placeholderDuration);

  const computeRange = useCallback((anchor: number, currentSlot: number) => {
    const rangeStart = Math.min(anchor, currentSlot);
    const rangeEnd = Math.min(
      Math.max(anchor, currentSlot) + placeholderDurationRef.current,
      axisEndMinRef.current
    );
    return { startMin: rangeStart, endMin: rangeEnd };
  }, []);

  const showDragPreview = useCallback((preview: DragPreview | null) => {
    const report = onDragPreviewChangeRef.current;
    if (report) {
      report(preview);
    } else {
      setDragPreview(
        preview && { startMin: preview.startMin, endMin: preview.endMin }
      );
    }
  }, []);

  const applyDragFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;

      const rect = container.getBoundingClientRect();
      const yOffset = Math.max(0, Math.min(clientY - rect.top, rect.height));

      let currentSlot = snapToSlotRef.current(yOffset);
      if (currentSlot == null) {
        // Clamped past bottom — use last valid slot
        currentSlot = axisEndMinRef.current - placeholderDurationRef.current;
      }

      const range = computeRange(drag.anchorSlotStart, currentSlot);
      const columnId =
        resolveColumnIdRef.current?.(clientX) ?? drag.currentColumnId;
      const unchanged =
        drag.moved &&
        drag.currentStartMin === range.startMin &&
        drag.currentEndMin === range.endMin &&
        drag.currentColumnId === columnId;
      drag.currentStartMin = range.startMin;
      drag.currentEndMin = range.endMin;
      drag.currentColumnId = columnId;
      drag.moved = true;
      if (!unchanged) {
        showDragPreview({
          columnId: columnIdRef.current,
          endColumnId: columnId,
          ...range,
        });
      }
    },
    [computeRange, showDragPreview]
  );

  const handleDocMouseMove = useCallback(
    (e: MouseEvent) => {
      lastClientYRef.current = e.clientY;
      lastClientXRef.current = e.clientX;
      applyDragFromPointer(e.clientX, e.clientY);

      const scrollParent = scrollParentRef.current;
      if (!scrollParent) return;
      const rect = scrollParent.getBoundingClientRect();
      if (computeAutoScrollIntensity(e.clientY, rect.top, rect.bottom) !== 0) {
        autoScrollerRef.current?.ensure();
      }
    },
    [applyDragFromPointer]
  );

  const handleDocMouseUpRef = useRef<() => void>(() => {});

  const handleDocMouseUp = useCallback(() => {
    autoScrollerRef.current?.stop();
    autoScrollerRef.current = null;
    scrollParentRef.current = null;

    const drag = dragRef.current;
    if (drag) {
      if (drag.moved) {
        didDragRef.current = true;
      }
      // Fire onSelect with the final settled range
      onSelectRef.current?.({
        columnId: columnIdRef.current,
        ...(resolveColumnIdRef.current
          ? { endColumnId: drag.currentColumnId }
          : {}),
        startTime: minutesToZonedDateTime(
          dateRef.current,
          drag.currentStartMin,
          timeZoneRef.current
        ),
        endTime: minutesToZonedDateTime(
          dateRef.current,
          drag.currentEndMin,
          timeZoneRef.current
        ),
      });
    }
    dragRef.current = null;
    showDragPreview(null);
    document.removeEventListener('mousemove', handleDocMouseMove);
    document.removeEventListener('mouseup', handleDocMouseUpRef.current);
  }, [handleDocMouseMove, showDragPreview]);

  // Sync all latest-value refs after render, before browser events
  useLayoutEffect(() => {
    onSelectRef.current = onSelect;
    resolveColumnIdRef.current = resolveColumnId;
    onDragPreviewChangeRef.current = onDragPreviewChange;
    columnIdRef.current = columnId;
    dateRef.current = date;
    timeZoneRef.current = timeZone;
    snapToSlotRef.current = snapToSlot;
    axisEndMinRef.current = axisEndMin;
    snapDurationRef.current = snapDuration;
    placeholderDurationRef.current = placeholderDuration;
    handleDocMouseUpRef.current = handleDocMouseUp;
    applyDragFromPointerRef.current = applyDragFromPointer;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      autoScrollerRef.current?.stop();
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUpRef.current);
    };
  }, [handleDocMouseMove]);

  const reportHover = useCallback(
    (slotStart: number | null) => {
      if (hoveredSlotRef.current === slotStart) return;
      hoveredSlotRef.current = slotStart;
      onSlotHover?.(
        slotStart == null
          ? null
          : {
              columnId,
              startTime: minutesToZonedDateTime(date, slotStart, timeZone),
              endTime: minutesToZonedDateTime(
                date,
                slotStart + placeholderDuration,
                timeZone
              ),
            }
      );
    },
    [onSlotHover, columnId, date, timeZone, placeholderDuration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSelect) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const yOffset = e.clientY - rect.top;
      const slotStart = snapToSlot(yOffset);
      if (slotStart == null) return;

      e.preventDefault(); // Prevent text selection
      onSelect(null); // Clear previous selection
      // No hover while dragging
      setHoveredSlotStart(null);
      reportHover(null);

      const slotEnd = slotStart + placeholderDuration;
      dragRef.current = {
        anchorSlotStart: slotStart,
        currentColumnId: columnId,
        currentStartMin: slotStart,
        currentEndMin: slotEnd,
        moved: false,
      };
      lastClientYRef.current = e.clientY;
      lastClientXRef.current = e.clientX;
      scrollParentRef.current = findVerticalScrollParent(container);
      autoScrollerRef.current?.stop();
      autoScrollerRef.current = createVerticalAutoScroller({
        getPointerY: () => lastClientYRef.current,
        getScrollParent: () => scrollParentRef.current,
        onScroll: () =>
          applyDragFromPointerRef.current(
            lastClientXRef.current,
            lastClientYRef.current
          ),
      });

      showDragPreview({
        columnId,
        endColumnId: columnId,
        startMin: slotStart,
        endMin: slotEnd,
      });

      document.addEventListener('mousemove', handleDocMouseMove);
      document.addEventListener('mouseup', handleDocMouseUp);
    },
    [
      onSelect,
      snapToSlot,
      placeholderDuration,
      handleDocMouseMove,
      handleDocMouseUp,
      columnId,
      showDragPreview,
      reportHover,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Suppress hover during a drag, including one that started in another
      // column or the all-day row
      if (dragRef.current || e.buttons !== 0) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const yOffset = e.clientY - rect.top;
      const slotStart = snapToSlot(yOffset);
      setHoveredSlotStart(slotStart);
      reportHover(slotStart);
    },
    [snapToSlot, reportHover]
  );

  const handleMouseLeave = useCallback(() => {
    if (dragRef.current) return;
    setHoveredSlotStart(null);
    reportHover(null);
  }, [reportHover]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // If we just finished a drag, suppress the click
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const yOffset = e.clientY - rect.top;
      const slotStart = snapToSlot(yOffset);
      if (slotStart == null) return;

      const slotEnd = slotStart + placeholderDuration;

      if (onSlotClick) {
        onSlotClick({
          columnId,
          startTime: minutesToZonedDateTime(date, slotStart, timeZone),
          endTime: minutesToZonedDateTime(date, slotEnd, timeZone),
        });
      }
    },
    [onSlotClick, snapToSlot, placeholderDuration, columnId, date, timeZone]
  );

  const highlightTop =
    hoveredSlotStart != null
      ? (hoveredSlotStart - axisStartMin) * pixelsPerMinute
      : 0;
  const highlightHeight = placeholderDuration * pixelsPerMinute;

  return (
    <div
      ref={containerRef}
      {...{ [DISMISS_ONLY_ATTR]: '' }}
      data-slot-column={columnId}
      style={{
        gridRow: '3 / -1',
        gridColumn: column,
        position: 'relative',
        pointerEvents: 'auto',
        cursor: onSlotClick || onSelect ? 'pointer' : undefined,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {hoveredSlotStart != null && !dragPreview && (
        <div
          aria-hidden="true"
          className={cls('slotHighlight')}
          style={{
            position: 'absolute',
            top: highlightTop,
            left: 0,
            right: 0,
            height: highlightHeight,
            pointerEvents: 'none',
          }}
        />
      )}
      {dragPreview &&
        (dragPreviewAppearance !== 'highlight' ? (
          <div
            aria-hidden="true"
            className={cls('eventColumn')}
            style={{ pointerEvents: 'none' }}
          >
            <EventChip
              interactive={false}
              positioned={{
                event: buildSyntheticEvent(
                  '',
                  minutesToZonedDateTime(date, dragPreview.startMin, timeZone),
                  minutesToZonedDateTime(date, dragPreview.endMin, timeZone),
                  dragPreviewAppearance.eventData
                ),
                top: (dragPreview.startMin - axisStartMin) * pixelsPerMinute,
                height:
                  (dragPreview.endMin - dragPreview.startMin) * pixelsPerMinute,
                subColumn: 0,
                totalSubColumns: 1,
              }}
              fallbackColor={fallbackColor}
              timeZone={timeZone}
              cls={cls}
              renderEvent={renderEvent}
            />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className={cls('selectionHighlight')}
            style={{
              position: 'absolute',
              top: (dragPreview.startMin - axisStartMin) * pixelsPerMinute,
              left: 0,
              right: 0,
              height:
                (dragPreview.endMin - dragPreview.startMin) * pixelsPerMinute,
              pointerEvents: 'none',
            }}
          />
        ))}
    </div>
  );
});
