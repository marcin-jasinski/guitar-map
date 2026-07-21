---
id: TICKET-026
title: Persist progressions in the favorites store
label: wayfinder:task
status: open
assignee: null
blocked_by: [TICKET-022, TICKET-024]
map: MAP-002
---

Spec: [§7](../guitar-map/progressions-spec.md), [§10.5](../guitar-map/progressions-spec.md).

## What to build

A progression saves to the existing favorites list — one list, one save button, one delete, one
soft cap. Reload the app and it comes back with its key, chords, pinned overrides and current
step. The rail's picker gains a second labelled group, so it shows **Presets** and **Saved**; the
headings carry real information, because the two load differently.

A progression becomes a fourth `Content` kind:

```ts
| { kind: 'progression'; key: Key; chords: Chord[]; step: number }
```

**No `overrides` field.** The pin lives on the `Chord` (TICKET-020's `pin?`), so persisting the
chords persists the pins and the two cannot drift apart across an edit.

**The store version must not bump.** `load()` returns the default store unless
`parsed.version === 1`, so a bump would silently discard every existing favorite. Adding a union
member needs none. `window` and `labelMode` become optional on `Favorite`, exactly as `display?`
already is — the progression branch omits them rather than writing values nothing reads.

**Two read sites need guarding, not one.** `favoriteName()` reads `f.window.startFret`
(`store.svelte.ts:78`) and the load path reads `f.window` and `f.labelMode`
(`App.svelte:150-151`); both are unconditional today, and the second is the easy one to miss
because it lives outside the store. Copy the `??` fallback `display?` already uses at
`App.svelte:152`.

Parent scale, exceptions and every auto-picked voicing are **recomputed on load**, not stored.
Accepted cost: a saved progression can report a different parent scale after an app update. The
chords, the only thing the user authored, never change.

`favoriteName()` gains a branch that drops the fret range, meaningless here:
`C major · I – iv – V7/V – V7 — Standard`, truncating past four chords with `…`.

## Acceptance criteria

- [ ] Save, load and delete a progression through the existing favorites UI
- [ ] Key, chords (pins included) and step round-trip; parent, exceptions and auto voicings recompute
- [ ] Store stays at `version: 1`; existing favorites saved before this change still load
- [ ] `window` and `labelMode` are optional on `Favorite`; the progression branch omits both
- [ ] Both read sites guard for their absence — `favoriteName()` **and** the `App.svelte` load path
- [ ] Loading a progression favorite from another tab switches to the progression tab (TICKET-019)
- [ ] `favoriteName()` names a progression without a fret range, truncating past four chords
- [ ] One picker shows Presets and Saved as two labelled groups

## Blocked by

- TICKET-022 — the picker the Saved group joins
- TICKET-024 — the pinned overrides that get saved
