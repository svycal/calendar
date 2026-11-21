import type { ReactNode } from 'react';
import type { TimeSlotEntry } from '@/lib/time';
import type { GridViewClassNames, SwipeDirection } from '@/types/calendar';

interface TimeGridSwipeNeighborProps {
  side: SwipeDirection;
  columnCount: number;
  /** A header cell for each column, placed in row 1 of columns 1 to `columnCount`. */
  headers: ReactNode;
  /** Class names for the all-day cell of the column at `index`. */
  allDayClassName: (index: number) => string;
  headerHeight: number;
  timeSlots: TimeSlotEntry[];
  cls: (key: keyof GridViewClassNames) => string;
}

/**
 * The empty period beside a time grid's columns, which a swipe reveals: its
 * headers, all-day row, and grid lines, sharing the grid's rows and columns.
 */
export function TimeGridSwipeNeighbor({
  side,
  columnCount,
  headers,
  allDayClassName,
  headerHeight,
  timeSlots,
  cls,
}: TimeGridSwipeNeighborProps) {
  const columns = Array.from({ length: columnCount }, (_, i) => i);

  return (
    <div
      aria-hidden="true"
      style={{
        gridColumn: '2 / -1',
        gridRow: '1 / -1',
        display: 'grid',
        gridTemplateColumns: 'subgrid',
        gridTemplateRows: 'subgrid',
        translate: side === 'next' ? '100% 0' : '-100% 0',
        pointerEvents: 'none',
      }}
    >
      {headers}
      {columns.map((i) => (
        <div
          key={`allday-${i}`}
          className={allDayClassName(i)}
          style={{
            gridRow: 2,
            gridColumn: i + 1,
            position: 'sticky',
            top: headerHeight,
            zIndex: 20,
          }}
        />
      ))}
      {timeSlots.map((slot) =>
        columns.map((i) => (
          <div
            key={`${slot.index}-${i}`}
            className={cls(slot.isHourStart ? 'bodyCell' : 'bodyCellMinor')}
            style={{
              gridRow: slot.index + 3,
              gridColumn: i + 1,
              ...(!slot.isHourStart
                ? { borderTopStyle: 'dotted' as const }
                : {}),
              ...(slot.index === 0 ? { borderTopWidth: 0 } : {}),
              // The edge that meets the grid's columns keeps its line
              ...(side === 'next' && i === columnCount - 1
                ? { borderRightWidth: 0 }
                : {}),
              ...(side === 'next' && i === 0
                ? { borderLeftWidth: 1, borderLeftStyle: 'solid' as const }
                : {}),
            }}
          />
        ))
      )}
    </div>
  );
}
