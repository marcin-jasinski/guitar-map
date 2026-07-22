---
id: TICKET-020
title: Progression tab — model, rail and chord stepping
label: wayfinder:task
status: closed
assignee: Marcin
blocked_by: [TICKET-019]
map: MAP-002
---

The tracer bullet: the fourth tab, end to end, on a hardcoded progression.
Spec: [§1](../guitar-map/progressions-spec.md), [§4.2–4.7](../guitar-map/progressions-spec.md).
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
type Chord = Deg & { quality: keyof typeof CHORDS; of?: Deg; pin?: (number | null)[] };
type Progression = { key: Key; chords: Chord[] };   // ordered, cap 32
```

`pin` belongs to TICKET-024 and stays unset here — it is in the type from the start so the field
never has to be retrofitted onto persisted chords.

No new music data — symbols derive from `spell()` by letter-step and semitones, nested through
`of`. Minor keys use natural-minor (Aeolian) degrees, so VII and VI carry no flat sign, and
**an `of` target's own degree reads against the key's tonality too** (`V7/III` in A minor targets
C, not C♯).

**Numerals are rendered mechanically, not from a table** (§1): case by whether the quality
contains a minor 3rd, then the shipped `CHORDS` suffix — so `min7` on degree 2 is **`iim7`**, not
`ii7`. Same construction as `diatonicTriads()` (`theory.ts:144-146`), widened from 4 qualities to
16.

### Rendering (§4.7)

Most of this already exists and must not be rebuilt:

- Neck cells: `board()` with `display.mode = 'whole'` — it already lights every cell whose pitch
  class is in `dots` (`view.ts:258-266`). No new `board()` branch.
- A `noteMap()` branch for the progression kind emits both tiers into one map; `Dot.faded`
  already distinguishes them.
- `Dot` gains three optional flags — `warnRing`, `cutRing`, `outline` — all defaulting off and
  all consumed by later tickets. Add the fields here so `Fretboard` is touched once.
- The label-mode, display-mode/fret-width and audio controls are **hidden on this tab** (§4.2).
  Hidden, not disabled and not reset: they stay app-global and other tabs find them unchanged.

### Zero and one chord (§4.6)

Both are legal and neither is an error. Empty: `＋` only, no inference run at all, one quiet
*Add a chord to begin* where the parent name goes. One chord: everything works except the three
forward layers, which draw nothing because the chord is its own successor.

## Acceptance criteria

- [ ] A fourth tab exists and holds its own content state
- [ ] Rail lists the progression top to bottom with numeral and derived symbol
- [ ] Click and ↑/↓ both step; stepping wraps past the last chord to the first
- [ ] ↑/↓ `preventDefault()` so stepping doesn't also scroll the page, and keep the shipped
      INPUT/SELECT/TEXTAREA guard (`App.svelte:162-168`)
- [ ] Stepping changes only the current chord — the neck does not move
- [ ] Neck shows every occurrence of the current chord's tones, role-coloured
- [ ] Numerals render mechanically for all 16 qualities; degree 2 as `min7` reads `iim7`
- [ ] Changing the key root re-spells every symbol correctly, including `of` chords (V7/V in C is D7)
- [ ] Switching tonality re-reads the numerals against natural minor, `of` targets included
- [ ] Label-mode, display-mode and audio controls are not rendered on this tab; other tabs keep theirs
- [ ] Empty and one-chord progressions draw per §4.6 — no inference on empty, no forward layers on one
- [ ] Symbol derivation has an assertion self-check covering a secondary dominant and a ♭-altered degree

## Blocked by

- TICKET-019 — the tab bar and per-tab content state

## Resolution

New module [`progression.ts`](../../src/lib/progression.ts) holds the model (`Key`, `Deg`, `Chord`
with `of?`/`pin?`, `Progression`) and everything derived from it: `offset()` computes a chord root's
letter-step + semitones above the key root (a secondary measures its outer degree above the target,
both degrees against the key tonality), `chordRoot`/`chordSymbolOf`/`chordNotesOf` derive via
`spell()`/`chordNotes`, and `numeralOf()` renders mechanically (case by the minor-3rd test, `m`
dropped only for the bare triad, `/target` for secondaries). `progressionDots()` maps the current
chord's tones to role-coloured dots. The progression became a fourth `Content` kind in
[`store.svelte.ts`](../../src/lib/store.svelte.ts); `describeContent` gained a placeholder branch
(refined in TICKET-026). New component [`Progression.svelte`](../../src/lib/Progression.svelte)
renders the rail + whole-neck via `board()`'s `'whole'` branch (reused verbatim) and owns the ↑/↓
stepping (wrapping, `preventDefault`, INPUT/SELECT/TEXTAREA guard); [`App.svelte`](../../src/App.svelte)
adds the fourth tab (hardcoded `I V7/V V7 I`) and renders `Progression` in place of the app-global
aside/section, so the label/display/audio controls simply aren't drawn there. `ROLE_COLOR` is now
exported from `view.ts`; empty/one-chord states draw per §4.6. Self-checks in
[`progression.test.ts`](../../src/lib/progression.test.ts) cover the secondary dominant, a ♭-altered
degree, minor-key degrees and the `of`-target tonality. 85 tests green, typecheck clean.
