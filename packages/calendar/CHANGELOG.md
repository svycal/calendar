# @savvycal/calendar

## 0.17.0

### Minor Changes

- [`99c3c2c`](https://github.com/svycal/calendar/commit/99c3c2c0fe38ffdef8cb432bdd674bf7aecbb292) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Give events a solid 2px focus ring on `:focus-visible` instead of the browser's default outline, in every view, including all-day events, overflow popover events, and custom-rendered events. Its color is the new `--color-cal-focus` theme token, which defaults to `blue-500`.

## 0.16.0

### Minor Changes

- [#39](https://github.com/svycal/calendar/pull/39) [`fc5986c`](https://github.com/svycal/calendar/commit/fc5986c0363112b5facd574e2643a34c1195d4ae) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Swipe sideways on a touch screen to show the previous or next period, like Google Calendar's mobile app, in `ResourceGridView`, `DayGridView`, and `MonthView` with `onSwipe`. The page follows the finger, revealing the neighboring period's empty grid (shaded from `availability` and `unavailability`, which can include the periods on either side), and turns when released past a third of its width or flung. Change the view's date in response; it holds the turned page until you do.

## 0.15.0

### Minor Changes

- [#37](https://github.com/svycal/calendar/pull/37) [`6e3fd07`](https://github.com/svycal/calendar/commit/6e3fd07e7ad8a9abed2a8d0b1d992e7fa1156b02) Thanks [@derrickreimer](https://github.com/derrickreimer)! - `DayGridView` takes `hiddenDates` to leave days out of `activeRange`, such as a week's weekend. The remaining days sit side by side, an all-day event spans the shown days it covers, and one that covers only hidden days isn't drawn.

## 0.14.0

### Minor Changes

- [`44e32e0`](https://github.com/svycal/calendar/commit/44e32e009300c3e0b7d8076a7e07a516fd080e3c) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Drag timed events to a new time, resource, or day in `ResourceGridView` and `DayGridView` with `onEventDrop`, using a mouse or, after a long press, touch. The grid doesn't move the event: show the drop with `pendingDrop` and anchor a confirmation popover to `pendingDropRef`, then update `events` to apply it.

  Drag selection in every view, and multi-day selection in `DayGridView`, also work on touch after a long press, and multi-day selection scrolls sideways near the grid's edges.

### Patch Changes

- [`5116c9e`](https://github.com/svycal/calendar/commit/5116c9eb9b2bbc3a6d2897f6e29439cf8b40cec7) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Keep a selected all-day event in `ResourceGridView` at full width instead of shrinking it to fit its title.

## 0.13.0

### Minor Changes

- [#34](https://github.com/svycal/calendar/pull/34) [`2878501`](https://github.com/svycal/calendar/commit/28785013802828341b154871430f9c287d41b388) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Events drawn by `renderEvent` handle clicks and keys like default event chips. An interactive event's wrapper gets `role="button"`, `tabIndex`, an `aria-label`, and calls `onEventClick` on click, Enter, or Space. A renderer that returned its own button should return plain content instead, to avoid nested buttons.

## 0.12.1

### Patch Changes

- [#32](https://github.com/svycal/calendar/pull/32) [`cc836c0`](https://github.com/svycal/calendar/commit/cc836c0cca900d48b88660138eb2a960252bc300) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Outlined events stay readable with pale and deep colors. Their text and outline keep the event's hue but cap its lightness in light mode and raise it in dark mode, through the new `--color-cal-event-outline` and `--color-cal-event-outline-dark` theme colors. Month view's hollow dot for an outlined event now matches its text.

## 0.12.0

### Minor Changes

- [#30](https://github.com/svycal/calendar/pull/30) [`596c7e2`](https://github.com/svycal/calendar/commit/596c7e2f5b0d73738aa13e306e45d4beaf841c5a) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Events take an optional `appearance: 'outline'`, which draws them as an outline in their color, with no fill or color bar, as calendar apps show invitations awaiting a reply. It applies in every view, including all-day events and month view. In dark mode the text takes a lighter tint of the color and the outline is softer. The event's color is exposed as the `--cal-event-color` CSS variable, and the new `eventOutline`, `allDayEventOutline`, and `timedEventOutline` class names style the outline.

## 0.11.2

### Patch Changes

- [#28](https://github.com/svycal/calendar/pull/28) [`105a626`](https://github.com/svycal/calendar/commit/105a62652588d4a4198a2390256844fb60448aff) Thanks [@derrickreimer](https://github.com/derrickreimer)! - `initialScrollHour` scrolls one pixel further, so the hour's grid line sits under the sticky header's bottom border instead of drawing a double line below it.

## 0.11.1

### Patch Changes

- [#26](https://github.com/svycal/calendar/pull/26) [`86462e2`](https://github.com/svycal/calendar/commit/86462e2c3a48cb276b4360f50a03556c1535c9f7) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Long all-day event titles in `DayGridView` no longer widen the day columns.

## 0.11.0

### Minor Changes

- [#25](https://github.com/svycal/calendar/pull/25) [`f23b145`](https://github.com/svycal/calendar/commit/f23b1457f701eb8d4b79e450fa4e485f13a0e847) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Add DayGridView features for replacing FullCalendar: multi-day drag selection (`multiDaySelection`, `DayGridSelectedRange.endDate` and `allDay`), background events (`backgroundEvents`, `renderBackgroundEvent`), `onSlotHover`, `formatGutterLabel` (also on ResourceGridView), `scrollKey`, and display-only events (`interactive: false`). Selections are now clipped to the time axis.

- [#21](https://github.com/svycal/calendar/pull/21) [`03d9413`](https://github.com/svycal/calendar/commit/03d94132b9dc90e61a3c59c7acdd3dbfb8296de9) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Add `MonthView`, a Google Calendar–style month grid. All-day and multi-day events render as bars that wrap across week rows, single-day timed events render as dot items, and days that run out of room collapse extras into a "+N more" popover. Supports click or drag to select day ranges (shown as a Google-style placeholder bar by default), a configurable week start, and fixed six-week layouts.

### Patch Changes

- [#21](https://github.com/svycal/calendar/pull/21) [`03d9413`](https://github.com/svycal/calendar/commit/03d94132b9dc90e61a3c59c7acdd3dbfb8296de9) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Fix the "+N" overflow popover in `ResourceGridView` and `DayGridView`: it now picks up dark mode from a `.dark` ancestor, Escape closes only the popover (instead of also reaching the grid's and your app's Escape handlers), focus moves into the popover when it opens and back to the chip when it closes with focus inside, its position uses the popover's measured size and follows it when the content resizes, its height is capped to the viewport so a long list scrolls instead of running off-screen, and clicking an empty time slot while it's open only closes it (instead of also starting a selection or firing `onSlotClick`).

## 0.10.3

### Patch Changes

- [#18](https://github.com/svycal/calendar/pull/18) [`6d1ecd2`](https://github.com/svycal/calendar/commit/6d1ecd29f8e91af3e3fa28ddbc96851dc5479e75) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Update dependencies to pick up security fixes.

## 0.10.2

### Patch Changes

- [#15](https://github.com/svycal/calendar/pull/15) [`a6687f2`](https://github.com/svycal/calendar/commit/a6687f2841a4ccb47027847133336067e360cc82) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Paint unavailable-time stripes with a tiled SVG instead of an angled repeating-linear-gradient, and isolate the overlay on one compositor layer, so Safari no longer stacks semi-transparent hatch bands on tall (especially full-day) ranges.

## 0.10.1

### Patch Changes

- [#13](https://github.com/svycal/calendar/pull/13) [`ed5ea8e`](https://github.com/svycal/calendar/commit/ed5ea8e9f95e124f3db63090478625293f421c07) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Auto-scroll the grid when dragging a time-range selection near the top or bottom edge, so the growing range stays in view instead of clamping to the visible hours.

## 0.10.0

### Minor Changes

- [#11](https://github.com/svycal/calendar/pull/11) [`bb74e4b`](https://github.com/svycal/calendar/commit/bb74e4b7fa4ded92ac8cb678d639acaef20ead6b) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Improve overlapping event layout: columns expand into unused space, dense stacks collapse into a "+N more" popover, and an optional event `priority` keeps higher-priority events visible when the stack is capped.

## 0.9.1

### Patch Changes

- [#9](https://github.com/svycal/calendar/pull/9) [`1e1cf44`](https://github.com/svycal/calendar/commit/1e1cf441659ddfabc7f1bac8a7b6eca0c7df927c) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Scroll the unavailable-time hatch with the grid instead of pinning it to the viewport. `background-attachment: fixed` does not paint reliably inside overflow scrollers on iOS Safari and Chrome Android, so the pattern clipped to the first screen and disappeared on scroll. Stripes still line up across disjoint overlay blocks by offsetting `background-position` from each block's grid top.

## 0.9.0

### Minor Changes

- [#6](https://github.com/svycal/calendar/pull/6) [`22c504f`](https://github.com/svycal/calendar/commit/22c504fbd8ef6cfadb68a3d933b1ee48cd4c9b06) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Add `initialScrollHour` prop to `DayGridView` and `ResourceGridView`. When set, the grid mounts scrolled so that hour sits at the top of the visible timed area (and re-applies on date/range navigation), without changing which hours are rendered. Fractional hours are supported and the value is clamped to the `timeAxis` range. It does not fight the user's manual scrolling or re-scroll on unrelated re-renders, and it defers the scroll until the grid is actually laid out so it works when the calendar first mounts inside a hidden container (an inactive tab, a collapsed panel, a `display: none` modal).

## 0.8.1

### Patch Changes

- [#3](https://github.com/svycal/calendar/pull/3) [`4411d4f`](https://github.com/svycal/calendar/commit/4411d4fb39a428b29bbe33542f1ecca6ca965f24) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Bump transitive dependencies to clear Dependabot security alerts (postcss, vite, rollup, flatted, ajv, minimatch, picomatch). No runtime API changes.

## 0.8.0

### Minor Changes

- [`08fe8b3`](https://github.com/svycal/calendar/commit/08fe8b39947b3023c920ec6445897d5a3cea4a16) Thanks [@derrickreimer](https://github.com/derrickreimer)! - Add optional `ariaLabel` field to `CalendarEvent` for accessible labels when `title` or `clientName` are React elements. Previously, passing a ReactNode for these fields would produce `[object Object]` in `aria-label` attributes and screen reader announcements. When `ariaLabel` is set, it is used as the plain-text label; otherwise, the existing behavior of coercing `title` to a string is preserved.

## 0.7.0

### Minor Changes

- Allow `renderEvent` to return `null` (or `undefined`) to fall back to default rendering
- Fix header height inconsistency when today is out of range

## 0.6.0

### Minor Changes

- Add defaultUnavailable prop to DayGridView and ResourceGridView

## 0.5.0

### Minor Changes

- Add DayGridView

## 0.4.0

### Minor Changes

- Remove app-specific helper functions

### Bug Fixes

- Only enable drag selection when onSelect handler is provided
- Fix tentative preview event not rendering at bottom of grid
- Fix selected events stacking above the time gutter

## 0.3.0

### Minor Changes

- Fix stale selection linger using ref-based timer

## 0.2.0

### Minor Changes

- Add utilities, remove metadata, improve DX

## 0.1.0

### Minor Changes

- Initial release
