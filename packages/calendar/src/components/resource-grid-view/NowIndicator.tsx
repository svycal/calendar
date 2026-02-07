import { memo, useEffect, useState } from 'react';

import type { ResourceGridViewClassNames } from '@/types/calendar';

interface NowIndicatorProps {
  date: string;
  timeZone: string;
  startHour: number;
  hourHeight: number;
  cls: (key: keyof ResourceGridViewClassNames) => string;
}

function isTodayInTimeZone(date: string, timeZone: string): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now) === date;
}

function getCurrentMinuteOffset(
  timeZone: string,
  startHour: number,
  hourHeight: number,
): number | null {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const totalMinutes = hour * 60 + minute;
  const axisStartMin = startHour * 60;

  if (totalMinutes < axisStartMin) return null;

  return ((totalMinutes - axisStartMin) / 60) * hourHeight;
}

export const NowIndicator = memo(function NowIndicator({
  date,
  timeZone,
  startHour,
  hourHeight,
  cls,
}: NowIndicatorProps) {
  const [offset, setOffset] = useState<number | null>(() =>
    isTodayInTimeZone(date, timeZone)
      ? getCurrentMinuteOffset(timeZone, startHour, hourHeight)
      : null,
  );

  useEffect(() => {
    if (!isTodayInTimeZone(date, timeZone)) {
      setOffset(null);
      return;
    }

    setOffset(getCurrentMinuteOffset(timeZone, startHour, hourHeight));

    const interval = setInterval(() => {
      if (!isTodayInTimeZone(date, timeZone)) {
        setOffset(null);
      } else {
        setOffset(getCurrentMinuteOffset(timeZone, startHour, hourHeight));
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [date, timeZone, startHour, hourHeight]);

  if (offset === null) return null;

  return (
    <div
      style={{
        gridRow: '2 / -1',
        gridColumn: '1 / -1',
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      <div className={cls('nowIndicator')} style={{ top: offset }} />
    </div>
  );
});
