import type { AllDayCalendarEvent, TimedCalendarEvent } from '@/types/calendar';

/** Create a timed calendar event (sets allDay to false automatically) */
export function timedEvent(
  data: Omit<TimedCalendarEvent, 'allDay'>
): TimedCalendarEvent {
  return { ...data, allDay: false };
}

/** Create an all-day calendar event (sets allDay to true automatically) */
export function allDayEvent(
  data: Omit<AllDayCalendarEvent, 'allDay'>
): AllDayCalendarEvent {
  return { ...data, allDay: true };
}
