---
id: TICKET-016
title: Persist progressions in the favorites store
label: wayfinder:grilling
status: open
assignee: null
blocked_by: [TICKET-010, TICKET-011]
map: MAP-002
---

## Question

How does a progression fit the persistence model already in
[`src/lib/store.svelte.ts`](../../src/lib/store.svelte.ts)?

A favorite today is a full view snapshot — embedded tuning, a `Content` union of
`scale | arpeggio | chord`, fret window, label mode, display mode — at `version: 1`.

- Does a progression become a fourth `Content` kind, or is it a separate saved-item type with
  its own list and its own UI?
- What is in the snapshot: the progression, the key, voicing overrides, the current step,
  the inferred scale (or is that recomputed on load)? Recomputing keeps saves small but means
  an old save can silently change if TICKET-012's inference is later improved.
- What the auto-generated name looks like, following `favoriteName()`'s existing shape.
- Does the store version bump, and how do `version: 1` saves load? The shipped rule is that
  older favorites keep loading (see the optional `display` field).
- Do preset progressions and saved ones share one picker or sit apart?
