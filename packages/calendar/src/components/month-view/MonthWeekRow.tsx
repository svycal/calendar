import { memo, useRef, type ReactNode, type Ref } from 'react';
import type { Temporal } from 'temporal-polyfill';
import { cn } from '@/lib/utils';
import { DAYS_PER_WEEK, type MonthWeekLayout } from '@/lib/month';
import type {
  CalendarEvent,
  MonthOverflowClickInfo,
  MonthOverflowPopoverRenderProps,
  MonthViewClassNames,
} from '@/types/calendar';
import { MonthEventItem } from './MonthEventItem';
import { MonthMoreButton } from './MonthMoreButton';
import { DISMISS_ONLY_ATTR } from '../shared/AnchoredPopover';

export const DAY_HEADER_HEIGHT = 28;
export const LANE_GAP = 2;

export type SelectedEventAnchor =
  { kind: 'segment' } | { kind: 'more'; col: number };

interface MonthWeekRowProps {
  weekIndex: number;
  layout: MonthWeekLayout;
  month: Temporal.PlainYearMonth;
  todayStr: string;
  lanes: number;
  eventHeight: number;
  timeZone: string;
  cls: (key: keyof MonthViewClassNames) => string;
  onEventClick?: (event: CalendarEvent) => void;
  onDayNumberClick?: (date: Temporal.PlainDate) => void;
  onCellMouseDown?: (date: Temporal.PlainDate, e: React.MouseEvent) => void;
  onOverflowClick?: (info: MonthOverflowClickInfo) => void;
  renderOverflowPopover?: (props: MonthOverflowPopoverRenderProps) => ReactNode;
  /** Inclusive columns to highlight in this week ('highlight' selection appearance). */
  highlight?: { startCol: number; endCol: number } | null;
  /** Attached to the highlight, or to the selection placeholder bar. */
  selectionRef?: Ref<HTMLDivElement>;
  selectedEventId?: string | null;
  selectedEventAnchor?: SelectedEventAnchor | null;
  selectedEventRef?: Ref<HTMLElement>;
}

export const MonthWeekRow = memo(function MonthWeekRow({
  weekIndex,
  layout,
  month,
  todayStr,
  lanes,
  eventHeight,
  timeZone,
  cls,
  onEventClick,
  onDayNumberClick,
  onCellMouseDown,
  onOverflowClick,
  renderOverflowPopover,
  highlight,
  selectionRef,
  selectedEventId,
  selectedEventAnchor,
  selectedEventRef,
}: MonthWeekRowProps) {
  const weekRef = useRef<HTMLDivElement>(null);
  let segmentRefAssigned = false;

  return (
    <div
      ref={weekRef}
      data-month-week={weekIndex}
      className={cls('week')}
      style={{ gridColumn: '1 / -1' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${DAYS_PER_WEEK}, minmax(0, 1fr))`,
          gridTemplateRows: `${DAY_HEADER_HEIGHT}px repeat(${lanes}, ${eventHeight}px) 1fr`,
          rowGap: LANE_GAP,
          // Very short rows can't fit even one lane; don't paint into the next week
          overflow: 'hidden',
        }}
      >
        {/* Day cell backgrounds */}
        {layout.dates.map((date, col) => {
          const isOutside =
            date.month !== month.month || date.year !== month.year;
          return (
            <div
              key={date.toString()}
              {...{ [DISMISS_ONLY_ATTR]: '' }}
              className={cn(cls('dayCell'), isOutside && cls('dayCellOutside'))}
              style={{
                gridRow: '1 / -1',
                gridColumn: col + 1,
                ...(weekIndex === 0 ? { borderTopWidth: 0 } : {}),
                ...(col === DAYS_PER_WEEK - 1 ? { borderRightWidth: 0 } : {}),
              }}
              onMouseDown={
                onCellMouseDown ? (e) => onCellMouseDown(date, e) : undefined
              }
            />
          );
        })}

        {/* Selection highlight */}
        {highlight && (
          <div
            ref={selectionRef}
            aria-hidden="true"
            className={cls('selectionHighlight')}
            style={{
              gridRow: '1 / -1',
              gridColumn: `${highlight.startCol + 1} / ${highlight.endCol + 2}`,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Day numbers */}
        {layout.dates.map((date, col) => {
          const dateStr = date.toString();
          const isToday = dateStr === todayStr;
          const isOutside =
            date.month !== month.month || date.year !== month.year;
          const label =
            date.day === 1
              ? `${date.toLocaleString('en-US', { month: 'short' })} ${date.day}`
              : String(date.day);
          const className = cn(
            cls('dayNumber'),
            isOutside && cls('dayNumberOutside'),
            onDayNumberClick && cls('dayNumberButton'),
            isToday && cls('dayNumberToday')
          );
          const placement = {
            gridRow: 1,
            gridColumn: col + 1,
            justifySelf: 'center',
            alignSelf: 'center',
          } as const;

          return onDayNumberClick ? (
            <button
              key={dateStr}
              type="button"
              className={className}
              style={placement}
              aria-label={date.toLocaleString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              aria-current={isToday ? 'date' : undefined}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onDayNumberClick(date)}
            >
              {label}
            </button>
          ) : (
            <span
              key={dateStr}
              className={className}
              style={{ ...placement, pointerEvents: 'none' }}
              aria-current={isToday ? 'date' : undefined}
            >
              {label}
            </span>
          );
        })}

        {/* Events */}
        {layout.visibleSegments.map((seg) => {
          if (seg.pinned) {
            return (
              <MonthEventItem
                key={seg.event.id}
                event={seg.event}
                isBar
                continuesBefore={seg.continuesBefore}
                continuesAfter={seg.continuesAfter}
                timeZone={timeZone}
                cls={cls}
                interactive={false}
                isSelected
                itemRef={selectionRef}
                style={{
                  gridRow: seg.lane + 2,
                  gridColumn: `${seg.startCol + 1} / span ${seg.span}`,
                }}
              />
            );
          }
          const isSelected = seg.event.id === selectedEventId;
          const attachRef =
            isSelected &&
            selectedEventAnchor?.kind === 'segment' &&
            !segmentRefAssigned;
          if (attachRef) segmentRefAssigned = true;
          return (
            <MonthEventItem
              key={seg.event.id}
              event={seg.event}
              isBar={seg.isBar}
              continuesBefore={seg.continuesBefore}
              continuesAfter={seg.continuesAfter}
              timeZone={timeZone}
              cls={cls}
              onClick={onEventClick}
              isSelected={isSelected}
              itemRef={attachRef ? selectedEventRef : undefined}
              style={{
                gridRow: seg.lane + 2,
                gridColumn: `${seg.startCol + 1} / span ${seg.span}`,
              }}
            />
          );
        })}

        {/* "+N more" buttons */}
        {layout.days.map((day, col) =>
          day.moreCount > 0 && day.moreLane < lanes ? (
            <MonthMoreButton
              key={`more-${day.date.toString()}`}
              date={day.date}
              events={day.events}
              count={day.moreCount}
              col={col}
              weekRef={weekRef}
              timeZone={timeZone}
              cls={cls}
              onEventClick={onEventClick}
              onOverflowClick={onOverflowClick}
              renderOverflowPopover={renderOverflowPopover}
              selectedEventId={selectedEventId}
              anchorRef={
                selectedEventAnchor?.kind === 'more' &&
                selectedEventAnchor.col === col
                  ? selectedEventRef
                  : undefined
              }
              style={{ gridRow: day.moreLane + 2, gridColumn: col + 1 }}
            />
          ) : null
        )}
      </div>
    </div>
  );
});
