# Guitar Map

Find scale, chord and arpeggio shapes across arbitrary guitar tunings. Every shape is
computed client-side from an interval formula plus a tuning definition, so standard,
all-fourths, DADGAD and any custom tuning work from the same engine — no per-tuning
authoring.

Four tabs — **Scale**, **Chord**, **Arpeggio**, **Progression** — share one fretboard: pick a
root/key, see the shape drawn (with diatonic-triad and multi-chord-overlay highlighting), hear
it played back through a sampled guitar tone, and save the whole view as a favorite. See
[`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) for how to use it, and [`CONTEXT.md`](CONTEXT.md)
for the tech stack, module map, and domain glossary.

Built to [`wayfinder/guitar-map/spec.md`](wayfinder/guitar-map/spec.md); section numbers
in the code comments refer to it.

```sh
npm install
npm run dev      # local dev server
npm test         # theory, view and render tests
npm run check    # svelte-check + tsc
npm run build    # static bundle in dist/ — deploy anywhere, no backend
```

## Layout

| File | What lives there |
|---|---|
| `src/lib/theory.ts` | Scales, chords, the key-correct spelling engine, tunings, pitch → MIDI → Hz |
| `src/lib/progression.ts` | Chord-progression model: key + Roman-numeral chords, presets |
| `src/lib/view.ts` | Content selection → what the fretboard draws and what audio plays |
| `src/lib/store.svelte.ts` | Favorites and custom tunings in `localStorage` |
| `src/lib/audio.ts` | Tone.js sampler playback: single note, strum, sequence |
| `src/lib/Fretboard.svelte` | Whole-neck SVG render with the position window in place |
| `src/lib/Progression.svelte` | Progression tab UI |
| `src/lib/TuningPicker.svelte` | Preset + custom tuning selection and builder |
| `src/lib/Favorites.svelte` | Save/load/rename/delete favorites panel |
| `src/App.svelte` | Tabs, sidebar controls and view state |

The spelling engine is the one piece of non-trivial pure logic, so its tricky cases
(F♯ major → E♯, C blues' repeated G, Cdim7's B𝄫) are pinned in `theory.test.ts`.
