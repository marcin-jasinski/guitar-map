/**
 * Guitar tone via Tone.js `Tone.Sampler` (TICKET-028): a handful of recorded notes
 * pitch-shifted across the whole range, so notes sound like a guitar, not a synth.
 *
 * The library and the samples are **dynamically imported on first sound**, so neither
 * lands in the initial bundle. The three exports stay synchronous-looking and
 * fire-and-forget — the load is awaited *inside*, off a module-level promise — so no
 * call site changes. Notes triggered before the sampler is ready are **dropped, not
 * queued**: a scale that plays half a second late is worse than one that needs a
 * second click.
 */
import { freq } from './theory';

// One recorded note every few semitones; the Sampler pitch-shifts to fill the gaps —
// a few samples per few octaves, not one per fret.
const SAMPLES: Record<string, string> = {
  D2: 'D2.mp3',
  G2: 'G2.mp3',
  C3: 'C3.mp3',
  F3: 'F3.mp3',
  A3: 'A3.mp3',
  D4: 'D4.mp3',
  G4: 'G4.mp3',
  D5: 'D5.mp3',
};
const BASE_URL = `${import.meta.env.BASE_URL}samples/guitar-acoustic/`;

// Timings tuned by ear in the Web Audio version — carried over unchanged, not
// re-derived (§5): the strum staggers low→high, the sequence steps and rings.
const NOTE_DUR = 1.4;
const STRUM_STAGGER = 0.045;
const SEQUENCE_RING = 1.6;

/** The slice of `Tone.Sampler` this module uses. `hz` is a frequency, not a note
 *  name — `Tone.Sampler.triggerAttackRelease` accepts either, and we hand it Hz. */
export type Sampler = { triggerAttackRelease(hz: number, dur: number, time: number): void };

// ---- pure scheduling (testable against a stubbed sampler) ----------------------
// `freq(midi)` (Hz) is passed straight through, so the true per-tuning MIDI number
// is honoured exactly — `Tone.Frequency(midi,'midi')` would give the same value.

export const scheduleNote = (s: Sampler, now: number, midi: number) =>
  s.triggerAttackRelease(freq(midi), NOTE_DUR, now);

export const scheduleStrum = (s: Sampler, now: number, midis: number[]) =>
  midis.forEach((m, i) => s.triggerAttackRelease(freq(m), NOTE_DUR, now + i * STRUM_STAGGER));

export const scheduleSequence = (s: Sampler, now: number, midis: number[], gap: number) =>
  midis.forEach((m, i) => s.triggerAttackRelease(freq(m), gap * SEQUENCE_RING, now + i * gap));

// ---- lazy load & the fire-and-forget surface -----------------------------------

let sampler: Sampler | undefined;
let now: (() => number) | undefined;
let loading: Promise<void> | undefined;

/** Lazy, once. Runs inside the first user gesture, so `Tone.start()` is allowed. */
function ensureLoaded(): void {
  if (loading) return;
  loading = (async () => {
    const Tone = await import('tone');
    await Tone.start(); // the audio context may only start on a user gesture
    const s = new Tone.Sampler({ urls: SAMPLES, baseUrl: BASE_URL }).toDestination();
    await Tone.loaded();
    now = () => Tone.now();
    sampler = s;
  })();
}

/** Kick the load, then run `fn` only if the sampler is ready — else drop the note. */
function withSampler(fn: (s: Sampler, now: number) => void): void {
  ensureLoaded();
  if (sampler && now) fn(sampler, now());
}

export const playNote = (midi: number) => withSampler((s, t) => scheduleNote(s, t, midi));

/** Chords: a quick low→high strum. */
export const strum = (midis: number[]) => withSampler((s, t) => scheduleStrum(s, t, midis));

/** Scales and arpeggios: ascending, note by note. */
export const playSequence = (midis: number[], gap = 0.3) =>
  withSampler((s, t) => scheduleSequence(s, t, midis, gap));
