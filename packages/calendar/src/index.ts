// Temporal
export { Temporal } from 'temporal-polyfill';

// Components
export { ResourceGridView } from './components/resource-grid-view';
// Defaults
export { resourceGridViewDefaults } from './components/resource-grid-view';

// Types
export type {
  CalendarResource,
  CalendarEvent,
  TimedCalendarEvent,
  AllDayCalendarEvent,
  TimeSlot,
  AvailabilityRange,
  TimeAxisConfig,
  ResourceGridViewProps,
  ResourceGridViewClassNames,
  PositionedEvent,
  SelectedRange,
  SelectionAppearance,
  SelectionEventData,
  EventLayout,
} from './types/calendar';

// Utilities
export { cn } from './lib/utils';
export { timedEvent, allDayEvent } from './lib/events';
