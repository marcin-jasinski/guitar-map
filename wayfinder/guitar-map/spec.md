# Guitar Map — Build-Ready Spec

A website that helps guitarists find scale, chord, and arpeggio shapes across arbitrary
tuning systems. All shapes are **computed client-side from interval formulas + a tuning
definition** — no per-tuning authoring — so classical (E-A-D-G-B-E), all-fourths
(E-A-D-G-C-F), and user-defined tunings all work from the same engine.

This document consolidates the decisions from wayfinder tickets [001–009](../map.md). Each
section cites its source ticket, which remains the authority for the reasoning behind a
decision. Nothing here is new — where a point is still open, it is flagged **[open]**.

---

## 1. Stack & hosting — [TICKET-001](../tickets/001-tech-stack.md)

- **Svelte 5 + TypeScript, built with Vite** to a static bundle.
- **SVG** fretboard rendering — every fret line and note dot is a real SVG element, giving
  per-note click/hover handlers, per-chord/per-degree coloring, shape-outline overlays, and an
  **accessibility surface** (focusable elements + ARIA labels, and every dot already carries its
  text label so information is never color-only); crisp at any size and printable. SVG makes
  accessibility *possible*, not automatic — the labels and ARIA are a build requirement, not free
  (see the a11y note under Cross-cutting). (Canvas and CSS-grid DOM rejected.)
- **Static hosting, no backend** — no API, DB, or auth. Deploy the bundle to any static host
  (Cloudflare Pages / Netlify / GitHub Pages are interchangeable, decided at deploy time).
- Persistence is `localStorage` only (§8). A backend is revisited only if sharing/accounts
  ever graduate from the fog.

## 2. Music-theory data model & content scope — [TICKET-002](../tickets/002-content-scope.md)

Shapes derive from interval formulas (semitones from root). Each formula is one data-table
entry; adding more later is trivial.

**Scales (12):**

| Scale | Intervals | | Scale | Intervals |
|---|---|---|---|---|
| Major (Ionian) | 0 2 4 5 7 9 11 | | Minor pentatonic | 0 3 5 7 10 |
| Natural minor (Aeolian) | 0 2 3 5 7 8 10 | | Major pentatonic | 0 2 4 7 9 |
| Dorian | 0 2 3 5 7 9 10 | | Minor blues | 0 3 5 6 7 10 |
| Phrygian | 0 1 3 5 7 8 10 | | Harmonic minor | 0 2 3 5 7 8 11 |
| Lydian | 0 2 4 6 7 9 11 | | Melodic minor (asc.) | 0 2 3 5 7 9 11 |
| Mixolydian | 0 2 4 5 7 9 10 | | | |
| Locrian | 0 1 3 5 6 8 10 | | | |

**Chords:**
- Triads: major `0 4 7`, minor `0 3 7`, diminished `0 3 6`, augmented `0 4 8`
- 7ths: maj7 `0 4 7 11`, min7 `0 3 7 10`, dom7 `0 4 7 10`, m7♭5 `0 3 6 10`, dim7 `0 3 6 9`
- Suspended/added: sus2 `0 2 7`, sus4 `0 5 7`, 6 `0 4 7 9`, add9 `0 2 4 7`
- Shell voicings (no 5th): maj7 shell `0 4 11`, dom7 shell `0 4 10`, min7 shell `0 3 10`

**Content categories:** Scale / Chord / Arpeggio are the three selectable types. An arpeggio
reuses the chord formulas — no new formulas — and shares a *single* chord's note set **and its
visuals** (interval color + outline, §3). The two differ only in playback (an arpeggio
sequences note-by-note, §6) and in that overlay (§9) is Chord-only.

**Roots:** 17 spelled roots — the 7 naturals plus both spellings of each of the 5 black
keys (C♯/D♭, D♯/E♭, F♯/G♭, G♯/A♭, A♯/B♭), chosen by transpose (no per-key authoring). The
picked spelling drives the enharmonic engine below, so F♯-major and G♭-major are distinct
selections. (Enharmonic-of-a-white-key roots — B♯, E♯, C♭, F♭ — are not offered.)

**Enharmonic spelling is key-correct**, not just pitch-class — note names follow the
key/scale context. Requires a small spelling engine; the rules (a **data-model requirement**,
not a separate build phase):

