import { cn } from '@/lib/utils';
import type { WeekViewProps } from '@/types/calendar';

export function WeekView({
  date,
  resource,
  events,
  className,
}: WeekViewProps) {
  return (
    <div className={cn('sc-week-view', className)}>
      <div className="text-zinc-950 dark:text-zinc-50 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Week View</h2>
        <p className="text-zinc-950/60 dark:text-zinc-50/60 text-sm">
          {date.toString()} &middot; {resource.name} &middot; {events.length} events
        </p>
      </div>
    </div>
  );
}
