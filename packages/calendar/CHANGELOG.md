# @savvycal/calendar

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
