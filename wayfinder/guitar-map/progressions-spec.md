# Chord Progression Explorer — Build-Ready Spec

A fourth tab for Guitar Map: the player picks or edits a chord progression in any key and learns
**how to solo over it** — the parent scale it lives in, the per-chord exceptions, and how the
chords connect. Everything is computed from the shipped engine; no new music data is authored.

This document consolidates the decisions from wayfinder tickets [010–018](../map-002.md). Each
section cites its source ticket, which remains the authority for the reasoning behind a decision.
No *decision* here is new. What is new is §10, which records the contradictions surfaced while
assembling this document and again while reviewing it against the shipped engine, and §§4.6–4.7,
which say what the earlier decisions imply for the degenerate progression lengths and for
`Fretboard.svelte` — implications, not new choices. Where a point is still open, it is flagged
**[open]**.

It builds on the shipped app ([`spec.md`](spec.md)) and **amends it in two places** — see §10.

---

## 1. Progression data model — [TICKET-010](../tickets/010-progression-model.md)

A progression is **a key plus an ordered list of Roman-numeral chords**. The numeral is the
stored form; the chord symbol is always derived and never persisted.

```ts
type Key   = { root: string; tonality: 'major' | 'minor' };    // root ∈ ROOTS (§2 of spec.md)
type Deg   = { degree: 1|2|3|4|5|6|7; alter?: -1 | 1 };
type Chord = Deg & {
  quality: keyof typeof CHORDS;
  of?: Deg;
  /** §5's pinned voicing, as one fret per string. Absent = auto. */
  pin?: (number | null)[];
};
type Progression = { key: Key; chords: Chord[] };              // ordered, cap 32
```

- **Numeral is canonical.** Transposition writes one field (`key.root`) and nothing else moves;
  presets are key-agnostic by construction. Accepted cost: a chord outside the vocabulary below
  cannot be stored at all.
- **Vocabulary:** a chromatic degree (1–7 with optional `alter` of ♭/♯, which reaches all 12
  pitch classes) carrying **any of the 16 shipped `CHORDS` types**, plus an optional `of` target
  for secondary function. Covers borrowed chords (♭VII, ♭VI, iv in major), secondary dominants
  (V7/V, vii°/vi), modal interchange and tritone subs. **Nothing new in `theory.ts`** — the
  degree simply stops being restricted to the scale.
- **`of` resolves relatively:** in `V7/V`, degree 5 is measured above the target's root, not
  above the tonic — so V7/V in C is D7. `♭II7` and `V7/V` are distinct chords in the model even
  where they sound alike, which is what lets §3 say "secondary dominant of V".
  **The `of` target's own degree reads against the key's tonality**, exactly like a top-level
  degree — so `V7/III` in A minor targets C (Aeolian ♭3), not C♯. Only the outer degree is
  measured relatively. Degree 5 is 7 semitones under either tonality, which is why the common
  secondaries never expose the distinction; the uncommon ones do.
- **Numeral rendering is mechanical, never a table.** The numeral is
  `case(NUMERALS[degree-1]) + accidental + CHORDS[quality].suffix`, where the case is
  **lower iff the quality contains a minor 3rd** (interval 3 at letter-step 2 — `minor`, `dim`,
  `min7`, `m7♭5`, `dim7`, `min7 shell`) and upper otherwise, including the sus qualities that
  have no 3rd at all. `min7`'s shipped suffix is `m7`, so ii-as-min7 renders **`iim7`**, not
  `ii7`; this is the same construction `diatonicTriads()` already uses (`theory.ts:144-146`),
  extended from 4 qualities to 16. No quality gets a special case.
- **Key = root + major|minor only.** Major uses Ionian degrees; minor uses **natural-minor
  (Aeolian)** degrees, so III/VI/VII need no flat sign and harmonic minor's V7 is an ordinary
  altered chord. Modal progressions need no modal key: D Dorian is the key of D minor with a IV
  instead of a iv — and that IV *is* the Dorian signal. Naming the mode is inference (§3).
- **Symbols derive** as `spell()` of the key root by the degree's letter-step and semitones,
  nested through `of` for secondaries. Spelling is key-correct for free; double accidentals
  render faithfully, exactly as elsewhere in `theory.ts`. In the sharpest shipped keys
  (`D♯`, `G♯`, `A♯` ∈ `ROOTS`) a ♯-altered degree can reach a **triple** sharp, and
  `accidentals()` will emit `♯♯♯` rather than respell. **Accepted, not guarded** — it is the
  honest spelling, it is already how the shipped engine behaves everywhere else, and the escape
  is to pick the enharmonic key root, which the picker already offers.
