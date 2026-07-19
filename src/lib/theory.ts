/**
 * Music theory engine — everything is computed from interval formulas + a tuning
 * definition, so custom tunings need no authoring (spec §1, §2).
 *
 * Note names are unicode-spelled throughout (`E♭`, `F♯`, `B𝄫`); there is no ASCII
 * form and therefore no conversion layer.
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const ACCIDENTAL: Record<string, number> = { '♯': 1, '♭': -1, '𝄪': 2, '𝄫': -2 };
/** Semitones of the major scale, the reference every interval name is measured against. */
const MAJOR_REF = [0, 2, 4, 5, 7, 9, 11];

const mod = (n: number, m: number) => ((n % m) + m) % m;
/** Nearest signed distance, so 11 semitones up reads as 1 down. */
const wrap = (n: number) => mod(n + 6, 12) - 6;

function accidentals(alt: number): string {
  if (alt === 0) return '';
  if (alt === 2) return '𝄪';
  if (alt === -2) return '𝄫';
  return alt > 0 ? '♯'.repeat(alt) : '♭'.repeat(-alt);
}

export function notePc(name: string): number {
  const letter = LETTERS.indexOf(name[0]);
  const alt = [...name].slice(1).reduce((a, c) => a + (ACCIDENTAL[c] ?? 0), 0);
  return mod(LETTER_PC[letter] + alt, 12);
}

/**
 * The whole spelling engine: pick the letter by degree, then let the accidental
 * fall out of the semitone arithmetic. Double accidentals are rendered faithfully
 * — there is no respelling pass (spec §2).
 */
export function spell(root: string, semitones: number, letterStep: number): string {
  const letter = LETTERS[mod(LETTERS.indexOf(root[0]) + letterStep, 7)];
  const target = mod(notePc(root) + semitones, 12);
  return letter + accidentals(wrap(target - LETTER_PC[LETTERS.indexOf(letter)]));
}

export type Role = 'root' | '3rd' | '5th' | '7th' | 'other';
export type Note = {
  pc: number;
  name: string;
  /** Scale-degree number, 1-based off the letter step. */
  degree: string;
  /** Interval name relative to the root: `R`, `♭3`, `5`, `♭7`… */
  interval: string;
  role: Role;
};

const ROLES: Record<number, Role> = { 0: 'root', 2: '3rd', 4: '5th', 6: '7th' };

function note(root: string, semitones: number, letterStep: number): Note {
  const alt = wrap(semitones - MAJOR_REF[letterStep]);
  return {
    pc: mod(notePc(root) + semitones, 12),
    name: spell(root, semitones, letterStep),
    degree: String(letterStep + 1),
    interval: semitones === 0 && letterStep === 0 ? 'R' : accidentals(alt) + (letterStep + 1),
    role: (semitones === 0 ? 'root' : ROLES[letterStep]) ?? 'other',
  };
}

/**
 * `letterSteps` is what makes spelling key-correct: it pins each interval to a
 * scale degree letter. Pentatonics inherit their parent scale's letters; blues
 * reuses the 5th's letter for its ♭5, the one deliberate repeated letter (§2).
 */
type Formula = { intervals: number[]; letterSteps: number[] };

