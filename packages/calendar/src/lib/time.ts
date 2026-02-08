import type { Temporal } from 'temporal-polyfill';
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

export function getMinutesFromMidnight(
  zdt: Temporal.ZonedDateTime,
  displayTimeZone: string,
): number {
  const inZone = zdt.withTimeZone(displayTimeZone);
  return inZone.hour * 60 + inZone.minute;
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

export function formatEventStartTime(
  startTime: Temporal.ZonedDateTime,
  displayTimeZone: string,
): string {
  const inZone = startTime.withTimeZone(displayTimeZone);
  const h = inZone.hour;
  const m = inZone.minute;
  const period = h >= 12 ? 'pm' : 'am';
  const displayHour = h % 12 || 12;
  if (m === 0) return `${displayHour} ${period}`;
  return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatEventTimeRange(
  startTime: Temporal.ZonedDateTime,
  endTime: Temporal.ZonedDateTime,
  displayTimeZone: string,
): string {
  const s = startTime.withTimeZone(displayTimeZone);
  const e = endTime.withTimeZone(displayTimeZone);

  const period = (h: number) => (h >= 12 ? 'PM' : 'AM');
  const fmt = (h: number, m: number) =>
    `${h % 12 || 12}:${String(m).padStart(2, '0')}`;

  const startStr = fmt(s.hour, s.minute);
  const endStr = fmt(e.hour, e.minute);

  if (period(s.hour) === period(e.hour)) {
    return `${startStr} – ${endStr} ${period(e.hour)}`;
  }

  return `${startStr} ${period(s.hour)} – ${endStr} ${period(e.hour)}`;
}
