---
id: TICKET-025
title: Guide-tone lines, common tones and forward ghosts
label: wayfinder:task
status: open
assignee: null
blocked_by: [TICKET-021, TICKET-024]
map: MAP-002
---

Spec: [§4.5](../guitar-map/progressions-spec.md), [§6](../guitar-map/progressions-spec.md).
Prototype: [`prototypes/015-connections.html`](prototypes/015-connections.html)
(variant LINE is the spec; its guide-tone path is real, chained by TICKET-024's rule).

## What to build

The neck **looks forward**. It does not redraw clean between chords: what persists is the *next*
chord, not the previous one, so the player sees the move before making it.

- **Next chord** — dashed outline ghosts.
- **Guide tones** — the 3rd and the 7th (the 5th standing in where a chord has no 7th) each draw
  as an arrowed `--accent` line from where they sit in this chord's voicing to where they sit in
  the next chord's. Two lines, never more. No whole-progression path.
- **Common tones** — a ring of panel colour cut into the dot. Shape, not hue. Marking is
  forward-only: a note held *from* the previous chord is not marked, because that move is behind
  you.

All five layers (parent scale, current chord, exception notes, next chord, guide-tone line)
default on and are independently toggleable, none mutually exclusive. They survive being on
together because each owns a different visual channel — faded small dots, full-size coloured dots,
dashed outlines, a cut ring, a `--warn` ring, and the line as the only stroke. No interlock.

## Acceptance criteria

- [ ] Next chord draws as dashed outline ghosts
- [ ] Exactly two arrowed guide-tone lines, from this voicing's 3rd/7th to the next voicing's
- [ ] The 5th stands in where a chord has no 7th
- [ ] Common tones held into the next chord get a cut ring; tones held from the previous one do not
- [ ] Five independent layer toggles, all on by default, none mutually exclusive
- [ ] Every layer stays distinguishable by form, not hue alone

## Blocked by

- TICKET-021 — the parent scale and exception layers
- TICKET-024 — the voicing chain the lines hang on
