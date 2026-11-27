import type { Temporal } from 'temporal-polyfill';
import type { CalendarEvent } from '@/types/calendar';
import { getMonthEventSpan } from './month';
import { formatTimeRange } from './time';

/** Returns a plain-text label for the event, suitable for aria-label and announcer messages. */
export function getEventLabel(event: CalendarEvent): string {
  return event.ariaLabel ?? String(event.title);
}

/**
 * Returns the client name when it's a non-empty string. A ReactNode client
 * name has no plain-text form, so it returns undefined.
 */
export function getClientNameLabel(event: CalendarEvent): string | undefined {
  return typeof event.clientName === 'string' && event.clientName
    ? event.clientName
    : undefined;
}

function formatDay(date: Temporal.PlainDate): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Plain-text description of an event: title, optionally the date(s) it
 * covers, time range (or "all day"), client name, and optionally its status.
 */
export function describeEvent(
  event: CalendarEvent,
  timeZone: string,
  {
    includeStatus = false,
    includeDate = false,
  }: { includeStatus?: boolean; includeDate?: boolean } = {}
): string {
  const parts: string[] = [getEventLabel(event)];
  if (includeDate) {
    // For views without a day column header to give the date (month view)
    const { startDate, endDate } = getMonthEventSpan(event, timeZone);
    parts.push(
      startDate.equals(endDate)
        ? formatDay(startDate)
        : `${formatDay(startDate)} to ${formatDay(endDate)}`
    );
  }
  parts.push(
    event.allDay
      ? 'all day'
      : formatTimeRange(event.startTime, event.endTime, timeZone)
  );
  const clientLabel = getClientNameLabel(event);
  if (clientLabel) parts.push(clientLabel);
  if (includeStatus) {
    if (event.status === 'canceled') parts.push('canceled');
    else if (event.status === 'tentative') parts.push('tentative');
  }
  return parts.join(', ');
}
