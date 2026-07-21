---
id: TICKET-021
title: Parent scale inference and per-chord exceptions
label: wayfinder:task
status: open
assignee: null
blocked_by: [TICKET-020]
map: MAP-002
---

Spec: [§3](../guitar-map/progressions-spec.md), [§4.4](../guitar-map/progressions-spec.md).

## What to build

The tab answers "what do I solo with". Above the neck, one parent scale is named — tonic plus
the scale's own name, always modal ("D Dorian", never "C major"). The parent's notes draw on the
neck as small faded dots with note names, underneath the current chord's full-size dots.

Every non-diatonic chord gets a function label in its rail entry — "secondary dominant of V",
"secondary leading-tone chord of vi", "borrowed from C minor", or the bare numeral plus "outside
the key". Diatonic chords get no label. Under the neck, each of the current chord's notes that
falls outside the parent is stated as a swap sentence ("play F♯ instead of F (♯4)"), and that
note's dot is ringed in `--warn`.

Inference: score the 9 shipped 7-note scales rooted on the stored tonic by role-weighted
chord-tone coverage — 3rd and 7th count 2, root and 5th count 1 — walking the chord list as
stored, so repeats count as prominence. Highest wins; ties break by declaration order in
`SCALES`. Pentatonics and blues are not candidates; harmonic major is deliberately not added.

When more than half the chords carry exceptions, one soft non-blocking line says so, in
`tuningWarnings()`'s voice. One plain answer always — no percentages, no runner-up.

## Acceptance criteria

- [ ] Parent scale named once above the neck, modally
- [ ] Parent notes drawn as small faded dots with names, under the chord dots
- [ ] Function label on every non-diatonic rail entry; none on diatonic ones
- [ ] Swap sentences under the neck for the current chord's outside notes, generated from `note()`'s interval naming
- [ ] Exception notes ringed in `--warn` on the neck
- [ ] Strained line appears when over half the chords carry exceptions, and blocks nothing
- [ ] Scorer ships an assertion self-check: `I ♭VII IV` → C Mixolydian, zero exceptions; `i IV` in D minor → D Dorian; `I IV iv I` → C Ionian, one exception (A♭ for A); `I V7/V V7 I` → one exception (F♯ for F), labelled secondary dominant of V; 12-bar blues → Mixolydian

## Blocked by

- TICKET-020 — the progression model and the tab