- **Typed symbols back-analyse** by the same arithmetic inverted, and round-trip faithfully
  because the **typed letter picks the degree**: in C major `C♯` is ♯I and `D♭` is ♭II. The
  accidental sets `alter`; the suffix matches a `CHORDS` suffix.
- **Unknown suffix** (`C13`, `G7♯9`, `Fm6/9`) → a **soft, non-blocking warning** naming what is
  supported; nothing is stored. This preserves the invariant everything downstream depends on:
  **every chord in a progression has real notes.**
- **No bass note.** The lowest note is decided by §5's voicing picker. The arpeggio, parent scale
  and guide-tone line are identical for C and C/E, and it leaves the slash unambiguously meaning
  secondary function.
- **No duration.** Timed playback was ruled out at charting, and stepping does not care how long
  a chord lasts. The 12-bar blues stores its 12 chords, repeats included.
- **Nothing is invalid.** Any ordered list of well-formed chords is legal, including empty and
  single-chord. The 32 cap exists so the rail stays usable. The only "this is odd" signal is
  §3's strained line, which is advice about the music, not a validity verdict. What the two
  degenerate lengths actually *draw* is §4.6.

## 2. Preset library — [TICKET-011](../tickets/011-preset-library.md)

```ts
type Preset = { name: string; tonality: 'major' | 'minor'; chords: Chord[] };  // no root
```

Modelled on `PRESET_TUNINGS`: **ten presets, one flat list, name only.** No grouping, no
descriptions, no example songs — names say what the preset *teaches*, which sidesteps song
attribution and duplicates nothing the tab already shows on load.

| Name | Tonality | Chords | Why it's in |
| --- | --- | --- | --- |
| I–V–vi–IV | major | `I V vi IV` | the baseline; all diatonic |
| I–vi–IV–V | major | `I vi IV V` | the other baseline |
| ii–V–I | major | `iim7 V7 Imaj7` | the jazz cadence; guide tones at their clearest |
| 12-bar blues | major | `I7×4 IV7×2 I7×2 V7 IV7 I7 V7` | parent lands on Mixolydian, not Ionian |
| Mixolydian rock | major | `I ♭VII IV` | borrowed ♭VII, parent shifts to fit — **zero** exceptions |
| Dorian vamp | minor | `i IV` | modal naming: reports "D Dorian", not "D minor" |
| Borrowed iv | major | `I IV iv I` | one exception, ♭6 — the cleanest possible swap |
| Secondary dominant | major | `I V7/V V7 I` | the `of` field and the ♯4 swap |
| Andalusian cadence | minor | `i VII VI V` | major V in a minor key — the ♯7 exception |
| Minor ii–V–i | minor | `iim7♭5 V7 i` | two exceptions at once, and the strained threshold |

Every numeral in that column is what §1's mechanical rule *produces* — the table is a rendering
of the stored chords, not a second source of truth. `iim7` and `iim7♭5` both carry their `m`
because `min7`'s and `m7♭5`'s shipped suffixes both start with one.

Four are what people come looking for; six exist so the feature demonstrates itself on load —
three prove the **inference** by resolving to a parent nobody typed, three prove the
**exceptions**.

**A preset stores no root**, only tonality — its numerals are written against one. Loading
**keeps the player's current root and switches tonality where needed**: load "Andalusian cadence"
while in E major and you land in E minor. Per-preset suggested keys and a neutral C-major home
were both rejected.

## 3. Parent scale inference & per-chord exceptions — [TICKET-012](../tickets/012-scale-inference.md)

```ts
type Alteration = { play: Note; insteadOf: Note };
type ParentAdvice = {
  root: string;                            // always the key's tonic
  scale: string;                           // a key of SCALES
  exceptions: Map<number, Alteration[]>;   // chord index → its outside notes
  strained: boolean;
};
```

- **Candidates: the 9 shipped 7-note scales, rooted on the stored tonic.** The key already fixes
  the tonal centre, so this is not a search for the key — the root is pinned and only the scale
  varies. Pentatonics and blues are excluded: under coverage scoring they can only lose to their
  7-note parents.
- **Harmonic major is deliberately not added.** It would make the borrowed-iv progression
  exception-free, but "play C major, flat the 6th over the Fm" is the better instruction, and the
  exception mechanism already delivers it.
- **Score: role-weighted chord-tone coverage.** Walk the chord list; for each chord sum a weight
  per covered note using the `role` field `note()` already computes — **3rd and 7th count 2, root
  and 5th count 1**. Highest wins; ties break by declaration order in `SCALES` (familiar →
  exotic). Scoring walks the list **as stored**, so a chord appearing six times counts six times —
  repetition is prominence.
- **`note()` must be exported.** It is module-private today (`theory.ts:56`); the scorer needs its
  `role` and the swap sentences need its `interval`. Exporting an existing function is the only
  change this tab makes to `theory.ts`'s surface — it adds no music data, which is what the
  "nothing new in `theory.ts`" claim actually means.
