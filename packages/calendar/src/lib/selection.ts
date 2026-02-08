import type { Temporal } from 'temporal-polyfill';
import type { SelectionEventData, TimedCalendarEvent } from '@/types/calendar';

export function buildSyntheticEvent(
  resourceId: string,
  startTime: Temporal.ZonedDateTime,
  endTime: Temporal.ZonedDateTime,
  eventData?: SelectionEventData,
): TimedCalendarEvent {
  return {
    id: '__selection__',
    resourceId,
    startTime,
    endTime,
    title: eventData?.title ?? '',
    ...eventData,
  };
}
