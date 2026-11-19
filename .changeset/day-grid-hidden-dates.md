---
'@savvycal/calendar': minor
---

`DayGridView` takes `hiddenDates` to leave days out of `activeRange`, such as a week's weekend. The remaining days sit side by side, an all-day event spans the shown days it covers, and one that covers only hidden days isn't drawn.
