import { Temporal } from 'temporal-polyfill';
import type { TimeAxisConfig } from '@/types/calendar';

export interface TimeSlotEntry {
  hour: number;
  minute: number;
  label: string;
  index: number;
  isHourStart: boolean;
}

export function formatTimeLabel(hour: number, minute: number): string {
  const period = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  if (minute === 0) return `${displayHour} ${period}`;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

export function generateTimeSlots(config: TimeAxisConfig): TimeSlotEntry[] {
  const startHour = config.startHour ?? 0;
  const endHour = config.endHour ?? 24;
  const intervalMinutes = config.intervalMinutes ?? 60;

  const slots: TimeSlotEntry[] = [];
  let index = 0;
  let totalMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  while (totalMinutes < endMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    slots.push({
      hour: h,
      minute: m,
      label: formatTimeLabel(h, m),
      index,
      isHourStart: m === 0,
    });
    index++;
    totalMinutes += intervalMinutes;
  }

  return slots;
}

interface MinuteRange {
  startMin: number;
  endMin: number;
}

export function getMinuteRange(
  startTime: Temporal.ZonedDateTime,
  endTime: Temporal.ZonedDateTime,
  viewDate: Temporal.PlainDate,
  displayTimeZone: string
): MinuteRange | null {
  const start = startTime.withTimeZone(displayTimeZone);
  const end = endTime.withTimeZone(displayTimeZone);
  const startDate = start.toPlainDate();
  const endDate = end.toPlainDate();
  const endMinutes = end.hour * 60 + end.minute;

  // Entirely before view date (or ends exactly at midnight starting view date)
  if (Temporal.PlainDate.compare(endDate, viewDate) < 0) return null;
  if (Temporal.PlainDate.compare(endDate, viewDate) === 0 && endMinutes === 0)
    return null;

  // Entirely after view date
  if (Temporal.PlainDate.compare(startDate, viewDate) > 0) return null;

  const startMin =
    Temporal.PlainDate.compare(startDate, viewDate) < 0
      ? 0
      : start.hour * 60 + start.minute;

  const endMin =
    Temporal.PlainDate.compare(endDate, viewDate) > 0 ? 1440 : endMinutes;

  if (endMin <= startMin) return null;

  return { startMin, endMin };
}

export function formatEventStartTime(
  startTime: Temporal.ZonedDateTime,
  displayTimeZone: string
): string {
  const inZone = startTime.withTimeZone(displayTimeZone);
  return formatTimeLabel(inZone.hour, inZone.minute);
}

export function formatDateLabel(date: Temporal.PlainDate): string {
  const dt = date.toPlainDateTime({ hour: 12 });
  const jsDate = new Date(dt.toString());
  return jsDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function generateDateRange(
  startDate: Temporal.PlainDate,
  endDate: Temporal.PlainDate
): Temporal.PlainDate[] {
  const dates: Temporal.PlainDate[] = [];
  let current = startDate;
  while (Temporal.PlainDate.compare(current, endDate) <= 0) {
    dates.push(current);
    current = current.add({ days: 1 });
  }
  return dates;
}

export function formatDayOfWeek(date: Temporal.PlainDate): string {
  const dt = date.toPlainDateTime({ hour: 12 });
  const jsDate = new Date(dt.toString());
  return jsDate.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatTimeRange(
  startTime: Temporal.ZonedDateTime,
  endTime: Temporal.ZonedDateTime,
  displayTimeZone: string
): string {
  const start = startTime.withTimeZone(displayTimeZone);
  const end = endTime.withTimeZone(displayTimeZone);
  const startLabel = formatTimeLabel(start.hour, start.minute);
  const endLabel = formatTimeLabel(end.hour, end.minute);
  return `${startLabel} to ${endLabel}`;
}
