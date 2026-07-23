import { expect, test } from 'vitest';
import { render } from 'svelte/server';
import Fretboard from './Fretboard.svelte';
import { PRESET_TUNINGS } from './theory';
import { board, noteMap, type NeckSelection } from './view';
import type { Content, Display } from './store.svelte';

const tuning = PRESET_TUNINGS[0];
const win = { startFret: 5, width: 5 };
const scale: Content = { kind: 'scale', root: 'C', scale: 'Major (Ionian)', degree: null };
const chord: Content = { kind: 'chord', slots: [{ root: 'F', type: 'major' }] };

const draw = (content: Content, display: Display, w = win, selection: NeckSelection | null = null) => {
  const dots = noteMap(content, 'names');
  const neck = board(tuning, w, content, dots, display);
  return render(Fretboard, {
    props: {
      tuning, dots, win: w, selection,
      cells: neck.cells,
      barre: neck.barre,
      ghosts: neck.ghosts,
      showWindow: display.mode === 'position',
      onCenter: () => {},
      onPlayNote: () => {},
      onPickRoot: () => {},
    },
  }).body;
};

test('whole-neck mode drops the window band and dims nothing', () => {
  const body = draw(scale, { mode: 'whole', octaves: 1, anchor: 0 });
  expect(body).not.toContain('var(--accent)" opacity=".14"');
  expect(body).not.toContain('faded');
  expect(body).toContain('open string 1"');
  expect(body).toContain('fret 24"');
});

test('open strings draw as a ring, not a filled dot', () => {
  const body = draw(scale, { mode: 'whole', octaves: 1, anchor: 0 });
  expect(body).toContain('stroke-width="3.5"');
  // Ringed but not dashed: an open string is played, unlike a ghost.
  expect(body).toContain('open string 6"');
});

test('a selection frames the region it isolates', () => {
  const body = draw(scale, { mode: 'whole', octaves: 1, anchor: 0 }, win, {
    fromString: 1, toString: 3, fromFret: 2, toFret: 6,
  });
  expect(body).toContain('Clear selection');
  // Pins the cell→pixel geometry, and with it the string axis: string 3 is nearer
  // the top than string 1, so the box hangs off the *higher* index.
  expect(body).toContain('x="115" y="90" width="230" height="102"');
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
  // Nothing is drawn at the nut: no scale note there, and no root to ghost.
  expect(body).not.toContain('fret 0"');
});

test('other roots render as dashed, clickable starting points', () => {
  const body = draw(scale, { mode: 'octaves', octaves: 2, anchor: 0 });
  expect(body).toContain('stroke-dasharray="3 2.5"');
  expect(body).toContain('Start the shape from C, string');
  // The ghosts are reachable by keyboard, like every other dot.
  expect(body).toMatch(/class="dot svelte-\w+ ghost"/);
});

test('a barred chord draws the bar and says so to a screen reader', () => {
  const body = draw(chord, { mode: 'position', octaves: 1, anchor: 0 }, { startFret: 1, width: 5 });
  expect(body).toContain(', barred"');
  expect(body).toContain('rx="13"');
});
