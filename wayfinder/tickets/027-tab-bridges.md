---
id: TICKET-027
title: Bridges from the progression tab to Chord and Scale
label: wayfinder:task
status: open
assignee: null
blocked_by: [TICKET-021]
map: MAP-002
---

Spec: [§8](../guitar-map/progressions-spec.md).

## What to build

Two bridges out of the progression tab, placed by scope:

```
rail entry ⋮          ▶ Play this chord    → Chord tab (root, type)
parent scale header   ♪ Solo on C Ionian   → Scale tab (root, inferred scale)
```

"Play this chord" is per-chord, so it sits on the rail entry. "Solo on <parent>" is
progression-level, so it sits beside the parent-scale name. Both bridges set the target tab's
content, then switch to it — and because content is per-tab (TICKET-019), the progression, its key
and its step are still there when the player comes back. The tab bar is the way back; no
breadcrumb.

No Arpeggio bridge: the progression neck already draws the chord's tones across the whole neck, so
it would land the player somewhere showing less. (TICKET-018's title promising one is stale.)

To Scale travels the key's root plus the inferred scale name, which encodes everything the
inference concluded. To Chord travels the derived root and type only — the chord arrives stripped
of its context, accepted because the reason to go there is to hear it.

**The Scale bridge un-maps the modal name.** The button reads "Solo on C Ionian" but
`{kind:'scale'}` stores a `SCALES` key, so it writes `'Major (Ionian)'` — TICKET-021's display map
run backwards. Only two of the nine candidates differ between label and stored value; the other
seven pass through unchanged, which is exactly why this is easy to get wrong once and never
notice.

## Acceptance criteria

- [ ] `▶ Play this chord` on a rail entry opens the Chord tab with that chord's root and type
- [ ] `♪ Solo on <parent>` beside the parent header opens the Scale tab with the tonic and inferred scale
- [ ] The Scale tab receives a real `SCALES` key — "Solo on C Ionian" lands on `'Major (Ionian)'`
- [ ] Returning to the progression tab restores the progression, key and step unchanged
- [ ] No Arpeggio bridge, no breadcrumb
- [ ] Tuning is unaffected by either bridge

## Blocked by

- TICKET-021 — the inferred parent scale the Scale bridge carries
