import { beforeEach, expect, test } from 'vitest';
import { addFavorite, collectTuning, favoriteName, store } from './store.svelte';
import { PRESET_TUNINGS, type Tuning } from './theory';
import type { Chord } from './progression';

/**
 * A `$state` tuning reaches the store as a proxy, and `structuredClone` refuses
 * to clone one. This stands in for that without needing a component.
 */
const reactive = (t: Tuning): Tuning => ({ name: t.name, strings: new Proxy(t.strings, {}) });

const custom = (name?: string): Tuning => ({
  name,
  strings: [
    { note: 'C', octave: 2 },
    { note: 'G', octave: 2 },
    { note: 'C', octave: 3 },
    { note: 'F', octave: 3 },
    { note: 'A', octave: 3 },
    { note: 'D', octave: 4 },
  ],
});

beforeEach(() => {
  store.customTunings.length = 0;
  store.favorites.length = 0;
});

test('a tuning held in reactive state can be saved', () => {
  expect(collectTuning(reactive(custom('Nashville-ish')))).toBe(true);
  expect(store.customTunings.map((t) => t.name)).toContain('Nashville-ish');
});

test('what lands in the store is plain data, not a live reference', () => {
  const live = custom('Snapshot me');
  collectTuning(reactive(live));
  live.strings[0].note = 'B';
  expect(store.customTunings[0].strings[0].note).toBe('C');
  expect(() => structuredClone(store.customTunings[0])).not.toThrow();
});

test('an unnamed tuning is stored under its auto-label', () => {
  collectTuning(reactive(custom()));
  expect(store.customTunings[0].name).toBe('C G C F A D');
});

test('saving the same strings again renames rather than duplicating', () => {
  collectTuning(custom('First go'));
  collectTuning(custom('Better name'));
  expect(store.customTunings).toHaveLength(1);
  expect(store.customTunings[0].name).toBe('Better name');
});

test('a built-in preset is reported rather than silently duplicated', () => {
  expect(collectTuning({ ...PRESET_TUNINGS[0], name: 'My standard' })).toBe(false);
  expect(store.customTunings).toHaveLength(0);
});

test('saving a favorite also collects its tuning, proxied or not', () => {
  const snapshot = {
    tuning: reactive(custom('From a favorite')),
    content: { kind: 'scale', root: 'C', scale: 'Major (Ionian)', degree: null } as const,
    window: { startFret: 5, width: 5 },
    labelMode: 'names' as const,
  };
  addFavorite(snapshot);
  expect(store.favorites[0].name).toContain('From a favorite');
  expect(store.customTunings.map((t) => t.name)).toContain('From a favorite');
  expect(() => structuredClone(store.favorites[0])).not.toThrow();
});

test('a progression favorite names without a fret range and omits window/labelMode', () => {
  const chords: Chord[] = [
    { degree: 1, quality: 'major' },
    { degree: 4, quality: 'minor' },
    { degree: 5, quality: 'dom7', of: { degree: 5 } },
    { degree: 5, quality: 'dom7' },
    { degree: 1, quality: 'major' }, // fifth chord → truncated with …
  ];
  const snapshot = {
    tuning: { ...PRESET_TUNINGS[0] },
    content: { kind: 'progression', key: { root: 'C', tonality: 'major' }, chords, step: 0 } as const,
  };
  addFavorite(snapshot);
  const fav = store.favorites[0];
  expect(fav.name).toBe('C major · I – iv – V7/V – V7 … — Standard');
  expect(fav.name).not.toContain('frets');
  expect(fav.window).toBeUndefined();
  expect(fav.labelMode).toBeUndefined();
  // The store never leaves version 1, so old favorites still load.
  expect(store.version).toBe(1);
});

test('favoriteName still adds the fret range for a windowed content kind', () => {
  const name = favoriteName({
    tuning: PRESET_TUNINGS[0],
    content: { kind: 'scale', root: 'C', scale: 'Major (Ionian)', degree: null },
    window: { startFret: 5, width: 5 },
    labelMode: 'names',
  });
  expect(name).toContain('frets 5–9');
});
