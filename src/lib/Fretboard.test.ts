import { expect, test } from 'vitest';
import { render } from 'svelte/server';
import Fretboard from './Fretboard.svelte';
import { PRESET_TUNINGS } from './theory';
import { board, noteMap } from './view';
import type { Content, Display } from './store.svelte';

const tuning = PRESET_TUNINGS[0];
const win = { startFret: 5, width: 5 };
const scale: Content = { kind: 'scale', root: 'C', scale: 'Major (Ionian)', degree: null };
const chord: Content = { kind: 'chord', slots: [{ root: 'F', type: 'major' }] };

const draw = (content: Content, display: Display, w = win) => {
  const dots = noteMap(content, 'names');
  const neck = board(tuning, w, content, dots, display);
  return render(Fretboard, {
    props: {
      tuning, dots, win: w,
      cells: neck.cells,
      barre: neck.barre,
      showWindow: display.mode === 'position',
      onCenter: () => {},
      onPlayNote: () => {},
    },
  }).body;
};

test('whole-neck mode drops the window band and dims nothing', () => {
  const body = draw(scale, { mode: 'whole', octaves: 1, anchor: 0 });
  expect(body).not.toContain('var(--accent)" opacity=".14"');
  expect(body).not.toContain('faded');
  expect(body).toContain('fret 0"');
  expect(body).toContain('fret 24"');
});

test('position mode keeps the window band', () => {
  expect(draw(scale, { mode: 'position', octaves: 1, anchor: 0 })).toContain('opacity=".14"');
});

test('octave mode draws one compact path, ignoring the window entirely', () => {
  const body = draw(scale, { mode: 'octaves', octaves: 2, anchor: 0 });
  expect(body).not.toContain('opacity=".14"');
  // The path runs frets 8–13 from the root on the low E string: past the
  // 5–9 window at one end, and starting well after it at the other.
  expect(body).toContain('fret 13"');
  expect(body).not.toContain('fret 5"');
  expect(body).not.toContain('fret 0"');
});

test('a barred chord draws the bar and says so to a screen reader', () => {
  const body = draw(chord, { mode: 'position', octaves: 1, anchor: 0 }, { startFret: 1, width: 5 });
  expect(body).toContain(', barred"');
  expect(body).toContain('rx="13"');
});
