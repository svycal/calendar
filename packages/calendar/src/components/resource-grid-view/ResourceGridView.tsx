import { useCallback, useEffect, useMemo } from 'react';
import { Temporal } from 'temporal-polyfill';
import { cn } from '@/lib/utils';
import {
  generateTimeSlots,
  formatDateLabel,
  formatTimeRange,
} from '@/lib/time';
import { computePositionedEvents, groupByResource } from '@/lib/overlap';
import {
  computeUnavailableBlocks,
  type UnavailableBlock,
} from '@/lib/availability';
import type {
  AllDayCalendarEvent,
  CalendarEvent,
  EventDrop,
  ResourceGridViewClassNames,
  ResourceGridViewProps,
  SelectedRange,
  TimedCalendarEvent,
} from '@/types/calendar';
import { resourceGridViewDefaults } from './defaults';
import { GridHeader } from './GridHeader';
import { ResourceColumn } from './ResourceColumn';
import { TimeGutter } from '../shared/TimeGutter';
import { SlotInteractionLayer } from '../shared/SlotInteractionLayer';
import { SelectionOverlay } from '../shared/SelectionOverlay';
import { UnavailabilityOverlay } from '../shared/UnavailabilityOverlay';
import { NowIndicator } from '../shared/NowIndicator';
import { AllDayRow } from '../shared/AllDayRow';
import { useEffectiveHourHeight } from '../shared/useEffectiveHourHeight';
import { useInitialScroll } from '../shared/useInitialScroll';
import { useSwipeNavigation } from '../shared/useSwipeNavigation';
import { TimeGridSwipeNeighbor } from '../shared/TimeGridSwipeNeighbor';
import { useAnnouncer } from '../shared/useAnnouncer';
import { useEventDrag } from '../shared/useEventDrag';
import { useLingeringValue } from '../shared/useLingeringValue';
import { getEventLabel, getClientNameLabel } from '@/lib/accessibility';

