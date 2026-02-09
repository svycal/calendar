import { memo, useEffect, useState } from 'react';
import { Temporal } from 'temporal-polyfill';

import type { ResourceGridViewClassNames } from '@/types/calendar';

interface NowIndicatorProps {
  date: Temporal.PlainDate;
  timeZone: string;
  startHour: number;
  endHour: number;
  hourHeight: number;
  cls: (key: keyof ResourceGridViewClassNames) => string;
}

function isTodayInTimeZone(
  date: Temporal.PlainDate,
  timeZone: string
): boolean {
  const today = Temporal.Now.plainDateISO(timeZone);
  return Temporal.PlainDate.compare(today, date) === 0;
}

function getCurrentMinuteOffset(
  timeZone: string,
  startHour: number,
  endHour: number,
  hourHeight: number
): number | null {
  const now = Temporal.Now.zonedDateTimeISO(timeZone);
  const totalMinutes = now.hour * 60 + now.minute;
  const axisStartMin = startHour * 60;
  const axisEndMin = endHour * 60;

  if (totalMinutes < axisStartMin || totalMinutes >= axisEndMin) return null;

  return ((totalMinutes - axisStartMin) / 60) * hourHeight;
}

export const NowIndicator = memo(function NowIndicator({
  date,
  timeZone,
  startHour,
  endHour,
  hourHeight,
  cls,
}: NowIndicatorProps) {
  const [, setTick] = useState(0);
  const isToday = isTodayInTimeZone(date, timeZone);
  const offset = isToday
    ? getCurrentMinuteOffset(timeZone, startHour, endHour, hourHeight)
    : null;

  useEffect(() => {
    if (!isToday) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60_000);

    return () => clearInterval(interval);
  }, [isToday]);

  if (offset === null) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        gridRow: '3 / -1',
        gridColumn: '1 / -1',
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      <div className={cls('nowIndicator')} style={{ top: offset }} />
    </div>
  );
});
