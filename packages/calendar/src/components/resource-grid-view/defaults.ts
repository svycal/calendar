import type { ResourceGridViewClassNames } from '@/types/calendar';

export const resourceGridViewDefaults: Required<ResourceGridViewClassNames> = {
  root: 'overflow-auto relative',
  grid: '',
  cornerCell:
    'bg-white dark:bg-zinc-950 border-b border-r border-zinc-200 dark:border-zinc-700 sticky top-0 left-0 z-30',
  headerCell:
    'bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-20 flex items-center gap-2 px-3 py-2',
  headerName: 'text-zinc-950 dark:text-zinc-50 text-sm font-medium truncate',
  headerAvatar: 'size-6 rounded-full object-cover',
  gutterCell:
    'bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-700 sticky left-0 z-10 flex items-start justify-end pr-2 -mt-[0.5rem]',
  gutterCellMinor:
    'bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-700 sticky left-0 z-10',
  gutterLabel: 'text-zinc-500 dark:text-zinc-400 text-xs',
  bodyCell: 'border-t border-r border-zinc-200 dark:border-zinc-700',
  bodyCellMinor: 'border-t border-r border-zinc-200 dark:border-zinc-700',
  eventColumn: 'relative mr-3',
  event:
    'absolute inset-x-0.5 rounded-md pl-2.5 pr-1.5 py-0.5 overflow-hidden cursor-pointer bg-zinc-100/90 ring-1 ring-inset ring-zinc-900/15 dark:bg-zinc-800/90 dark:ring-white/15',
  eventColorBar: 'absolute left-0 top-0 bottom-0 w-1',
  eventTitle: 'text-zinc-900 dark:text-zinc-100 text-xs/4 font-medium truncate',
  eventTime: 'text-zinc-500 dark:text-zinc-400 text-xs/4 truncate',
  eventClientName: 'text-zinc-500 dark:text-zinc-400 text-xs/4 truncate',
  nowIndicator:
    'absolute left-0 right-0 h-0.5 bg-orange-500 dark:bg-orange-400 pointer-events-none',
  slotHighlight:
    'bg-blue-400/15 dark:bg-blue-500/20 rounded-md transition-[top,opacity] duration-75',
  selectionHighlight: 'bg-blue-400/25 dark:bg-blue-500/30 rounded-md',
  unavailableOverlay: 'cal-unavailable-overlay',
};
