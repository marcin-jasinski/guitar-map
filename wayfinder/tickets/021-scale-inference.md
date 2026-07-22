---
id: TICKET-021
title: Parent scale inference and per-chord exceptions
label: wayfinder:task
status: closed
assignee: Marcin
blocked_by: [TICKET-020]
map: MAP-002
---

Spec: [§3](../guitar-map/progressions-spec.md), [§4.4](../guitar-map/progressions-spec.md).

## What to build

The tab answers "what do I solo with". Above the neck, one parent scale is named — tonic plus the
scale's **modal** name, always ("D Dorian", never "C major"). The parent's notes draw on the neck
as small faded dots with note names (`Dot.faded`, already shipped), underneath the current chord's
full-size dots.

Two `SCALES` keys are not modal names and need a **two-entry display map, plus its inverse** for
TICKET-027's Scale bridge: `'Major (Ionian)'` → "Ionian", `'Natural minor (Aeolian)'` → "Aeolian".
The other seven are already bare. **Do not rename the keys** — they are persisted verbatim inside
every saved `{kind:'scale'}` favorite.

`note()` is module-private today (`theory.ts:56`) and must be **exported**: the scorer needs its
`role`, the swap sentences need its `interval`.

Every non-diatonic chord gets a function label in its rail entry — "secondary dominant of V",
"secondary leading-tone chord of vi", "borrowed from C minor", or the bare numeral plus "outside
the key". Diatonic chords get no label. Under the neck, each of the current chord's notes that
falls outside the parent is stated as a swap sentence ("play F♯ instead of F (♯4)"), and that
note's dot is ringed in `--warn`.

Inference: score the 9 shipped 7-note scales rooted on the stored tonic by role-weighted
chord-tone coverage — 3rd and 7th count 2, root and 5th count 1 — walking the chord list as
stored, so repeats count as prominence. Highest wins; ties break by declaration order in
`SCALES`. Pentatonics and blues are not candidates; harmonic major is deliberately not added.

**The tie-break decides two of the five assertions below**, and neither is close-run — they are
exact ties: `I IV iv I` ties Ionian with Mixolydian at 14, and `I V7/V V7 I` ties Ionian with
Lydian at 18. Both land on Ionian only because it is declared first in `SCALES`. Note that beside
the assertions, or reordering that record silently flips them.

An **empty** progression runs no inference at all and names no parent (§4.6) — with no chords every
candidate scores 0 and the tie-break would report "C Ionian" with total confidence.

When more than half the chords carry exceptions, one soft non-blocking line says so, in
`tuningWarnings()`'s voice. One plain answer always — no percentages, no runner-up.

## Acceptance criteria

- [ ] Parent scale named once above the neck, modally — "C Ionian", never "C Major (Ionian)"
- [ ] Display map has an inverse back to the `SCALES` key; the keys themselves are unrenamed
- [ ] `note()` is exported and both the scorer and the swap sentences use it
- [ ] Parent notes drawn as small faded dots with names, under the chord dots
- [ ] No parent named and no inference run on an empty progression
- [ ] Function label on every non-diatonic rail entry; none on diatonic ones
- [ ] Swap sentences under the neck for the current chord's outside notes, generated from `note()`'s interval naming
- [ ] Exception notes ringed in `--warn` on the neck
- [ ] Strained line appears when over half the chords carry exceptions, and blocks nothing
- [ ] Exception notes carry `Dot.warnRing` (field added in TICKET-020)
- [ ] Scorer ships an assertion self-check: `I ♭VII IV` → C Mixolydian, zero exceptions; `i IV` in D minor → D Dorian; `I IV iv I` → C Ionian, one exception (A♭ for A); `I V7/V V7 I` → one exception (F♯ for F), labelled secondary dominant of V; 12-bar blues → Mixolydian
- [ ] The two tie-decided assertions say so in a comment naming `SCALES` declaration order

## Blocked by

- TICKET-020 — the progression model and the tab

## Resolution

`note()` is now exported from [`theory.ts`](../../src/lib/theory.ts). `inferParent()` in
[`progression.ts`](../../src/lib/progression.ts) scores the nine 7-note `SCALES` rooted on the
stored tonic by role-weighted coverage (3rd/7th → 2, else 1), walking chords as stored, `>`-tie-break
so the first-declared scale wins; the self-checks confirm the two exact ties (Ionian vs Mixolydian
at 14, Ionian vs Lydian at 18) resolve on declaration order, with a comment saying reordering
`SCALES` flips them. Names use a two-entry `MODAL_NAME` map (Ionian/Aeolian) plus its inverse
`scaleKeyOf()` for TICKET-027; the keys are unrenamed. Exceptions are computed as each chord tone
outside the parent paired with the parent note sharing its letter, tagged with the tonic-relative
interval via `note()`. `functionLabel()` names every non-diatonic chord (secondary
dominant/leading-tone, borrowed-from-parallel, or bare-numeral-outside-the-key). `strained` fires
when over half the chords carry exceptions. `progressionDots()` now layers faded parent name dots
under the role-coloured chord dots and flags the current chord's outside notes with the new
`Dot.warnRing`, which `Fretboard.svelte` renders as a `--warn` ring. Empty progressions run no
inference. [`Progression.svelte`](../../src/lib/Progression.svelte) names the parent above the neck,
shows function labels in the rail and swap sentences + the strained line under the neck. 92 tests
green (7 new inference assertions), typecheck clean.
