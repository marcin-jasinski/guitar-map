---
id: TICKET-009
title: Multi-chord overlay UX (max 3 chords)
label: wayfinder:grilling
status: closed
assignee: Marcin
blocked_by: [TICKET-007]
---

## Question

Up to 3 chords can be displayed at once. How are the 2nd/3rd chords added (search/picker
per slot, or an "add chord" button), how is each visually distinguished on the shared
fretboard (color per chord, separate lanes, shape outlines), and what happens where their
notes overlap on the same string/fret?

## Resolution

**Purpose: reveal relationships between chords.** The overlay exists to compare up to 3
chords on one shared neck — common tones and how their shapes relate — not to show three
independent diagrams side-by-side (that adds nothing over viewing chords one at a time).
This framing makes overlaps *the feature*, and drives every decision below.

**Color encodes chord identity (not interval role).** In overlay mode each chord gets one
hue (chord 1 / 2 / 3). This resolves the tension flagged in [TICKET-007](007-fretboard-visual-design.md):
007's interval-role coloring (root/3rd/5th/7th hues) is what *single*-chord view is for;
overlay repurposes color for chord identity because "which chords share which notes" is a
per-chord question, and color is the strongest channel to carry it. 3 chords × 4 interval
hues (12 colors) was rejected as illegible.

**Shared notes render as split fill** in the contributing chords' colors — half-and-half for
two chords, thirds for three. This shows *which* chords share a note (e.g. "C is in chord 1
and chord 2 but not chord 3"), the exact insight the feature exists to surface; a single
generic "common tone" treatment was rejected for discarding that. A two/three-tone dot reads
instantly on a dense neck, and the max of 3 keeps the combinatorics legible.

**Overlay is Chord view with slots — no separate mode.** Chord view starts with one chord;
a **"+ Add chord"** control reveals slot 2, then slot 3 (hard max 3). Each slot = the existing
single-chord root + type picker, plus its color swatch and a remove ×. A dedicated "Compare"
mode was rejected for duplicating the picker and forcing an up-front choice.

**Color rule follows slot count:** 1 chord → 007's interval-role colors; 2–3 chords →
chord-identity colors. Adding the second chord *is* what flips the neck into overlay coloring;
removing back down to one restores interval roles.

**Slots are fully independent** — any root, any chord type from [TICKET-002](002-content-scope.md)'s
set, no key constraint. Comparison is often most interesting across keys (borrowed chords,
tritone subs), which a key-scoped mode would forbid. The diatonic angle is served by
[TICKET-008](008-diatonic-triad-highlighting.md)'s degree selector; the fog "send a triad to
the overlay" bridge just pre-fills an independent slot — no key mode needed here.

**Labels lock to note names while 2+ chords are active.** 007's degree/interval label toggle
is relative to a root, but overlay has up to three roots and shared notes belong to several
chords at once — so degree/interval is ambiguous ("3rd of which chord?") and unlabelable on a
split-fill note. Names are the neutral common language for spotting common tones. The toggle
greys out at 2+ chords and returns to full function at one chord.

**Inherited from TICKET-007 (not re-decided):** whole-neck rendering with all occurrences of
each chord's notes, 5-fret position window emphasized in place.

**Folded in (minor):** each slot reuses [TICKET-005](005-audio-playback.md)'s strum via its
own play button; overlay applies to the **Chord** content category only (Scale and Arpeggio
stay single-content). Chord-identity palette (3 hues that don't clash with the faded
non-chord state) is an implementation/prototype detail, not decided here.