- **Seven-note scales** (major, all modes, harmonic/melodic minor): spell each degree by
  letter first (one of the seven letters per degree), then apply sharps/flats — so F♯ major
  spells E♯, not F. Double accidentals are rendered faithfully where the letter arithmetic
  demands them (e.g. a pathological root like A♯ major → C𝄪); no respelling pass.
- **Pentatonics** inherit their letters from the parent seven-note scale (minor pentatonic ⊂
  natural minor, major pentatonic ⊂ major): C minor pentatonic = C E♭ F G B♭.
- **Blues** = minor pentatonic + the ♭5 blue note, which reuses an already-present letter
  (C blues = C E♭ F G♭ G B♭ — letter G appears twice). This is the one deliberate exception
  to "one letter per degree."
- **Chords viewed in isolation** (Chord view, no key context): spell each chord tone by its
  chord-degree letter off the picked root — root, 3rd = letter+2, 5th = letter+4, 7th =
  letter+6, with accidentals from the semitone offset. Falls out of the same engine keyed on
  chord intervals instead of scale intervals: Caug = C E G♯, Cdim = C E♭ G♭, Cdim7's 7th = B𝄫.

## 3. Fretboard visual & interaction — [TICKET-007](../tickets/007-fretboard-visual-design.md)

- **Layout: horizontal, dense, whole-neck** with a sidebar of controls (prototype variant C).
  The whole fretboard is visible with the position window (§4) highlighted **in place** —
  there is **no separate single-position view mode**.
- **Note labeling: a runtime toggle** across note names / scale-degree numbers / intervals.
  Provisional default = **note names** [open — revisit at settings/onboarding design]. Which
  options the toggle offers depends on content type: **Scale** offers all three; **Chord** and
  **Arpeggio** offer names + intervals only (scale-degree numbers need a tonic + scale context
  a bare chord lacks — for a chord "degree" would just duplicate the interval label); **overlay**
  (2+ chords) locks to names (§9).
- **Content-type encoding (single-content view): interval color + outline.** Chord tones get
  a colored fill + outline ring keyed to interval role (root / 3rd / 5th / 7th distinct hues);
  non-chord scale tones fade back. An **arpeggio renders identically to a single chord** (same
  interval colors + outline) — the connecting-arrow idea was dropped as visual noise on a dense
  whole-neck view. Scale / Chord / Arpeggio are told apart by the content-type selector and by
  playback (§6), not by a distinct arpeggio glyph.
- Prototype asset: [`prototypes/007-fretboard.html`](../tickets/prototypes/007-fretboard.html).

## 4. Position window & navigation — [TICKET-003](../tickets/003-position-window.md)

- **Width: configurable 4–6 frets, default 5** (stepper or segmented control). Part of view
  state; saved with favorites.
- **Navigation:** click any fret to center the window on it; prev/next arrows and keyboard
  ←/→ nudge ±1 fret; a readout shows the current range (e.g. "frets 5–9").
- **Edges:** fret 0 (open strings) is a real column rendered at the low end. The window clamps
  to `[0, lastFret]`; near an edge, click-to-center falls back to the clamped position (the
  clicked fret stays inside the window but may not be dead-center).
- The window consumes `lastFret` as its upper clamp. **Whole-neck fret count = 24** (render
  frets 0–24, two octaves — matches a 24-fret electric), so `lastFret = 24` and the window's
  highest position is `20 .. 24`.

## 5. Custom tuning builder — [TICKET-004](../tickets/004-custom-tuning-builder.md)

- **Input: per-string note dropdown + octave selector.** The note dropdown shows all 12
  pitch classes with both spellings on the black keys (C, C♯/D♭, D, D♯/E♭, … B), so a
  flat-tuned string reads as "E♭", not "D♯", and auto-labels (§8) match how players write
  tunings. The octave selector spans **0–8** (covers B0 on a 5-string bass through the top
  frets). A string's pitch is `{ note, octave }` in scientific pitch notation; no free-text parsing.
- **Preset tunings (built-in, 6):** Standard `E A D G B E`, Drop D `D A D G B E`, Half-step
  down `E♭ A♭ D♭ G♭ B♭ E♭`, DADGAD `D A D G A D`, Open G `D G D G B D`, Open D `D A D F♯ A D`,
  All-fourths `E A D G C F`, 7-string standard `B E A D G B E`. Each is just a `Tuning` object;
  the list is trivially extended. Standard is the default on first load.
