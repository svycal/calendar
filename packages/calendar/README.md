# @savvycal/calendar

A fully-featured resource grid calendar component built with React, Tailwind CSS v4, and the Temporal API.

## Installation

```bash
npm install @savvycal/calendar
```

### Peer dependencies

- `react` ^18 || ^19
- `react-dom` ^18 || ^19

The package ships [`temporal-polyfill`](https://www.npmjs.com/package/temporal-polyfill) as a direct dependency, so you don't need to install it separately.

## CSS setup (Tailwind CSS v4)

Add three imports to your app's CSS **in this exact order**:

```css
@import '@savvycal/calendar/preset.css';
@import 'tailwindcss';
@import '@savvycal/calendar/components.css';
```

**Why order matters:** The preset registers `@theme` tokens and a `@source` directive _before_ Tailwind processes them, so Tailwind can generate the utility classes the library uses. The components stylesheet must come _after_ Tailwind so its custom CSS (e.g. the unavailable-time cross-hatch pattern) can reference Tailwind's generated values.

## Quick start

```tsx
import { ResourceGridView, Temporal } from '@savvycal/calendar';

const today = Temporal.Now.plainDateISO();

function App() {
  return (
    <ResourceGridView
      date={today}
      timeZone="America/Chicago"
      resources={[
        { id: '1', name: 'Alice', color: '#3b82f6' },
        { id: '2', name: 'Bob', color: '#8b5cf6' },
      ]}
      events={[
        {
          id: 'evt-1',
          title: 'Meeting',
          resourceId: '1',
          startTime: today
            .toPlainDateTime({ hour: 10 })
            .toZonedDateTime('America/Chicago'),
          endTime: today
            .toPlainDateTime({ hour: 11 })
            .toZonedDateTime('America/Chicago'),
        },
      ]}
    />
  );
}
```

## ResourceGridView props

### Required

| Prop        | Type                 | Description                                           |
| ----------- | -------------------- | ----------------------------------------------------- |
| `date`      | `Temporal.PlainDate` | The date to display.                                  |
| `timeZone`  | `string`             | IANA time zone identifier (e.g. `"America/Chicago"`). |
| `resources` | `CalendarResource[]` | Array of resources (columns).                         |
| `events`    | `CalendarEvent[]`    | Array of timed and/or all-day events.                 |

### Time axis

| Prop       | Type             | Default                                              | Description                                          |
| ---------- | ---------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `timeAxis` | `TimeAxisConfig` | `{ startHour: 0, endHour: 24, intervalMinutes: 60 }` | Controls the visible hour range and gutter interval. |

### Layout

| Prop             | Type                         | Default                                        | Description                                                                                          |
| ---------------- | ---------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `hourHeight`     | `number`                     | `60`                                           | Height in pixels for one hour.                                                                       |
| `columnMinWidth` | `number`                     | `120`                                          | Minimum width in pixels for each resource column.                                                    |
| `eventLayout`    | `'columns' \| 'stacked'`     | `'columns'`                                    | How overlapping events are laid out. `'columns'` places them side-by-side; `'stacked'` offsets them. |
| `eventGap`       | `number`                     | —                                              | Vertical gap in pixels between the edge of events and column borders.                                |
| `stackOffset`    | `number`                     | `8`                                            | Horizontal pixel offset for each stacked event (only applies when `eventLayout` is `'stacked'`).     |
| `className`      | `string`                     | —                                              | Class name applied to the root element.                                                              |
| `classNames`     | `ResourceGridViewClassNames` | See [Customizing styles](#customizing-styles). | Override default class names for internal elements.                                                  |

### Events & interaction

| Prop                  | Type                                               | Default | Description                                                          |
| --------------------- | -------------------------------------------------- | ------- | -------------------------------------------------------------------- |
| `onEventClick`        | `(event: CalendarEvent) => void`                   | —       | Called when an event is clicked.                                     |
| `onSlotClick`         | `(info: { resource, startTime, endTime }) => void` | —       | Called when an empty time slot is clicked.                           |
| `snapDuration`        | `number`                                           | —       | Snap interval in minutes for drag selection.                         |
| `placeholderDuration` | `number`                                           | `15`    | Duration in minutes for the hover placeholder shown before dragging. |

### Selection

| Prop                    | Type                                     | Default | Description                                                                                                                               |
| ----------------------- | ---------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `selectedRange`         | `SelectedRange \| null`                  | —       | The currently selected time range (controlled).                                                                                           |
| `onSelect`              | `(range: SelectedRange \| null) => void` | —       | Called when the user selects or clears a range by dragging.                                                                               |
| `selectionAppearance`   | `SelectionAppearance`                    | —       | How the selection is rendered. `'highlight'` shows a translucent overlay; `{ style: 'event', eventData? }` renders it as a phantom event. |
| `dragPreviewAppearance` | `SelectionAppearance`                    | —       | Appearance of the drag preview while the user is actively dragging (before releasing). Falls back to `selectionAppearance` if not set.    |
| `selectionRef`          | `Ref<HTMLDivElement>`                    | —       | Ref attached to the selection element, useful for positioning popovers (e.g. with [Floating UI](https://floating-ui.com)).                |

### Availability

| Prop             | Type                                  | Default | Description                                                                                       |
| ---------------- | ------------------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `availability`   | `Record<string, AvailabilityRange[]>` | —       | Map of resource ID to available time ranges. Times outside these ranges are shown as unavailable. |
| `unavailability` | `Record<string, AvailabilityRange[]>` | —       | Map of resource ID to explicitly unavailable time ranges. Applied on top of availability.         |

### Render props

| Prop           | Type                                                                             | Description                                                          |
| -------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `renderHeader` | `(props: { resource: CalendarResource }) => ReactNode`                           | Custom renderer for resource column headers.                         |
| `renderEvent`  | `(props: { event: TimedCalendarEvent, position: PositionedEvent }) => ReactNode` | Custom renderer for timed events.                                    |
| `renderCorner` | `() => ReactNode`                                                                | Custom renderer for the top-left corner cell (e.g. time zone label). |

## WeekView props

`WeekView` is a simpler single-resource weekly calendar.

| Prop           | Type                              | Default                                              | Description                                            |
| -------------- | --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| `date`         | `Temporal.PlainDate`              | —                                                    | A date within the week to display.                     |
| `timeZone`     | `string`                          | —                                                    | IANA time zone identifier.                             |
| `resource`     | `CalendarResource`                | —                                                    | The single resource to display events for.             |
| `events`       | `CalendarEvent[]`                 | —                                                    | Array of events.                                       |
| `availability` | `TimeSlot[]`                      | —                                                    | Availability slots for the resource.                   |
| `timeAxis`     | `TimeAxisConfig`                  | `{ startHour: 0, endHour: 24, intervalMinutes: 60 }` | Controls the visible hour range and gutter interval.   |
| `weekStartsOn` | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | —                                                    | Day the week starts on (0 = Sunday, 1 = Monday, etc.). |
| `onEventClick` | `(event: CalendarEvent) => void`  | —                                                    | Called when an event is clicked.                       |
| `className`    | `string`                          | —                                                    | Class name applied to the root element.                |

## Data types

### CalendarResource

```ts
interface CalendarResource {
  id: string;
  name: string;
  avatarUrl?: string;
  color?: string;
}
```

### CalendarEvent

A discriminated union of `TimedCalendarEvent` and `AllDayCalendarEvent`:

```ts
interface TimedCalendarEvent {
  id: string;
  title: string;
  resourceId: string;
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
  allDay?: false;
  color?: string;
  clientName?: string;
  selected?: boolean;
  status?: 'confirmed' | 'canceled' | 'tentative';
  metadata?: Record<string, unknown>;
}

interface AllDayCalendarEvent {
  id: string;
  title: string;
  resourceId: string;
  startDate: Temporal.PlainDate;
  endDate: Temporal.PlainDate;
  allDay: true;
  color?: string;
  clientName?: string;
  selected?: boolean;
  status?: 'confirmed' | 'canceled' | 'tentative';
  metadata?: Record<string, unknown>;
}
```

### AvailabilityRange

```ts
interface AvailabilityRange {
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
}
```

### SelectedRange

```ts
interface SelectedRange {
  resourceId: string;
  startTime: Temporal.ZonedDateTime;
  endTime: Temporal.ZonedDateTime;
}
```

### TimeAxisConfig

```ts
interface TimeAxisConfig {
  startHour?: number; // default: 0
  endHour?: number; // default: 24
  intervalMinutes?: number; // default: 60
}
```

### PositionedEvent

Provided to the `renderEvent` render prop with layout information:

```ts
interface PositionedEvent {
  event: TimedCalendarEvent;
  top: number;
  height: number;
  subColumn: number;
  totalSubColumns: number;
}
```

## Customizing styles

### CSS custom properties

The preset defines a set of `--color-cal-*` CSS custom properties under `@theme`. Override them in your own CSS to change the calendar's color palette:

| Variable                          | Light default    | Description                       |
| --------------------------------- | ---------------- | --------------------------------- |
| `--color-cal-surface`             | `white`          | Background color of the calendar. |
| `--color-cal-border`              | `zinc-300`       | Border color for grid lines.      |
| `--color-cal-text`                | `zinc-950`       | Primary text color (headers).     |
| `--color-cal-text-body`           | `zinc-900`       | Body text color (event titles).   |
| `--color-cal-text-muted`          | `zinc-600`       | Muted text color (times, labels). |
| `--color-cal-event-bg`            | `zinc-100 @ 90%` | Event background.                 |
| `--color-cal-event-ring`          | `zinc-900 @ 15%` | Event border ring.                |
| `--color-cal-event-ring-selected` | `zinc-900 @ 30%` | Ring color for selected events.   |
| `--color-cal-event-shadow`        | `black @ 10%`    | Shadow color for selected events. |
| `--color-cal-now`                 | `orange-500`     | Now indicator line color.         |
| `--color-cal-slot-highlight`      | `blue-400 @ 15%` | Hover slot highlight.             |
| `--color-cal-selection`           | `blue-400 @ 25%` | Drag selection highlight.         |

Example override:

```css
@import '@savvycal/calendar/preset.css';
@import 'tailwindcss';
@import '@savvycal/calendar/components.css';

@theme {
  --color-cal-now: var(--color-red-500);
  --color-cal-selection: color-mix(
    in oklab,
    var(--color-indigo-400) 25%,
    transparent
  );
}
```

### Dark mode

The preset uses a `.dark` class convention (matching Tailwind's `@custom-variant dark`). Add the `dark` class to a parent element to switch to dark mode. All `--color-cal-*` variables are automatically overridden in the `.dark` scope.

### The `classNames` prop

Every internal element can be restyled via the `classNames` prop. Each key maps to a specific part of the calendar:

| Key                  | Description                                      |
| -------------------- | ------------------------------------------------ |
| `root`               | Outermost wrapper (scroll container).            |
| `grid`               | The CSS grid element.                            |
| `cornerCell`         | Top-left corner cell (sticky).                   |
| `headerCell`         | Resource column header cell (sticky).            |
| `headerName`         | Resource name text inside the header.            |
| `headerAvatar`       | Avatar image inside the header.                  |
| `gutterCell`         | Time gutter cell for hour labels (sticky).       |
| `gutterCellMinor`    | Time gutter cell for sub-hour intervals.         |
| `gutterLabel`        | Text label inside gutter cells.                  |
| `bodyCell`           | Hour-start body cell in the grid.                |
| `bodyCellMinor`      | Sub-hour body cell in the grid.                  |
| `eventColumn`        | Container for events within a resource column.   |
| `event`              | Individual event element.                        |
| `eventSelected`      | Additional classes applied to a selected event.  |
| `eventColorBar`      | Vertical color bar on the left edge of an event. |
| `eventTitle`         | Event title text.                                |
| `eventTime`          | Event time text.                                 |
| `eventClientName`    | Client name text on the event.                   |
| `nowIndicator`       | Horizontal "now" indicator line.                 |
| `slotHighlight`      | Hover highlight on time slots.                   |
| `selectionHighlight` | Drag selection highlight overlay.                |
| `allDayCell`         | All-day event row cell.                          |
| `unavailableOverlay` | Unavailable time cross-hatch overlay.            |

### `resourceGridViewDefaults`

The library exports `resourceGridViewDefaults`, an object containing the default Tailwind classes for every `classNames` key. Use it to extend rather than replace defaults:

```tsx
import {
  ResourceGridView,
  resourceGridViewDefaults,
  cn,
} from '@savvycal/calendar';

<ResourceGridView
  classNames={{
    event: cn(resourceGridViewDefaults.event, 'rounded-lg'),
    headerCell: cn(resourceGridViewDefaults.headerCell, 'border-b'),
  }}
  // ...other props
/>;
```

The `cn()` utility (re-exported from the library) merges Tailwind classes with conflict resolution via `tailwind-merge`.

## Selection & interaction

### Controlled selection

Selection is controlled via `selectedRange` and `onSelect`:

```tsx
const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null);

<ResourceGridView
  selectedRange={selectedRange}
  onSelect={setSelectedRange}
  // ...
/>;
```

### Selection appearance

- `'highlight'` — renders a translucent overlay on the selected time range.
- `{ style: 'event', eventData? }` — renders the selection as a phantom event. Pass `eventData` to customize its title, color, etc.

```tsx
<ResourceGridView
  selectionAppearance={{
    style: 'event',
    eventData: {
      title: 'New appointment',
      color: '#3b82f6',
      selected: true,
    },
  }}
  // ...
/>
```

### Popover positioning with `selectionRef`

Attach `selectionRef` to use [Floating UI](https://floating-ui.com) (or a similar library) to position a popover next to the selection:

```tsx
import {
  useFloating,
  autoUpdate,
  flip,
  shift,
  offset,
} from '@floating-ui/react';

const { refs, floatingStyles } = useFloating({
  open: selectedRange !== null,
  middleware: [flip(), shift(), offset(5)],
  placement: 'right',
  whileElementsMounted: autoUpdate,
});

<ResourceGridView
  selectionRef={refs.setReference}
  selectedRange={selectedRange}
  onSelect={setSelectedRange}
  // ...
/>;

{
  selectedRange && (
    <div ref={refs.setFloating} style={floatingStyles}>
      {/* Popover content */}
    </div>
  );
}
```

### Slot and event clicks

- `onSlotClick` fires when clicking an empty time slot, receiving the `resource`, `startTime`, and `endTime`.
- `onEventClick` fires when clicking an event.
- `snapDuration` (in minutes) controls the snap interval for drag-to-select.
- `placeholderDuration` (in minutes, default `15`) controls the height of the hover placeholder shown before the user starts dragging.

## Exports

```ts
// Components
export { ResourceGridView } from '@savvycal/calendar';
export { WeekView } from '@savvycal/calendar';

// Defaults
export { resourceGridViewDefaults } from '@savvycal/calendar';

// Temporal polyfill
export { Temporal } from '@savvycal/calendar';

// Utility
export { cn } from '@savvycal/calendar';

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
  WeekViewProps,
} from '@savvycal/calendar';
```

## License

MIT
