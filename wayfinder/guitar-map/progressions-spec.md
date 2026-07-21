# Chord Progression Explorer — Build-Ready Spec

A fourth tab for Guitar Map: the player picks or edits a chord progression in any key and learns
**how to solo over it** — the parent scale it lives in, the per-chord exceptions, and how the
chords connect. Everything is computed from the shipped engine; no new music data is authored.

This document consolidates the decisions from wayfinder tickets [010–018](../map-002.md). Each
section cites its source ticket, which remains the authority for the reasoning behind a decision.
Nothing here is new except §10, which records contradictions surfaced while assembling and how
they were resolved. Where a point is still open, it is flagged **[open]**.

It builds on the shipped app ([`spec.md`](spec.md)) and **amends it in two places** — see §10.

---

## 1. Progression data model — [TICKET-010](../tickets/010-progression-model.md)

A progression is **a key plus an ordered list of Roman-numeral chords**. The numeral is the
stored form; the chord symbol is always derived and never persisted.

```ts
type Key   = { root: string; tonality: 'major' | 'minor' };    // root ∈ ROOTS (§2 of spec.md)
type Deg   = { degree: 1|2|3|4|5|6|7; alter?: -1 | 1 };
type Chord = Deg & { quality: keyof typeof CHORDS; of?: Deg };
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
- **Key = root + major|minor only.** Major uses Ionian degrees; minor uses **natural-minor
  (Aeolian)** degrees, so III/VI/VII need no flat sign and harmonic minor's V7 is an ordinary
  altered chord. Modal progressions need no modal key: D Dorian is the key of D minor with a IV
  instead of a iv — and that IV *is* the Dorian signal. Naming the mode is inference (§3).
- **Symbols derive** as `spell()` of the key root by the degree's letter-step and semitones,
  nested through `of` for secondaries. Spelling is key-correct for free; double accidentals
  render faithfully, exactly as elsewhere in `theory.ts`.
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
  §3's strained line, which is advice about the music, not a validity verdict.

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
| ii–V–I | major | `ii7 V7 Imaj7` | the jazz cadence; guide tones at their clearest |
| 12-bar blues | major | `I7×4 IV7×2 I7×2 V7 IV7 I7 V7` | parent lands on Mixolydian, not Ionian |
| Mixolydian rock | major | `I ♭VII IV` | borrowed ♭VII, parent shifts to fit — **zero** exceptions |
| Dorian vamp | minor | `i IV` | modal naming: reports "D Dorian", not "D minor" |
| Borrowed iv | major | `I IV iv I` | one exception, ♭6 — the cleanest possible swap |
| Secondary dominant | major | `I V7/V V7 I` | the `of` field and the ♯4 swap |
| Andalusian cadence | minor | `i VII VI V` | major V in a minor key — the ♯7 exception |
| Minor ii–V–i | minor | `iim7♭5 V7 i` | two exceptions at once, and the strained threshold |

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
- **Name: tonic plus the scale's own name** — always "D Dorian", never "C major".
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

### 4.3 Stepping

Click a rail entry, or **↑ ↓**. Stepping **wraps** — the progression is a loop, and the last
chord's forward view points back at the first. Stepping changes only which chord is current; it
never moves the neck.

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

## 5. Voicing selection & override — [TICKET-014](../tickets/014-voicing-selection.md)

```ts
type Voicing = { frets: (number | null)[]; pinned: boolean };
solveChain(prog, tuning): Voicing[]
```

- **The voicing is never drawn.** §4.4's neck shows every occurrence of the chord's tones, so a
  voicing has no shape to be. Its job is to be the **frame the guide-tone line hangs on**: it
  decides *which* occurrence of the 3rd and the 7th the line passes through. It surfaces only as
  a readout under the neck (`x-3-5-5-4-3`) and, indirectly, as the line's path.
- **Smooth = guide-voice movement, then hand travel.** Primary cost between consecutive chords is
  how far the two guide voices move in frets — literally the drawn line's length. Tie-break on
  whole-hand travel, so a voicing cannot leap ten frets to save the line a semitone. The classic
  **7th-falls-to-3rd** resolution emerges from minimising this rather than being special-cased.
- **Candidates: `chordVoicings()` reused as-is.** It already returns deduped `Board`s — roughly
  one best shape per fret window, scored for root-in-bass, completeness, fingers and span. That is
  ~12–15 shapes per chord. **No new generator.**
- **Chain: one global Viterbi pass.** At most 32 chords × ~15 candidates is a few hundred
  comparisons. An overridden chord is a **fixed constraint** (its column holds one shape) and the
  pass re-runs — so **nothing "re-flows"**: there is no forward-only or bidirectional question,
  because the chain is always solved whole. Two overrides are no harder than one.
- **Override UI:** the readout becomes a **stepper** — `◄ ►` through candidates low-to-high with
  "Shape 3 of 12", plus **Clear** back to auto. Stepping sets the pin.
- **Overrides transpose.** Stored as the chosen shape's fret positions and **shifted by the same
  interval** when the key changes. One that cannot survive the shift — off the neck, or using open
  strings that no longer exist — is **dropped with a soft note** naming which chords reverted to
  auto. Editing a chord's degree or quality clears **only that chord's** override.
- **Awkward on this tuning:** when the optimal chain still leaves a change moving the guide voices
  more than about **5 frets**, one soft line names that change.

## 6. Guide tones & common tones — [TICKET-015](../tickets/015-connection-rendering.md)

Prototype asset: [`prototypes/015-connections.html`](../tickets/prototypes/015-connections.html)
(variant LINE is the spec; its guide-tone path is real, chained by §5's rule).

- **Guide tones: two arrowed lines to the next chord.** The 3rd and the 7th (the 5th standing in
  where a chord has no 7th) each draw as an arrowed line from where they sit in this chord's
  voicing to where they sit in the next chord's. **Two lines, never more.**
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
  No interlock is needed to police them.
- **Colour:** the line uses `--accent`. §4.4 flagged a possible collision with the position
  window, which also uses accent — **no clash, because this tab has no position window.**

## 7. Persistence — [TICKET-016](../tickets/016-progression-persistence.md)

A progression becomes a **fourth `Content` kind**; the store **stays at `version: 1`**.

```ts
export type Content =
  | { kind: 'scale'; … } | { kind: 'arpeggio'; … } | { kind: 'chord'; … }
  | { kind: 'progression'; key: Key; chords: Chord[];
      overrides: Record<number, (number | null)[]>; step: number };
