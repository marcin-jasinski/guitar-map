/**
 * Web Audio synthesis (spec §6) — no audio assets, any pitch free. A plucked-string
 * ADSR on a triangle oscillator is close enough to a guitar to be recognisable.
 */
import { freq } from './theory';

let ctx: AudioContext | undefined;
const audio = () => (ctx ??= new AudioContext());

function pluck(midi: number, at: number, duration = 1.4) {
  const a = audio();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq(midi);

  // attack ~6ms, then an exponential decay — a string, not an organ.
  const t = a.currentTime + at;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.28, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration);
}

export const playNote = (midi: number) => pluck(midi, 0);

/** Chords: a quick low→high strum. */
export const strum = (midis: number[]) =>
  midis.forEach((m, i) => pluck(m, i * 0.045));

/** Scales and arpeggios: ascending, note by note. */
export const playSequence = (midis: number[], gap = 0.3) =>
  midis.forEach((m, i) => pluck(m, i * gap, gap * 1.6));
