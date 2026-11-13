import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Ref,
} from 'react';
import type { Temporal } from 'temporal-polyfill';
import type { CalendarEvent, DayGridViewClassNames } from '@/types/calendar';
import type { PositionedAllDayEvent } from '@/lib/overlap';
import { AllDayEventChip } from './AllDayEventChip';

interface AllDaySectionProps {
  positioned: PositionedAllDayEvent[];
  dates: Temporal.PlainDate[];
  headerHeight: number;
  cls: (key: keyof DayGridViewClassNames) => string;
  onEventClick?: (event: CalendarEvent) => void;
  selectedEventId?: string | null;
  selectedEventRef?: Ref<HTMLDivElement>;
  /** Enables drag selection of whole days across the row. */
  onSelectDays?: (
    startDate: Temporal.PlainDate,
    endDate: Temporal.PlainDate
  ) => void;
  /** Finds the date (as a string) of the day column under the pointer. */
  resolveColumnId?: (clientX: number) => string | null;
}

export const AllDaySection = memo(function AllDaySection({
  positioned,
  dates,
  headerHeight,
  cls,
  onEventClick,
  selectedEventId,
  selectedEventRef,
  onSelectDays,
  resolveColumnId,
}: AllDaySectionProps) {
  const [drag, setDrag] = useState<{ anchor: number; current: number } | null>(
    null
  );
  const dragRef = useRef(drag);
  const datesRef = useRef(dates);
  const onSelectDaysRef = useRef(onSelectDays);
  const resolveColumnIdRef = useRef(resolveColumnId);
  useEffect(() => {
    datesRef.current = dates;
    onSelectDaysRef.current = onSelectDays;
    resolveColumnIdRef.current = resolveColumnId;
  });

  const updateDrag = (next: { anchor: number; current: number } | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const handleDocMouseMove = useCallback((e: MouseEvent) => {
    const current = dragRef.current;
    const columnId = resolveColumnIdRef.current?.(e.clientX);
    if (!current || !columnId) return;
    const index = datesRef.current.findIndex((d) => d.toString() === columnId);
    if (index !== -1 && index !== current.current) {
      updateDrag({ ...current, current: index });
    }
  }, []);

  const handleDocMouseUp = useCallback(() => {
    document.removeEventListener('mousemove', handleDocMouseMove);
    const current = dragRef.current;
    updateDrag(null);
    if (!current) return;
    const first = Math.min(current.anchor, current.current);
    const last = Math.max(current.anchor, current.current);
    onSelectDaysRef.current?.(datesRef.current[first], datesRef.current[last]);
  }, [handleDocMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUp);
    };
  }, [handleDocMouseMove, handleDocMouseUp]);

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    updateDrag({ anchor: index, current: index });
    document.addEventListener('mousemove', handleDocMouseMove);
    document.addEventListener('mouseup', handleDocMouseUp, { once: true });
  };

  const laneCount =
    positioned.length > 0 ? Math.max(...positioned.map((p) => p.lane)) + 1 : 0;

  // Add top/bottom padding rows so dividers span through the padding area
  const hasEvents = positioned.length > 0;
  const paddingRow = hasEvents ? '4px' : '0px';
  const totalRows = hasEvents
    ? `${paddingRow} repeat(${laneCount}, auto) ${paddingRow}`
    : 'auto';

  return (
    <div
      className={cls('allDayLane')}
      style={{
        gridRow: 2,
        gridColumn: `2 / -1`,
        display: 'grid',
        gridTemplateColumns: 'subgrid',
        gridTemplateRows: totalRows,
        position: 'sticky',
        top: headerHeight,
        zIndex: 20,
        gap: '2px 0',
      }}
    >
      {/* Column dividers — span all rows including padding rows */}
      {dates.map((date, i) => (
        <div
          key={date.toString()}
          className={
            i < dates.length - 1 ? 'border-r border-cal-border' : undefined
          }
          style={{
            gridColumn: i + 1,
            gridRow: '1 / -1',
            pointerEvents: onSelectDays ? 'auto' : 'none',
            cursor: onSelectDays ? 'pointer' : undefined,
          }}
          onMouseDown={onSelectDays ? handleMouseDown(i) : undefined}
        />
      ))}

      {drag && (
        <div
          aria-hidden="true"
          className={cls('selectionHighlight')}
          style={{
            gridColumn: `${Math.min(drag.anchor, drag.current) + 1} / ${
              Math.max(drag.anchor, drag.current) + 2
            }`,
            gridRow: '1 / -1',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Event chips — offset by 1 row for the top padding row */}
      {positioned.map((p) => (
        <AllDayEventChip
          key={p.event.id}
          positioned={p}
          laneOffset={hasEvents ? 1 : 0}
          cls={cls}
          onEventClick={onEventClick}
          selectedEventId={selectedEventId}
          selectedEventRef={selectedEventRef}
        />
      ))}
    </div>
  );
});
