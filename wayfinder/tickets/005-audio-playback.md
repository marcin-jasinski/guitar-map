---
id: TICKET-005
title: Design audio playback feature
label: wayfinder:grilling
status: closed
assignee: marcin
blocked_by: []
---

## Question

Audio playback is in scope (map Decisions). Should notes be synthesized (e.g. Web Audio
oscillators) or sample-based (recorded guitar tones)? Play the whole scale/chord as a
strum/arpeggiated sequence, all-at-once, or note-by-note on click? Does it need to sound
distinct per tuning (i.e. respect actual string pitches), which it should given the
algorithmic data model.

## Resolution

**Sound source: Web Audio synthesis at launch; samples deferred to fog.** Notes are
synthesized with the Web Audio API (oscillator + a simple plucked-string-style ADSR envelope)
— zero audio assets, any pitch for free, no bandwidth or sample-licensing cost, which fits the
static/no-backend, lean stance. Realistic sample-based tone is a possible post-launch upgrade
and is recorded in the map's Not-yet-specified.

**Playback behavior: context-appropriate, plus note-on-click.**
- Chords play as a quick strum/roll (short stagger low→high string), not a hard block.
- Scales play ascending, note-by-note, in a timed sequence.
- Clicking any single note on the fretboard plays just that note.
- (Arpeggios, a separate content type per TICKET-002, play as their single-note spread —
  same sequencing path as scales.)

**Tuning-aware: yes — true pitch per string/fret.** A note's frequency derives from the
tuning's open-string pitch plus fret offset (`pitch = openStringPitch(tuning, string) +
fretSemitones`), so alternate and custom tunings sound correct. This falls straight out of
the algorithmic data model — the same {note, octave} pitch data the tuning builder
(TICKET-004) captures feeds the synth's frequency calc.

## Spec-review refinement (2026-07-19)

- **Pitch reference pinned:** A4 = 440 Hz, scientific pitch notation (middle C = C4, standard
  low E = E2). Frequency = `440 * 2^((midi − 69) / 12)`, with the MIDI number computed from
  `{note, octave}`. This makes the frequency calc above concrete.