- **The tie-break is load-bearing, not a formality.** Three of the five self-checks below are
  decided by it, not by a score margin: `I IV iv I` ties **Ionian with Mixolydian at 14** (no
  chord contains the 7th degree that separates them), and `I V7/V V7 I` ties **Ionian with Lydian
  at 18** (Lydian buys the D7's F♯ and loses the G7's F for exactly the same weight). Both land on
  Ionian only because `'Major (Ionian)'` is declared first. **Reordering `SCALES` silently changes
  the answers** — say so beside the assertions, or the next person to tidy that record breaks two
  passing tests with no idea why.
- **Name: tonic plus the scale's *modal* name** — always "D Dorian", never "C major". Two shipped
  keys are not modal names: `'Major (Ionian)'` → **Ionian** and `'Natural minor (Aeolian)'` →
  **Aeolian**; the other seven are already bare. A two-entry display map, **and its inverse**,
  since §8's Scale bridge has to hand the Scale tab a real `SCALES` key. The keys themselves must
  **not** be renamed — they are persisted verbatim in every saved `{kind:'scale'}` favorite.
  **"A Aeolian", not "A minor"** — decided, not incidental. Three of the nine candidates are a
  kind of minor (Aeolian, harmonic, melodic), so "minor" is the one answer that doesn't say which
  scale to play, which is the only thing this line exists to say. And a name that switched
  registers for the two familiar cases would make them look like a different *kind* of answer
  from "D Dorian" — the inference returns one scale out of nine every time, and the naming should
  read that way every time.
- **Exception: an altered degree, phrased as a swap** — each note outside the parent, named as an
  altered degree and paired with the parent note it displaces. Wording is generated from `note()`'s
  interval naming, not authored per case.
- **Function wording:** every **non-diatonic** chord is also named by its function, above its
  swaps, computed from §1's numeral:
  - `of` set → "secondary dominant of V" (or "secondary leading-tone chord of vi" for a
    diminished quality)
  - else all notes fit the parallel tonality → "borrowed from C minor" (one membership test)
  - else → the bare numeral and "outside the key"

  Diatonic chords get no label.
- **Uncertainty:** one plain answer always; no percentages, no confidence meter, no runner-up.
  When **more than half the chords carry exceptions**, `strained` is set and the panel adds one
  non-blocking line. Same voice as `tuningWarnings()`.

> parent: **C Ionian** — D7 · secondary dominant of V → play F♯ instead of F (♯4)

## 4. Tab layout & chord stepping — [TICKET-013](../tickets/013-tab-layout.md)

Prototype asset: [`prototypes/013-progression-tab.html`](../tickets/prototypes/013-progression-tab.html)
(variant D is the spec).

### 4.1 The tab bar

The shipped app has **no tab bar** — it is one page with a `scale | chord | arpeggio` segmented
control in `App.svelte`. This tab therefore **introduces the tab bar**: the existing page becomes
three tabs and Progression is the fourth. The segmented control is **replaced by** the tab bar,
not nested inside it.

### 4.2 Layout — a left rail

- The progression reads **top to bottom in a left rail**, like a chart. Each entry carries the
  **numeral, the chord symbol, and §3's function label**; the current chord takes an accent
  border. A `＋` entry at the foot adds a chord.
- The **key control and an `Edit progression` button sit under the rail** — everything that
  changes *what* the progression is in one column, everything showing *what to play* in the other.
- The **note-swaps sit under the neck**, not in the rail: they are sentences, not labels. Rail
  entries carrying only the function label is what made the rail viable.
- The **parent scale is named once**, above the neck, since it is constant across the progression.
- The **five layer toggles (§6) sit under the neck**, in the same column as the swap sentences and
  the voicing readout — everything about *how the neck is drawn* below it, everything about *what
  the progression is* in the rail. They are **session state, not saved** — decided, not deferred:
  §7 persists what the player authored, and a layer toggle is a way of looking, not a thing to
  own. A favorite that restored with three layers switched off would read as a broken save rather
  than as a remembered preference, and the player has no way to tell which it was. All five come
  back on next session, which is also §6's default and therefore one rule instead of two.
- **The shipped app-global controls are hidden on this tab**, not disabled: the label-mode control
  (§4.4 fixes the parent layer to note names and the chord layer to role colours, so there is
  nothing left to choose), the `position | octaves | whole` display control and the fret-width
  control (§4.4 drops all three modes), and the audio controls (§8 — this tab has no audio).
  `labelMode`, `win` and `display` stay app-global and untouched in `App.svelte`; the progression
  tab simply never reads or renders them, so returning to another tab finds them as they were.

### 4.3 Stepping

