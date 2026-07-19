---
id: TICKET-007
title: Fretboard visual and interaction design
label: wayfinder:prototype
status: closed
assignee: Marcin
blocked_by: [TICKET-001, TICKET-002, TICKET-003]
---

## Question

Build a rough, throwaway fretboard prototype (per the chosen stack from TICKET-001) to
react to: neck orientation (horizontal/vertical), note labeling (note names, scale-degree
numbers, intervals, or a toggle), single-position vs whole-neck rendering (using the window
from TICKET-003), and how the content types from TICKET-002 (triads, 7ths, arpeggios) are
visually distinguished on the same fretboard. This is "how should it look/behave" — raise
fidelity with a concrete artifact rather than deciding in the abstract.

## Resolution

Built a 3-variant throwaway prototype (self-contained HTML + inline SVG — no Vite/Svelte
scaffold, since the decision is look-and-feel, not stack) and reacted to it live.

- Prototype asset: [`prototypes/007-fretboard.html`](prototypes/007-fretboard.html)
  (published artifact: https://claude.ai/code/artifact/c2adbbff-0be6-4056-94e6-4aa6f7867359).
  Variants: A horizontal whole-neck / shape-coded, B vertical single-position / color-coded,
  C horizontal dense / interval-coded. All render C major + Cmaj7 chord & arpeggio, standard tuning.

**Decisions:**

- **Orientation / layout: variant C — horizontal, dense, sidebar controls.** Landscape neck,
  whole fretboard visible with the 5-fret position window highlighted in place (not a separate
  single-position mode). Wins for seeing shapes across the neck while keeping analysis density.
- **Note labeling: a runtime toggle** across note names / scale-degree numbers / intervals.
  Provisional default = **note names** (soft; revisit during settings/onboarding design — too
  minor for its own ticket).
- **Content-type encoding: interval color + outline (variant C's scheme).** Chord tones get a
  colored fill + outline ring keyed to interval role (root / 3rd / 5th / 7th distinct hues);
  non-chord scale tones fade back; the **arpeggio is a directional, arrowed connecting path**
  rather than badges. Shape-only and color-per-role encodings (A/B) were set aside.

## Spec-review refinement (2026-07-19)

- **The arrowed arpeggio path is dropped.** On a dense whole-neck view there was no
  non-spaghetti way to define which occurrences the arrows connect. An arpeggio therefore
  renders *identically* to a single chord (interval color + outline); Scale/Chord/Arpeggio are
  distinguished by the content-type selector and by playback (TICKET-005), not by a distinct
  arpeggio glyph. Everything else in variant C's scheme stands.

**Implications for downstream tickets:**

- Single-position vs whole-neck is settled as *whole-neck with an in-place highlighted window* —
  there is no separate "position-only" view mode to design.
- The interval-color encoding is the baseline that multi-chord overlay
  ([TICKET-009](009-multi-chord-overlay.md)) must reconcile with: per-chord color has to coexist
  with (or override) per-interval color. That tension is already inside 009's question.
