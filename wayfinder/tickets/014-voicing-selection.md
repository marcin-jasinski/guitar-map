---
id: TICKET-014
title: Smooth voicing selection and manual override
label: wayfinder:grilling
status: open
assignee: null
blocked_by: [TICKET-010, TICKET-013]
map: MAP-002
---

## Question

How does the app pick each chord's voicing, and how does the player overrule it?

Charting settled: auto-picked for smoothness, manually overridable, the rest re-flows.

- What "smooth" is measured as — total pitch movement, fret-hand travel, common tones
  retained, playability. These disagree; one has to win.
- What the candidate voicings are. The app already computes playable voicings for the chord
  view (commit `a7ec51c`) — is that generator reusable as-is, or does connecting chords need
  candidates it does not produce?
- Since the job here is soloing, not comping: is the voicing the thing you *play*, or just the
  frame the arpeggio hangs on? That decides how prominent this is on screen.
- The override: how a voicing is swapped, whether the choice sticks when you change key or
  edit the progression, and how "re-flows" behaves — do overridden chords pin, and does
  re-flow run forward only or both directions?
- Does the app ever say a progression's smoothest path is still awkward on this tuning?
