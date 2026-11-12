---
'@savvycal/calendar': patch
---

Fix the "+N" overflow popover in `ResourceGridView` and `DayGridView`: it now picks up dark mode from a `.dark` ancestor, Escape closes only the popover (instead of also reaching the grid's and your app's Escape handlers), focus moves into the popover when it opens and back to the chip when it closes with focus inside, its position uses the popover's measured size and follows it when the content resizes, its height is capped to the viewport so a long list scrolls instead of running off-screen, and clicking an empty time slot while it's open only closes it (instead of also starting a selection or firing `onSlotClick`).
