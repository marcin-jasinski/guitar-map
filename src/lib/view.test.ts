import { describe, expect, test } from 'vitest';
import {
  CHORD_COLORS,
  board,
  chordVoicing,
  chordVoicings,
  effectiveLabelMode,
  noteMap,
  rootAnchors,
  usableAnchors,
  scaleRun,
  type Board,
} from './view';
import { PRESET_TUNINGS, fretMidi, notePc } from './theory';
import type { Content, Display } from './store.svelte';

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
  const POS: Display = { mode: 'position', octaves: 1, anchor: 0 };
  const WHOLE: Display = { mode: 'whole', octaves: 1, anchor: 0 };

  const at = (c: Content, display: Display, tuning = standard) =>
    board(tuning, win, c, noteMap(c, 'names'), display);
  const frets = (b: Board) => [...b.cells].map((k) => Number(k.split(':')[1]));
  const perString = (b: Board) => {
    const counts = new Map<string, number>();
    for (const k of b.cells) {
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

  test('position mode draws nothing outside the window', () => {
    // A single chord is exempt: it steps through shapes, not window positions.
    for (const c of [scale, arp, overlay]) {
      expect(frets(at(c, POS)).every((f) => f >= 5 && f <= 9), c.kind).toBe(true);
    }
  });

  test('a single chord ignores the window and follows its shape index instead', () => {
    const dots = noteMap(chord, 'names');
    const shapes = chordVoicings(standard, dots, notePc('C'));
    const first = board(standard, { startFret: 5, width: 5 }, chord, dots, POS);
    const same = board(standard, { startFret: 17, width: 4 }, chord, dots, POS);
    expect([...same.cells]).toEqual([...first.cells]);
    expect([...first.cells]).toEqual([...shapes[0].cells]);

    const second = board(standard, win, chord, dots, { ...POS, anchor: 1 });
    expect([...second.cells]).not.toEqual([...first.cells]);
  });

  test('scales and arpeggios keep the full in-position pattern', () => {
    expect(perString(at(scale, POS)).some((n) => n > 1)).toBe(true);
    expect(perString(at(arp, POS)).some((n) => n > 1)).toBe(true);
  });

  test('an overlay is not thinned, since the overlaps are the point', () => {
    expect(perString(at(overlay, POS)).some((n) => n > 1)).toBe(true);
  });

  test('whole-neck mode restores every occurrence, open strings included', () => {
    const b = at(scale, WHOLE);
    expect(frets(b)).toContain(0);
    expect(frets(b)).toContain(24);
    expect(b.cells.size).toBeGreaterThan(at(scale, POS).cells.size);
  });

  test('whole-neck mode does not thin chords either', () => {
    expect(perString(at(chord, WHOLE)).some((n) => n > 1)).toBe(true);
  });

  test('the board follows the tuning, so a 7-string neck fills 7 rows', () => {
    const b = at(scale, POS, PRESET_TUNINGS[7]);
    expect(new Set([...b.cells].map((k) => k.split(':')[0])).size).toBe(7);
  });
});