- **String count: variable ~4–8** (add/remove string rows), defaulting to the current
  tuning's count. The renderer **must take string count from the tuning, not hard-code 6** —
  7/8-string guitars and 4-string bass all work.
- **Validation: warn, never block.** Any pitch set is accepted; soft non-blocking warnings
  flag oddities (non-ascending pitches, extreme adjacent intervals). Save is never disabled.
- **Naming/save: optional name** defaulting to an auto-label from the pitches ("E A D G C F"),
  persisted via favorites (§8). Unnamed/unsaved custom tunings remain usable within the session.

## 6. Audio playback — [TICKET-005](../tickets/005-audio-playback.md)

- **Web Audio synthesis at launch** (oscillator + plucked-string-style ADSR envelope). Zero
  audio assets, any pitch free, no licensing/bandwidth cost. Sample-based tone is deferred (§10).
- **Behavior:** chords play as a quick strum (short low→high stagger); scales play ascending
  note-by-note in a timed sequence; arpeggios use the same sequencing path as scales; clicking
  any single note plays just that note.
- **Tuning-aware:** frequency derives from `pitch = openStringPitch(tuning, string) +
  fretSemitones`, so alternate/custom tunings sound correct. Reuses the `{ note, octave }`
  data the tuning builder captures. **Reference: A4 = 440 Hz, scientific pitch notation**
  (middle C = C4, standard low E = E2); `freq = 440 * 2^((midi − 69) / 12)` from the
  `{note, octave}` → MIDI number.

## 7. Diatonic triad highlighting (scale view) — [TICKET-008](../tickets/008-diatonic-triad-highlighting.md)

- **One triad at a time via a sidebar Roman-numeral degree selector.** Default state is the
  plain scale (nothing selected); picking a degree highlights that triad; re-click / "clear"
  returns to the plain scale. (Showing all seven at once was rejected — it lights up nearly
  every note in clashing colors.)
- **Coloring re-keys to the selected triad:** its three notes take the existing root/3rd/5th
  hues (§3) relative to the *triad's* root; the other four scale notes fade to the non-chord
  state. A selected diatonic triad thus renders identically to viewing that chord directly.
- **Seven-note scales only** (major, all 7 modes, harmonic minor, melodic minor asc.). For
  pentatonics/blues the selector is **hidden** (not disabled). Rule is mechanical: scale has
  7 notes → show the selector.
- **Chip labels: Roman numeral + quality glyph** (`I ii iii IV V vi vii°`, `+` = augmented;
  case = major/minor) paired with the concrete key-correct chord symbol (`ii` / `Dm`, spelled
  per §2).
- **Scope: triads only** (diatonic 7ths deferred, §10). **Passive lens** — no "open in chord
  view" / "add to overlay" actions here (§10 notes the future bridge).
- Highlights across the whole neck at every occurrence; the 5-fret window stays emphasized in
  place; faded scale notes remain visible.

## 8. Save / favorites persistence — [TICKET-006](../tickets/006-save-favorites.md)

- **A favorite = a full view snapshot** (the whole restorable screen state). Separately, any
  custom tuning the user builds is **auto-collected** into a persisted tunings list so it
  reappears in the picker even without saving a favorite.
- **Storage: `localStorage`, versioned JSON key, no accounts, soft cap ~50 favorites** (warn
  on exceed; deletion never blocked).
- **Management: auto-generated editable name** ("C blues — Drop D — whole neck"); a favorites
  panel lists them with load / rename / delete per row. No reordering.

**Schema (indicative):**

