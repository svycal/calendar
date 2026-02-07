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
      <div className="text-gray-950 dark:text-gray-50 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Week View</h2>
        <p className="text-gray-950/60 dark:text-gray-50/60 text-sm">
          {date} &middot; {resource.name} &middot; {events.length} events
        </p>
      </div>
    </div>
  );
}
