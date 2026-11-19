import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { Temporal } from 'temporal-polyfill';
import type { EventDrop, TimedCalendarEvent } from '@/types/calendar';
import {
  createAutoScroller,
  findVerticalScrollParent,
  type AutoScroller,
} from '@/lib/autoScroll';
import { minutesToZonedDateTime } from '@/lib/time';

/** How far (px) the mouse must move before a press on an event becomes a drag. */
const DRAG_THRESHOLD_PX = 4;

/** How long (ms) a touch must rest on an event before it can be dragged. */
const LONG_PRESS_MS = 400;

/** How far (px) a touch can wander during the long press before it counts as a scroll. */
const TOUCH_SLOP_PX = 10;

interface UseEventDragOptions {
  /** Called with the new placement when the user drops an event somewhere new. */
  onDrop?: (drop: EventDrop) => void;
  gridRef: RefObject<HTMLElement | null>;
  rootRef: RefObject<HTMLElement | null>;
  /** The sticky gutter, so a drag past the left edge picks the first visible column. */
  gutterRef: RefObject<HTMLElement | null>;
  timeZone: string;
  startHour: number;
  endHour: number;
  hourHeight: number;
  snapDuration: number;
  /** Maps a `data-event-column` id to the day it shows and, for resource columns, its resource. */
  resolveTarget: (columnId: string) => {
    date: Temporal.PlainDate;
    resourceId?: string;
  };
}

interface DragSession {
  event: TimedCalendarEvent;
  pointerId: number;
  /** Touch and pen drags start with a long press; the mouse drags right away. */
  isTouch: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  originX: number;
  originY: number;
  /** Minutes between the event's start and the pointer when it was pressed. */
  grabOffsetMin: number;
  durationMin: number;
  started: boolean;
  cancelled: boolean;
  preview: EventDrop | null;
  lastX: number;
  lastY: number;
  scroller: AutoScroller | null;
  scrollParent: HTMLElement | null;
}

function minutesIntoDay(
  time: Temporal.ZonedDateTime,
  date: Temporal.PlainDate,
  timeZone: string
): number {
  return date
    .toPlainDateTime()
    .until(time.withTimeZone(timeZone).toPlainDateTime(), {
      largestUnit: 'minutes',
    })
    .total('minutes');
}

/** The time of day under the pointer in a column, in minutes since midnight. */
function pointerMinutes(
  column: HTMLElement,
  clientY: number,
  { startHour, hourHeight }: { startHour: number; hourHeight: number }
): number {
  const rect = column.getBoundingClientRect();
  return startHour * 60 + ((clientY - rect.top) * 60) / hourHeight;
}

// Swallows the click that may follow a drag's pointerup, so dropping an event
// on itself doesn't also open it. A touch's click can arrive a moment later
// than a mouse's, so this waits for the next press rather than the next task.
function suppressNextClick() {
  const swallow = (e: MouseEvent) => {
    // A keyboard click, such as Enter on a confirmation popover's button
    if (e.detail === 0) return;
    e.stopPropagation();
    e.preventDefault();
    stop();
  };
  const stop = () => {
    clearTimeout(timer);
    document.removeEventListener('click', swallow, true);
    document.removeEventListener('pointerdown', stop, true);
  };
  const timer = setTimeout(stop, 1000);
  document.addEventListener('click', swallow, true);
  document.addEventListener('pointerdown', stop, true);
}

/**
 * Drag-to-move for timed events. A mouse press on an event becomes a drag once
 * the pointer moves a few pixels; a touch becomes one after a long press, so a
 * swipe across events still scrolls the grid. The event then follows the
 * pointer, snapped to `snapDuration`, across columns. Releasing it somewhere
 * new calls `onDrop` and does nothing else: the caller decides whether to
 * apply the move, ask for confirmation, or ignore it. Escape cancels a drag
 * in progress.
 */
