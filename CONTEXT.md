# Guitar Map — Context

Domain and architecture overview for this repo, per the convention in
[`docs/agents/domain.md`](docs/agents/domain.md). Read this before exploring the codebase;
`docs/adr/` (empty so far) is where hard-to-reverse decisions get recorded as they happen.

The full design record — including rejected alternatives — lives in
[`wayfinder/guitar-map/spec.md`](wayfinder/guitar-map/spec.md). This file is the shorter,
living summary; the spec is the archive.

## What it is

A client-side tool that computes scale, chord, and arpeggio shapes on a guitar (or bass) neck
in any tuning, plus a fourth tab for chord progressions. Nothing is per-tuning authored: every
shape is derived at runtime from an interval formula and a tuning definition.

## Tech stack

- **Svelte 5** (runes: `$state`, `$derived`, `$effect`) + **TypeScript**, built with **Vite**.
- **SVG** fretboard rendering — every note is a real, focusable, ARIA-labelled element.
- **Tone.js** (`Tone.Sampler`) for audio, dynamically imported on first sound so it's not in
  the initial bundle. Recorded guitar samples under `public/samples/guitar-acoustic/`,
  pitch-shifted to cover the full range.
- **`localStorage`** for persistence — favorites and custom tunings. No backend, no accounts;
  the build output in `dist/` is a static bundle deployable anywhere.
- **Vitest** for tests (`*.test.ts` files next to the modules they cover).

## Module map

| Module | Owns |
|---|---|
| `src/lib/theory.ts` | Pure music theory: scales, chords, the key-correct spelling engine, tunings, pitch ↔ MIDI ↔ Hz. No knowledge of the UI. |
| `src/lib/progression.ts` | The chord-progression model: a `Key` + ordered `Chord[]`, Roman-numeral ↔ symbol conversion, preset progressions. Builds on `theory.ts`. |
| `src/lib/view.ts` | Turns a `Content` selection into what the fretboard draws (`Dot`s, `Board` cells) and what audio plays. Keeps `Fretboard.svelte` dumb — it only renders what it's handed. Also owns chord-voicing search (which frets are actually playable) and octave-path walking. |
| `src/lib/store.svelte.ts` | The `Content`/`Favorite`/`Display` types, and favorites + auto-collected custom tunings in `localStorage`. |
| `src/lib/audio.ts` | Sampler playback: single note, strum (chord), sequence (scale/arpeggio). Pure scheduling functions are unit-tested against a stubbed sampler. |
| `src/App.svelte` | Tab state, per-tab content stash, sidebar controls, wires `view.ts` output into `Fretboard.svelte`. |
| `src/lib/Fretboard.svelte` | Whole-neck SVG render: note dots, fret window, drag-to-select. |
| `src/lib/Progression.svelte` | The progression tab's own UI (separate from the sidebar-driven scale/chord/arpeggio tabs). |
| `src/lib/TuningPicker.svelte` | Preset + custom tuning selection and the custom tuning builder. |
| `src/lib/Favorites.svelte` | Save/load/rename/delete favorites panel. |

Data flow is one-directional: `App.svelte` holds the selection state (`content`, `tuning`,
`display`, `win`) → `view.ts` derives `Dot`s and `Board` cells (pure functions, no Svelte) →
`Fretboard.svelte` renders them and `audio.ts` plays them.

## Domain glossary

- **`Content`** — what's selected to view: a tagged union over `scale` / `chord` (1–3 slots,
  ≥2 = overlay) / `arpeggio` / `progression`. Each tab keeps its own `Content` in a stash, so
  switching tabs doesn't lose your place (bridges between tabs set a target tab's content and
  switch to it, e.g. sending a progression chord to the Chord tab).
- **`Display`** — how much of the neck to show: `position` (a 4–6 fret window), `octaves`
  (1–3 octaves up from a chosen root anchor), or `whole` (every occurrence, all 24 frets).
- **`Board`** — the computed `{ cells, barre, omits, ghosts }` for the current `Content` +
  `Display`: which `(string, fret)` cells get a dot, whether they're barred, which chord tones
  don't fit in the window (`omits`), and faint alternate-root markers in octave mode (`ghosts`).
- **`Dot`** — what a pitch class *looks like*: label, color(s), faded/outline state. `view.ts`
  separates "what a pitch class looks like" (`Dot`, from `noteMap`) from "where it appears"
  (`Board`, from `board`) — the same map of dots gets projected onto different fret ranges.
- **Voicing** — one playable fingering of a single chord, found by brute-force search over a
  5-fret window and scored by completeness, root-in-bass, and hand span/finger count. A single
  chord (not overlay, not scale/arpeggio) steps through its voicings rather than sliding a
  window.
- **Spelling engine** (`theory.ts`'s `spell`/`note`) — the one non-trivial piece of pure logic:
  note names are key-correct (letter-first, then accidental), not just pitch-class-correct, so
  F♯ major spells E♯ and Cdim7's 7th spells B𝄫. Self-checked in `theory.test.ts`.
- **Favorite** — a full, self-contained view snapshot (tuning embedded, not referenced) saved
  to `localStorage`. Progression favorites omit `window`/`labelMode`/`display`, since the
  progression tab doesn't use them.

## Conventions this repo already follows

- Section numbers in code comments (e.g. `(§7)`) refer to `wayfinder/guitar-map/spec.md`
  section numbers, or to a `TICKET-NNN` under `wayfinder/tickets/` for anything built after
  the spec. Follow a `§N` reference back to the spec for the reasoning, not just the rule.
- Issue tracking is local markdown under `wayfinder/` — see
  [`wayfinder/TRACKER.md`](wayfinder/TRACKER.md) for the convention and
  [`wayfinder/map.md`](wayfinder/map.md) / [`map-002.md`](wayfinder/map-002.md) for the maps.
