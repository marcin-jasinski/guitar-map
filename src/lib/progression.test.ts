import { expect, test } from 'vitest';
import {
  PRESET_PROGRESSIONS,
  chordRoot,
  chordSymbolOf,
  inferParent,
  numeralOf,
  parseChord,
  scaleKeyOf,
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

test('scaleKeyOf inverts the modal display map', () => {
  expect(scaleKeyOf('Ionian')).toBe('Major (Ionian)');
  expect(scaleKeyOf('Aeolian')).toBe('Natural minor (Aeolian)');
  expect(scaleKeyOf('Dorian')).toBe('Dorian'); // passes through
});