Click a rail entry, or **↑ ↓**. Stepping **wraps** — the progression is a loop, and the last
chord's forward view points back at the first. Stepping changes only which chord is current; it
never moves the neck.

↑ ↓ join the shipped `←/→` handler on `<svelte:window>` (`App.svelte:162-168`) and inherit its
INPUT/SELECT/TEXTAREA guard, so the editor's fields keep their own arrow behaviour. Unlike `←/→`,
these two **must `preventDefault()`** — ↑ ↓ scroll the page by default and the rail is a scrolling
column, so without it every step also jumps the viewport. They are live only on this tab.

### 4.4 The neck — whole neck only

**None of the shipped display modes carry over.** The position window and the octave view are
dropped in this tab: a soloist over changes wants every occurrence, not a box, and a window that
follows the chord makes the floor move under the player.

Layers, in the shipped colour language:

| Layer | Rendering |
| --- | --- |
| parent scale | small faded dots, note names |
| current chord | full-size dots, interval-role coloured (root / 3rd / 5th / 7th) |
| exception notes | chord tone outside the parent, ringed in `--warn` |
| next chord | dashed outline ghosts |
| guide-tone line | accent-coloured arrowed polyline (§6) |

### 4.5 The neck looks forward

The neck **does not redraw clean**. What persists is the **next** chord, not the previous one:
ghosts and the guide-tone line both point ahead, so the player sees the move before making it.

### 4.6 Zero and one chord

§1 makes both legal, so both need a drawing, and neither is an error state.

- **Empty.** The rail is the `＋` entry alone. No parent is named and **no inference runs** — with
  no chords every candidate scores 0 and the tie-break would confidently report "C Ionian", which
  reads as a bug rather than as an empty progression. The neck draws bare, with one quiet line
  where the parent name goes: *Add a chord to begin.* Not a warning — nothing is wrong.
- **One chord.** Parent, exceptions, swaps and the voicing readout all work normally; the chord is
  its own successor under §4.3's wrap. The three **forward** layers therefore draw nothing: no
  ghosts (they would land exactly on the chord dots), no guide-tone lines (both would be
  zero-length), no common-tone rings (§6's marking is forward-only and nothing moves). Their
  toggles stay visible and enabled — a progression is one chord away from having a next one, and
  a control that vanishes and reappears is worse than one that does nothing for a moment.

### 4.7 What `Fretboard.svelte` needs, and what it doesn't

Every layer except the guide-tone line is **pitch-class-level**, which is exactly the axis
`Fretboard` is already built on — it is "dumb by design: it draws whatever pitch classes `dots`
hands it", keyed `Map<number, Dot>`. So the component extension is small and additive:

- **Two dot tiers need nothing new.** `Dot.faded` already exists (`view.ts:21-32`) and already
  distinguishes the small faded parent dots from the full-size role-coloured chord dots. One
  `noteMap()` branch for the progression kind emits both tiers into the one map.
- **Cell selection needs nothing new.** `board()`'s `'whole'` branch already lights every cell
  whose pitch class is in `dots` (`view.ts:258-266`). The progression tab solves for `'whole'`
  internally and reuses it verbatim — no new `board()` branch.
- **Three new optional `Dot` fields**, all pitch-class-level, all defaulting off:
  `warnRing` (§3's exception notes), `cutRing` (§6's held common tones), and `outline`
  (§4.5's dashed next-chord ghosts — a ghost pitch class is *next minus current*, since a pitch
  class in both is a held tone and gets `cutRing` instead, never a ghost).
- **One new `Fretboard` prop: `lines?: { from: string; to: string }[]`**, cell-key pairs drawn as
  arrowed `--accent` strokes. This is the *only* piece that is position-level rather than
  pitch-class-level, and the only reason the component is touched at all beyond the three fields.

Two existing collisions to know about rather than fix: `Board.ghosts` is an unrelated
`Map<string, number>` for the octave view's alternate roots (this tab has no octave view, so it is
always empty here and the name simply overlaps), and §6's "the line is the only *stroke*" is
loose — the barre and the `.fretzone:hover` tint already stroke `--accent`
(`Fretboard.svelte:91,196`). Neither renders on this tab, so the claim holds where it is made.

## 5. Voicing selection & override — [TICKET-014](../tickets/014-voicing-selection.md)

```ts
type Voicing = { frets: (number | null)[]; pinned: boolean };
solveChain(prog: Progression, tuning: Tuning): Voicing[]
```

The pins are **already inside `prog`** — §1 puts `pin?` on the `Chord`, so the chain's input is
one object and `Voicing.pinned` is a pure echo of `chords[i].pin !== undefined`. Storing pins on
the chord rather than in a side table keyed by index is what makes §5's "editing clears only that
chord's override" and the editor's add / remove / **reorder** (TICKET-023) free: a pin travels
with the chord it belongs to, because it is part of it. An index-keyed `Record` would silently
re-point every later pin at the wrong chord the first time someone deletes chord 2.

