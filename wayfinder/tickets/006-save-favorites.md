---
id: TICKET-006
title: Design save/favorites persistence
label: wayfinder:grilling
status: closed
assignee: marcin
blocked_by: []
---

## Question

Save/favorite presets are in scope (map Decisions). What gets saved (a tuning + a
scale/chord selection + position/whole-neck state)? Is localStorage sufficient (no
accounts), and what's the schema/limit (how many favorites, how are they named/listed)?

## Resolution

**Unit of a favorite: full view snapshot; custom tunings auto-collected.**
A favorite captures the whole restorable screen state. Additionally, any custom tuning the
user builds (TICKET-004) is auto-added to a persisted tunings list so it reappears in the
tuning picker even without saving a full favorite — closing the loop TICKET-004 left open.

**Storage: localStorage, no accounts, soft cap ~50 favorites.** JSON under a versioned key;
localStorage's ~5MB is far more than this needs. A soft cap of ~50 favorites with a warning
if exceeded (deletion never blocked). No sync/backend — consistent with TICKET-001.

**Naming/management: auto-name, user-editable; a list panel with load/rename/delete.**
Save auto-generates a name (e.g. "C blues — Drop D — whole neck") the user can edit inline;
a favorites panel lists them, click to load, rename or delete per row. No reordering.

**Schema (indicative):**

```ts
type Pitch = { note: string; octave: number };        // note = "C".."B" incl. sharps/flats
type Tuning = { name?: string; strings: Pitch[] };     // ordered low→high, 4–8 strings

type Favorite = {
  id: string;
  name: string;                                        // auto, editable
  tuning: Tuning;                                       // embedded (self-contained snapshot)
  root: string;                                         // e.g. "C", "F#"
  contentType: "scale" | "chord" | "arpeggio";
  selection: string;                                    // e.g. "blues", "maj7", "min7"
  view: "position" | "wholeNeck";
  window: { startFret: number; width: number };         // width 4–6 (TICKET-003)
  labelMode: string;                                    // set by TICKET-007 prototype
};

type Store = {
  version: 1;
  favorites: Favorite[];                                // soft cap ~50
  customTunings: Tuning[];                              // auto-collected, feeds the picker
};
```

`labelMode`'s exact values are fixed by the fretboard prototype (TICKET-007); the field
exists here as part of the snapshot.

## Spec-review refinement (2026-07-19)

This schema predated TICKET-008 (diatonic triads) and TICKET-009 (overlay) and couldn't hold
their state; the `view` field also contradicted TICKET-007's "no separate position mode".
Revised schema (the version in `guitar-map/spec.md` §8 is authoritative):

- **Dropped `view`** — TICKET-007 killed the separate position mode, so whole-neck render +
  `window` is the entire position state.
- **`root` + `selection` → a `content` discriminated union** on `kind`, so illegal states are
  unrepresentable:
  - `scale` carries `scale` + `degree: number | null` — the selected diatonic-triad degree
    (TICKET-008), so a highlighted triad restores.
  - `chord` carries `slots: ChordSlot[]` (length 1–3) — overlay when ≥2 (TICKET-009).
  - `arpeggio` carries one `chord`.
- **`labelMode`** pinned to `"names" | "degrees" | "intervals"`; forced `"names"` while ≥2
  chord slots are active (TICKET-009).
- **`version` stays 1** — nothing is shipped yet, so no migration is owed.
