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
      <div className="text-cal-foreground bg-cal-background border-cal-border rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Week View</h2>
        <p className="text-cal-foreground/60 text-sm">
          {date} &middot; {resource.name} &middot; {events.length} events
        </p>
      </div>
    </div>
  );
}
