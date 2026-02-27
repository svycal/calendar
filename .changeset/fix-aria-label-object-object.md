---
"@savvycal/calendar": minor
---

Add optional `ariaLabel` field to `CalendarEvent` for accessible labels when `title` or `clientName` are React elements. Previously, passing a ReactNode for these fields would produce `[object Object]` in `aria-label` attributes and screen reader announcements. When `ariaLabel` is set, it is used as the plain-text label; otherwise, the existing behavior of coercing `title` to a string is preserved.
