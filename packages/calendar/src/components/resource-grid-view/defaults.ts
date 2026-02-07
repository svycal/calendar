import type { ResourceGridViewClassNames } from '@/types/calendar';

export const resourceGridViewDefaults: Required<ResourceGridViewClassNames> = {
  root: 'overflow-auto relative border border-cal-border rounded-lg bg-cal-background',
  grid: '',
  cornerCell:
    'bg-cal-header border-b border-r border-cal-border sticky top-0 left-0 z-30',
  headerCell:
    'bg-cal-header border-b border-cal-border sticky top-0 z-20 flex items-center gap-2 px-3 py-2',
  headerName: 'text-cal-header-foreground text-sm font-medium truncate',
  headerAvatar: 'size-6 rounded-full object-cover',
  gutterCell:
    'bg-cal-gutter border-r border-b border-cal-border sticky left-0 z-10 flex items-start justify-end pr-2 -mt-[0.5em]',
  gutterLabel: 'text-cal-muted-foreground text-xs',
  bodyCell: 'border-b border-r border-cal-border',
  eventColumn: 'relative',
  event:
    'absolute inset-x-0.5 rounded px-1.5 py-0.5 overflow-hidden cursor-pointer transition-opacity hover:opacity-90',
  eventTitle: 'text-cal-event-foreground text-xs font-medium truncate',
  eventTime: 'text-cal-event-foreground/70 text-[10px] truncate',
  nowIndicator:
    'absolute left-0 right-0 h-0.5 bg-cal-now-indicator pointer-events-none',
  slotHighlight:
    'bg-cal-slot-highlight rounded-sm transition-[top,opacity] duration-75',
};
