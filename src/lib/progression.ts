/**
 * The chord-progression model (spec §1) and everything computed from it. A
 * progression is a key plus an ordered list of Roman-numeral chords; the numeral
 * is stored, the chord symbol is always derived. No new music data — degrees map
 * to `theory.ts`'s `spell()` and the 16 shipped `CHORDS`.
 */
import { CHORDS, chordNotes, chordSymbol, spell, type Note } from './theory';
import { ROLE_COLOR, type Dot } from './view';

export type Tonality = 'major' | 'minor';
export type Key = { root: string; tonality: Tonality };
/** A chromatic degree: 1–7 with an optional ♭/♯, reaching all 12 pitch classes. */
export type Deg = { degree: number; alter?: -1 | 1 };
export type Chord = Deg & {
  quality: keyof typeof CHORDS;
  /** Secondary-function target, e.g. the `V` in `V7/V`. */
  of?: Deg;
  /** §5's pinned voicing, one fret per string. Absent = auto. Unused until TICKET-024. */
  pin?: (number | null)[];
};
export type Progression = { key: Key; chords: Chord[] };

/** The rail stays usable; nothing is invalid below this (§1). */
export const PROG_CAP = 32;

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10]; // natural minor (Aeolian) — VII/VI need no flat
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const mod = (n: number, m: number) => ((n % m) + m) % m;
const degSemis = (t: Tonality) => (t === 'major' ? MAJOR : MINOR);
const accidental = (alt = 0) => (alt > 0 ? '♯'.repeat(alt) : alt < 0 ? '♭'.repeat(-alt) : '');

/**
 * Total letter-step and semitone offset of a chord's root above the key root.
 * A secondary (`of`) chord measures its own degree above the target's root; both
 * degrees read against the key's tonality, so only the outer one is relative (§1).
 */
function offset(key: Key, ch: Chord): { ls: number; semi: number } {
  const base = (d: Deg) => ({
    ls: d.degree - 1,
    semi: degSemis(key.tonality)[d.degree - 1] + (d.alter ?? 0),
  });
  const outer = base(ch);
  if (!ch.of) return outer;
  const tgt = base(ch.of);
  return { ls: tgt.ls + outer.ls, semi: tgt.semi + outer.semi };
}

/** The spelled root name of a chord in a key, key-correct for free via `spell()`. */
export function chordRoot(key: Key, ch: Chord): string {
  const { ls, semi } = offset(key, ch);
  return spell(key.root, semi, ls);
}

export const chordNotesOf = (key: Key, ch: Chord): Note[] => chordNotes(chordRoot(key, ch), ch.quality);
export const chordSymbolOf = (key: Key, ch: Chord): string => chordSymbol(chordRoot(key, ch), ch.quality);

/** Lower-case numeral iff the quality contains a minor 3rd (interval 3 at
 *  letter-step 2) — the same test `diatonicTriads()` uses, over all 16 qualities. */
const minorish = (q: keyof typeof CHORDS) =>
  CHORDS[q].intervals.some((iv, i) => CHORDS[q].letterSteps[i] === 2 && iv === 3);

/** The diatonic triad on a degree is minor-ish — decides a secondary target's case. */
const degMinorish = (t: Tonality, degree: number) =>
  mod(degSemis(t)[mod(degree + 1, 7)] - degSemis(t)[degree - 1], 12) === 3;

const degNumeral = (cased: boolean, d: Deg) =>
  accidental(d.alter) + (cased ? NUMERALS[d.degree - 1].toLowerCase() : NUMERALS[d.degree - 1]);

/**
 * Mechanical numeral: accidental + cased roman + quality suffix, plus `/target`
 * for a secondary. Drops only the bare `m` suffix (lower-case already says minor),
 * so `min7` reads `iim7` and `m7♭5` reads `iim7♭5` (§1).
 */
export function numeralOf(key: Key, ch: Chord): string {
  const suffix = CHORDS[ch.quality].suffix;
  let s = degNumeral(minorish(ch.quality), ch) + (suffix === 'm' ? '' : suffix);
  if (ch.of) s += '/' + degNumeral(degMinorish(key.tonality, ch.of.degree), ch.of);
  return s;
}

/**
 * The current chord's tones as full-size role-coloured dots for the whole neck
 * (§4.4). Parent-scale and exception layers are added by TICKET-021. Empty when
 * there is no current chord.
 */
export function progressionDots(key: Key, chord: Chord | undefined): Map<number, Dot> {
  const dots = new Map<number, Dot>();
  if (!chord) return dots;
  for (const n of chordNotesOf(key, chord)) {
    dots.set(n.pc, {
      name: n.name,
      label: n.name,
      colors: [ROLE_COLOR[n.role]],
      faded: false,
      badge: '',
      role: n.interval,
    });
  }
  return dots;
}
