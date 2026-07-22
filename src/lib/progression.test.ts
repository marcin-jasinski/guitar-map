import { expect, test } from 'vitest';
import { CHORDS, PRESET_TUNINGS, notePc } from './theory';
import {
  PRESET_PROGRESSIONS,
  chordRoot,
  chordSymbolOf,
  guideCells,
  guideMove,
  guideVoices,
  inferParent,
  keyShift,
  numeralOf,
  parseChord,
  scaleKeyOf,
  shiftPins,
  solveChain,
  type Chord,
  type Key,
  type Progression,
} from './progression';

const C_MAJ: Key = { root: 'C', tonality: 'major' };
const A_MIN: Key = { root: 'A', tonality: 'minor' };

test('symbol derivation — secondary dominant resolves relatively', () => {
  // V7/V in C: degree 5 above the target V (=G), so D7 — not the diatonic G7.
  const v7ofV: Chord = { degree: 5, quality: 'dom7', of: { degree: 5 } };
  expect(chordRoot(C_MAJ, v7ofV)).toBe('D');
  expect(chordSymbolOf(C_MAJ, v7ofV)).toBe('D7');
  expect(numeralOf(C_MAJ, v7ofV)).toBe('V7/V');
});

test('symbol derivation — a ♭-altered degree spells against the key', () => {
  // ♭VII in C major is B♭ (a borrowed major triad); the flat is load-bearing here.
  const flat7: Chord = { degree: 7, quality: 'major', alter: -1 };
  expect(chordRoot(C_MAJ, flat7)).toBe('B♭');
  expect(chordSymbolOf(C_MAJ, flat7)).toBe('B♭');
  expect(numeralOf(C_MAJ, flat7)).toBe('♭VII');
});

test('minor keys use natural-minor degrees — VII/VI carry no flat', () => {
  // Andalusian i VII VI V in A minor: VII=G, VI=F, V=E (major, the ♯7 exception).
  expect(chordSymbolOf(A_MIN, { degree: 7, quality: 'major' })).toBe('G');
  expect(chordSymbolOf(A_MIN, { degree: 6, quality: 'major' })).toBe('F');
  expect(numeralOf(A_MIN, { degree: 7, quality: 'major' })).toBe('VII');
});

test("an of-target's own degree reads against the key tonality", () => {
  // V7/III in A minor targets C (Aeolian ♭3), not C♯ — only the outer degree is relative.
  const v7ofIII: Chord = { degree: 5, quality: 'dom7', of: { degree: 3 } };
  expect(chordRoot(A_MIN, v7ofIII)).toBe('G'); // degree 5 above C
  expect(numeralOf(A_MIN, v7ofIII)).toBe('V7/III');
});

test('numerals are cased by the minor-3rd rule, m dropped only for the bare triad', () => {
  expect(numeralOf(C_MAJ, { degree: 6, quality: 'minor' })).toBe('vi'); // bare m dropped
  expect(numeralOf(C_MAJ, { degree: 2, quality: 'min7' })).toBe('iim7'); // m7 kept
  expect(numeralOf(C_MAJ, { degree: 2, quality: 'm7♭5' })).toBe('iim7♭5');
  expect(numeralOf(C_MAJ, { degree: 7, quality: 'dim' })).toBe('vii°');
  expect(numeralOf(C_MAJ, { degree: 2, quality: 'sus4' })).toBe('IIsus4'); // no 3rd → upper
});

// ---- parent scale inference (spec §3, cross-cutting build notes) ----------------

const prog = (key: Key, chords: Chord[]): Progression => ({ key, chords });
const maj = (degree: number, alter?: -1 | 1): Chord => ({ degree, quality: 'major', alter });
const dom7 = (degree: number, of?: number): Chord =>
  ({ degree, quality: 'dom7', ...(of ? { of: { degree: of } } : {}) });

test('I ♭VII IV in C major → C Mixolydian, zero exceptions', () => {
  const a = inferParent(prog(C_MAJ, [maj(1), maj(7, -1), maj(4)]))!;
  expect(a.name).toBe('C Mixolydian');
  expect(a.exceptions.size).toBe(0);
});

test('i IV in D minor → D Dorian (modal naming, not "D minor")', () => {
  const a = inferParent(prog({ root: 'D', tonality: 'minor' }, [
    { degree: 1, quality: 'minor' },
    maj(4),
  ]))!;
  expect(a.name).toBe('D Dorian');
});

