# User Guide

Guitar Map shows scale, chord, arpeggio and progression shapes on a fretboard, in whatever
tuning you play. Nothing is pre-drawn — everything is computed live, so any tuning works.

## The four tabs

- **Scale** — pick a root and a scale. Play it, or pick a diatonic triad chip (`I ii iii IV V
  vi vii°`) to highlight just that triad within the scale; click it again to clear. The triad
  selector only appears for seven-note scales (pentatonics and blues don't have one).
- **Chord** — pick a root and chord type. **+ Add chord** brings in up to two more chords
  (three total) as an overlay on the same neck: shared notes render as a split-color fill, so
  you can see which chords share a tone. Each chord slot has its own play button.
- **Arpeggio** — a chord's notes, played one at a time instead of strummed. Looks identical to
  viewing that chord directly.
- **Progression** — build a chord progression in a key (Roman numerals, with secondary
  dominants like `V7/V`), step through it, and jump a chord over to the Chord tab to see its
  shape on the neck.

Switching tabs remembers what you had selected in the tab you're leaving.

## How much of the neck to show ("Show")

- **Position** (scale/arpeggio) or **Voicings** (a single chord) — a 4–6 fret window you slide
  along the neck, or a list of playable fingerings for that one chord.
- **Octaves** — 1–3 octaves up from a root, with faint "ghost" markers showing other places the
  same shape could start; click one to jump there.
- **Whole neck** — every occurrence of every note, all 24 frets, no window.
- **← / →** (or the arrow keys) step through whichever of the above you're on: window position,
  chord voicing, or octave-start root.

You can also **drag a rectangle directly on the fretboard** to select a custom region — this is
a session-only way of looking, not saved with favorites.

## Labels

Toggle note **names**, scale **degrees**, or **intervals**. Degrees need a key, so they're only
offered on the Scale tab. With 2+ chords overlaid, labels lock to names (there's no single root
to number degrees against).

## Tuning

Pick a preset (standard, drop D, DADGAD, open tunings, 7-string, all-fourths, …) or build a
custom one: per string, choose a note and octave. Any pitch set is accepted — odd tunings get a
non-blocking warning, never a block. String count follows the tuning (4–8 strings), so basses
and 7/8-string guitars work the same way.

## Favorites

**Save** captures the whole current view — tuning, what's selected, the window/label
state — so **Load** restores it exactly. Rename or delete from the favorites panel. Custom
tunings you build are also remembered on their own, so they reappear in the tuning picker even
without saving a favorite.

## Playback

Click any note to hear it. Chords strum low-to-high; scales, arpeggios and progressions play
their notes in sequence. Playback follows what's actually drawn — step to a different voicing
or octave and the sound moves with it.

## Keyboard

- **← / →** — nudge the current position/voicing/octave-root, same as the on-screen arrows.
  (Ignored while a text input, select, or textarea has focus.)
