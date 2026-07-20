---
id: TICKET-010
title: Define the progression data model — numerals, symbols, key
label: wayfinder:grilling
status: closed
assignee: Marcin
blocked_by: []
map: MAP-002
---

## Question

What exactly is a progression, as data?

Charting settled that numerals and chord symbols are shown together and either is editable,
with one derived from the other via the key. This ticket fixes the model that makes that
work, and everything downstream reads from it:

- Which chord vocabulary is allowed — diatonic triads and 7ths, borrowed chords (bVII, bVI),
  secondary dominants (V/V), diminished, sus/6/add9? How far past the shipped chord types
  from TICKET-002 does this go?
- The numeral syntax: how are quality, borrowing, secondary function and inversions written,
  and is the numeral or the symbol the stored form?
- What "key" means here — root plus major/minor only, or a mode? How does changing the key
  transpose (and what happens to a chord that was typed as an absolute symbol)?
- Enharmonic spelling under transposition, given the key-correct spelling already in
  `theory.ts`.
- Does a chord carry duration/bars, or is a progression just an ordered list of chords?
- What makes a progression invalid, and does the app block it or warn softly (the app's
  standing habit is soft, non-blocking warnings)?

## Resolution

A progression is **a key plus an ordered list of Roman-numeral chords**. The numeral is the
stored form; the chord symbol is always derived and never persisted.

```ts
type Key   = { root: string; tonality: 'major' | 'minor' };    // root ∈ ROOTS
type Deg   = { degree: 1|2|3|4|5|6|7; alter?: -1 | 1 };
type Chord = Deg & { quality: keyof typeof CHORDS; of?: Deg };
type Progression = { key: Key; chords: Chord[] };
```

### Numeral is canonical

Transposition writes one field (`key.root`) and nothing else moves; presets are key-agnostic
by construction; the model matches how `diatonicTriads()` already thinks. The cost accepted:
a chord outside the vocabulary below cannot be stored at all.

### Vocabulary — diatonic + borrowed + secondary

A numeral is a **chromatic degree** (1–7 with an optional `alter` of ♭/♯, which reaches all 12
pitch classes) carrying **any of the 16 shipped `CHORDS` types**, with an optional `of` target
for secondary function. That covers borrowed chords (♭VII, ♭VI, iv in major), secondary
dominants (V7/V, vii°/vi), modal interchange and tritone subs. Nothing new is needed in
`theory.ts` — the degree simply stops being restricted to the scale.

`of` resolves **relatively**: in `V7/V`, degree 5 is measured above the target's root, not
above the tonic — so V7/V in C is D7. `♭II7` and `V7/V` are therefore distinct chords in the
model even where they would sound alike, which is what lets TICKET-012 say "secondary dominant
of V" rather than merely "chromatic chord".

### Key — root + major|minor only

Two tonalities. Major uses Ionian degrees; minor uses **natural-minor (Aeolian)** degrees, so
III/VI/VII need no flat sign and harmonic minor's V7 is an ordinary altered chord in the
vocabulary. This keeps numeral conventions the ones every chart uses.

Modal progressions are expressible without a modal key: D Dorian is the key of D minor with a
IV instead of a iv — and that IV *is* the Dorian signal. Naming the mode is inference, owned
by TICKET-012, not an input the user must set correctly up front.

### Symbols derive; typed symbols back-analyse

The derived root is `spell()` of the key root by the degree's letter-step and semitones,
nested through `of` for secondaries. Spelling is therefore key-correct for free and double
accidentals render faithfully, exactly as elsewhere in `theory.ts` — no respelling pass, no
enharmonic decision to make.

Typing an absolute symbol is the same arithmetic inverted, and it round-trips faithfully
because the **typed letter picks the degree**: in C major `C♯` is ♯I and `D♭` is ♭II, each
preserved as written. The accidental sets `alter`; the suffix is matched against the `CHORDS`
suffixes.

A suffix with no match (`C13`, `G7♯9`, `Fm6/9`) produces a **soft, non-blocking warning**
naming what is supported, and stores nothing — following `tuningWarnings()`'s established
style. This preserves the invariant everything downstream depends on: **every chord in a
progression has real notes**. No arpeggio shape, scale inference, voicing or guide-tone line
ever has to handle a noteless chord.

### No bass note

A chord carries no inversion or slash bass. The lowest note is decided by TICKET-014's voicing
picker. The job here is soloing over the changes, and the arpeggio, parent scale and
guide-tone line are identical for C and C/E. It also leaves the slash unambiguously meaning
secondary function, which `C/E` would otherwise collide with in the same input box.

### No duration

An ordered list, nothing more. Timed playback and any transport UI were ruled out while
charting, and chord-by-chord stepping does not care how long a chord lasts — duration would be
a field with no reader. The 12-bar blues stores its 12 chords, repeats included, which is also
how one steps through it. If timed playback ever lands, duration is an additive field on an
unchanged model.

### Nothing is invalid

Any ordered list of well-formed chords is legal, including the empty one and the single-chord
one — empty is the honest state of a progression being built. The editor caps length at **32**
purely so the chord strip stays usable. There is no validity verdict anywhere in the model:
the only interesting "this is odd" signal is "no parent scale covers these chords well", which
is advice about the music and belongs to TICKET-012.
