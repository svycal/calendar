import { memo, type Ref } from 'react';
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
}

export const AllDaySection = memo(function AllDaySection({
  positioned,
  dates,
  headerHeight,
  cls,
  onEventClick,
  selectedEventId,
  selectedEventRef,
}: AllDaySectionProps) {
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
            pointerEvents: 'none',
          }}
        />
      ))}

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
