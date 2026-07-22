---
id: TICKET-025
title: Guide-tone lines, common tones and forward ghosts
label: wayfinder:task
status: closed
assignee: Marcin
blocked_by: [TICKET-021, TICKET-024]
map: MAP-002
---

Spec: [§4.5](../guitar-map/progressions-spec.md), [§6](../guitar-map/progressions-spec.md).
Prototype: [`prototypes/015-connections.html`](prototypes/015-connections.html)
(variant LINE is the spec; its guide-tone path is real, chained by TICKET-024's rule).

## What to build

The neck **looks forward**. It does not redraw clean between chords: what persists is the *next*
chord, not the previous one, so the player sees the move before making it.

- **Next chord** — dashed outline ghosts (`Dot.outline`). A ghost pitch class is **next minus
  current**: a class in both is a held tone and gets the cut ring instead, never a ghost.
- **Guide tones** — the two guide voices, by **TICKET-024's priority rule** (3rd → 7th → 5th →
  root → other) rather than a second definition here, each draw as an arrowed `--accent` line from
  where they sit in this chord's voicing to where they sit in the next chord's. Two lines, never
  more; fewer only where §5's fallback left a chord short a voice. No whole-progression path.
- **Common tones** — a ring of panel colour cut into the dot (`Dot.cutRing`). Shape, not hue.
  Marking is forward-only: a note held *from* the previous chord is not marked, because that move
  is behind you.

**The component work is one prop.** Everything above is pitch-class-level and rides on the `Dot`
flags TICKET-020 added, which `Fretboard` already keys by pitch class. Only the line is
position-level: `Fretboard` gains `lines?: { from: string; to: string }[]`, cell-key pairs drawn
as arrowed `--accent` strokes. Nothing else about the component changes.

The wrap line (last chord → first) is drawn like any other, but TICKET-024's chain never scored
that transition — expect it to be less smooth than the rest, by design. On a **one-chord**
progression none of these three layers draw at all (§4.6); their toggles stay visible and enabled.

The five toggles sit **under the neck** with the swap sentences and the voicing readout, and are
**session-only** — §7 persists what the player authored, and a way of looking is not that.

All five layers (parent scale, current chord, exception notes, next chord, guide-tone line)
default on and are independently toggleable, none mutually exclusive. They survive being on
together because each owns a different visual channel — faded small dots, full-size coloured dots,
dashed outlines, a cut ring, a `--warn` ring, and the line as the only stroke. No interlock.

## Acceptance criteria

- [ ] Next chord draws as dashed outline ghosts; a pitch class in both chords is a held tone, not a ghost
- [ ] Two arrowed guide-tone lines, from this voicing's guide voices to the next voicing's
- [ ] Guide voices come from TICKET-024's rule, not a local one — `sus4` draws 5th + root, not nothing
- [ ] Common tones held into the next chord get a cut ring; tones held from the previous one do not
- [ ] Five independent layer toggles under the neck, all on by default, session-only, none mutually exclusive
- [ ] A one-chord progression draws no ghosts, no lines and no cut rings, with toggles still enabled
- [ ] Every layer stays distinguishable by form, not hue alone

## Blocked by

- TICKET-021 — the parent scale and exception layers
- TICKET-024 — the voicing chain the lines hang on

## Resolution

`progressionDots()` now takes the next chord and a `Layers` toggle set and layers all five channels
onto the one pitch-class map: held tones (a current tone whose pc is in the next chord) get
`Dot.cutRing`, next-chord tones *not* held get `Dot.outline` (dashed ghost), each respecting its
toggle. `nextChord` is undefined on a one-chord progression, so the three forward layers draw nothing.
[`Fretboard.svelte`](../../src/lib/Fretboard.svelte) gained one prop — `lines: {from,to}[]` — drawn as
arrowed `--accent` strokes via an SVG marker (the only stroke on this tab); it renders `outline` dots
dashed like the octave ghost but in accent, and `cutRing` as a panel-colour ring cut into the dot.
[`Progression.svelte`](../../src/lib/Progression.svelte) holds the five session-only layer toggles
under the neck, derives the two guide-tone `lines` from `guideCells()` of the current and next
voicings (TICKET-024's rule, not a second one), and passes them through. Self-checks cover the
ii→V held-tone/ghost split, a one-chord progression drawing neither, and a toggle suppressing its
channel. 104 tests green, typecheck clean, production build succeeds.
