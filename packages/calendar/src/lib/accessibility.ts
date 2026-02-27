import type { CalendarEvent } from '@/types/calendar';

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
