---
'@savvycal/calendar': patch
---

Lower-priority timed events fill gaps between higher-priority events in the same column instead of starting a new column. A long, low-priority event, such as an availability window behind a day of bookings, no longer lands past `eventMaxStack` and gets drawn as a full-width overlay on top of the bookings.
