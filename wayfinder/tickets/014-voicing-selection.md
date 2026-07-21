---
id: TICKET-014
title: Smooth voicing selection and manual override
label: wayfinder:grilling
status: closed
assignee: Marcin
blocked_by: [TICKET-010, TICKET-013]
map: MAP-002
---

## Question

How does the app pick each chord's voicing, and how does the player overrule it?

Charting settled: auto-picked for smoothness, manually overridable, the rest re-flows.

- What "smooth" is measured as — total pitch movement, fret-hand travel, common tones
  retained, playability. These disagree; one has to win.
- What the candidate voicings are. The app already computes playable voicings for the chord
  view (commit `a7ec51c`) — is that generator reusable as-is, or does connecting chords need
  candidates it does not produce?
- Since the job here is soloing, not comping: is the voicing the thing you *play*, or just the
  frame the arpeggio hangs on? That decides how prominent this is on screen.
- The override: how a voicing is swapped, whether the choice sticks when you change key or
  edit the progression, and how "re-flows" behaves — do overridden chords pin, and does
  re-flow run forward only or both directions?
- Does the app ever say a progression's smoothest path is still awkward on this tuning?

## Resolution

```ts
type Voicing = { frets: (number | null)[]; pinned: boolean };
solveChain(prog, tuning): Voicing[]    // one DP pass over chordVoicings() candidates
```

### The voicing is never drawn

TICKET-013 settled that this tab's neck shows **every occurrence** of the chord's tones, not a
shape — so a voicing has no shape to be. Its job is to be the **frame the guide-tone line hangs
on**: it decides *which* occurrence of the 3rd and the 7th the line passes through.

That is precisely the gap the layout prototype exposed. It faked the line by picking guide tones
at the nearest hand position, because no voicing existed to anchor them. This ticket fills it.

Drawing the shape on the neck was rejected: it would be a fifth layer on a neck already carrying
the parent scale, chord tones, exception rings, next-chord ghosts and the line itself — and the
job here is soloing, not comping.

The voicing surfaces only as a **readout** under the neck (`x-3-5-5-4-3`) and, indirectly, as
the path the line takes.

### Smooth = guide-voice movement, then hand travel

Primary cost between consecutive chords: **how far the two guide voices (3rd and 7th) move in
frets** — which is literally the length of the drawn line. Tie-break on **whole-hand travel**, so
a voicing cannot leap ten frets to save the line a semitone.

Scoring exactly what the player sees makes the smoothness claim verifiable by looking at the
neck. It also means the classic **7th-falls-to-3rd** resolution emerges from minimising the cost
rather than being special-cased.

Rejected: total pitch movement across all voices (orthodox voice leading, but it optimises notes
this tab never draws, and needs a voice mapping between chords of different sizes); hand travel
alone (a stationary hand can still produce a wildly leaping line).

### Candidates — `chordVoicings()` reused as-is

[`view.ts`](../../src/lib/view.ts)'s `chordVoicings(tuning, dots, rootPc)` already returns
deduped `Board`s — roughly one best shape per fret window across the neck, each scored for
root-in-bass, completeness, finger count and span, capped by `MAX_SPAN`/`MAX_FINGERS`. That is
~12–15 shapes per chord, spread up the neck: plenty to choose between. **No new generator.**

### The chain — one global pass, so nothing "re-flows"

A Viterbi-style DP over the whole progression: at most 32 chords × ~15 candidates is a few
hundred comparisons, instant at any size this tab allows.

An overridden chord becomes a **fixed constraint** — its candidate column holds exactly one
shape — and the pass re-runs. This **dissolves the re-flow question**: there is no "forward only
or both directions", because the chain is always solved whole and neighbours on both sides adapt
together. Two overrides are no harder than one. Overridden chords stay pinned until cleared.

### Override — a stepper, and it transposes

Swapping reuses the shipped chord tab's pattern: the readout becomes a **stepper**, `◄ ►`
through the candidates low-to-high with "Shape 3 of 12", plus a **Clear** button back to auto.
Stepping sets the pin.

An override is stored as **the chosen shape's fret positions**. Changing the key **shifts every
override by the same interval** — transposing is a one-field operation the player will do
constantly to find a comfortable key, and silently discarding hand-picked voicings each time
would make overriding not worth doing. An override that cannot survive the shift — pushed off
the end of the neck, or a shape using open strings that no longer exist once moved — is
**dropped with a soft note** naming which chords reverted to auto. Editing a chord's degree or
quality clears **only that chord's** override, since the shape no longer fits the notes.

### Awkward on this tuning

Yes, it says so. When the optimal chain still leaves a change moving the guide voices more than
about **5 frets**, one soft, non-blocking line names that change ("iv → V7/V moves a long way in
this tuning"). Same voice as TICKET-012's strained-parent line and `tuningWarnings()`.
