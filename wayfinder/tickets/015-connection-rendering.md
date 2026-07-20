---
id: TICKET-015
title: Render guide-tone lines and held common tones
label: wayfinder:prototype
status: open
assignee: null
blocked_by: [TICKET-012, TICKET-013]
map: MAP-002
---

## Question

How do the two launch connection aids draw on the neck without wrecking its legibility?

The neck already carries a lot: interval colours, content-type outlines, the arpeggio's
directional arrowed path, chord-identity colours in overlay. Guide-tone lines and held common
tones add two more layers. Prototype it.

- Guide tones (the 3rds and 7ths moving chord to chord): are they drawn as a path across the
  neck, marked per chord, or shown on a separate small staff/strip? A path spanning chords
  conflicts with a view that redraws each step — resolve against TICKET-013.
- Common tones: how a note is marked as shared with the previous chord, the next one, or both.
- Whether these are always on, toggled, or one-at-a-time like the diatonic triad lens.
- What survives when both are on at once plus the arpeggio and the parent scale — if that is
  too much, which layers are mutually exclusive.
- Colour-blind-safe distinctions, consistent with the shipped palette.
