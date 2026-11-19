---
'@savvycal/calendar': minor
---

Events drawn by `renderEvent` handle clicks and keys like default event chips. An interactive event's wrapper gets `role="button"`, `tabIndex`, an `aria-label`, and calls `onEventClick` on click, Enter, or Space. A renderer that returned its own button should return plain content instead, to avoid nested buttons.
