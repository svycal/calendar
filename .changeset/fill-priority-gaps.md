---
'@savvycal/calendar': minor
---

Timed events no longer cover other events when a stack passes `eventMaxStack` or `eventMinWidth`. An event that doesn't fit goes in a "+N" chip even when it's alone, instead of being drawn as a full-width overlay on top of the visible events, and `PositionedEvent` no longer has an `overlay` field. Lower-priority events also fill gaps between higher-priority events in the same column instead of starting a new column, so fewer events overflow.
