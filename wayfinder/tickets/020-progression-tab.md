---
id: TICKET-020
title: Progression tab — model, rail and chord stepping
label: wayfinder:task
status: open
assignee: null
blocked_by: [TICKET-019]
map: MAP-002
---

The tracer bullet: the fourth tab, end to end, on a hardcoded progression.
Spec: [§1](../guitar-map/progressions-spec.md), [§4.2–4.4](../guitar-map/progressions-spec.md).
Prototype: [`prototypes/013-progression-tab.html`](prototypes/013-progression-tab.html)
(variant D is the spec).

## What to build

A fourth tab showing one hardcoded progression (`I V7/V V7 I` is the useful one — it exercises
`of`). The progression reads top to bottom in a left rail as numeral + chord symbol, the current
entry accented. Click an entry or press ↑/↓ to step; stepping wraps, and never moves the neck.
The whole neck draws the current chord's tones as full-size role-coloured dots — every
occurrence, all frets, no position window and no octave view in this tab.

A key control (root + major|minor) sits under the rail. Changing the root transposes the whole
progression, because the numeral is what's stored and the symbol is always derived.

The model, from the spec:

```ts
type Key   = { root: string; tonality: 'major' | 'minor' };
type Deg   = { degree: 1|2|3|4|5|6|7; alter?: -1 | 1 };
type Chord = Deg & { quality: keyof typeof CHORDS; of?: Deg };
type Progression = { key: Key; chords: Chord[] };   // ordered, cap 32
```

Nothing new in `theory.ts` — symbols derive from `spell()` by letter-step and semitones, nested
through `of`. Minor keys use natural-minor (Aeolian) degrees, so VII and VI carry no flat sign.

## Acceptance criteria

- [ ] A fourth tab exists and holds its own content state
- [ ] Rail lists the progression top to bottom with numeral and derived symbol
- [ ] Click and ↑/↓ both step; stepping wraps past the last chord to the first
- [ ] Stepping changes only the current chord — the neck does not move
- [ ] Neck shows every occurrence of the current chord's tones, role-coloured
- [ ] Changing the key root re-spells every symbol correctly, including `of` chords (V7/V in C is D7)
- [ ] Switching tonality re-reads the numerals against natural minor
- [ ] Symbol derivation has an assertion self-check covering a secondary dominant and a ♭-altered degree

## Blocked by

- TICKET-019 — the tab bar and per-tab content state
