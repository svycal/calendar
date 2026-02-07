import { cn } from '@/lib/utils';
import type { ResourceGridViewProps } from '@/types/calendar';

export function ResourceGridView({
  date,
  resources,
  events,
  className,
}: ResourceGridViewProps) {
  return (
    <div className={cn('sc-resource-grid', className)}>
      <div className="text-cal-foreground bg-cal-background border-cal-border rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Resource Grid View</h2>
        <p className="text-cal-foreground/60 text-sm">
          {date} &middot; {resources.length} resources &middot; {events.length}{' '}
          events
        </p>
      </div>
    </div>
  );
}
