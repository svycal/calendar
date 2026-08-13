# @savvycal/calendar

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
