---
'@savvycal/calendar': minor
---

Add `initialScrollHour` prop to `DayGridView` and `ResourceGridView`. When set, the grid mounts scrolled so that hour sits at the top of the visible timed area (and re-applies on date/range navigation), without changing which hours are rendered. Fractional hours are supported and the value is clamped to the `timeAxis` range. It does not fight the user's manual scrolling or re-scroll on unrelated re-renders, and it defers the scroll until the grid is actually laid out so it works when the calendar first mounts inside a hidden container (an inactive tab, a collapsed panel, a `display: none` modal).
