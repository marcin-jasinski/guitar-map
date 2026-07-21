---
id: TICKET-024
title: Smooth voicing chain and override stepper
label: wayfinder:task
status: open
assignee: null
blocked_by: [TICKET-023]
map: MAP-002
---

Spec: [§5](../guitar-map/progressions-spec.md).

## What to build

Each chord in the progression gets a voicing — never drawn as a shape, because the neck already
shows every occurrence of its tones. The voicing exists to be the frame the guide-tone line will
hang on (TICKET-025): it decides *which* occurrence of the 3rd and 7th the line passes through.
It surfaces now as a readout under the neck (`x-3-5-5-4-3`).

Picked for smoothness: the primary cost between consecutive chords is how far the two guide
voices move in frets, tie-broken on whole-hand travel so a voicing can't leap ten frets to save
the line a semitone. The classic 7th-falls-to-3rd resolution emerges from this rather than being
special-cased.

```ts
type Voicing = { frets: (number | null)[]; pinned: boolean };
solveChain(prog, tuning): Voicing[]
```

Candidates are `chordVoicings()` reused as-is — no new generator. One global Viterbi pass over at
most 32 chords × ~15 candidates. An override is a **fixed constraint** (its column holds one
shape) and the whole chain re-solves, so nothing "re-flows" and two overrides are no harder than
one.

The readout doubles as the override UI: `◄ ►` through candidates low-to-high with "Shape 3 of 12",
plus **Clear** back to auto. Stepping sets the pin. Overrides are stored as fret positions and
shift by the same interval when the key changes; one that can't survive the shift — off the neck,
or using open strings that no longer exist — is dropped with a soft note naming which chords
reverted to auto. Editing a chord's degree or quality clears only that chord's override.

When the optimal chain still leaves a change moving the guide voices more than about 5 frets, one
soft line names that change as awkward on this tuning.

## Acceptance criteria

- [ ] Every chord has a voicing, shown as a readout under the neck
- [ ] The chain minimises guide-voice movement, tie-broken on hand travel
- [ ] `◄ ► Shape n of m` steps candidates low-to-high and pins; Clear reverts to auto
- [ ] Overrides re-solve the whole chain as fixed columns; two overrides behave like one
- [ ] Overrides transpose with the key; unsurvivable ones drop with a soft note naming the chords
- [ ] Editing a chord clears only that chord's override
- [ ] Awkward-stretch line appears past ~5 frets of guide-voice movement, and blocks nothing
- [ ] `solveChain` ships an assertion self-check, including ii–V–I resolving 7th to 3rd

## Blocked by

- TICKET-023 — the editor, so "editing clears that chord's override" lands where editing exists
