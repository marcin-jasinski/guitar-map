import { describe, expect, test } from 'vitest';
import { CHORD_COLORS, chordVoicing, effectiveLabelMode, noteMap, scaleRun, visibleCells } from './view';
import { PRESET_TUNINGS, notePc } from './theory';
import type { Content } from './store.svelte';

const standard = PRESET_TUNINGS[0];
const win = { startFret: 5, width: 5 };
const dot = (c: Content, pc: number, mode: 'names' | 'degrees' | 'intervals' = 'names') =>
  noteMap(c, mode).get(pc)!;

describe('scale view', () => {
  const c: Content = { kind: 'scale', root: 'C', scale: 'Major (Ionian)', degree: null };

  test('all seven notes show, none faded', () => {
    const m = noteMap(c, 'names');
    expect(m.size).toBe(7);
    expect([...m.values()].every((d) => !d.faded)).toBe(true);
  });

  test('label mode switches names / degrees / intervals', () => {
    expect(dot(c, notePc('E'), 'names').label).toBe('E');
    expect(dot(c, notePc('E'), 'degrees').label).toBe('3');
    expect(dot(c, notePc('E'), 'intervals').label).toBe('3');
  });

  test('selecting a degree fades the rest and re-keys colour to the triad root (§7)', () => {
    const withV: Content = { ...c, degree: 5 } as Content; // V = G major
    const m = noteMap(withV, 'names');
    expect(m.get(notePc('G'))!.colors).toEqual(['var(--c-root)']);
    expect(m.get(notePc('B'))!.colors).toEqual(['var(--c-triad)']);
    expect(m.get(notePc('D'))!.colors).toEqual(['var(--c-fifth)']);
    expect(m.get(notePc('F'))!.faded).toBe(true);
    // The plain scale keeps its notes visible underneath.
    expect(m.size).toBe(7);
  });
});

describe('chord and arpeggio views', () => {
  test('an arpeggio renders identically to the same single chord (§2)', () => {
    const chord = noteMap({ kind: 'chord', slots: [{ root: 'C', type: 'maj7' }] }, 'names');
    const arp = noteMap({ kind: 'arpeggio', root: 'C', chord: 'maj7' }, 'names');
    expect(arp).toEqual(chord);
  });

  test('only chord tones appear', () => {
    expect(noteMap({ kind: 'chord', slots: [{ root: 'C', type: 'major' }] }, 'names').size).toBe(3);
  });
});

describe('overlay (§9)', () => {
  const two: Content = { kind: 'chord', slots: [{ root: 'C', type: 'major' }, { root: 'A', type: 'minor' }] };

  test('colour switches from interval role to chord identity at 2 chords', () => {
    expect(dot(two, notePc('C')).colors).toEqual([CHORD_COLORS[0], CHORD_COLORS[1]]);
    expect(dot(two, notePc('G')).colors).toEqual([CHORD_COLORS[0]]);
  });

  test('shared notes split their fill and carry a numeric badge', () => {
    expect(dot(two, notePc('E')).colors).toHaveLength(2);
    expect(dot(two, notePc('E')).badge).toBe('1·2');
    expect(dot(two, notePc('G')).badge).toBe('1');
  });

  test('three chords split three ways', () => {
    const three: Content = {
      kind: 'chord',
      slots: [{ root: 'C', type: 'major' }, { root: 'A', type: 'minor' }, { root: 'F', type: 'major' }],
    };
    expect(dot(three, notePc('C')).colors).toHaveLength(3);
    expect(dot(three, notePc('C')).badge).toBe('1·2·3');
  });
});