- **The voicing is never drawn.** §4.4's neck shows every occurrence of the chord's tones, so a
  voicing has no shape to be. Its job is to be the **frame the guide-tone line hangs on**: it
  decides *which* occurrence of the 3rd and the 7th the line passes through. It surfaces only as
  a readout under the neck (`x-3-5-5-4-3`) and, indirectly, as the line's path.
- **The two guide voices are defined for all 16 qualities.** Normally the 3rd and the 7th. Where
  either role is absent, take the next note by the priority **3rd → 7th → 5th → root → other**,
  never picking the same note twice. That one rule covers every shipped case: a triad has no 7th
  and falls to the 5th (as already stated); the three **shells** have no 5th but do have both a
  3rd and a 7th, so they are unaffected; **`sus2` and `sus4` have no 3rd at all** and land on
  5th + root; `dim7`'s ♭♭7 is a 7th by letter-step and needs nothing special. Stated once here
  because §5's cost function and §6's two lines must agree on what they are measuring.
- **Smooth = guide-voice movement, then hand travel.** Primary cost between consecutive chords is
  how far the two guide voices move in frets — literally the drawn line's length. Tie-break on
  whole-hand travel, so a voicing cannot leap ten frets to save the line a semitone. The classic
  **7th-falls-to-3rd** resolution emerges from minimising this rather than being special-cased.
- **Candidates: `chordVoicings()` reused as-is.** It already returns deduped `Board`s — roughly
  one best shape per fret window, scored for root-in-bass, completeness, fingers and span. That is
  ~12–15 shapes per chord. **No new generator.** Two adapters, both trivial and both this tab's,
  not `view.ts`'s:
  - **In:** its signature is `(tuning, dots, rootPc)` (`view.ts:411`), so a progression chord is
    handed to it as a synthesised `{ kind: 'chord', slots: [{ root, type }] }` run through
    `noteMap()` — a progression chord is not a `Content` and does not become one.
  - **Out:** it returns `Board`s (`cells: Set<"string:fret">`), not `Voicing.frets`. One pass over
    `cells` gives the per-string array, `null` for an unfretted string.
- **A candidate that omits a guide voice is not a candidate.** `Board.omits` is real
  (`view.ts:126-128`) — nothing complete is always reachable in a 4-fret window — and a shape
  missing its 3rd or 7th gives §6's line no anchor to start or end at. **Filter those shapes out
  before the chain runs.** If filtering empties a chord's candidate list, fall back to the
  unfiltered list for that chord and let §6 draw the one line it can: the neck showing an honest
  shape beats the neck showing nothing, and this is the same "saying so beats quietly showing a
  lie" the `omits` field was added for.
- **Chain: one global Viterbi pass.** At most 32 chords × ~15 candidates is a few hundred
  comparisons. An overridden chord is a **fixed constraint** (its column holds one shape) and the
  pass re-runs — so **nothing "re-flows"**: there is no forward-only or bidirectional question,
  because the chain is always solved whole. Two overrides are no harder than one.
- **The chain is linear; only the drawing wraps.** §4.3 loops the progression and §4.5 points the
  last chord's forward view back at the first, so §6 draws a guide-tone line from chord *n* to
  chord 1 — but the pass scores transitions 1→2 … (n-1)→n only, and **that last line is not
  optimised**. Deliberate: a cyclic chain has no Viterbi solution without pinning a column and
  re-solving once per candidate, which is the whole algorithm again for one transition the player
  meets after they have already learned the loop. The wrap line is drawn honestly, wherever the
  two shapes happen to sit.
- **Override UI:** the readout becomes a **stepper** — `◄ ►` through candidates low-to-high with
  "Shape 3 of 12", plus **Clear** back to auto. Stepping sets the pin.
- **Overrides transpose.** Stored as the chosen shape's fret positions and **shifted by the same
  interval** when the key changes. "The same interval" means the **nearest signed** one —
  `wrap()` (`theory.ts:17`) already computes it, so C→B is −1 fret and not +11. If the shifted
  shape leaves the neck, retry it **one octave the other way** (±12) before giving up; that
  rescues most of the shapes a naive shift would throw away at either end. One that still cannot
  survive — off the neck both ways, or using open strings that no longer exist — is **dropped with
  a soft note** naming which chords reverted to auto. Editing a chord's degree or quality clears
  **only that chord's** override, which is one field on one chord (§1's `pin`).
- **Awkward on this tuning:** when the optimal chain still leaves a change moving the guide voices
  more than about **5 frets**, one soft line names that change.

