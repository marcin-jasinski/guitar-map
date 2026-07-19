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
  per-note click/hover handlers, per-chord/per-degree coloring, shape-outline overlays, and
  accessibility for free; crisp at any size and printable. (Canvas and CSS-grid DOM rejected.)
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
reuses the chord formulas but renders as a single-note spread across the neck (§5); no new
formulas — a chord and its arpeggio share note sets, differing only in presentation.

**Roots:** all 12 chromatic roots via transpose (no per-key authoring).

**Enharmonic spelling is key-correct**, not just pitch-class — note names follow the
key/scale context so each of the seven letters is used once where theory calls for it (F♯
major spells E♯, not F). Requires a small spelling engine: spell each degree by letter first,
then apply sharps/flats. Well-understood algorithm; a **data-model requirement**, not a
separate build phase.

## 3. Fretboard visual & interaction — [TICKET-007](../tickets/007-fretboard-visual-design.md)

- **Layout: horizontal, dense, whole-neck** with a sidebar of controls (prototype variant C).
  The whole fretboard is visible with the position window (§4) highlighted **in place** —
  there is **no separate single-position view mode**.
- **Note labeling: a runtime toggle** across note names / scale-degree numbers / intervals.
  Provisional default = **note names** [open — revisit at settings/onboarding design].
- **Content-type encoding (single-content view): interval color + outline.** Chord tones get
  a colored fill + outline ring keyed to interval role (root / 3rd / 5th / 7th distinct hues);
  non-chord scale tones fade back; an **arpeggio is a directional, arrowed connecting path**
  rather than badges.
- Prototype asset: [`prototypes/007-fretboard.html`](../tickets/prototypes/007-fretboard.html).

## 4. Position window & navigation — [TICKET-003](../tickets/003-position-window.md)

- **Width: configurable 4–6 frets, default 5** (stepper or segmented control). Part of view
  state; saved with favorites.
- **Navigation:** click any fret to center the window on it; prev/next arrows and keyboard
  ←/→ nudge ±1 fret; a readout shows the current range (e.g. "frets 5–9").
- **Edges:** fret 0 (open strings) is a real column rendered at the low end. The window clamps
  to `[0, lastFret]`; near an edge, click-to-center falls back to the clamped position (the
  clicked fret stays inside the window but may not be dead-center).
- The window consumes `lastFret` as its upper clamp; the whole-neck fret count itself is
  **[open]** (§10) and does not affect window logic.

## 5. Custom tuning builder — [TICKET-004](../tickets/004-custom-tuning-builder.md)

- **Input: per-string note dropdown (C…B) + octave selector.** A string's pitch is
  `{ note, octave }`; no free-text parsing.
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
  data the tuning builder captures.

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
type Pitch = { note: string; octave: number };        // note = "C".."B" incl. sharps/flats
type Tuning = { name?: string; strings: Pitch[] };     // ordered low→high, 4–8 strings

type Favorite = {
  id: string;
  name: string;                                        // auto, editable
  tuning: Tuning;                                       // embedded (self-contained snapshot)
  root: string;                                         // e.g. "C", "F#"
  contentType: "scale" | "chord" | "arpeggio";
  selection: string;                                    // e.g. "blues", "maj7", "min7"
  view: "position" | "wholeNeck";
  window: { startFret: number; width: number };        // width 4–6 (§4)
  labelMode: string;                                    // names | degrees | intervals (§3)
};

type Store = {
  version: 1;
  favorites: Favorite[];                               // soft cap ~50
  customTunings: Tuning[];                             // auto-collected, feeds the picker
};
```

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
  implementation/prototype detail, **[open]**.

## 10. Deferred / out of scope

Explicitly **not** built at launch (from the map's *Not yet specified*):

- Modes of harmonic/melodic minor; extended chords (9/11/13) — post-launch content expansion.
- Diatonic **seventh** chords on the §7 degree selector (triad/7th toggle).
- A diatonic-triad → overlay bridge ("send this triad to a §9 slot") — now just "pre-fill an
  independent slot"; post-launch convenience.
- Whole-neck **fret count** (12 vs full length) — the one open item inside settled window
  behavior. **[open]**
- Sample-based audio as an upgrade over §6's synthesis.
- Export/share of results (link/image/PDF) — not yet evaluated.
- Mobile/touch — nice-to-have, not designed-for; revisit only if free.
- Onboarding/help explaining unfamiliar tuning systems.

## Cross-cutting build notes

- The **spelling engine** (§2), **whole-neck-with-window renderer** (§3–4), and
  **tuning-driven string count** (§5) are the three model requirements every view depends on;
  build them first.
- View state saved by favorites (§8) is the union of root, content type, selection, tuning,
  window, view, and label mode — keep it a single serializable object so snapshot/restore is
  trivial.