describe('octave mode', () => {
  const scale: Content = { kind: 'scale', root: 'C', scale: 'Major (Ionian)', degree: null };
  const arp: Content = { kind: 'arpeggio', root: 'C', chord: 'major' };
  const display = (octaves: number, anchor = 0): Display => ({ mode: 'octaves', octaves, anchor });
  const at = (c: Content, d: Display) => board(standard, win, c, noteMap(c, 'names'), d);
  const cellsOf = (b: Board) => [...b.cells].map((k) => k.split(':').map(Number));
  const midis = (b: Board) => cellsOf(b).map(([s, f]) => fretMidi(standard, s, f));

  test('root positions come from every string and keep same-pitch duplicates', () => {
    const roots = rootAnchors(standard, scale);
    expect(roots.map((a) => a.midi)).toEqual([...roots.map((a) => a.midi)].sort((a, b) => a - b));
    expect(roots.every((a) => a.midi % 12 === 0)).toBe(true);
    expect(new Set(roots.map((a) => a.string)).size).toBe(6);
    // C4 is reachable on the D, G and B strings: three different places to start.
    expect(roots.filter((a) => a.midi === 60).length).toBeGreaterThan(1);
  });

  test('each pitch is drawn once — one path, not every duplicate on the neck', () => {
    for (const count of [1, 2, 3]) {
      const b = at(scale, display(count, 0));
      const m = midis(b);
      expect(new Set(m).size, `${count} oct`).toBe(m.length);
    }
  });

  test('the path starts on the active root and closes an octave up', () => {
    const anchor = usableAnchors(standard, scale, noteMap(scale, 'names'), 2)[0];
    const m = midis(at(scale, display(2, 0)));
    expect(Math.min(...m)).toBe(anchor.midi);
    expect(Math.max(...m)).toBe(anchor.midi + 24);
  });

  test('it draws far fewer notes than every position in the range would', () => {
    const b = at(scale, display(2, 0));
    const anchor = usableAnchors(standard, scale, noteMap(scale, 'names'), 2)[0];
    let everywhere = 0;
    for (let s = 0; s < 6; s++) {
      for (let f = 0; f <= 24; f++) {
        const midi = fretMidi(standard, s, f);
        if (midi >= anchor.midi && midi <= anchor.midi + 24 && [0, 2, 4, 5, 7, 9, 11].includes(midi % 12)) {
          everywhere++;
        }
      }
    }
    expect(b.cells.size).toBeLessThan(everywhere / 2);
  });

  test('the shape stays under the hand: at most three notes per string, in reach', () => {
    for (const anchorIndex of [0, 1, 2, 3]) {
      const b = at(scale, display(2, anchorIndex));
      const byString = new Map<number, number[]>();
      for (const [s, f] of cellsOf(b)) byString.set(s, [...(byString.get(s) ?? []), f]);
      for (const [s, frets] of byString) {
        expect(frets.length, `string ${s}`).toBeLessThanOrEqual(3);
        expect(Math.max(...frets) - Math.min(...frets), `string ${s}`).toBeLessThanOrEqual(4);
      }
    }
  });

  test('stepping the anchor moves to the next root position', () => {
    const anchors = usableAnchors(standard, scale, noteMap(scale, 'names'), 1);
    expect(Math.min(...midis(at(scale, display(1, 0))))).toBe(anchors[0].midi);
    expect(Math.min(...midis(at(scale, display(1, 1))))).toBe(anchors[1].midi);
  });

  test('anchors that could not complete the span are not offered', () => {
    const dots = noteMap(scale, 'names');
    const one = usableAnchors(standard, scale, dots, 1);
    const three = usableAnchors(standard, scale, dots, 3);
    expect(three.length).toBeLessThan(one.length);
  });

  test('an out-of-range anchor clamps instead of blanking the board', () => {
    expect(at(scale, display(1, 999)).cells.size).toBeGreaterThan(0);
  });

  test('the other roots are offered as ghosts pointing at their own anchor', () => {
    const anchors = usableAnchors(standard, scale, noteMap(scale, 'names'), 2);
    const b = at(scale, display(2, 0));

    expect(b.ghosts.size).toBeGreaterThan(0);
    for (const [key, index] of b.ghosts) {
      const [s, f] = key.split(':').map(Number);
      // Every ghost is a real root, and its index selects that very position.
      expect(fretMidi(standard, s, f) % 12).toBe(notePc('C'));
      expect(anchors[index]).toMatchObject({ string: s, fret: f });
      // Ghosts never sit on a note the path already draws.
      expect(b.cells.has(key)).toBe(false);
    }
    expect(b.ghosts.has(`${anchors[0].string}:${anchors[0].fret}`)).toBe(false);
  });

  test('clicking a ghost gives exactly the board that anchor would', () => {
    const b = at(scale, display(2, 0));
    const [, index] = [...b.ghosts][0];
    const picked = at(scale, display(2, index));
    const anchors = usableAnchors(standard, scale, noteMap(scale, 'names'), 2);
    expect(Math.min(...midis(picked))).toBe(anchors[index].midi);
    expect([...picked.cells]).not.toEqual([...b.cells]);
  });

  test('only octave mode has ghosts — nothing else grows stray dots', () => {
    expect(at(scale, { mode: 'position', octaves: 1, anchor: 0 }).ghosts.size).toBe(0);
    expect(at(scale, { mode: 'whole', octaves: 1, anchor: 0 }).ghosts.size).toBe(0);
  });

  test('arpeggios get the same treatment, showing only chord tones', () => {
    const b = at(arp, display(2));
    const m = midis(b);
    expect(new Set(m).size).toBe(m.length);
    expect(new Set(m.map((x) => x % 12))).toEqual(new Set([0, 4, 7]));
  });
});

