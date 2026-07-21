---
id: TICKET-023
title: Progression editor
label: wayfinder:task
status: open
assignee: null
blocked_by: [TICKET-020]
map: MAP-002
---

Spec: [§1](../guitar-map/progressions-spec.md), [§4.2](../guitar-map/progressions-spec.md).

## What to build

An `Edit progression` button under the rail, plus a `＋` entry at its foot, let the player build a
progression of their own: add, remove and reorder chords, and change any chord's degree
(1–7 with optional ♭/♯), quality (any of the 16 shipped `CHORDS` types) and optional `of` target.

A chord can also be **typed as a symbol** and back-analysed to a numeral: the typed letter picks
the degree, so in C major `C♯` is ♯I and `D♭` is ♭II; the accidental sets `alter` and the suffix
matches a `CHORDS` suffix. Round-trips faithfully.

An unsupported suffix (`C13`, `G7♯9`, `Fm6/9`) raises a **soft, non-blocking warning** naming what
is supported, and stores nothing — which keeps the invariant everything downstream depends on:
every chord in a progression has real notes.

Nothing is invalid. Empty and single-chord progressions are legal; the only cap is 32 chords, so
the rail stays usable. No bass note, no duration.

## Acceptance criteria

- [ ] Add, remove and reorder chords from the rail
- [ ] Edit a chord's degree, alter, quality and `of` target
- [ ] Typing a chord symbol back-analyses to the right numeral and round-trips
- [ ] Unsupported suffix warns softly, blocks nothing and stores nothing
- [ ] Empty and single-chord progressions render without error
- [ ] Adding past 32 chords is prevented
- [ ] Back-analysis has an assertion self-check, including the `C♯` vs `D♭` case

## Blocked by

- TICKET-020 — the progression model and the tab