export function ResourceGridView({
  date,
  timeZone,
  resources,
  events,
  availability,
  unavailability,
  defaultUnavailable,
  timeAxis,
  initialScrollHour,
  onEventClick,
  onSwipe,
  snapDuration,
  placeholderDuration,
  selectedRange,
  onSelect,
  onSlotClick,
  className,
  classNames,
  hourHeight = 60,
  columnMinWidth = 120,
  renderHeader,
  renderEvent,
  selectionAppearance,
  dragPreviewAppearance,
  selectionRef,
  selectionLingerMs = 0,
  onEventDrop,
  pendingDrop,
  pendingDropRef,
  selectedEventId,
  selectedEventRef,
  renderCorner,
  formatGutterLabel,
  eventGap,
  eventLayout = 'columns',
  stackOffset = 8,
  eventMinWidth,
  eventMaxStack,
  onOverflowClick,
  renderOverflowPopover,
}: ResourceGridViewProps) {
  const startHour = timeAxis?.startHour ?? 0;
  const endHour = timeAxis?.endHour ?? 24;
  const intervalMinutes = timeAxis?.intervalMinutes ?? 60;

  const {
    effectiveHourHeight,
    rootRef,
    headerRef,
    allDayRef,
    gridRef,
    headerHeight,
    containerHeight,
  } = useEffectiveHourHeight(hourHeight, endHour - startHour);

  const swipe = useSwipeNavigation({
    rootRef,
    gridRef,
    gutterRef: allDayRef,
    onSwipe,
    periodKey: date.toString(),
  });

  useInitialScroll({
    rootRef,
    initialScrollHour,
    startHour,
    endHour,
    effectiveHourHeight,
    containerHeight,
    scrollKey: date.toString(),
    swipedRef: swipe.swipedRef,
  });

  const cls = useCallback(
    (key: keyof ResourceGridViewClassNames) =>
      cn(resourceGridViewDefaults[key], classNames?.[key]),
    [classNames]
  );

  // Keep the selection and pending drop mounted briefly after clearing so
  // popover close transitions can finish without losing their reference.
  const effectiveSelectedRange = useLingeringValue(
    selectedRange,
    selectionLingerMs
  );
  const shownPendingDrop = useLingeringValue(pendingDrop, selectionLingerMs);

  const timeSlots = useMemo(
    () => generateTimeSlots({ startHour, endHour, intervalMinutes }),
    [startHour, endHour, intervalMinutes]
  );

  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: AllDayCalendarEvent[] = [];
    const timed: TimedCalendarEvent[] = [];
    for (const event of events) {
      if (event.allDay) {
        allDay.push(event);
      } else {
        timed.push(event);
      }
    }
    return { allDayEvents: allDay, timedEvents: timed };
  }, [events]);

  const allDayByResource = useMemo(
    () => groupByResource(allDayEvents),
    [allDayEvents]
  );

  const positionedByResource = useMemo(
    () =>
      computePositionedEvents(
        timedEvents,
        timeZone,
        date,
        startHour,
        endHour,
        effectiveHourHeight
      ),
    [timedEvents, timeZone, date, startHour, endHour, effectiveHourHeight]
  );

  // Unavailable blocks by resource on `day`. A swipe draws the neighboring
  // days' too, from the same ranges, so they can include those days.
  const unavailableOn = useCallback(
    (day: Temporal.PlainDate) => {
      if (!defaultUnavailable && !availability && !unavailability)
        return new Map<string, UnavailableBlock[]>();

      // Collect all resource IDs that need evaluation
      const resourceIds = new Set([
        ...Object.keys(availability ?? {}),
        ...Object.keys(unavailability ?? {}),
        ...(defaultUnavailable ? resources.map((r) => r.id) : []),
      ]);

      const map = new Map<string, UnavailableBlock[]>();
      for (const resourceId of resourceIds) {
        const availableRanges = availability?.[resourceId];
        const effectiveAvailable =
          defaultUnavailable && availableRanges === undefined
            ? []
            : availableRanges;

        const blocks = computeUnavailableBlocks(
          effectiveAvailable,
          unavailability?.[resourceId],
          timeZone,
          day,
          startHour,
          endHour,
          effectiveHourHeight
        );
        if (blocks.length > 0) {
          map.set(resourceId, blocks);
        }
      }
      return map;
    },
    [
      defaultUnavailable,
      resources,
      availability,
      unavailability,
      timeZone,
      startHour,
      endHour,
      effectiveHourHeight,
    ]
  );

  const unavailableByResource = useMemo(
    () => unavailableOn(date),
    [unavailableOn, date]
  );

  const neighborUnavailable = useMemo(
    () =>
      swipe.swiping
        ? {
            previous: unavailableOn(date.subtract({ days: 1 })),
            next: unavailableOn(date.add({ days: 1 })),
          }
        : null,
    [swipe.swiping, unavailableOn, date]
  );

  const { message: announcerMessage, announce } = useAnnouncer();

  const gridAriaLabel = useMemo(
    () => `Schedule for ${formatDateLabel(date)}`,
    [date]
  );

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      onSelect?.(null);
      onEventClick?.(event);

      if (!event.allDay) {
        const parts: string[] = [
          getEventLabel(event),
          formatTimeRange(event.startTime, event.endTime, timeZone),
        ];
        const clientLabel = getClientNameLabel(event);
        if (clientLabel) parts.push(clientLabel);
        const resource = resources.find((r) => r.id === event.resourceId);
        if (resource) parts.push(resource.name);
        announce(`Selected: ${parts.join(', ')}`);
      } else {
        const parts: string[] = [getEventLabel(event), 'all day'];
        const clientLabel = getClientNameLabel(event);
        if (clientLabel) parts.push(clientLabel);
        announce(`Selected: ${parts.join(', ')}`);
      }
    },
    [onSelect, onEventClick, timeZone, resources, announce]
  );

  const handleOverflowClick = useCallback(
    (
      info: Parameters<NonNullable<ResourceGridViewProps['onOverflowClick']>>[0]
    ) => {
      onSelect?.(null);
      onOverflowClick?.(info);
    },
    [onSelect, onOverflowClick]
  );

  const handleEventDrop = useCallback(
    (drop: EventDrop) => {
      onEventDrop?.(drop);
      const parts = [
        getEventLabel(drop.event),
        formatTimeRange(drop.startTime, drop.endTime, timeZone),
      ];
      const resource = resources.find((r) => r.id === drop.resourceId);
      if (resource) parts.push(resource.name);
      announce(`Moved: ${parts.join(', ')}`);
    },
    [onEventDrop, timeZone, resources, announce]
  );

  const resolveDragTarget = useCallback(
    (columnId: string) => ({ date, resourceId: columnId }),
    [date]
  );

  const { dragPreview, startEventDrag } = useEventDrag({
    onDrop: onEventDrop ? handleEventDrop : undefined,
    gridRef,
    rootRef,
    gutterRef: allDayRef,
    timeZone,
    startHour,
    endHour,
    hourHeight: effectiveHourHeight,
    snapDuration: snapDuration ?? 15,
    resolveTarget: resolveDragTarget,
  });

  const dragSourceId = dragPreview?.event.id ?? pendingDrop?.event.id ?? null;

  const handleSlotInteractionSelect = useCallback(
    (
      range: {
        columnId: string;
        startTime: Temporal.ZonedDateTime;
        endTime: Temporal.ZonedDateTime;
      } | null
    ) => {
      if (!range) {
        onSelect?.(null);
        return;
      }
      const selectedRangeValue: SelectedRange = {
        resourceId: range.columnId,
        startTime: range.startTime,
        endTime: range.endTime,
      };
      onSelect?.(selectedRangeValue);
      const parts = [formatTimeRange(range.startTime, range.endTime, timeZone)];
      const resource = resources.find((r) => r.id === range.columnId);
      if (resource) parts.push(resource.name);
      announce(`Selected time: ${parts.join(', ')}`);
    },
    [onSelect, timeZone, resources, announce]
  );

  const handleSlotClick = useCallback(
    (info: {
      columnId: string;
      startTime: Temporal.ZonedDateTime;
      endTime: Temporal.ZonedDateTime;
    }) => {
      const resource = resources.find((r) => r.id === info.columnId);
      if (!resource) return;
      onSlotClick?.({
        resource,
        startTime: info.startTime,
        endTime: info.endTime,
      });
    },
    [onSlotClick, resources]
  );

  useEffect(() => {
    if (!selectedRange || !onSelect) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelect(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedRange, onSelect]);

  const rowHeight = (effectiveHourHeight * intervalMinutes) / 60;

  return (
    <div
      ref={rootRef}
      className={cn(cls('root'), className)}
      style={swipe.rootStyle}
    >
      <div
        ref={gridRef}
        className={cls('grid')}
        role="region"
        aria-roledescription="calendar"
        aria-label={gridAriaLabel}
        style={{
          display: 'grid',
          gridTemplateColumns: `max-content repeat(${resources.length}, minmax(${columnMinWidth}px, 1fr))`,
          gridTemplateRows: `auto auto repeat(${timeSlots.length}, ${rowHeight}px)`,
          ...swipe.gridStyle,
        }}
      >
        {/* Corner cell */}
        <div
          ref={headerRef}
          className={cls('cornerCell')}
          style={{ gridRow: 1, gridColumn: 1, ...swipe.pinnedStyle }}
        >
          {renderCorner?.({ timeZone, date })}
        </div>

        {/* Header cells */}
        {resources.map((resource, i) => (
          <GridHeader
            key={resource.id}
            resource={resource}
            column={i + 2}
            cls={cls}
            renderHeader={renderHeader}
          />
        ))}

        {/* All-day gutter cell */}
        <div
          ref={allDayRef}
          className={cn(cls('allDayCell'), 'left-0 z-30')}
          style={{
            gridRow: 2,
            gridColumn: 1,
            top: headerHeight,
            ...swipe.pinnedStyle,
          }}
        />

        {/* All-day cells */}
        {resources.map((resource, i) => (
          <div
            key={`allday-${resource.id}`}
            className={cls('allDayCell')}
            style={{
              gridRow: 2,
              gridColumn: i + 2,
              top: headerHeight,
              ...(i === resources.length - 1 ? { borderRightWidth: 0 } : {}),
            }}
          >
            <AllDayRow
              events={allDayByResource.get(resource.id) ?? []}
              cls={cls}
              onEventClick={handleEventClick}
              selectedEventId={selectedEventId}
              selectedEventRef={selectedEventRef}
            />
          </div>
        ))}

        {/* Gutter cells */}
        {timeSlots.map((slot) => (
          <TimeGutter
            key={slot.index}
            label={
              formatGutterLabel
                ? formatGutterLabel(
                    Temporal.PlainTime.from({
                      hour: slot.hour,
                      minute: slot.minute,
                    })
                  )
                : slot.label
            }
            row={slot.index + 3}
            isHourStart={slot.isHourStart}
            isFirst={slot.index === 0}
            cls={cls}
            style={swipe.pinnedStyle}
          />
        ))}

        {/* Body cells */}
        {timeSlots.map((slot) =>
          resources.map((resource, colIdx) => (
            <div
              key={`${slot.index}-${resource.id}`}
              className={cls(slot.isHourStart ? 'bodyCell' : 'bodyCellMinor')}
              style={{
                gridRow: slot.index + 3,
                gridColumn: colIdx + 2,
                ...(!slot.isHourStart
                  ? { borderTopStyle: 'dotted' as const }
                  : {}),
                ...(slot.index === 0 ? { borderTopWidth: 0 } : {}),
                ...(colIdx === resources.length - 1
                  ? { borderRightWidth: 0 }
                  : {}),
              }}
            />
          ))
        )}

        {/* Unavailability overlays */}
        {resources.map((resource, i) => {
          const blocks = unavailableByResource.get(resource.id);
          if (!blocks) return null;
          return (
            <UnavailabilityOverlay
              key={`unavail-${resource.id}`}
              blocks={blocks}
              column={i + 2}
              cls={cls}
            />
          );
        })}

        {/* Slot interaction layers (between body cells and event columns) */}
        {snapDuration != null &&
          resources.map((resource, i) => (
            <SlotInteractionLayer
              key={`slot-${resource.id}`}
              columnId={resource.id}
              fallbackColor={resource.color}
              column={i + 2}
              date={date}
              timeZone={timeZone}
              startHour={startHour}
              endHour={endHour}
              hourHeight={effectiveHourHeight}
              snapDuration={snapDuration}
              placeholderDuration={placeholderDuration ?? 15}
              cls={cls}
              onSlotClick={onSlotClick ? handleSlotClick : undefined}
              onSelect={onSelect ? handleSlotInteractionSelect : undefined}
              dragPreviewAppearance={dragPreviewAppearance}
              renderEvent={renderEvent}
            />
          ))}

        {/* Resource columns with events */}
        {resources.map((resource, i) => (
          <ResourceColumn
            key={resource.id}
            resource={resource}
            positionedEvents={positionedByResource.get(resource.id) ?? []}
            column={i + 2}
            timeZone={timeZone}
            cls={cls}
            onEventClick={handleEventClick}
            renderEvent={renderEvent}
            eventGap={eventGap}
            eventLayout={eventLayout}
            stackOffset={stackOffset}
            selectedEventId={selectedEventId}
            selectedEventRef={selectedEventRef}
            eventMinWidth={eventMinWidth}
            eventMaxStack={eventMaxStack}
            onOverflowClick={handleOverflowClick}
            renderOverflowPopover={renderOverflowPopover}
            dragSourceId={dragSourceId}
            onEventDragStart={onEventDrop ? startEventDrag : undefined}
          />
        ))}

        {/* Selection overlay (after resource columns so it stacks on top) */}
        {effectiveSelectedRange != null &&
          (() => {
            const colIdx = resources.findIndex(
              (r) => r.id === effectiveSelectedRange.resourceId
            );
            if (colIdx === -1) return null;
            return (
              <SelectionOverlay
                startTime={effectiveSelectedRange.startTime}
                endTime={effectiveSelectedRange.endTime}
                fallbackColor={resources[colIdx].color}
                column={colIdx + 2}
                viewDate={date}
                timeZone={timeZone}
                startHour={startHour}
                endHour={endHour}
                hourHeight={effectiveHourHeight}
                cls={cls}
                appearance={selectionAppearance}
                selectionRef={selectionRef}
                renderEvent={renderEvent}
              />
            );
          })()}

        {/* A dropped event awaiting confirmation, then the one being dragged */}
        {[
          { drop: shownPendingDrop, ref: pendingDropRef, hidden: !pendingDrop },
          { drop: dragPreview, ref: undefined, hidden: false },
        ].map(({ drop, ref, hidden }, i) => {
          if (!drop) return null;
          const colIdx = resources.findIndex((r) => r.id === drop.resourceId);
          if (colIdx === -1) return null;
          return (
            <SelectionOverlay
              key={i === 0 ? 'pending-drop' : 'drag-preview'}
              event={drop.event}
              startTime={drop.startTime}
              endTime={drop.endTime}
              fallbackColor={resources[colIdx].color}
              column={colIdx + 2}
              viewDate={date}
              timeZone={timeZone}
              startHour={startHour}
              endHour={endHour}
              hourHeight={effectiveHourHeight}
              cls={cls}
              selectionRef={ref}
              renderEvent={renderEvent}
              hidden={hidden}
            />
          );
        })}

        {swipe.swiping &&
          (['previous', 'next'] as const).map((side) => (
            <TimeGridSwipeNeighbor
              key={side}
              side={side}
              columnCount={resources.length}
              headers={resources.map((resource, i) => (
                <GridHeader
                  key={resource.id}
                  resource={resource}
                  column={i + 1}
                  cls={cls}
                  renderHeader={renderHeader}
                />
              ))}
              allDayClassName={() => cls('allDayCell')}
              headerHeight={headerHeight}
              timeSlots={timeSlots}
              cls={cls}
            >
              {resources.map((resource, i) => {
                const blocks = neighborUnavailable?.[side].get(resource.id);
                return (
                  blocks && (
                    <UnavailabilityOverlay
                      key={`unavail-${resource.id}`}
                      blocks={blocks}
                      column={i + 1}
                      cls={cls}
                    />
                  )
                );
              })}
            </TimeGridSwipeNeighbor>
          ))}

        {/* Now indicator */}
        <NowIndicator
          date={date}
          timeZone={timeZone}
          startHour={startHour}
          endHour={endHour}
          hourHeight={effectiveHourHeight}
          cls={cls}
        />
      </div>
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {announcerMessage}
      </div>
    </div>
  );
}
