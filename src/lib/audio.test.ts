import { expect, test } from 'vitest';
import { scheduleNote, scheduleSequence, scheduleStrum, type Sampler } from './audio.svelte';
import { freq } from './theory';

/**
 * Audio itself stays untested, as it always has — but the midi→pitch conversion and
 * the scheduling offsets are pinned here against a stubbed sampler, so the ear-tuned
 * timings can't silently drift when the synth was swapped for samples (TICKET-028).
 */
function stub() {
  const calls: { hz: number; dur: number; time: number }[] = [];
  const sampler: Sampler = { triggerAttackRelease: (hz, dur, time) => calls.push({ hz, dur, time }) };
  return { sampler, calls };
}

test('a single note plays at its true pitch, now, ringing 1.4s', () => {
  const { sampler, calls } = stub();
  scheduleNote(sampler, 100, 69); // MIDI 69 = A4 = 440 Hz
  expect(calls).toEqual([{ hz: 440, dur: 1.4, time: 100 }]);
});

test('a strum staggers low→high by 0.045s and keeps true per-tuning pitch', () => {
  const { sampler, calls } = stub();
  const midis = [40, 45, 50]; // E2 A2 D3, e.g. a drop/7-string low run
  scheduleStrum(sampler, 10, midis);
  expect(calls.map((c) => c.time)).toEqual([10, 10.045, 10.09]);
  expect(calls.map((c) => c.hz)).toEqual(midis.map(freq));
  expect(calls.every((c) => c.dur === 1.4)).toBe(true);
});

test('a sequence steps by gap and rings gap×1.6', () => {
  const { sampler, calls } = stub();
  scheduleSequence(sampler, 0, [60, 62, 64], 0.3);
  expect(calls.map((c) => c.time)).toEqual([0, 0.3, 0.6]);
  expect(calls.every((c) => Math.abs(c.dur - 0.48) < 1e-9)).toBe(true);
});
