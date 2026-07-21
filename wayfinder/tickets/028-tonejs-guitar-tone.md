---
id: TICKET-028
title: Tone.js sample-based guitar tone
label: wayfinder:task
status: open
assignee: null
blocked_by: []
map: null
---

Promoted from [`backlog.md`](../backlog.md) B1. No map owns it — it was ruled out of scope of
MAP-002 while charting, and it has no fog to clear, so it goes straight to an implementation
agent.

## What to build

Replace the triangle-oscillator pluck in [`src/lib/audio.ts`](../../src/lib/audio.ts) with
Tone.js, so notes sound like a guitar rather than a synth. `Tone.Sampler` pitch-shifts a handful
of recorded notes across the whole range, which is what makes this cheap — a few samples per few
octaves, not one per fret.

**The whole change is confined to one 36-line file.** Every caller goes through its three
exports, and none of them may change:

```ts
export const playNote     = (midi: number) => void;
export const strum        = (midis: number[]) => void;
export const playSequence = (midis: number[], gap = 0.3) => void;
```

All three are fire-and-forget and return `void` today. **Keep them synchronous-looking** — do not
make them `async` or return promises, or every call site has to change and the "confined to one
file" property is lost. The load is awaited *inside*, off a module-level promise.

### The constraints that shape it

- **Pitches are already true per-tuning MIDI numbers** (`fretMidi()` → `midiOf()`), and the
  sampler must honour them exactly. `Tone.Frequency(midi, 'midi')` converts; `freq()` in
  `theory.ts` stays exported either way, it is the reference for what a MIDI number means here.
- **Timing is relative offsets in seconds**, and that must survive the swap: `strum` staggers
  `i * 0.045` for a low→high strum, `playSequence` steps `i * gap` and rings for `gap * 1.6`.
  Those numbers are tuned by ear — carry them over unchanged rather than re-deriving them.
- **The audio context may still only start on a user gesture.** Today `new AudioContext()` is
  constructed lazily on first call, which is already inside a click handler; `Tone.start()` needs
  the same treatment and the same lazy point.
- **Samples ship as static assets on a no-backend host.** Mind total download size, and
  **`import('tone')` dynamically on first sound** so neither the library nor the samples land in
  the initial bundle. The app currently ships zero audio assets and no audio dependency; this
  ticket is the one that changes that, so it owns the budget.
- **Licence must permit redistribution.** Non-negotiable — the samples are committed to the repo
  and served to every visitor.

### Decide at pickup

- **Which sample set.** The two hard filters are the redistribution licence and the download
  size; verify the licence at the source rather than trusting a summary, including this ticket's.
  Prefer the smallest set that covers the range — a few notes per octave, not per fret.
- **Whether the first-sound delay needs a UI affordance.** Default to **no**: dynamic import plus
  sample fetch on a click is likely under the threshold where a spinner helps more than it
  distracts. If measurement says otherwise, the lightest thing that works is the existing soft,
  non-blocking warning voice, not a modal or a progress bar. Notes triggered before the sampler
  is ready are **dropped, not queued** — a scale that plays half a second late is worse than one
  that needs a second click.

## Acceptance criteria

- [ ] `playNote`, `strum` and `playSequence` keep their exact signatures and stay non-async
- [ ] Notes sound at the correct pitch for every tuning, including 7-string and drop tunings
- [ ] Strum stagger and sequence gap/ring timings are unchanged from the shipped values
- [ ] Tone.js and the samples are dynamically imported — neither is in the initial bundle
- [ ] Audio still starts only on a user gesture
- [ ] Sample licence permits redistribution, and the licence file ships with the assets
- [ ] Notes triggered before load are dropped without throwing
- [ ] One test asserts midi→pitch conversion and the scheduling offsets against a stubbed sampler,
      so the timings can't silently drift — audio itself stays untested, as it is today

## Blocked by

None — independent of the progression tab (MAP-002 §8: that tab has no audio), so it can land
before, during or after TICKET-019–027.
