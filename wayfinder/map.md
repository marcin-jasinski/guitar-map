---
id: MAP-001
title: Guitar scale/chord/tuning finder — spec
label: wayfinder:map
status: open
---

## Destination

A written, build-ready spec for a website that helps find scale and chord shapes on the
guitar across different tuning systems (classical E-A-D-G-B-E, all-fourths E-A-D-G-C-F,
and user-defined custom tunings). The spec covers: the music-theory data model, the tech
stack, and the UI/UX for single-position vs whole-neck display, diatonic-triad highlighting
on scales, and up-to-3-chord overlay comparison. Reaching the end means there is nothing
left to decide before implementation starts — this map does not build the website itself.

## Notes

- Domain: guitar music theory (scales, chords, triads, shell chords, arpeggios) and its
  representation across arbitrary string tunings.
- Use `/grilling` and `/domain-modeling` for decision tickets; use `/prototype` for the
  fretboard visual/interaction ticket.
- Standing preference: favor computing shapes from theory + tuning definitions over
  hand-curated per-tuning data, so new/custom tunings work without new authoring.

## Decisions so far

- (none yet — map just charted)

## Not yet specified

- Exact scope of "most important" content: which scale types (modes, pentatonics,
  harmonic/melodic minor, etc.) and chord/arpeggio types (triads, 7ths, shell voicings,
  extended chords) beyond the ones already ticketed for scoping.
- How many frets are shown in whole-neck view (12 vs full fretboard length).
- Whether chord/scale results can be exported or shared (link, image, PDF) — not asked
  about yet, may or may not be worth a ticket.
- Mobile/touch support: explicitly a nice-to-have, not a designed-for requirement — revisit
  only if it turns out to be free, otherwise leave alone.
- Any onboarding/help content explaining unfamiliar tuning systems to newer players.

## Out of scope

- (none yet)
