---
'@savvycal/calendar': minor
---

Events take an optional `appearance: 'outline'`, which draws them as an outline in their color, with no fill or color bar, as calendar apps show invitations awaiting a reply. It applies in every view, including all-day events and month view. In dark mode the text takes a lighter tint of the color and the outline is softer. The event's color is exposed as the `--cal-event-color` CSS variable, and the new `eventOutline`, `allDayEventOutline`, and `timedEventOutline` class names style the outline.
