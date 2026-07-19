---
id: MAP-001
title: Guitar scale/chord/tuning finder — spec
label: wayfinder:map
status: open
---

## Destination

A written, build-ready spec for a website that helps find scale and chord shapes on the
guitar across different tuning systems (classical E-A-D-G-B-E, all-fourths E-A-D-G-C-F,
and user-defined custom tunings). The spec covers: the music-theory data model, the tech
stack, and the UI/UX for single-position vs whole-neck display, diatonic-triad highlighting
on scales, and up-to-3-chord overlay comparison. Reaching the end means there is nothing
left to decide before implementation starts — this map does not build the website itself.

**Destination reached:** consolidated build-ready spec at [`guitar-map/spec.md`](guitar-map/spec.md),
assembled from the nine ticket resolutions below.

## Notes

- Domain: guitar music theory (scales, chords, triads, shell chords, arpeggios) and its
  representation across arbitrary string tunings.
- Use `/grilling` and `/domain-modeling` for decision tickets; use `/prototype` for the
  fretboard visual/interaction ticket.
- Standing preference: favor computing shapes from theory + tuning definitions over
  hand-curated per-tuning data, so new/custom tunings work without new authoring.

## Decisions so far

- [Choose tech stack and hosting](tickets/001-tech-stack.md) — Svelte 5 + TS + Vite, SVG
  fretboard, static host with no backend (all shapes computed client-side).
- [Define music-theory content scope](tickets/002-content-scope.md) — 12 scales (major, 6
  modes, both pentatonics, blues, harmonic + melodic minor), triads/7ths/sus/6/add9/shell
  chords, arpeggios as a separate content type, all 12 roots with key-correct enharmonic
  spelling.
- [Define position window size and navigation](tickets/003-position-window.md) — configurable
  4–6 fret span (default 5), click-a-fret-to-center + arrow nudges, fret 0 as an open-string
  column, window clamped to [0, lastFret].
- [Design custom tuning builder UX](tickets/004-custom-tuning-builder.md) — per-string note +
  octave dropdowns, variable 4–8 strings, soft non-blocking warnings, optional name persisted
  via favorites; renderer reads string count from the tuning (not hard-coded 6).
- [Design audio playback feature](tickets/005-audio-playback.md) — Web Audio synthesis at
  launch (samples deferred), chords strum / scales play ascending / click a note to hear it,
  true per-tuning pitch (`openStringPitch + fret`).
- [Design save/favorites persistence](tickets/006-save-favorites.md) — favorites = full view
  snapshots in localStorage (versioned JSON, ~50 soft cap), custom tunings auto-collected into
  the picker, auto-generated editable names, list panel with load/rename/delete.
- [Fretboard visual and interaction design](tickets/007-fretboard-visual-design.md) — horizontal
  dense neck (whole-neck with in-place highlighted 5-fret window; no separate position-only mode),
  runtime label toggle (names/degrees/intervals, default names), content types by interval
  color + outline with the arpeggio as a directional arrowed path. Prototype:
  [`007-fretboard.html`](tickets/prototypes/007-fretboard.html).
- [Diatonic triad highlighting UX for scale view](tickets/008-diatonic-triad-highlighting.md) —
  one triad at a time via a sidebar Roman-numeral degree selector (7-note scales only, hidden
  for pentatonic/blues); selecting a degree re-keys the existing interval colors to that triad's
  root; triads only (7ths deferred), passive lens (no overlay/chord-view actions).
- [Multi-chord overlay UX (max 3 chords)](tickets/009-multi-chord-overlay.md) — comparison-first:
  Chord view grows "+ Add chord" slots (max 3, independent chords), color switches from interval
  role to chord identity at 2+ chords, shared notes render as split fill in the contributing
  chords' colors, labels lock to note names in overlay.

## Not yet specified

- Modes of harmonic/melodic minor, and richer extended chords (9ths/11ths/13ths) beyond the
  launch set fixed in TICKET-002 — candidates for a post-launch content expansion.
- Diatonic *seventh* chords on the degree selector (Imaj7 ii7 …) as a triad/7th toggle —
  natural extension of TICKET-008's selector, deferred to keep the launch highlight legible.
- A diatonic-triad → multi-chord-overlay bridge ("send this triad to the overlay") — now that
  TICKET-009's overlay model is fixed (independent slots), this is just a "pre-fill a slot"
  action from TICKET-008's degree selector; deferred as a post-launch convenience.
- How many frets are shown in whole-neck view (12 vs full fretboard length) — orientation and
  window behaviour are now settled (TICKET-007); only the whole-neck fret count remains open.
- Realistic sample-based audio as a post-launch upgrade over the launch Web Audio synthesis
  (TICKET-005) — needs sample assets + licensing + pitch-shifting.
- Whether chord/scale results can be exported or shared (link, image, PDF) — not asked
  about yet, may or may not be worth a ticket.
- Mobile/touch support: explicitly a nice-to-have, not a designed-for requirement — revisit
  only if it turns out to be free, otherwise leave alone.
- Any onboarding/help content explaining unfamiliar tuning systems to newer players.

## Out of scope

- (none yet)