test('I IV iv I → C Ionian, one exception A♭ for A — Ionian ties Mixolydian at 14, wins on SCALES order', () => {
  // Both score 14 (no chord contains the 7th degree that separates them); Ionian
  // wins only because 'Major (Ionian)' is declared first in SCALES. Reordering
  // SCALES silently flips this.
  const a = inferParent(prog(C_MAJ, [maj(1), maj(4), { degree: 4, quality: 'minor' }, maj(1)]))!;
  expect(a.name).toBe('C Ionian');
  expect(a.exceptions.size).toBe(1);
  const [alt] = a.exceptions.get(2)!;
  expect([alt.play.name, alt.insteadOf.name]).toEqual(['A♭', 'A']);
});

test('I V7/V V7 I → C Ionian, F♯ for F, labelled secondary dominant — Ionian ties Lydian at 18', () => {
  // Ionian and Lydian both score 18: Lydian buys the D7's F♯ and loses the G7's F
  // for the same weight. Ionian wins on SCALES declaration order.
  const a = inferParent(prog(C_MAJ, [maj(1), dom7(5, 5), dom7(5), maj(1)]))!;
  expect(a.name).toBe('C Ionian');
  const [alt] = a.exceptions.get(1)!;
  expect([alt.play.name, alt.insteadOf.name, alt.interval]).toEqual(['F♯', 'F', '♯4']);
  expect(a.labels[1]).toBe('secondary dominant of V');
});

test('12-bar blues → Mixolydian, not Ionian', () => {
  const blues = [dom7(1), dom7(1), dom7(1), dom7(1), dom7(4), dom7(4), dom7(1), dom7(1), dom7(5), dom7(4), dom7(1), dom7(5)];
  expect(inferParent(prog(C_MAJ, blues))!.name).toBe('C Mixolydian');
});

test('empty progression runs no inference', () => {
  expect(inferParent(prog(C_MAJ, []))).toBeNull();
});

test('presets render the numerals the spec table lists, in the right tonality', () => {
  const numerals = (name: string) => {
    const p = PRESET_PROGRESSIONS.find((x) => x.name === name)!;
    // Rendered against any root; the numeral is root-agnostic.
    const key: Key = { root: 'C', tonality: p.tonality };
    return p.chords.map((ch) => numeralOf(key, ch)).join(' ');
  };
  expect(numerals('ii–V–I')).toBe('iim7 V7 Imaj7');
  expect(numerals('Mixolydian rock')).toBe('I ♭VII IV');
  expect(numerals('Borrowed iv')).toBe('I IV iv I');
  expect(numerals('Secondary dominant')).toBe('I V7/V V7 I');
  expect(numerals('Andalusian cadence')).toBe('i VII VI V'); // natural-minor degrees, no flat
  expect(numerals('Minor ii–V–i')).toBe('iim7♭5 V7 i');
  expect(PRESET_PROGRESSIONS.find((x) => x.name === '12-bar blues')!.chords).toHaveLength(12);
  expect(PRESET_PROGRESSIONS).toHaveLength(10);
});

// ---- typed-symbol back-analysis (spec §1, TICKET-023) ---------------------------

test('the typed letter picks the degree — C♯ is ♯I, D♭ is ♭II in C major', () => {
  expect(parseChord(C_MAJ, 'C♯')).toEqual({ degree: 1, quality: 'major', alter: 1 });
  expect(parseChord(C_MAJ, 'D♭')).toEqual({ degree: 2, quality: 'major', alter: -1 });
  // ASCII accidentals are accepted too.
  expect(parseChord(C_MAJ, 'C#')).toEqual({ degree: 1, quality: 'major', alter: 1 });
});

test('back-analysis round-trips through the symbol', () => {
  const cases: Chord[] = [
    { degree: 2, quality: 'min7' },
    { degree: 5, quality: 'dom7' },
    { degree: 7, quality: 'major', alter: -1 },
    { degree: 2, quality: 'm7♭5' },
    { degree: 1, quality: 'maj7' },
  ];
  for (const ch of cases) {
    expect(parseChord(C_MAJ, chordSymbolOf(C_MAJ, ch))).toEqual(ch);
  }
});

