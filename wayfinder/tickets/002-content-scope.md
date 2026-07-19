---
id: TICKET-002
title: Define music-theory content scope
label: wayfinder:grilling
status: closed
assignee: marcin
blocked_by: []
---

## Question

Which scale types (e.g. major, natural/harmonic/melodic minor, modes, major/minor
pentatonic, blues), chord/triad types (major/minor/diminished/augmented triads, 7ths, shell
voicings, extended chords), and arpeggio types count as the "most important" set to support
at launch? Since shapes are computed from interval formulas (per TICKET-001's data-model
Note), this is a matter of which formulas to encode, not how to encode them.

## Resolution

Launch content = the following interval formulas (semitones from root). Each is one data-table
entry; adding more later is trivial, so this is a deliberate "cover the common cases" cut.

**Scales (12):**

| Scale | Intervals |
|---|---|
| Major (Ionian) | 0 2 4 5 7 9 11 |
| Natural minor (Aeolian) | 0 2 3 5 7 8 10 |
| Dorian | 0 2 3 5 7 9 10 |
| Phrygian | 0 1 3 5 7 8 10 |
| Lydian | 0 2 4 6 7 9 11 |
| Mixolydian | 0 2 4 5 7 9 10 |
| Locrian | 0 1 3 5 6 8 10 |
| Major pentatonic | 0 2 4 7 9 |
| Minor pentatonic | 0 3 5 7 10 |
| Minor blues | 0 3 5 6 7 10 |
| Harmonic minor | 0 2 3 5 7 8 11 |
| Melodic minor (asc.) | 0 2 3 5 7 9 11 |

Modes of harmonic/melodic minor are deferred to fog.

**Chords/triads:**

- Triads: major `0 4 7`, minor `0 3 7`, diminished `0 3 6`, augmented `0 4 8`
- 7ths: maj7 `0 4 7 11`, min7 `0 3 7 10`, dom7 `0 4 7 10`, m7♭5 `0 3 6 10`, dim7 `0 3 6 9`
- Suspended/added: sus2 `0 2 7`, sus4 `0 5 7`, 6 `0 4 7 9`, add9 `0 2 4 7`
- Shell voicings (drop the 5th): maj7 shell `0 4 11`, dom7 shell `0 4 10`, min7 shell `0 3 10`

**Arpeggios:** their own selectable content category (alongside Scale / Chord), reusing the
chord formulas above but rendered as a single-note spread across the neck rather than a
stacked shape. No new formulas — a chord and its arpeggio share note sets; they differ only
in presentation.

**Roots:** all 12 chromatic roots, chosen by transpose (no per-key authoring). **Enharmonic
spelling is key-correct**, not just pitch-class: note names follow the key/scale context so
each of the seven letters is used once where the theory calls for it (e.g. F♯ major spells
E♯, not F; the "G♭ vs F♯" choice follows the selected root's spelling). This requires a small
spelling engine in the data model — spell each degree by letter first, then apply
sharps/flats — rather than a flat pitch-class → name lookup. Well-understood algorithm; no
separate ticket, but flagged here as a data-model requirement.