```

- One favorites list, one save button, one delete, one soft cap: `addFavorite`,
  `describeContent` and `favoriteName` each extend by a single branch.
- **The version must not bump.** `load()` returns the default store unless `parsed.version === 1`,
  so a bump would silently discard every existing favorite unless a migration were written first.
  Adding a union member needs no bump.
- **`window` and `labelMode` become optional** on `Favorite`, exactly as `display?` already is;
  the progression branch omits them rather than writing values nothing reads. Existing favorites
  are unaffected — they all carry both. (This amends `spec.md` §8; see §10.)
- **Saved:** key, chords, **pinned** overrides, current step.
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

Assembly is where separately-made decisions meet. Five surfaced; all are resolved here rather
than left for an implementer.

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

## Cross-cutting build notes

- **Build order:** §1's model first (everything reads from it), then §3's inference, then §4's
  layout, then §5's chain, then §6's rendering — each is the input to the next. §2, §7 and §8 can
  land in any order once §1 exists.
- **Nothing new in `theory.ts`.** §1's vocabulary reuses the 16 shipped chord types and `spell()`;
  §3's candidates are 9 of the 12 shipped scales; §5's candidates are `chordVoicings()` unchanged.
  The only new *engine* code is the inference scorer and the voicing chain.
- **The two pieces of non-trivial pure logic are §3's scorer and §5's Viterbi chain**, and both
  ship with an assertion self-check on the presets, which were chosen partly to be that test set:
  `I ♭VII IV` → C Mixolydian with **zero** exceptions; `i IV` in D minor → **D Dorian**, not D
  minor; `I IV iv I` → C Ionian with exactly one exception, A♭ for A; `I V7/V V7 I` → one
  exception, F♯ for F, labelled "secondary dominant of V"; the 12-bar blues → Mixolydian, not
  Ionian.
- **Soft warnings, never blocking** is the house rule this tab inherits and uses in four places:
  an unknown chord suffix (§1), a strained parent (§3), a dropped override (§5), and an awkward
  stretch on this tuning (§5). All follow `tuningWarnings()`'s voice.
- **Accessibility:** §6's layers are distinguished by *form* — dot size, fill, dashed outline, cut
  ring, stroke — not by hue alone, so the neck stays readable under any colour vision. The
  function labels and swap sentences are text, not encodings.