test('an unsupported suffix parses to null (the caller warns, stores nothing)', () => {
  expect(parseChord(C_MAJ, 'C13')).toBeNull();
  expect(parseChord(C_MAJ, 'G7♯9')).toBeNull();
  expect(parseChord(C_MAJ, 'Fm6/9')).toBeNull();
});

// ---- voicing chain (spec §5, TICKET-024) ----------------------------------------

const STD = PRESET_TUNINGS[0];

test('guide voices resolve for all 16 qualities by the priority rule', () => {
  const g = (q: Chord['quality']) => guideVoices(C_MAJ, { degree: 1, quality: q });
  expect(g('major')).toHaveLength(2); // 3rd, then 5th (no 7th)
  expect(g('maj7')).toEqual([notePc('E'), notePc('B')]); // 3rd, 7th
  // sus4 has no 3rd at all → 5th + root, never nothing.
  expect(g('sus4')).toEqual([notePc('G'), notePc('C')]);
  expect(g('sus2')).toEqual([notePc('G'), notePc('C')]);
  for (const q of Object.keys(CHORDS) as Chord['quality'][]) {
    expect(guideVoices(C_MAJ, { degree: 1, quality: q }).length).toBeGreaterThanOrEqual(2);
  }
});

test('the chain resolves ii–V–I smoothly — every guide voice sounds, movement stays tiny', () => {
  const prog: Progression = {
    key: C_MAJ,
    chords: [{ degree: 2, quality: 'min7' }, { degree: 5, quality: 'dom7' }, { degree: 1, quality: 'maj7' }],
  };
  const v = solveChain(prog, STD);
  expect(v).toHaveLength(3);
  // Every candidate that survives the filter sounds both guide voices — no line
  // is left without an anchor (§5).
  v.forEach((voicing, i) => {
    expect(guideCells(STD, voicing.frets, guideVoices(prog.key, prog.chords[i])).every((c) => c !== null)).toBe(true);
  });
  // 7th-falls-to-3rd and its neighbour emerge from minimising: each change moves the
  // guide voices barely at all.
  const total = guideMove(STD, v[0].frets, guideVoices(prog.key, prog.chords[0]), v[1].frets, guideVoices(prog.key, prog.chords[1]))
    + guideMove(STD, v[1].frets, guideVoices(prog.key, prog.chords[1]), v[2].frets, guideVoices(prog.key, prog.chords[2]));
  expect(total).toBeLessThanOrEqual(3);
});

test('a pin is a fixed column — the chain honours it and echoes pinned', () => {
  const pin = [null, null, 10, 9, 8, 8] as (number | null)[];
  const prog: Progression = {
    key: C_MAJ,
    chords: [{ degree: 2, quality: 'min7' }, { degree: 5, quality: 'dom7', pin }, { degree: 1, quality: 'maj7' }],
  };
  const v = solveChain(prog, STD);
  expect(v[1].frets).toEqual(pin);
  expect(v.map((x) => x.pinned)).toEqual([false, true, false]);
});

test('pins transpose by the nearest signed interval, rescued by ±12', () => {
  expect(keyShift('C', 'B')).toBe(-1); // not +11
  // −1 takes fret 0 below the nut, but the +12 octave retry rescues the whole shape.
  const prog: Progression = { key: { root: 'C', tonality: 'major' }, chords: [{ degree: 1, quality: 'major', pin: [null, null, 0, 2, 1, 0] }] };
  expect(shiftPins(prog, keyShift('C', 'B'), STD)).toEqual([]);
  // shift −1 fails at the nut, so the +12 retry applies: net +11.
  expect(prog.chords[0].pin).toEqual([null, null, 11, 13, 12, 11]);
});

test('a pin too wide to octave-shift drops to auto with its index reported', () => {
  // Span 19 frets: no single octave shift keeps both ends on the neck.
  const prog: Progression = { key: { root: 'C', tonality: 'major' }, chords: [{ degree: 1, quality: 'major', pin: [1, null, null, null, null, 20] }] };
  expect(shiftPins(prog, -2, STD)).toEqual([0]);
  expect(prog.chords[0].pin).toBeUndefined();
});

test('scaleKeyOf inverts the modal display map', () => {
  expect(scaleKeyOf('Ionian')).toBe('Major (Ionian)');
  expect(scaleKeyOf('Aeolian')).toBe('Natural minor (Aeolian)');
  expect(scaleKeyOf('Dorian')).toBe('Dorian'); // passes through
});
