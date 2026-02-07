import type { ResourceGridViewClassNames } from '@/types/calendar';

export const resourceGridViewDefaults: Required<ResourceGridViewClassNames> = {
  root: 'overflow-auto relative border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950',
  grid: '',
  cornerCell:
    'bg-gray-50 dark:bg-gray-900 border-b border-r border-gray-200 dark:border-gray-700 sticky top-0 left-0 z-30',
  headerCell:
    'bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 flex items-center gap-2 px-3 py-2',
  headerName: 'text-gray-950 dark:text-gray-50 text-sm font-medium truncate',
  headerAvatar: 'size-6 rounded-full object-cover',
  gutterCell:
    'bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 sticky left-0 z-10 flex items-start justify-end pr-2 -mt-[0.5rem]',
  gutterCellMinor:
    'bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 sticky left-0 z-10',
  gutterLabel: 'text-gray-500 dark:text-gray-400 text-xs',
  bodyCell: 'border-t border-r border-gray-200 dark:border-gray-700',
  bodyCellMinor: 'border-t border-r border-gray-200 dark:border-gray-700',
  eventColumn: 'relative',
  event:
    'absolute inset-x-0.5 rounded-md pl-2.5 pr-1.5 py-0.5 overflow-hidden cursor-pointer bg-gray-100/90 ring-1 ring-inset ring-gray-900/15 dark:bg-gray-800/90 dark:ring-white/15',
  eventColorBar: 'absolute left-0 top-0 bottom-0 w-1',
  eventTitle: 'text-gray-900 dark:text-gray-100 text-xs/4 font-medium truncate',
  eventTime: 'text-gray-500 dark:text-gray-400 text-xs/4 truncate',
  eventClientName: 'text-gray-500 dark:text-gray-400 text-xs/4 truncate',
  nowIndicator:
    'absolute left-0 right-0 h-0.5 bg-orange-500 dark:bg-orange-400 pointer-events-none',
  slotHighlight:
    'bg-blue-400/15 dark:bg-blue-500/20 rounded-sm transition-[top,opacity] duration-75',
  unavailableOverlay: 'cal-unavailable-overlay',
};
