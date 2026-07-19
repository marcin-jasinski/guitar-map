---
id: TICKET-008
title: Diatonic triad highlighting UX for scale view
label: wayfinder:grilling
status: closed
assignee: Marcin
blocked_by: [TICKET-002, TICKET-007]
---

## Question

When a scale is displayed, its diatonic triads (built on each scale degree) must be
highlighted. How: a toggle overlay, one triad at a time via a degree selector, or all seven
shown simultaneously with distinct colors? Does this apply to every scale type in
TICKET-002's scope, or only ones where "diatonic triad" is a meaningful concept (e.g. modes
of major vs a pentatonic)?

## Resolution

**One triad at a time via a sidebar degree selector.** Showing all seven simultaneously
was rejected: in a 7-note scale each note belongs to three diatonic triads and notes repeat
across the whole neck, so "all seven" lights up nearly every fretted note in clashing colors
and fights the interval-color scheme. Default state is the plain scale (nothing selected);
picking a degree highlights its triad, re-clicking / "clear" returns to plain scale.

**Coloring re-keys to the selected triad.** Its three notes take the app's existing
root/3rd/5th hues (TICKET-007), now relative to the *triad's* root; the other four scale
notes drop to the faded non-chord-tone state. This reuses the existing color vocabulary (no
new legend) and makes a selected diatonic triad render identically to viewing that chord
directly — correct, since they are the same object. Deselect restores full scale coloring.

**Enabled only for seven-note scales** (major, all 7 modes, harmonic minor, melodic minor
asc.). For pentatonics/blues the selector is **hidden**, not disabled — diatonic thirds
don't stack cleanly there and there's nothing useful to explain. Rule is mechanical:
scale has 7 notes → show the selector; no per-scale authoring.

**Chip labels: Roman numeral + quality glyph** (`I ii iii IV V vi vii°`, `+` = augmented;
uppercase = major, lowercase = minor) paired with the concrete, key-correct chord symbol
(`ii` / `Dm`, spelled per TICKET-002's enharmonic engine). Quality is legible at a glance
and teaches the harmony; the symbol grounds beginners. Plain degree numbers were rejected —
they discard the quality information the feature exists to convey.

**Scope: triads only.** Diatonic 7ths (Imaj7 ii7 …) are a natural extension of this same
selector but deferred to fog — four-note stacks crowd the neck (esp. vii°7) and it's a
post-launch add, not a launch requirement.

**Passive lens only.** Selecting a degree highlights notes on the scale view; no "open in
chord view" / "add to overlay" actions here. A diatonic-triad → multi-chord-overlay bridge
is noted in fog, to be designed against [TICKET-009](009-multi-chord-overlay.md)'s overlay
model rather than pre-empting it.

**Inherited from TICKET-007 (not re-decided):** the selected triad highlights across the
whole neck at every occurrence of its three notes, with the 5-fret position window still
emphasized in place; faded scale notes remain visible across the neck.
