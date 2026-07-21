---
id: TICKET-011
title: Curate the preset progression library
label: wayfinder:grilling
status: closed
assignee: Marcin
blocked_by: [TICKET-010]
map: MAP-002
---

## Question

Which progressions ship preloaded, and how are they presented?

- The actual list — the classics worth having (I–V–vi–IV, ii–V–I, 12-bar blues, I–vi–IV–V,
  Andalusian, rhythm changes?), written in TICKET-010's notation.
- How many is enough before the picker stops being useful, and are they grouped (by genre,
  by feel, by difficulty) or one flat list?
- Does each preset carry a name, a description, or example songs? Song titles are recognisable
  but raise attribution questions worth a moment's thought.
- Do presets carry a suggested default key, or always land in a neutral one?
- How complex do the presets get — do any of them exist mainly to exercise the per-chord
  exceptions from TICKET-012 (secondary dominants, modal interchange), so the feature shows
  its value out of the box?

## Resolution

```ts
type Preset = { name: string; tonality: 'major' | 'minor'; chords: Chord[] };  // no root
```

### Shape — ten, one flat list, name only

Modelled directly on `PRESET_TUNINGS`: a short flat list, each entry a name and its chords. **No
grouping, no descriptions, no example songs.** Every preset earns its place by teaching something
the others don't, so a category system would be structure describing ten items. The app's answer
to "how do we present a preset list" already exists and is reused.

Names say **what the preset teaches** — "Borrowed iv", "Secondary dominant", "Andalusian
cadence". That carries the weight a description would have, sidesteps song attribution entirely,
and avoids maintaining prose in a teaching voice the app doesn't otherwise have. Anything a
description would say is on screen the moment it loads: the parent scale, the function labels,
the swaps.

### The list

Four are what people come looking for; six exist so the feature demonstrates itself on load.

| Name | Tonality | Chords | Why it's in |
| --- | --- | --- | --- |
| I–V–vi–IV | major | `I V vi IV` | the baseline; all diatonic |
| I–vi–IV–V | major | `I vi IV V` | the other baseline |
| ii–V–I | major | `ii7 V7 Imaj7` | the jazz cadence; guide tones at their clearest |
| 12-bar blues | major | `I7×4 IV7×2 I7×2 V7 IV7 I7 V7` | parent lands on Mixolydian, not Ionian |
| Mixolydian rock | major | `I ♭VII IV` | borrowed ♭VII, parent shifts to fit — **zero** exceptions |
| Dorian vamp | minor | `i IV` | modal naming: reports "D Dorian", not "D minor" |
| Borrowed iv | major | `I IV iv I` | one exception, ♭6 — the cleanest possible swap |
| Secondary dominant | major | `I V7/V V7 I` | the `of` field and the ♯4 swap |
| Andalusian cadence | minor | `i ♭VII ♭VI V` | major V in a minor key — the ♯7 exception |
| Minor ii–V–i | minor | `iim7♭5 V7 i` | two exceptions at once, and the strained threshold |

Three of them (Mixolydian rock, Dorian vamp, 12-bar blues) prove the **inference** by resolving
to a parent nobody typed; three (Borrowed iv, Secondary dominant, Andalusian cadence) prove the
**exceptions**. The 12-bar blues stores all 12 chords, repeats included, per TICKET-010 — well
inside the 32-chord cap.

### Key — keep your root, take the preset's tonality

A preset stores **no root**. That is the payoff of numerals-as-canonical, and loading a preset
should not yank a guitarist out of the key they are working in.

It does store **major or minor**, because its numerals are written against one: the Andalusian
cadence is i–♭VII–♭VI–V and means nothing in a major key. Loading therefore **switches tonality
where the preset needs it and leaves the root alone** — load "Andalusian cadence" while in E
major and you land in E minor.

Rejected: per-preset suggested keys (overrides a key the player deliberately chose, and "usually
played in A" is a genre claim the app never otherwise makes); a neutral C major / A minor home
(C is a poor guitar key, and it discards the current key for no musical reason).