## 6. Guide tones & common tones — [TICKET-015](../tickets/015-connection-rendering.md)

Prototype asset: [`prototypes/015-connections.html`](../tickets/prototypes/015-connections.html)
(variant LINE is the spec; its guide-tone path is real, chained by §5's rule).

- **Guide tones: two arrowed lines to the next chord.** The two guide voices — **§5's priority
  rule, not a second definition here** — each draw as an arrowed line from where they sit in this
  chord's voicing to where they sit in the next chord's. **Two lines, never more**, and fewer only
  where §5's fallback left a chord short a voice, or where §4.6 has nothing to point at.
- A path spanning **all** chords is dropped: it would demand the whole progression on screen,
  where a path to the **next** chord needs only the forward ghosts §4.5 already commits to.
  Rejected alternatives, kept on record as the fallback if the neck ever gets busier: **MARKS**
  (guide tones ringed in place, labelled `hold` / `-1` / `+2`, no strokes at all) and **STRIP**
  (a clean neck with a two-voice chart below it).
- **Common tones: a ring of panel colour cut into the dot.** Shape, not hue — no new colour, and
  it survives colour-blindness at dot size. Marking is **forward-only**, matching §4.5: a note
  held *from* the previous chord is not marked, because that move is behind you.
- **Layers: all five default on, independently toggleable, none mutually exclusive.** They survive
  being on together because each owns a different **visual channel** — faded small dots, full-size
  coloured dots, dashed outlines, a cut ring, a `--warn` ring, and the line as the only *stroke*.
  No interlock is needed to police them. The toggles live under the neck and are session-only
  (§4.2); the channels map onto `Dot.faded`, role colours, `Dot.outline`, `Dot.cutRing`,
  `Dot.warnRing` and the `lines` prop respectively (§4.7).
- **Colour:** the line uses `--accent`. §4.4 flagged a possible collision with the position
  window, which also uses accent — **no clash, because this tab has no position window.**

## 7. Persistence — [TICKET-016](../tickets/016-progression-persistence.md)

A progression becomes a **fourth `Content` kind**; the store **stays at `version: 1`**.

```ts
export type Content =
  | { kind: 'scale'; … } | { kind: 'arpeggio'; … } | { kind: 'chord'; … }
  | { kind: 'progression'; key: Key; chords: Chord[]; step: number };
```

**There is no `overrides` field.** §5 moved the pin onto the `Chord` itself, so persisting the
chords persists the overrides, and the two can never drift out of alignment across an edit. One
fewer field to save, migrate and re-key.

- One favorites list, one save button, one delete, one soft cap: `addFavorite`,
  `describeContent` and `favoriteName` each extend by a single branch.
- **The version must not bump.** `load()` returns the default store unless `parsed.version === 1`,
  so a bump would silently discard every existing favorite unless a migration were written first.
  Adding a union member needs no bump.
- **`window` and `labelMode` become optional** on `Favorite`, exactly as `display?` already is;
  the progression branch omits them rather than writing values nothing reads. Existing favorites
  are unaffected — they all carry both. (This amends `spec.md` §8; see §10.)
  **Two read sites need the same guard, not just one.** `favoriteName()` reads `f.window.startFret`
  (`store.svelte.ts:78`) and the load path reads `f.window` and `f.labelMode`
  (`App.svelte:150-151`) — both currently unconditional, and the second is the one that is easy to
  miss because it lives outside the store. `display?`'s existing `??` fallback at `App.svelte:152`
  is the pattern to copy.
- **Loading a favorite selects the tab that owns its kind**, then writes into that tab's content.
  Otherwise a progression loaded from the Scale tab lands somewhere the player cannot see, and the
  favorites list — which is one list across all four tabs (§7) — would appear to do nothing. This
  is the one place a favorite moves the tab bar; §8's bridges are the other.
- **Saved:** key, chords (pins included, per §5), current step.
  **Recomputed on load:** parent scale, exceptions, and every auto-picked voicing — all pure
  functions of the chords. Accepted cost: **a saved progression can report a different parent
  scale after an app update.** The right trade for advice that is always current; the chords, the
  only thing the user authored, never change.
- **Name:** `favoriteName()` gains a branch that **drops the fret range** (meaningless here) —
  `C major · I – iv – V7/V – V7 — Standard`, truncating past four chords with `…`.
- **One picker, two labelled groups** in the rail: **Presets** and **Saved**. The headings carry
  real information, because the two load differently (§2 vs. a saved key).

## 8. Bridges to the other tabs — [TICKET-018](../tickets/018-tab-bridge.md)

A bridge is only worth building where the target can do something this tab cannot. This tab has
**no audio** and **no position/octave window**, which fixes both the targets and the count.

```
rail entry ⋮          ▶ Play this chord    → Chord tab (root, type)
parent scale header   ♪ Solo on C Ionian   → Scale tab (root, inferred scale)
```

- **Placement follows scope.** "Play this chord" is per-chord, so it sits on the rail entry.
  "Solo on <parent>" is progression-level, so it sits beside the parent-scale name. Putting both
  on the rail entry would imply a per-chord scale — the chord-scale model ruled out of scope.
- **No Arpeggio bridge**: the progression neck already draws the chord's tones across the whole
  neck, so it would land the player somewhere showing *less*.
- **Per-tab content state.** `App.svelte`'s single `content` becomes **one content state per
  tab**, so the progression, its key and its step survive any excursion. The bridge is "set the
  target tab's content, then switch to it".
- **No breadcrumb** — the Progression tab in the bar is already the way back.
- **Tuning stays app-global**, not per-tab. Only content is remembered per tab.
- **What travels:** to Scale, the key's root plus the inferred scale name (which encodes
  everything the inference concluded). To Chord, the derived root and type only — the chord
  **arrives stripped of its context**, accepted because the reason to go there is to hear it.
