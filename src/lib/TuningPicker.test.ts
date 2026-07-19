import { expect, test } from 'vitest';
import { render } from 'svelte/server';
import TuningPicker from './TuningPicker.svelte';
import { PRESET_TUNINGS } from './theory';

const grid = (tuning = PRESET_TUNINGS[0]) => {
  const body = render(TuningPicker, { props: { tuning } }).body;
  return { body, rows: body.slice(body.indexOf('class="strings'), body.indexOf('class="note')) };
};

test('strings are listed highest first, the same way round as the neck', () => {
  const selected = [...grid().rows.matchAll(/<option value="([^"]+)" selected="">/g)].map((m) => m[1]);
  // note, octave, note, octave… from the top row down.
  expect(selected).toEqual(['E', '4', 'B', '3', 'G', '3', 'D', '3', 'A', '2', 'E', '2']);
});

test('numbering still counts up from the lowest string, matching the fretboard', () => {
  const numbers = [...grid().rows.matchAll(/String (\d) note"/g)].map((m) => Number(m[1]));
  expect(numbers).toEqual([6, 5, 4, 3, 2, 1]);
});

test('the octave column is labelled, not left as bare numbers', () => {
  const { body } = grid();
  expect(body).toContain('>octave</span>');
  expect(body).toContain('>note</span>');
  expect(body).toContain('middle C is C4');
});

test('a seven-string tuning lists all seven', () => {
  const numbers = [...grid(PRESET_TUNINGS[7]).rows.matchAll(/String (\d) note"/g)].map((m) =>
    Number(m[1]),
  );
  expect(numbers).toEqual([7, 6, 5, 4, 3, 2, 1]);
});