export function useEventDrag(options: UseEventDragOptions) {
  const [dragPreview, setDragPreview] = useState<EventDrop | null>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const findColumn = useCallback((clientX: number): HTMLElement | null => {
    const { gridRef, rootRef, gutterRef } = optionsRef.current;
    const columns = gridRef.current?.querySelectorAll<HTMLElement>(
      '[data-event-column]'
    );
    if (!columns || columns.length === 0) return null;
    // Clamp to the visible part of the grid, right of the sticky gutter, so a
    // drag past an edge picks the outermost visible column.
    let x = clientX;
    const gutter = gutterRef.current;
    const root = rootRef.current;
    if (gutter) x = Math.max(x, gutter.getBoundingClientRect().right);
    if (root) x = Math.min(x, root.getBoundingClientRect().right - 1);
    // Each event column stops short of the next by its margin; that gap
    // belongs to the column on its left
    let match = columns[0];
    for (const column of columns) {
      if (x < column.getBoundingClientRect().left) break;
      match = column;
    }
    return match;
  }, []);

  const updatePreview = useCallback(
    (clientX: number, clientY: number) => {
      const session = sessionRef.current;
      if (!session?.started || session.cancelled) return;
      const column = findColumn(clientX);
      const columnId = column?.dataset.eventColumn;
      if (!column || columnId == null) return;

      const { startHour, endHour, snapDuration, timeZone, resolveTarget } =
        optionsRef.current;
      const raw =
        pointerMinutes(column, clientY, optionsRef.current) -
        session.grabOffsetMin;
      const snapped = Math.round(raw / snapDuration) * snapDuration;
      // Let the event run off either end of the time axis, as one crossing
      // midnight does, but keep a snap's worth of it on the axis
      const visibleMin = Math.min(session.durationMin, snapDuration);
      const startMin = Math.min(
        Math.max(snapped, startHour * 60 + visibleMin - session.durationMin),
        endHour * 60 - visibleMin
      );

      const { date, resourceId } = resolveTarget(columnId);
      const startTime = minutesToZonedDateTime(date, startMin, timeZone);
      const prev = session.preview;
      if (
        prev &&
        prev.resourceId === (resourceId ?? session.event.resourceId) &&
        prev.startTime.equals(startTime)
      ) {
        return;
      }
      session.preview = {
        event: session.event,
        resourceId: resourceId ?? session.event.resourceId,
        startTime,
        endTime: startTime.add({ minutes: session.durationMin }),
      };
      setDragPreview(session.preview);
    },
    [findColumn]
  );

  const endSessionRef = useRef<() => void>(() => {});

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      session.lastX = e.clientX;
      session.lastY = e.clientY;
      if (!session.started) {
        const dist = Math.hypot(
          e.clientX - session.originX,
          e.clientY - session.originY
        );
        if (!session.isTouch) {
          if (dist < DRAG_THRESHOLD_PX) return;
          session.started = true;
        } else {
          // Moving before the long press completes is a scroll, not a drag
          if (dist > TOUCH_SLOP_PX) endSessionRef.current();
          return;
        }
      }
      updatePreview(e.clientX, e.clientY);
      // Scrolls if the pointer is near an edge, and stops on its own if not
      if (!session.cancelled) session.scroller?.ensure();
    },
    [updatePreview]
  );

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const session = sessionRef.current;
    if (!session || e.pointerId !== session.pointerId) return;
    endSessionRef.current();
    if (!session.started) return;
    suppressNextClick();
    // The browser took the pointer back, e.g. to scroll: drop nothing
    if (e.type === 'pointercancel') return;
    const drop = session.preview;
    if (session.cancelled || !drop) return;
    // Compare instants: `equals` also compares time zones, and the event's
    // may differ from the grid's
    const moved =
      drop.resourceId !== session.event.resourceId ||
      drop.startTime.epochNanoseconds !==
        session.event.startTime.epochNanoseconds;
    if (moved) optionsRef.current.onDrop?.(drop);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const session = sessionRef.current;
    if (e.key !== 'Escape' || !session?.started || session.cancelled) return;
    // Keep listening for the pointerup so its click is still swallowed
    session.cancelled = true;
    session.scroller?.stop();
    setDragPreview(null);
  }, []);

  // Blocks text selection, and the long-press menu while a touch drag is
  // pending or under way.
  const preventDefault = useCallback((e: Event) => e.preventDefault(), []);

  useLayoutEffect(() => {
    endSessionRef.current = () => {
      const session = sessionRef.current;
      if (session?.longPressTimer != null) clearTimeout(session.longPressTimer);
      session?.scroller?.stop();
      sessionRef.current = null;
      setDragPreview(null);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', preventDefault);
      document.removeEventListener('contextmenu', preventDefault);
    };
  });

  useEffect(() => () => endSessionRef.current(), []);

  // Once a touch drag starts, keep the finger from scrolling the page. Touch
  // listeners must exist before the touch begins to be able to cancel it, so
  // this one stays on the grid for as long as events are draggable.
  const draggable = options.onDrop != null;
  const { rootRef } = options;
  useEffect(() => {
    const root = rootRef.current;
    if (!draggable || !root) return;
    const blockScroll = (e: TouchEvent) => {
      if (sessionRef.current?.started) e.preventDefault();
    };
    root.addEventListener('touchmove', blockScroll, { passive: false });
    return () => root.removeEventListener('touchmove', blockScroll);
  }, [draggable, rootRef]);

  const startEventDrag = useCallback(
    (event: TimedCalendarEvent, e: React.PointerEvent<HTMLElement>) => {
      if (!e.isPrimary || e.button !== 0 || !optionsRef.current.onDrop) return;
      const column = e.currentTarget.closest<HTMLElement>(
        '[data-event-column]'
      );
      const columnId = column?.dataset.eventColumn;
      if (!column || columnId == null) return;
      endSessionRef.current();

      const { timeZone, resolveTarget } = optionsRef.current;
      const { date } = resolveTarget(columnId);
      const isTouch = e.pointerType !== 'mouse';
      const session: DragSession = {
        event,
        pointerId: e.pointerId,
        isTouch,
        longPressTimer: null,
        originX: e.clientX,
        originY: e.clientY,
        grabOffsetMin:
          pointerMinutes(column, e.clientY, optionsRef.current) -
          minutesIntoDay(event.startTime, date, timeZone),
        durationMin: event.startTime.until(event.endTime).total('minutes'),
        started: false,
        cancelled: false,
        preview: null,
        lastX: e.clientX,
        lastY: e.clientY,
        scroller: null,
        scrollParent: findVerticalScrollParent(column),
      };
      session.scroller = createAutoScroller({
        getPointerY: () => session.lastY,
        getScrollParent: () => session.scrollParent,
        horizontal: {
          getPointerX: () => session.lastX,
          // The sticky gutter covers the first column while scrolled
          getViewportLeft: () =>
            optionsRef.current.gutterRef.current?.getBoundingClientRect().right,
        },
        onScroll: () => updatePreview(session.lastX, session.lastY),
      });
      if (isTouch) {
        // A touch drags only after a long press, so a swipe still scrolls
        session.longPressTimer = setTimeout(() => {
          session.longPressTimer = null;
          session.started = true;
          // Drop any text the press managed to select before the drag
          window.getSelection()?.removeAllRanges();
          updatePreview(session.lastX, session.lastY);
        }, LONG_PRESS_MS);
      }
      sessionRef.current = session;

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.addEventListener('pointercancel', handlePointerUp);
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('selectstart', preventDefault);
      if (isTouch) document.addEventListener('contextmenu', preventDefault);
    },
    [
      handlePointerMove,
      handlePointerUp,
      handleKeyDown,
      preventDefault,
      updatePreview,
    ]
  );

  return { dragPreview, startEventDrag };
}
