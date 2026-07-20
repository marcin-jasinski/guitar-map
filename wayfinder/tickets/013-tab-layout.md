---
id: TICKET-013
title: Tab layout and chord-stepping interaction
label: wayfinder:prototype
status: closed
assignee: Marcin
blocked_by: [TICKET-010]
map: MAP-002
---

## Question

What does the tab look like, and how does stepping through the progression feel?

Charting settled on one full-size neck showing the current chord, stepped through the
progression. Prototype it until the layout is obvious, then spec it:

- Where the progression itself lives on screen (a chord strip? a bar?), how the current chord
  is marked, and how you move — click a chord, arrow keys, a next/prev control.
- What the neck shows for the current chord: its arpeggio over the parent scale, both at
  once, and how the two are visually separated given the shipped colour language.
- Which of the shipped display modes (position window / octaves / whole neck) apply here, and
  does the window follow the chord as you step or stay put? Following is smoother; staying put
  is how a soloist actually plays.
- What the surrounding panel says about the current chord — its function, its scale exception
  (TICKET-012), its voicing.
- Where the key control and the progression editor sit, and how editing is entered.
- Does anything about the neck persist across steps so the *movement* between chords is
  visible, or does each step redraw clean?

## Resolution

Prototyped as four layouts in
[`prototypes/013-progression-tab.html`](prototypes/013-progression-tab.html) (A–D, arrow keys
switch; ↑↓ steps chords). **Variant D is the spec** — a vertical progression rail, the swap
wording under the neck, and a forward-pointing guide-tone line.

### The tab bar

This tab does not exist in a vacuum: the shipped app has **no tab bar at all** — it is one page
with a content-kind segmented control (`scale | chord | arpeggio` in `App.svelte`). This ticket
therefore also introduces the tab bar, with the existing page becoming three tabs and
Progression the fourth. The segmented control inside the old page is replaced by the tab bar,
not nested inside it.

### Layout — the progression is a left rail

The progression reads **top to bottom in a left rail**, like a chart, not as a horizontal strip.
Each rail entry carries the **numeral, the chord symbol, and the function label** from
TICKET-012 ("secondary dominant of V", "borrowed from C minor"); the current chord is marked by
an accent border. A `＋` entry at the foot of the rail adds a chord.

The **key control and an `Edit progression` button sit under the rail**, so everything that
changes *what* the progression is lives in one column, and everything that shows *what to play*
lives in the other.

The **note-swaps do not fit in the rail** — they are sentences, not labels. They sit **under the
neck**, where the current chord's swaps are stated in full ("over D7, play F♯ instead of F (♯4)").
Rail entries carrying only the function label was the fix that made the rail layout viable at
all; the first pass tried to inline everything and the rail could not hold it.

The parent scale is named **once**, above the neck, since it is constant across the whole
progression — not repeated per chord.

### Stepping

Click a rail entry, or **↑ ↓**. Stepping **wraps** — the progression is a loop, and the last
chord's forward view points back at the first. Stepping changes only which chord is current; it
never moves the neck.

### The neck — whole neck only, no position window

None of the shipped display modes carry over. The position window and the octave view are
**dropped in this tab**: a soloist playing over changes wants every occurrence of the parent
scale, not a box, and a window that follows the chord (prototyped in variant A, where it jumps
7→8→5→7) makes the floor move under the player. A window that stays put is defensible, but with
no window at all it is simply the whole neck — so the whole neck is what this tab shows.

Layers on the neck, in the shipped colour language:

- **parent scale** — small faded dots, note names
- **current chord** — full-size dots, interval-role coloured (root / 3rd / 5th / 7th)
- **exception notes** — a chord tone outside the parent, ringed in `--warn`
- **next chord** — dashed outline ghosts
- **guide-tone line** — an accent-coloured polyline through the 3rds and 7ths

### The neck looks forward

The neck **does not redraw clean**. What persists is the **next** chord, not the previous one:
dashed ghosts and the guide-tone line both point ahead, so the player sees the move before
making it. This was the one substantive revision to the prototype — it originally looked
backward, which shows you what you already played.

Guide tones are settable to **off / to the next chord / whole progression**. "Whole progression"
draws one polyline per voice across every chord, and it only works *because* the neck retains
more than the current chord — a line spanning four chords needs all four chords' guide tones on
screen. The forward ghosts are therefore load-bearing, not decoration.

### Handed to other tickets

- **The line's actual path is not decided here.** The prototype picks guide tones by nearest
  hand position, which is not real voice leading — a 7th should fall to the next chord's 3rd.
  TICKET-014 owns the voicing, TICKET-015 owns how the line draws. This ticket fixes only the
  *layout budget*: the neck must hold a cross-chord connector, and the view retains the next
  chord to make one possible.
- **Colour collision to resolve in TICKET-015**: the accent colour is the position-window colour
  in the shipped app and the guide-tone line here. No clash in this tab because there is no
  window — but TICKET-015 should confirm the line stays legible against the exception ring and
  whatever common-tone marking it adds.