export const SCALES: Record<string, Formula> = {
  'Major (Ionian)': { intervals: [0, 2, 4, 5, 7, 9, 11], letterSteps: [0, 1, 2, 3, 4, 5, 6] },
  'Dorian': { intervals: [0, 2, 3, 5, 7, 9, 10], letterSteps: [0, 1, 2, 3, 4, 5, 6] },
  'Phrygian': { intervals: [0, 1, 3, 5, 7, 8, 10], letterSteps: [0, 1, 2, 3, 4, 5, 6] },
  'Lydian': { intervals: [0, 2, 4, 6, 7, 9, 11], letterSteps: [0, 1, 2, 3, 4, 5, 6] },
  'Mixolydian': { intervals: [0, 2, 4, 5, 7, 9, 10], letterSteps: [0, 1, 2, 3, 4, 5, 6] },
  'Natural minor (Aeolian)': { intervals: [0, 2, 3, 5, 7, 8, 10], letterSteps: [0, 1, 2, 3, 4, 5, 6] },
  'Locrian': { intervals: [0, 1, 3, 5, 6, 8, 10], letterSteps: [0, 1, 2, 3, 4, 5, 6] },
  'Harmonic minor': { intervals: [0, 2, 3, 5, 7, 8, 11], letterSteps: [0, 1, 2, 3, 4, 5, 6] },
  'Melodic minor (asc.)': { intervals: [0, 2, 3, 5, 7, 9, 11], letterSteps: [0, 1, 2, 3, 4, 5, 6] },
  'Minor pentatonic': { intervals: [0, 3, 5, 7, 10], letterSteps: [0, 2, 3, 4, 6] },
  'Major pentatonic': { intervals: [0, 2, 4, 7, 9], letterSteps: [0, 1, 2, 4, 5] },
  'Minor blues': { intervals: [0, 3, 5, 6, 7, 10], letterSteps: [0, 2, 3, 4, 4, 6] },
};

export const CHORDS: Record<string, Formula & { suffix: string }> = {
  'major': { intervals: [0, 4, 7], letterSteps: [0, 2, 4], suffix: '' },
  'minor': { intervals: [0, 3, 7], letterSteps: [0, 2, 4], suffix: 'm' },
  'dim': { intervals: [0, 3, 6], letterSteps: [0, 2, 4], suffix: '°' },
  'aug': { intervals: [0, 4, 8], letterSteps: [0, 2, 4], suffix: '+' },
  'maj7': { intervals: [0, 4, 7, 11], letterSteps: [0, 2, 4, 6], suffix: 'maj7' },
  'min7': { intervals: [0, 3, 7, 10], letterSteps: [0, 2, 4, 6], suffix: 'm7' },
  'dom7': { intervals: [0, 4, 7, 10], letterSteps: [0, 2, 4, 6], suffix: '7' },
  'm7♭5': { intervals: [0, 3, 6, 10], letterSteps: [0, 2, 4, 6], suffix: 'm7♭5' },
  'dim7': { intervals: [0, 3, 6, 9], letterSteps: [0, 2, 4, 6], suffix: '°7' },
  'sus2': { intervals: [0, 2, 7], letterSteps: [0, 1, 4], suffix: 'sus2' },
  'sus4': { intervals: [0, 5, 7], letterSteps: [0, 3, 4], suffix: 'sus4' },
  '6': { intervals: [0, 4, 7, 9], letterSteps: [0, 2, 4, 5], suffix: '6' },
  'add9': { intervals: [0, 2, 4, 7], letterSteps: [0, 1, 2, 4], suffix: 'add9' },
  'maj7 shell': { intervals: [0, 4, 11], letterSteps: [0, 2, 6], suffix: 'maj7 (shell)' },
  'dom7 shell': { intervals: [0, 4, 10], letterSteps: [0, 2, 6], suffix: '7 (shell)' },
  'min7 shell': { intervals: [0, 3, 10], letterSteps: [0, 2, 6], suffix: 'm7 (shell)' },
};

/** The 17 spelled roots — both spellings of each black key, no B♯/E♯/C♭/F♭ (§2). */
export const ROOTS = [
  'C', 'C♯', 'D♭', 'D', 'D♯', 'E♭', 'E', 'F', 'F♯', 'G♭', 'G', 'G♯', 'A♭', 'A', 'A♯', 'B♭', 'B',
];

const notesOf = (root: string, f: Formula) =>
  f.intervals.map((iv, i) => note(root, iv, f.letterSteps[i]));

export const scaleNotes = (root: string, scale: string) => notesOf(root, SCALES[scale]);
export const chordNotes = (root: string, chord: string) => notesOf(root, CHORDS[chord]);
export const chordSymbol = (root: string, chord: string) => root + CHORDS[chord].suffix;

