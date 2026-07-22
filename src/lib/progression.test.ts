import { expect, test } from 'vitest';
import { chordRoot, chordSymbolOf, numeralOf, type Chord, type Key } from './progression';

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
