---
id: TICKET-022
title: Preset progression library
label: wayfinder:task
status: open
assignee: null
blocked_by: [TICKET-020]
map: MAP-002
---

Spec: [§2](../guitar-map/progressions-spec.md).

## What to build

A picker in the rail loads any of ten curated progressions, replacing the hardcoded one. One flat
list, name only — no grouping, no descriptions, no song titles; the names say what each preset
teaches. Modelled on `PRESET_TUNINGS`.

A preset stores **no root**, only tonality. Loading keeps the player's current root and switches
tonality where needed: load "Andalusian cadence" while in E major and you land in E minor.

```ts
type Preset = { name: string; tonality: 'major' | 'minor'; chords: Chord[] };
```

| Name | Tonality | Chords |
| --- | --- | --- |
| I–V–vi–IV | major | `I V vi IV` |
| I–vi–IV–V | major | `I vi IV V` |
| ii–V–I | major | `ii7 V7 Imaj7` |
| 12-bar blues | major | `I7×4 IV7×2 I7×2 V7 IV7 I7 V7` |
| Mixolydian rock | major | `I ♭VII IV` |
| Dorian vamp | minor | `i IV` |
| Borrowed iv | major | `I IV iv I` |
| Secondary dominant | major | `I V7/V V7 I` |
| Andalusian cadence | minor | `i VII VI V` |
| Minor ii–V–i | minor | `iim7♭5 V7 i` |

The Andalusian is `i VII VI V`, not `i ♭VII ♭VI V` — minor keys use natural-minor degrees, so a
flat sign there would mean a double flat. "Mixolydian rock" keeps its `♭VII`; that one is in a
major key, where the flat is load-bearing.

## Acceptance criteria

- [ ] All ten presets load from one flat, name-only picker
- [ ] Loading keeps the current root and switches only tonality
- [ ] Presets are the assertion test set for the inference scorer (TICKET-021) where it has landed
- [ ] The 12-bar blues stores its 12 chords, repeats included

## Blocked by

- TICKET-020 — the progression model and the tab
