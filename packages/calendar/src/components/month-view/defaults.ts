import type { MonthViewClassNames } from '@/types/calendar';

export const monthViewDefaults: Required<MonthViewClassNames> = {
  root: 'overflow-auto relative bg-cal-surface',
  grid: 'min-h-full',
  headerCell:
    'bg-cal-surface border-r border-cal-border sticky top-0 z-20 px-2 pt-2 pb-1 text-center text-cal-text-muted text-xs font-medium uppercase truncate',
  week: 'relative',
  dayCell: 'border-t border-r border-cal-border',
  dayCellOutside: '',
  dayNumber:
    'text-cal-text text-xs font-medium min-w-6 h-6 px-1.5 inline-flex items-center justify-center rounded-full whitespace-nowrap',
  dayNumberToday: 'bg-cal-now text-white',
  dayNumberOutside: 'text-cal-text-muted',
  dayNumberButton: 'cursor-pointer hover:bg-cal-event-bg',
  event:
    'relative flex items-center gap-1 h-full rounded-md pl-2.5 pr-1.5 overflow-hidden cursor-pointer select-none text-left bg-cal-event-bg ring-1 ring-inset ring-cal-event-ring min-w-0',
  eventSelected:
    'shadow-lg shadow-cal-event-shadow ring-cal-event-ring-selected',
  eventColorBar: 'absolute left-0 top-0 bottom-0 w-1',
  eventTitle: 'text-cal-text-body text-xs/4 font-medium truncate',
  eventTime: 'text-cal-text-muted text-xs/4 shrink-0',
  timedEvent:
    'flex items-center gap-1.5 h-full rounded-md px-1.5 overflow-hidden cursor-pointer select-none text-left min-w-0 hover:bg-cal-event-bg',
  timedEventSelected:
    'bg-cal-event-bg ring-1 ring-inset ring-cal-event-ring-selected shadow-lg shadow-cal-event-shadow',
  timedEventDot: 'size-2 shrink-0 rounded-full',
  timedEventTime: 'text-cal-text-muted text-xs/4 shrink-0',
  timedEventTitle: 'text-cal-text-body text-xs/4 font-medium truncate',
  moreButton:
    'h-full rounded-md px-1.5 text-left text-cal-text-body text-xs/4 font-medium truncate cursor-pointer select-none hover:bg-cal-event-bg',
  selectionHighlight: 'bg-cal-selection',
  morePopover:
    'w-60 rounded-lg bg-cal-surface p-2 shadow-lg shadow-cal-event-shadow ring-1 ring-cal-event-ring max-h-[min(24rem,calc(100dvh-1rem))] overflow-auto outline-none',
  morePopoverHeader: 'flex flex-col items-center pb-2',
  morePopoverWeekday: 'text-cal-text-muted text-xs font-medium uppercase',
  morePopoverDayNumber: 'text-cal-text text-2xl font-medium',
  morePopoverEvents: 'flex flex-col gap-0.5',
};