export type Triad = { degree: number; numeral: string; symbol: string; notes: Note[] };

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/**
 * Diatonic triads of a 7-note scale (§7). Returns `[]` for pentatonic/blues —
 * the rule is mechanical: 7 notes → the selector shows.
 */
export function diatonicTriads(root: string, scale: string): Triad[] {
  const scaleN = scaleNotes(root, scale);
  if (scaleN.length !== 7) return [];
  const semis = SCALES[scale].intervals;

  return scaleN.map((tonic, i) => {
    const stack = [0, 2, 4].map((s) => mod(i + s, 7));
    // Interval of each stacked note above the triad's own root.
    const above = stack.map((d) => mod(semis[d] - semis[i], 12));
    const [, third, fifth] = above;
    const chord =
      third === 4 && fifth === 8 ? 'aug'
      : third === 3 && fifth === 6 ? 'dim'
      : third === 3 ? 'minor'
      : 'major';

    const minorish = chord === 'minor' || chord === 'dim';
    const numeral =
      (minorish ? NUMERALS[i].toLowerCase() : NUMERALS[i]) + (CHORDS[chord].suffix === 'm' ? '' : CHORDS[chord].suffix);

    return {
      degree: i + 1,
      numeral,
      symbol: chordSymbol(tonic.name, chord),
      // Notes keep the scale's own spelling; only the role re-keys to this triad.
      notes: stack.map((d, k) => ({ ...scaleN[d], role: (['root', '3rd', '5th'] as Role[])[k] })),
    };
  });
}

// ---- pitch, tuning, audio frequency (§5, §6) ----------------------------------

export type Pitch = { note: string; octave: number };
export type Tuning = { name?: string; strings: Pitch[] };

/** Scientific pitch notation: middle C = C4 = MIDI 60, standard low E = E2 = 40. */
export const midiOf = (p: Pitch) => (p.octave + 1) * 12 + notePc(p.note);
export const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
/** `string` is an index into `tuning.strings`, ordered low→high. */
export const fretMidi = (tuning: Tuning, string: number, fret: number) =>
  midiOf(tuning.strings[string]) + fret;

export const LAST_FRET = 24;

/** The position window: a 4–6 fret span highlighted in place on the whole neck (§4). */
export type FretWindow = { startFret: number; width: number };

export const PRESET_TUNINGS: Tuning[] = [
  { name: 'Standard', strings: pitches('E2 A2 D3 G3 B3 E4') },
  { name: 'Drop D', strings: pitches('D2 A2 D3 G3 B3 E4') },
  { name: 'Half-step down', strings: pitches('E♭2 A♭2 D♭3 G♭3 B♭3 E♭4') },
  { name: 'DADGAD', strings: pitches('D2 A2 D3 G3 A3 D4') },
  { name: 'Open G', strings: pitches('D2 G2 D3 G3 B3 D4') },
  { name: 'Open D', strings: pitches('D2 A2 D3 F♯3 A3 D4') },
  { name: 'All-fourths', strings: pitches('E2 A2 D3 G3 C4 F4') },
  { name: '7-string standard', strings: pitches('B1 E2 A2 D3 G3 B3 E4') },
];

function pitches(spec: string): Pitch[] {
  return spec.split(' ').map((s) => ({ note: s.slice(0, -1), octave: Number(s.slice(-1)) }));
}

/** Auto-label a tuning from its pitches, e.g. "E A D G C F" (§5). */
export const autoLabel = (t: Tuning) => t.strings.map((s) => s.note).join(' ');

/**
 * Soft, non-blocking warnings — any pitch set is accepted and save is never
 * disabled (§5).
 */
export function tuningWarnings(t: Tuning): string[] {
  const out: string[] = [];
  const midis = t.strings.map(midiOf);
  if (midis.some((m, i) => i > 0 && m <= midis[i - 1])) {
    out.push('Strings are not in ascending pitch order.');
  }
  if (midis.some((m, i) => i > 0 && Math.abs(m - midis[i - 1]) > 12)) {
    out.push('Some adjacent strings are more than an octave apart.');
  }
  return out;
}
