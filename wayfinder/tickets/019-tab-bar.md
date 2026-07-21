---
id: TICKET-019
title: Tab bar with per-tab content state
label: wayfinder:task
status: open
assignee: null
blocked_by: []
map: MAP-002
---

Prefactor for the progression tab — make the change easy, then make the easy change.
Spec: [§4.1](../guitar-map/progressions-spec.md), [§8](../guitar-map/progressions-spec.md),
[§10.4](../guitar-map/progressions-spec.md).

## What to build

The app's `scale | chord | arpeggio` segmented control becomes a **tab bar**: the same three
views, but each tab remembers its own content. Set up a scale, switch to Chord, come back —
the scale is exactly as you left it. Tuning stays app-global; only content is per-tab.

This deliberately changes shipped behaviour: `setKind()` currently carries the root across when
switching kind, and it no longer does. That carry-over is served by the bridges (TICKET-027)
once the progression tab exists.

No progression tab in this ticket — three tabs, nothing new to look at.

## Acceptance criteria

- [ ] The segmented control is replaced by a tab bar, not nested inside one
- [ ] Each tab holds its own content state; switching tabs and back restores it
- [ ] Tuning, and everything else app-global, is unaffected by tab switches
- [ ] The root no longer carries across a plain tab switch
- [ ] Existing tests pass; those asserting the old carry-over are updated, not deleted

## Blocked by

None — can start immediately.
