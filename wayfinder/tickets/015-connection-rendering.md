---
id: TICKET-015
title: Render guide-tone lines and held common tones
label: wayfinder:prototype
status: closed
assignee: Marcin
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

## Resolution

Prototyped as three treatments in
[`prototypes/015-connections.html`](prototypes/015-connections.html) (LINE / MARKS / STRIP,
arrow keys switch; every layer independently toggleable). **LINE is the spec.**

The prototype's guide-tone path is real, not a placeholder: candidate voicings are generated per
chord and chained by TICKET-014's Viterbi pass, so what was judged is the path the app will
actually draw.

### Guide tones — two arrowed lines to the next chord

The 3rd and the 7th (the 5th standing in where a chord has no 7th) are each drawn as an
**arrowed line straight across the neck**, from where they sit in this chord's voicing to where
they sit in the next chord's. Two lines, never more.

This is the most ink of the three treatments, and it won anyway — the movement is the thing the
tab exists to teach, and a drawn stroke says it in a way a label cannot. The rejected
alternatives are recorded because they remain the fallback if the neck ever gets busier:

- **MARKS** — guide tones ringed in place, labelled with their movement (`hold`, `-1`, `+2`).
  Adds no strokes at all; the connection is stated rather than drawn.
- **STRIP** — the neck stays clean and the guide tones move to a two-voice chart below it.

The arrowed line resolves the conflict TICKET-013 flagged: a path **spanning all chords** would
demand the whole progression on screen at once, but a path to **the next chord only** needs just
the forward ghosts that layout already commits to. The whole-progression variant prototyped in
TICKET-013 is dropped.

### Common tones — a ring cut into the dot

A chord tone also present in the **next** chord is marked by a **ring of panel colour cut into
the dot**. Shape, not hue: it costs no new colour, survives any colour-blindness, and reads at
dot size. Marking is forward-only, matching the neck's forward-looking stance from TICKET-013 —
a note held *from* the previous chord is not marked, because by the time you are on this chord
that move is behind you.

### Layers — all on, nothing exclusive

Parent scale, chord tones, next-chord ghosts, guide-tone lines and hold-rings **all default on**,
each independently toggleable, **none locking another out**.

The layers survive being on together because they separate by **visual channel** rather than by
colour: scale dots are small and faded, chord tones are full-size and interval-coloured, ghosts
are dashed outlines, holds are a cut ring, exceptions are a `--warn` ring, and the guide-tone
line is the only **stroke** on the board. Nothing competes for the same channel, so no interlock
is needed to police them, and the player turns off whatever they personally don't want.

Rejected: defaulting the parent scale off (it is the tab's headline advice — hiding it buries
what the inference works hardest to produce); making ghosts and the line mutually exclusive (the
ghosts show the whole next chord, the line shows two notes of it — different questions, and an
interlock would silently kill one when you enable the other).

### Colour

The guide-tone line uses `--accent`. TICKET-013 flagged a possible collision with the position
window, which also uses accent — **no clash, since this tab has no position window**. Accent is
free here, and being the only stroke on the neck it is distinguishable by form even where hue
fails.
