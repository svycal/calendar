import type { CalendarEvent } from '@/types/calendar';
import { formatTimeRange } from './time';

/** Returns a plain-text label for the event, suitable for aria-label and announcer messages. */
export function getEventLabel(event: CalendarEvent): string {
  return event.ariaLabel ?? String(event.title);
}

/** Returns a plain-text client name string, or undefined if not set. */
export function getClientNameLabel(event: CalendarEvent): string | undefined {
  if (!event.clientName) return undefined;
  return typeof event.clientName === 'string'
    ? event.clientName
    : String(event.clientName);
}

/**
 * Plain-text description of an event: title, time range (or "all day"),
 * client name, and optionally its status.
 */
export function describeEvent(
  event: CalendarEvent,
  timeZone: string,
  { includeStatus = false }: { includeStatus?: boolean } = {}
): string {
  const parts: string[] = [
    getEventLabel(event),
    event.allDay
      ? 'all day'
      : formatTimeRange(event.startTime, event.endTime, timeZone),
  ];
  const clientLabel = getClientNameLabel(event);
  if (clientLabel) parts.push(clientLabel);
  if (includeStatus) {
    if (event.status === 'canceled') parts.push('canceled');
    else if (event.status === 'tentative') parts.push('tentative');
  }
  return parts.join(', ');
}
