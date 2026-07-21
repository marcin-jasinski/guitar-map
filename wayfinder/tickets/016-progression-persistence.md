---
id: TICKET-016
title: Persist progressions in the favorites store
label: wayfinder:grilling
status: closed
assignee: Marcin
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

## Resolution

### A fourth `Content` kind, store stays at `version: 1`

```ts
export type Content =
  | { kind: 'scale'; … }
  | { kind: 'arpeggio'; … }
  | { kind: 'chord'; … }
  | { kind: 'progression'; key: Key; chords: Chord[];
      overrides: Record<number, (number | null)[]>; step: number };
```

One favorites list, one save button, one delete, one soft cap: `addFavorite`, `describeContent`
and `favoriteName` each extend by a single branch.

**The version does not bump.** `load()` returns the default store unless `parsed.version === 1`,
so a bump would silently discard every existing favorite unless a migration were written first —
real work for a marker nothing reads. Adding a union member needs no bump, and the shipped rule
(older favorites keep loading, see the optional `display` field) is preserved.

`window` and `labelMode` become **optional** on `Favorite`, exactly as `display?` already is, and
the progression branch omits them rather than writing values nothing will read — this tab has no
fret window and no label toggle. Existing favorites are unaffected: they all carry both.

Rejected: a separate saved-item type with its own array and list. Conceptually cleaner — a
progression is not a neck view — but it doubles the save/delete/cap/name paths for a distinction
the user does not experience.

### Snapshot — store what was chosen, recompute what was derived

**Saved**: the key, the chords, the **pinned** voicing overrides, the current step.

**Recomputed on load**: the parent scale, the exceptions, and every auto-picked voicing. All
three are pure functions of the chords, so storing them would cache a derivation and freeze the
save against later improvements — if TICKET-012's scoring or TICKET-014's chain is ever refined,
old saves get the better answer for free.

The accepted cost is stated plainly: **a saved progression can report a different parent scale
after an app update.** That is the right trade for advice that is always current, and the chords
— the only thing the user actually authored — never change.

### Name

`favoriteName()` gains a progression branch that **drops the fret range**, which is meaningless
in a tab with no window:

```
C major · I – iv – V7/V – V7 — Standard
```

Key, then the numerals, then the tuning — the same shape as the existing name (what it is, then
the tuning), truncating past four chords with `…`.

### One picker, two labelled groups

A single control in the rail lists **Presets** and **Saved** under two headings. Both answer the
same question — "what am I playing over?" — and splitting them would make the player recall
which kind a progression was before they could find it.

The headings also carry real information, because the two load differently: a preset carries no
root and switches only tonality (TICKET-011), while a saved progression restores its own key.
The group tells you which is about to happen.
