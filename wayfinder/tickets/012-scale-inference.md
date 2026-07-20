---
id: TICKET-012
title: Parent scale inference and per-chord exceptions
label: wayfinder:grilling
status: closed
assignee: Marcin
blocked_by: [TICKET-010]
map: MAP-002
---

## Question

Given a progression, how does the app decide what to tell the player to solo with?

Charting settled the shape of the answer — one parent scale, plus exceptions on the chords
that fall outside it. This ticket fixes how that is computed and how it is worded:

- The inference itself: how is the parent scale chosen, and what is it scored on — notes
  covered, chord tones covered, simplicity? What breaks ties?
- Which scale set is it choosing from? The shipped 12 (TICKET-002) cover major, its modes,
  pentatonics, blues, harmonic and melodic minor — the ask mentions modes of harmonic
  *major*, which do not exist in the app yet. Do they get added, and if so which?
- How is the answer *named*? "A minor" and "C major" are the same notes; the honest name
  depends on the tonal centre the progression implies. When is a modal name (D Dorian) the
  right answer rather than a parent-key name?
- What is an exception, exactly — a chord with notes outside the parent scale — and what does
  the app say about it? A substitute scale for that chord, just the offending notes flagged,
  or the altered degree named?
- When no scale fits well, does it say so, or does it always produce a best guess?
- Confidence: does the UI express uncertainty, or state one answer plainly?

## Resolution

One function, computed from the progression and its stored key:

```ts
type Alteration = { play: Note; insteadOf: Note };   // "play A♭ instead of A"
type ParentAdvice = {
  root: string;                        // always the key's tonic
  scale: string;                       // a key of SCALES
  exceptions: Map<number, Alteration[]>;  // chord index → its outside notes
  strained: boolean;
};
```

### Candidates — the 9 shipped 7-note scales, on the stored tonic

The key already fixes the tonal centre, so this is not a search for the key: the root is
pinned and only the scale varies. Candidates are the 7 major modes plus harmonic and melodic
minor, rooted on `key.root`.

Pentatonics and blues are excluded from *inference*. Under coverage scoring they can only ever
lose to their 7-note parents, so keeping them would make the set look larger than it is.
Narrowing a parent scale down to its pentatonic is something the player does by ear, and the
shipped tabs already show pentatonics for anyone who wants one.

**Harmonic major is deliberately not added.** It would make the borrowed-iv progression
(C – Fm – C) exception-free, but "play C harmonic major" is a weaker instruction than "play C
major, flat the 6th over the Fm" — and the exception mechanism below already delivers exactly
that. Adding it would also put a new formula in front of the shipped tabs' scale picker for no
gain there.

### Score — role-weighted chord-tone coverage

Walk the chord list; for each chord, sum a weight for every one of its notes the candidate
covers, using the `role` field `note()` already computes: **3rd and 7th count 2, root and 5th
count 1**. A scale that omits a chord's 3rd is a genuinely worse recommendation than one
omitting its 5th, because the 3rd is what makes the chord sound like itself. Highest total
wins; ties break by declaration order in `SCALES`, which already runs familiar → exotic.

Scoring walks the list **as stored**, so a chord appearing six times counts six times.
Repetition is prominence — a 12-bar blues is mostly I7 and the parent should bend toward it.

Secondary dominants get no special handling **in the scoring**: V7/V in C scores its F♯ as an
outside note like any other chromatic tone. They do get named — see "Function wording" below.

### Name — tonic plus the scale's own name

Always "D Dorian", never "C major". The stored key already fixed the tonal centre, so
reporting an equivalent parent key would answer a question nobody asked. Modal names arrive
honestly and for free: a D-minor progression with a IV scores Dorian above Aeolian, because
the tonic never moved and the mode is what changed.

### Exception — an altered degree, phrased as a swap

A chord's exception is each of its notes outside the parent, named as an altered degree of
that parent and paired with the parent note it displaces. The player holds one scale and bends
one note, which is how this is actually played. The wording is generated from `note()`'s
existing interval naming, not authored per case.

> parent: **C Ionian** — over Fm, play A♭ instead of A (♭6) · over D7, play F♯ instead of F (♯4)

### Function wording

*(Revised after the original resolution, which left this to TICKET-013's panel — the label is
derived from stored data, so it belongs with the exception it explains.)*

Every non-diatonic chord is also **named by its function**, above its note swaps. The label is
pure presentation computed from TICKET-010's numeral — the inference computes nothing new for
it:

- **`of` is set** → "secondary dominant of V" (or "secondary leading-tone chord of vi" for a
  diminished quality), naming the target by its numeral.
- **otherwise, all the chord's notes fit the parallel tonality** (major ↔ minor on the same
  tonic) → "borrowed from C minor". One membership test against the parallel scale's notes.
- **neither** → the bare numeral and "outside the key", which is the honest thing to say about
  a chord with no clean source.

```
D7    secondary dominant of V
      → play F♯ instead of F (♯4)
Fm    borrowed from C minor
      → play A♭ instead of A (♭6)
B♭    borrowed from C minor
      → play B♭ instead of B (♭7)
```

Labelling only secondaries was considered and rejected: a ♭VII earns the sentence as much as a
V7/V does, and one labelled chord sitting beside an unlabelled one reads as a bug. Diatonic
chords get no label — there is nothing to explain.

### Uncertainty — one plain answer, one soft line when strained

A single winning scale is always named, stated plainly. No percentages, no confidence meter,
no runner-up. When **more than half the chords carry exceptions**, `strained` is set and the
panel adds one non-blocking line: the progression doesn't sit in a single scale and the
exceptions are doing the real work. Same voice as `tuningWarnings()` — an honest signal rather
than a number the player has to interpret.