```ts
type Pitch = { note: string; octave: number };        // note e.g. "C", "F#", "Eb" (§2 spelling)
type Tuning = { name?: string; strings: Pitch[] };     // ordered low→high, 4–8 strings

type ChordSlot = { root: string; type: string };      // e.g. { root: "C", type: "maj7" }

// Content is a union on kind so illegal states can't be stored:
//   scale carries the optional selected diatonic-triad degree (§7);
//   chord carries 1–3 slots (overlay when ≥2, §9); arpeggio is one chord's note set (§2).
type Content =
  | { kind: "scale";    root: string; scale: string; degree: number | null }  // degree 1–7 or null
  | { kind: "arpeggio"; root: string; chord: string }
  | { kind: "chord";    slots: ChordSlot[] };                                  // length 1–3

type Favorite = {
  id: string;
  name: string;                                        // auto, editable
  tuning: Tuning;                                       // embedded (self-contained snapshot)
  content: Content;
  window: { startFret: number; width: number };        // width 4–6 (§4)
  labelMode: "names" | "degrees" | "intervals";        // (§3); forced "names" in overlay (§9)
};

type Store = {
  version: 1;
  favorites: Favorite[];                               // soft cap ~50
  customTunings: Tuning[];                             // auto-collected, feeds the picker
};
```

There is **no `view` field** — §7 settled that there is no separate position-only mode, so the
whole-neck render plus `window` is the entire position state. `labelMode` is a concrete enum;
overlay (§9) forces it to `"names"` while ≥2 chord slots are active.

## 9. Multi-chord overlay (max 3 chords) — [TICKET-009](../tickets/009-multi-chord-overlay.md)

Purpose: **reveal relationships between up to 3 chords** on one shared neck — common tones and
how shapes relate. Overlaps are the feature.

- **Overlay is Chord view with slots** — no separate mode. Chord view starts with one chord; a
  **"+ Add chord"** control reveals slot 2, then slot 3 (hard max 3). Each slot = the existing
  root+type picker, plus a color swatch and a remove ×.
- **Color rule follows slot count:** 1 chord → §3's interval-role colors; **2–3 chords → color
  encodes chord identity** (chord 1 / 2 / 3 each get one hue). Adding the 2nd chord flips the
  neck into overlay coloring; removing back to one restores interval roles.
- **Shared notes render as split fill** in the contributing chords' colors — half for two,
  thirds for three — showing *which* chords share the note.
- **Slots are fully independent** — any root, any §2 chord type, no key constraint.
- **Labels lock to note names while 2+ chords are active** (degree/interval has no single root
  to reference); the toggle greys out and returns at one chord.
- **Per-slot audio:** each slot reuses §6's strum via its own play button.
- **Scope:** overlay applies to the **Chord** category only (Scale and Arpeggio stay
  single-content). Chord-identity palette (3 hues that don't clash with the faded state) is an
  implementation/prototype detail, **[open]** — with one constraint: overlay encodes chord
  identity by **color alone**, so the 3 hues must be colorblind-distinguishable, or the split-fill
  must carry a non-color cue (e.g. a small chord-number badge 1/2/3). Pin this when the palette
  is chosen.

## 10. Deferred / out of scope

Explicitly **not** built at launch (from the map's *Not yet specified*):

- Modes of harmonic/melodic minor; extended chords (9/11/13) — post-launch content expansion.
- Diatonic **seventh** chords on the §7 degree selector (triad/7th toggle).
- A diatonic-triad → overlay bridge ("send this triad to a §9 slot") — now just "pre-fill an
  independent slot"; post-launch convenience.
- Sample-based audio as an upgrade over §6's synthesis.
- Export/share of results (link/image/PDF) — not yet evaluated.
- Mobile/touch — nice-to-have, not designed-for; revisit only if free.
- Onboarding/help explaining unfamiliar tuning systems.

## Cross-cutting build notes

- The **spelling engine** (§2), **whole-neck-with-window renderer** (§3–4), and
  **tuning-driven string count** (§5) are the three model requirements every view depends on;
  build them first.
- View state saved by favorites (§8) is the single `Favorite` object — tuning, the `content`
  union (scale+degree / arpeggio / 1–3 chord slots), window, and label mode — kept serializable
  so snapshot/restore is trivial. (There is no `view` field; see §8.)
- The **spelling engine** (§2) is the one piece of non-trivial pure logic and the easiest to get
  subtly wrong, so it ships with an assertion self-check covering the tricky cases: F♯ major →
  E♯; C blues → C E♭ F G♭ G B♭ (repeated letter G); C minor pentatonic → C E♭ F G B♭; Cdim7's
  7th → B𝄫; Caug → C E G♯.
- **Accessibility** is a build requirement, not free from SVG (§1): note dots are focusable with
  ARIA labels and keyboard reachable; the always-present text label keeps every encoding from
  being color-only, except overlay chord-identity, which §9 constrains separately.
