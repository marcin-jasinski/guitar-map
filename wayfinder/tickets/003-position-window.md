---
id: TICKET-003
title: Define position window size and navigation
label: wayfinder:grilling
status: closed
assignee: marcin
blocked_by: []
---

## Question

A "position" was decided as a fixed fret-span window slid along the neck. How wide is that
window (e.g. 4 frets, 5 frets), how does the user move it (dropdown of preset windows,
next/prev arrows, click-a-fret-to-center), and what happens at the neck's edges (frets 0-3,
or past the highest fret)?

## Resolution

**Width: configurable 4–6 frets, default 5.** A small control (stepper or segmented 4/5/6)
sets the span; 5 is the default because it fits most CAGED/pentatonic box shapes without a
stretch. Width is part of view state and is saved with favorites (TICKET-006).

**Navigation: click-a-fret-to-center, plus prev/next arrows.**
- Clicking any fret on the neck moves the window so that fret sits at (or nearest to) the
  window's center.
- Prev/next arrows (and keyboard ←/→) nudge the window ±1 fret.
- A readout shows the current fret range (e.g. "frets 5–9").

**Edges: fret 0 (open strings) is a real column; clamp at both ends.**
- The lowest window position is `0 .. width-1` (fret 0 = open strings), shown as an open-string
  column. The window never goes below 0.
- At the high end the window clamps so its top edge never exceeds the neck's last fret; near
  either edge, click-to-center falls back from true centering to the clamped position (the
  clicked fret stays inside the window but may not be dead-center).
- Neck length (last fret) is still open — see the whole-neck fret-count fog item; the window
  logic just consumes `lastFret` as its upper clamp and is unaffected by which value wins.
