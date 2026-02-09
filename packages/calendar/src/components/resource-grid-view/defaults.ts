import type { ResourceGridViewClassNames } from '@/types/calendar';

export const resourceGridViewDefaults: Required<ResourceGridViewClassNames> = {
  root: 'overflow-auto relative',
  grid: 'min-w-max',
  cornerCell:
    'bg-cal-surface border-r border-cal-border sticky top-0 left-0 z-30 flex items-end justify-end',
  headerCell:
    'bg-cal-surface border-cal-border sticky top-0 z-20 flex items-center gap-2 px-3 py-2',
  headerName: 'text-cal-text text-sm font-medium truncate',
  headerAvatar: 'size-6 rounded-full object-cover',
  gutterCell:
    'bg-cal-surface border-r border-cal-border sticky left-0 z-10 flex items-start justify-end pr-2 -mt-[0.5rem]',
  gutterCellMinor:
    'bg-cal-surface border-r border-cal-border sticky left-0 z-10',
  gutterLabel: 'font-medium text-cal-text-muted text-xs',
  bodyCell: 'border-t border-r border-cal-border',
  bodyCellMinor: 'border-t border-r border-cal-border',
  eventColumn: 'relative mr-3',
  event:
    'absolute inset-x-0.5 rounded-md pl-2.5 pr-1.5 py-0.5 overflow-hidden cursor-pointer select-none bg-cal-event-bg ring-1 ring-inset ring-cal-event-ring',
  eventSelected:
    'shadow-lg shadow-cal-event-shadow ring-cal-event-ring-selected',
  eventColorBar: 'absolute left-0 top-0 bottom-0 w-1',
  eventTitle: 'text-cal-text-body text-xs/4 font-medium',
  eventTime: 'text-cal-text-muted text-xs/4',
  eventClientName: 'text-cal-text-muted text-xs/4',
  nowIndicator: 'absolute left-0 right-0 h-0.5 bg-cal-now pointer-events-none',
  slotHighlight:
    'bg-cal-slot-highlight rounded-md transition-[top,opacity] duration-75',
  selectionHighlight: 'bg-cal-selection rounded-md',
  allDayCell:
    'border-r sticky z-20 bg-cal-surface border-b border-cal-border px-1 py-1 flex flex-wrap gap-1',
  unavailableOverlay: 'cal-unavailable-overlay',
};
