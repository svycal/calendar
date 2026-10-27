---
'@savvycal/calendar': patch
---

Fix the "+N" overflow popover in `ResourceGridView` and `DayGridView`: it now picks up dark mode from a `.dark` ancestor, Escape closes only the popover (instead of also reaching the grid's and your app's Escape handlers), focus moves into the popover when it opens and back to the chip on Escape, and its position uses the popover's measured size.
