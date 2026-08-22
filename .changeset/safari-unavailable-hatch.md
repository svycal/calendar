---
'@savvycal/calendar': patch
---

Paint unavailable-time stripes with a tiled SVG instead of an angled repeating-linear-gradient, and isolate the overlay on one compositor layer, so Safari no longer stacks semi-transparent hatch bands on tall (especially full-day) ranges.
