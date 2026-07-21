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

**Loading a favorite selects the tab that owns its kind**, then writes into that tab's content
(spec §7). With one favorites list across all tabs, a favorite loaded from the wrong tab would
otherwise write somewhere invisible and look like a no-op. This is the only place a favorite
touches the tab bar.

`labelMode`, `win` and `display` stay **app-global** — they are not part of per-tab content. Only
`content` moves.

No progression tab in this ticket — three tabs, nothing new to look at.

## Acceptance criteria

- [ ] The segmented control is replaced by a tab bar, not nested inside one
- [ ] Each tab holds its own content state; switching tabs and back restores it
- [ ] Tuning, and everything else app-global, is unaffected by tab switches
- [ ] The root no longer carries across a plain tab switch
- [ ] Loading a favorite switches to the tab owning its `content.kind` and loads it there
- [ ] Existing tests pass; those asserting the old carry-over are updated, not deleted

## Blocked by

None — can start immediately.
