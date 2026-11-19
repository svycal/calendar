---
'@savvycal/calendar': minor
---

Drag timed events to a new time, resource, or day in `ResourceGridView` and `DayGridView` with `onEventDrop`, using a mouse or, after a long press, touch. The grid doesn't move the event: show the drop with `pendingDrop` and anchor a confirmation popover to `pendingDropRef`, then update `events` to apply it.

Drag selection in every view, and multi-day selection in `DayGridView`, also work on touch after a long press, and multi-day selection scrolls sideways near the grid's edges.