- **The Scale bridge un-maps the modal name.** The button reads "Solo on C Ionian", but
  `{kind:'scale'}` stores a `SCALES` key, so the bridge writes `'Major (Ionian)'` — §3's display
  map run backwards. The label the player reads and the value the target tab stores are not the
  same string, and only two of the nine candidates differ.

## 9. Deferred / out of scope

Explicitly **not** built (from the map's *Not yet specified* and *Out of scope*):

- **Timed, looping backing-track playback with tempo** — the one item still in fog. Revisit only
  if the audio engine justifies a transport UI.
- **A preset authoring/sharing format** — progressions live in `localStorage` with no export path
  and the app has no backend.
- **Chromatic approach notes / passing tones** as a third connection layer — the launch aids are
  guide tones and common tones only, and §6 spends the last free visual channel.
- **Full chord-scale (per-chord mode) display** — contradicts the binding "one parent scale +
  exceptions" decision rather than extending it.
- **Harmonic major and its modes** (§3), **inversions/slash chords** (§1), **chord durations and
  bars** (§1), **drawing the voicing as a held shape** (§5).

## 10. Contradictions found while assembling

Assembly is where separately-made decisions meet, and review is where the assembled thing meets
the shipped code. Five surfaced at assembly and six more at review; all eleven are resolved here
rather than left for an implementer.

1. **The Andalusian preset was written in the wrong notation.** [TICKET-011](../tickets/011-preset-library.md)
   lists it as `i ♭VII ♭VI V`, but §1 fixes minor keys to **natural-minor degrees**, where VII and
   VI are already flat. Written as ♭VII it would mean a doubly-flattened degree. **Resolved:** §2
   lists it as `i VII VI V`. "Mixolydian rock" keeps its `♭VII` correctly — that one is in a
   *major* key, where the flat sign is load-bearing.
2. **The guide-tone control collapsed from three settings to one.**
   [TICKET-013](../tickets/013-tab-layout.md) specified off / next chord / whole progression;
   [TICKET-015](../tickets/015-connection-rendering.md) dropped the whole-progression path after
   prototyping it. **Resolved in favour of the later decision**, which was made against a real
   voicing chain: §6 is a plain on/off toggle.
3. **[TICKET-018](../tickets/018-tab-bridge.md)'s title promises an Arpeggio bridge** that its own
   resolution drops. **Resolved:** §8 ships two bridges — Chord and Scale. The ticket title is
   stale, not the decision.
4. **`setKind()`'s shipped behaviour changes.** Today it *carries the root across* when switching
   content kind. Under §8's per-tab state, a plain tab switch keeps whatever that tab held.
   **Resolved: accepted deliberately** — tab memory is the standard expectation of a tab bar, and
   the carry-over case is now served explicitly by the bridges. Stated here so it is not
   discovered as a regression.
5. **This spec amends [`spec.md`](spec.md) §8.** The shipped schema shows `window` and `labelMode`
   as required on `Favorite`; §7 makes both optional. The shipped `Content` union also gains a
   fourth member. Neither changes the store version, and both are backward compatible with every
   saved favorite.

The next six came out of reviewing the assembled spec against the shipped engine rather than
against its own tickets. Each was a place the spec described something the code does not do.

6. **§2's `ii7` contradicted the only numeral rule available.** `min7`'s shipped suffix is `m7`
   (`theory.ts:95`), so a mechanical numeral is `iim7`. The table said `ii7` while writing
   `iim7♭5` two rows down. **Resolved:** §1 states the rule mechanically for all 16 qualities and
   §2's table becomes its output, not a second source of truth. `iim7` it is.
7. **"The scale's own name" did not produce the names §3 uses.** The `SCALES` keys are
   `'Major (Ionian)'` and `'Natural minor (Aeolian)'` (`theory.ts:75,80`), so the stated rule
   yields "C Major (Ionian)" while every example and every self-check says **"C Ionian"**.
   **Resolved:** §3 adds a two-entry display map and its inverse (§8 needs the inverse). The keys
   are not renamed — they are persisted verbatim in existing `{kind:'scale'}` favorites.
8. **`solveChain(prog, tuning)` could not see the pins it was required to honour.** They lived in
   `Content.overrides` (§7) keyed by chord index, while the chain took only `Progression`.
   **Resolved by deleting the field:** §1 puts `pin?` on the `Chord`. That fixes the signature and
   the reorder bug at once — an index-keyed table silently re-points every later pin the first
   time a chord is deleted, which no ticket had noticed because editing (TICKET-023) and pinning
   (TICKET-024) were specified apart.
9. **"`chordVoicings()` reused as-is" was two adapters short, and `Board.omits` broke §6.** Its
   real signature is `(tuning, dots, rootPc)` returning `Board`s, not `(root, type)` returning
   fret arrays — and a `Board` may omit the 3rd or the 7th, leaving §6's "two lines, never more"
   with no anchor. **Resolved:** §5 names both adapters and filters guide-voice-omitting shapes
   out of the candidate list, with an honest fallback when filtering empties it. "Reused as-is"
   was true of the *generator*; it was never true of its interface.
10. **§6's guide tones were undefined for a third of the shipped qualities.** "The 5th standing in
    where a chord has no 7th" covers triads but not `sus2`/`sus4`, which have **no 3rd** — and
    both are in the 16 §1 admits. **Resolved:** §5 states one priority rule
    (3rd → 7th → 5th → root → other) that closes every case, and §6 defers to it rather than
    restating it, so the cost function and the drawing cannot disagree.
11. **The five layer toggles had no home and the shipped controls had no fate.** §6 required the
    toggles; §4.2's layout had no room for them. Separately, `labelMode`, `win` and `display` are
    app-global (`App.svelte:41,44`) and this tab uses none of them. **Resolved:** §4.2 puts the
    toggles under the neck as session-only state, and hides — does not disable, does not reset —
    the label-mode, display-mode and audio controls on this tab.

## Cross-cutting build notes

- **Build order:** §1's model first (everything reads from it), then §3's inference, then §4's
  layout, then §5's chain, then §6's rendering — each is the input to the next. §2, §7 and §8 can
  land in any order once §1 exists.
- **No new music data.** §1's vocabulary reuses the 16 shipped chord types and `spell()`; §3's
  candidates are 9 of the 12 shipped scales; §5's candidates are `chordVoicings()` unchanged. The
  only new *engine* code is the inference scorer and the voicing chain. Two mechanical edits to
  shipped files are still required and are not exceptions to this: **`note()` gets exported**
  (`theory.ts:56`, needed by §3), and **`Dot` gains three optional flags** plus `Fretboard` one
  `lines` prop (§4.7). Nothing is authored; nothing existing changes shape.
- **What the existing code gives this tab for free**, and should not be rebuilt: `board()`'s
  `'whole'` branch is §4.4's neck exactly, `Dot.faded` is §4.4's two tiers, `diatonicTriads()`'s
  case-plus-suffix construction is §1's numeral rule at 4 qualities instead of 16, `wrap()` is
  §5's nearest-signed transposition, and `tuningWarnings()` is the voice for all four soft
  warnings. Five of the six things this tab looked like it needed already exist under another
  name.
- **The two pieces of non-trivial pure logic are §3's scorer and §5's Viterbi chain**, and both
  ship with an assertion self-check on the presets, which were chosen partly to be that test set:
  `I ♭VII IV` → C Mixolydian with **zero** exceptions; `i IV` in D minor → **D Dorian**, not D
  minor; `I IV iv I` → C Ionian with exactly one exception, A♭ for A; `I V7/V V7 I` → one
  exception, F♯ for F, labelled "secondary dominant of V"; the 12-bar blues → Mixolydian, not
  Ionian. **Two of those five are decided by the tie-break, not by a margin** (§3) — the
  assertions must say so beside themselves, because reordering `SCALES` flips them.
- **Soft warnings, never blocking** is the house rule this tab inherits and uses in four places:
  an unknown chord suffix (§1), a strained parent (§3), a dropped override (§5), and an awkward
  stretch on this tuning (§5). All follow `tuningWarnings()`'s voice.
- **Accessibility:** §6's layers are distinguished by *form* — dot size, fill, dashed outline, cut
  ring, stroke — not by hue alone, so the neck stays readable under any colour vision. The
  function labels and swap sentences are text, not encodings.
