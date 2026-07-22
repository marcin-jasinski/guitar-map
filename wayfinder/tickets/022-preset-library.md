---
id: TICKET-022
title: Preset progression library
label: wayfinder:task
status: closed
assignee: Marcin
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
| ii–V–I | major | `iim7 V7 Imaj7` |
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

The numeral column is **rendered output, not stored input** — presets store `Chord` objects, and
TICKET-020's mechanical rule produces these strings from them. `iim7` and `iim7♭5` both carry
their `m` because both shipped suffixes do. If the column and the rule ever disagree, the rule
wins and the table is wrong.

## Acceptance criteria

- [ ] All ten presets load from one flat, name-only picker
- [ ] Loading keeps the current root and switches only tonality
- [ ] Presets are the assertion test set for the inference scorer (TICKET-021) where it has landed
- [ ] The 12-bar blues stores its 12 chords, repeats included

## Blocked by

- TICKET-020 — the progression model and the tab

## Resolution

`PRESET_PROGRESSIONS` (ten `Preset` objects, name + tonality + chords, no root) lives in
[`progression.ts`](../../src/lib/progression.ts), modelled on `PRESET_TUNINGS`. A `<select>` with a
"Presets" optgroup in [`Progression.svelte`](../../src/lib/Progression.svelte) loads one via
`loadPreset()`, which keeps `prog.key.root` and switches only the tonality. The picker is built to
gain a "Saved" optgroup in TICKET-026. A self-check renders each preset's stored chords through
`numeralOf()` and asserts they equal the spec's numeral column (`iim7 V7 Imaj7`, `I ♭VII IV`,
`i VII VI V`, …) and that the 12-bar blues stores 12 chords. 93 tests green, typecheck clean.