describe('chord voicings are playable', () => {
  const POS: Display = { mode: 'position', octaves: 1, anchor: 0 };

  const voice = (root: string, type: string, startFret: number) => {
    const c: Content = { kind: 'chord', slots: [{ root, type }] };
    const b = board(standard, { startFret, width: 5 }, c, noteMap(c, 'names'), POS);
    const shape = [...b.cells].map((k) => k.split(':').map(Number)).sort((a, z) => a[0] - z[0]);
    return { barre: b.barre, shape };
  };

  const cases: [string, string, number][] = [
    ['C', 'major', 5], ['C', 'maj7', 5], ['G', 'major', 0], ['A', 'minor', 0],
    ['F', 'major', 1], ['E♭', 'dom7', 3], ['B♭', 'min7', 5], ['D', 'sus4', 7],
    ['F♯', 'm7♭5', 9], ['A', 'dim7', 12], ['C', 'add9', 7], ['G', '6', 2],
  ];

  test('the root always sounds', () => {
    for (const [root, type, fret] of cases) {
      const pcs = voice(root, type, fret).shape.map(([s, f]) => fretMidi(standard, s, f) % 12);
      expect(pcs, root + type + ' at ' + fret).toContain(notePc(root));
    }
  });

  test('played strings are adjacent, with no muted string in the middle', () => {
    for (const [root, type, fret] of cases) {
      const strings = voice(root, type, fret).shape.map(([s]) => s);
      expect(strings.at(-1)! - strings[0], root + type).toBe(strings.length - 1);
    }
  });

  test('every shape fits one hand: four fingers, five frets', () => {
    for (const [root, type, fret] of cases) {
      const { shape, barre } = voice(root, type, fret);
      const frets = shape.map(([, f]) => f).filter((f) => f > 0);
      const span = frets.length ? Math.max(...frets) - Math.min(...frets) : 0;
      expect(span, root + type + ' span').toBeLessThanOrEqual(5);

      const low = frets.length ? Math.min(...frets) : 0;
      const fingers = barre ? 1 + frets.filter((f) => f > low).length : frets.length;
      expect(fingers, root + type + ' fingers').toBeLessThanOrEqual(4);
    }
  });

  test('a barre is only claimed where one finger really could stop the run', () => {
    for (const [root, type, fret] of cases) {
      const { shape, barre } = voice(root, type, fret);
      if (!barre) continue;
      const byString = new Map(shape.map(([s, f]) => [s, f]));
      expect(barre.to, root + type).toBeGreaterThan(barre.from);
      for (let s = barre.from; s <= barre.to; s++) {
        const f = byString.get(s);
        if (f === undefined) continue;
        // Nothing in the run sits below the barre, and nothing is left open.
        expect(f, root + type + ' string ' + s).toBeGreaterThanOrEqual(barre.fret);
        expect(f).not.toBe(0);
      }
    }
  });

  test('it puts the root in the bass where the window allows one', () => {
    const { shape } = voice('C', 'major', 5);
    expect(fretMidi(standard, shape[0][0], shape[0][1]) % 12).toBe(notePc('C'));
  });

  test('it finds the chords guitarists actually play', () => {
    // Low string first, null for a string that is not played.
    const spell = (root: string, type: string, startFret: number) => {
      const { shape } = voice(root, type, startFret);
      const byString = new Map(shape.map(([s, f]) => [s, f]));
      return [...Array(6).keys()].map((s) => byString.get(s) ?? null);
    };
    expect(spell('E', 'major', 0)).toEqual([0, 2, 2, 1, 0, 0]);
    expect(spell('A', 'minor', 0)).toEqual([null, 0, 2, 2, 1, 0]);
    expect(spell('D', 'major', 0)).toEqual([null, null, 0, 2, 3, 2]);
    expect(spell('G', 'major', 0)).toEqual([3, 2, 0, 0, 0, 3]);
    expect(spell('F', 'major', 1)).toEqual([1, 3, 3, 2, 1, 1]);
  });

  test('a complete voicing is preferred over one in root position', () => {
    // A°7 in frets 12–16 can be complete or root-in-bass, not both.
    const { shape } = voice('A', 'dim7', 12);
    const pcs = shape.map(([s, f]) => fretMidi(standard, s, f) % 12);
    expect(new Set(pcs)).toEqual(new Set([9, 0, 3, 6]));
  });

  test('omits reports the truth when nothing complete is reachable', () => {
    const complete = board(
      standard, { startFret: 5, width: 5 },
      { kind: 'chord', slots: [{ root: 'E♭', type: 'dom7' }] },
      noteMap({ kind: 'chord', slots: [{ root: 'E♭', type: 'dom7' }] }, 'names'), POS,
    );
    expect(complete.omits).toEqual([]);

    // Only three frets of reach: something has to give, and it is declared.
    const cramped = board(
      standard, { startFret: 3, width: 4 },
      { kind: 'chord', slots: [{ root: 'A', type: 'dim7' }] },
      noteMap({ kind: 'chord', slots: [{ root: 'A', type: 'dim7' }] }, 'names'), POS,
    );
    expect(cramped.omits.length + cramped.cells.size).toBeGreaterThan(0);
  });
});

describe('playback note selection (§6)', () => {
  test('a voicing is one note per chord tone, ascending, inside the window', () => {
    const v = chordVoicing(standard, win, 'C', 'major');
    expect(v).toHaveLength(3);
    expect(v).toEqual([...v].sort((a, b) => a - b));
    expect(new Set(v.map((m) => m % 12))).toEqual(new Set([0, 4, 7]));
  });

  test('a scale run ascends one octave and closes on the root', () => {
    const r = scaleRun('C', 'Major (Ionian)', 48);
    expect(r).toHaveLength(8);
    expect(r[0]).toBe(48);
    expect(r.at(-1)! - r[0]).toBe(12);
    expect(r).toEqual([...r].sort((a, b) => a - b));
  });

  test('a run covers as many octaves as the board is showing', () => {
    const r = scaleRun('C', 'Major (Ionian)', 48, 3);
    expect(r).toHaveLength(22);
    expect(r.at(-1)).toBe(84);
  });

  test('playback follows the tuning, not standard', () => {
    const dropD = PRESET_TUNINGS[1];
    expect(chordVoicing(dropD, { startFret: 0, width: 5 }, 'D', 'major')[0]).toBe(38); // open low D
  });
});
