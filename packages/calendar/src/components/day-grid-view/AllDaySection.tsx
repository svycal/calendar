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

  return (
    <div
      className={cls('allDayLane')}
      style={{
        gridRow: 2,
        gridColumn: `2 / -1`,
        display: 'grid',
        gridTemplateColumns: 'subgrid',
        gridTemplateRows: laneCount > 0 ? `repeat(${laneCount}, auto)` : 'auto',
        position: 'sticky',
        top: headerHeight,
        zIndex: 20,
        gap: '2px 0',
        padding: positioned.length > 0 ? '4px 0' : undefined,
      }}
    >
      {/* Column divider backgrounds */}
      {dates.map((date, i) => (
        <div
          key={date.toString()}
          style={{
            gridColumn: i + 1,
            gridRow: `1 / -1`,
            borderRight: i < dates.length - 1 ? '1px solid' : undefined,
            borderColor: 'var(--cal-border)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Event chips */}
      {positioned.map((p) => (
        <AllDayEventChip
          key={p.event.id}
          positioned={p}
          cls={cls}
          onEventClick={onEventClick}
          selectedEventId={selectedEventId}
          selectedEventRef={selectedEventRef}
        />
      ))}
    </div>
  );
});
