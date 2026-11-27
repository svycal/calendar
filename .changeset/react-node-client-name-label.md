---
'@savvycal/calendar': patch
---

Accessible labels leave out a `clientName` that's a React element instead of reading it as "[object Object]". Include the client's name in `ariaLabel` when `clientName` is a React element.
