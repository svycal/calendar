---
'@savvycal/calendar': patch
---

Scroll the unavailable-time hatch with the grid instead of pinning it to the viewport. `background-attachment: fixed` does not paint reliably inside overflow scrollers on iOS Safari and Chrome Android, so the pattern clipped to the first screen and disappeared on scroll. Stripes still line up across disjoint overlay blocks by offsetting `background-position` from each block's grid top.
