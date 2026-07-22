---
id: TICKET-024
title: Smooth voicing chain and override stepper
label: wayfinder:task
status: closed
assignee: Marcin
blocked_by: [TICKET-020]
map: MAP-002
---

Spec: [§5](../guitar-map/progressions-spec.md).

## What to build

Each chord in the progression gets a voicing — never drawn as a shape, because the neck already
shows every occurrence of its tones. The voicing exists to be the frame the guide-tone line will
hang on (TICKET-025): it decides *which* occurrence of the 3rd and 7th the line passes through.
It surfaces now as a readout under the neck (`x-3-5-5-4-3`).

**The two guide voices, defined for all 16 qualities:** the 3rd and the 7th, and where either role
is absent take the next by priority **3rd → 7th → 5th → root → other**, never the same note twice.
Triads fall to the 5th; the three shells have no 5th but do have a 3rd and a 7th, so they are
unaffected; **`sus2`/`sus4` have no 3rd** and land on 5th + root; `dim7`'s ♭♭7 is a 7th by
letter-step. This rule is shared with TICKET-025's two lines — one definition, so the cost
function and the drawing cannot disagree about what they are measuring.

Picked for smoothness: the primary cost between consecutive chords is how far the two guide
voices move in frets, tie-broken on whole-hand travel so a voicing can't leap ten frets to save
the line a semitone. The classic 7th-falls-to-3rd resolution emerges from this rather than being
special-cased.

```ts
type Voicing = { frets: (number | null)[]; pinned: boolean };
solveChain(prog: Progression, tuning: Tuning): Voicing[]
```

The pins are already inside `prog` — `Chord.pin?` (TICKET-020) — so `Voicing.pinned` is an echo of
`chords[i].pin !== undefined` and the signature needs nothing else.

Candidates are `chordVoicings()`, no new generator, but **"as-is" is true of the generator and not
of its interface** — two adapters, both belonging to this tab rather than to `view.ts`:

- **In:** its signature is `(tuning, dots, rootPc)` (`view.ts:411`). Hand it a synthesised
  `{ kind: 'chord', slots: [{ root, type }] }` through `noteMap()`. A progression chord is not a
  `Content` and does not become one.
- **Out:** it returns `Board`s (`cells: Set<"string:fret">`), not fret arrays. One pass over
  `cells` gives `Voicing.frets`, `null` for an unfretted string.

**Filter out candidates whose `Board.omits` drops a guide voice** (`view.ts:126-128`) — a shape
missing its 3rd or 7th gives TICKET-025's line no anchor. If that empties a chord's list, fall
back to the unfiltered list for that chord and let the line that can be drawn be drawn.

One global Viterbi pass over at most 32 chords × ~15 candidates. An override is a **fixed
constraint** (its column holds one shape) and the whole chain re-solves, so nothing "re-flows" and
two overrides are no harder than one. **The pass is linear and the drawing wraps**: the last→first
guide-tone line is drawn but never scored, deliberately — a cyclic chain costs the whole algorithm
again for one transition.

The readout doubles as the override UI: `◄ ►` through candidates low-to-high with "Shape 3 of 12",
plus **Clear** back to auto. Stepping sets `pin`. Pins are fret positions and shift by the
**nearest signed** interval when the key changes — `wrap()` (`theory.ts:17`) already computes it,
so C→B is −1 fret, not +11 — retrying **one octave the other way (±12)** before giving up. One
that still can't survive — off the neck both ways, or using open strings that no longer exist — is
dropped with a soft note naming which chords reverted to auto. Editing a chord's degree or quality
clears only that chord's `pin` (TICKET-023 owns the edit paths; a pin travels with its chord, so
reorder and remove need nothing).

When the optimal chain still leaves a change moving the guide voices more than about 5 frets, one
soft line names that change as awkward on this tuning.

## Acceptance criteria

- [ ] Every chord has a voicing, shown as a readout under the neck
- [ ] Guide voices resolve for all 16 qualities, `sus2`/`sus4` included, by the priority rule
- [ ] Candidates omitting a guide voice are filtered out, with the documented fallback when none survive
- [ ] The chain minimises guide-voice movement, tie-broken on hand travel
- [ ] `◄ ► Shape n of m` steps candidates low-to-high and pins; Clear reverts to auto
- [ ] Overrides re-solve the whole chain as fixed columns; two overrides behave like one
- [ ] Overrides transpose by the nearest signed interval, retry ±12, and unsurvivable ones drop with a soft note naming the chords
- [ ] Editing a chord clears only that chord's `pin`
- [ ] Awkward-stretch line appears past ~5 frets of guide-voice movement, and blocks nothing
- [ ] `solveChain` ships an assertion self-check, including ii–V–I resolving 7th to 3rd

## Blocked by

- TICKET-020 — the model (`Chord.pin`) and the tab

Not blocked by TICKET-023: the pin lives on the chord, so the editor's add / remove / reorder need
no cooperation from the chain. The two can land in either order.

## Resolution

`solveChain(prog, tuning)` in [`progression.ts`](../../src/lib/progression.ts) runs one global
Viterbi pass: `guideVoices()` picks the two guide pcs by the 3rd→7th→5th→root→other priority (all 16
qualities, sus2/sus4 → 5th+root); `chordCandidates()` flattens `chordVoicings()`'s Boards to fret
arrays and filters out any that don't sound both guide voices (fallback: keep all). The transition
cost is guide-voice fret movement × 100 + hand travel, so movement dominates and ties break on
travel; a `Chord.pin` is a fixed single-candidate column so the whole chain re-solves. `Voicing.pinned`
echoes `chord.pin`. The pass is linear — the last→first wrap is drawn but never scored.
`voicingReadout()`, `keyShift()` (nearest signed), `shiftPins()` (retry ±12, drop unsurvivable and
report indices) and `awkwardTransitions()` (>5-fret moves) round out the surface.
[`Progression.svelte`](../../src/lib/Progression.svelte) shows the `x-3-5-5-4-3` readout with a
◄ Shape n of m ► stepper that pins, a Clear that reverts to auto, transposes pins on a root change
with a soft note, and warns on awkward stretches. Self-checks: guide voices for all qualities,
ii–V–I solving with tiny movement and every voice anchored, a pin honoured as a fixed column, and pin
transposition (±12 rescue + wide-span drop). 101 tests green, typecheck clean.