describe('label mode locking', () => {
  test('overlay locks to names', () => {
    const two: Content = { kind: 'chord', slots: [{ root: 'C', type: 'major' }, { root: 'F', type: 'major' }] };
    expect(effectiveLabelMode(two, 'intervals')).toBe('names');
  });

  test('one chord keeps intervals but not degrees', () => {
    const one: Content = { kind: 'chord', slots: [{ root: 'C', type: 'major' }] };
    expect(effectiveLabelMode(one, 'intervals')).toBe('intervals');
    expect(effectiveLabelMode(one, 'degrees')).toBe('names');
  });

  test('scale keeps all three', () => {
    const s: Content = { kind: 'scale', root: 'C', scale: 'Dorian', degree: null };
    expect(effectiveLabelMode(s, 'degrees')).toBe('degrees');
  });
});

describe('which positions get drawn', () => {
  const cells = (c: Content, wholeNeck = false) =>
    visibleCells(standard, win, c, noteMap(c, 'names'), wholeNeck);
  const frets = (set: Set<string>) => [...set].map((k) => Number(k.split(':')[1]));
  const perString = (set: Set<string>) => {
    const counts = new Map<string, number>();
    for (const k of set) {
      const s = k.split(':')[0];
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.values()];
  };

  const scale: Content = { kind: 'scale', root: 'C', scale: 'Major (Ionian)', degree: null };
  const chord: Content = { kind: 'chord', slots: [{ root: 'C', type: 'major' }] };
  const arp: Content = { kind: 'arpeggio', root: 'C', chord: 'major' };
  const overlay: Content = {
    kind: 'chord',
    slots: [{ root: 'C', type: 'major' }, { root: 'A', type: 'minor' }],
  };

  test('window mode draws nothing outside the window', () => {
    for (const c of [scale, chord, arp, overlay]) {
      expect(frets(cells(c)).every((f) => f >= 5 && f <= 9), c.kind).toBe(true);
    }
  });

  test('a single chord thins to one fingerable note per string', () => {
    const set = cells(chord);
    expect(perString(set).every((n) => n === 1)).toBe(true);
    // C major is reachable on all six strings in frets 5–9.
    expect(set.size).toBe(6);
  });

  test('scales and arpeggios keep the full in-position pattern', () => {
    expect(perString(cells(scale)).some((n) => n > 1)).toBe(true);
    expect(perString(cells(arp)).some((n) => n > 1)).toBe(true);
  });

  test('an overlay is not thinned — the overlaps are the point (§9)', () => {
    expect(perString(cells(overlay)).some((n) => n > 1)).toBe(true);
  });

  test('whole-neck mode restores every occurrence, open strings included', () => {
    const set = cells(scale, true);
    expect(frets(set)).toContain(0);
    expect(frets(set)).toContain(24);
    expect(set.size).toBeGreaterThan(cells(scale).size);
  });

  test('whole-neck mode does not thin chords either', () => {
    expect(perString(cells(chord, true)).some((n) => n > 1)).toBe(true);
  });

  test('the window follows the tuning, so a 7-string neck fills 7 rows', () => {
    const seven = PRESET_TUNINGS[7];
    const set = visibleCells(seven, win, scale, noteMap(scale, 'names'), false);
    expect(new Set([...set].map((k) => k.split(':')[0])).size).toBe(7);
  });
});

describe('playback note selection (§6)', () => {
  test('a voicing is one note per chord tone, ascending, inside the window', () => {
    const v = chordVoicing(standard, win, 'C', 'major');
    expect(v).toHaveLength(3);
    expect(v).toEqual([...v].sort((a, b) => a - b));
    expect(new Set(v.map((m) => m % 12))).toEqual(new Set([0, 4, 7]));
  });

  test('a scale run ascends one octave from the lowest root in the window', () => {
    const r = scaleRun(standard, win, 'C', 'Major (Ionian)');
    expect(r).toHaveLength(8);
    expect(r.at(-1)! - r[0]).toBe(12);
    expect(r).toEqual([...r].sort((a, b) => a - b));
  });

  test('playback follows the tuning, not standard', () => {
    const dropD = PRESET_TUNINGS[1];
    expect(chordVoicing(dropD, { startFret: 0, width: 5 }, 'D', 'major')[0]).toBe(38); // open low D
  });
});
