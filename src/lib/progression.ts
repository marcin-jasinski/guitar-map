/**
 * The chord-progression model (spec §1) and everything computed from it. A
 * progression is a key plus an ordered list of Roman-numeral chords; the numeral
 * is stored, the chord symbol is always derived. No new music data — degrees map
 * to `theory.ts`'s `spell()` and the 16 shipped `CHORDS`.
 */
import {
  CHORDS,
  SCALES,
  chordNotes,
  chordSymbol,
  note,
  notePc,
  scaleNotes,
  spell,
  type Note,
} from './theory';
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

/** A curated progression, key-agnostic — its numerals are written against a
 *  tonality, not a root (§2). */
export type Preset = { name: string; tonality: Tonality; chords: Chord[] };

// Compact builders so the table below reads like its numeral column.
const c = (degree: number, quality: Chord['quality'], extra: Partial<Chord> = {}): Chord =>
  ({ degree, quality, ...extra });
const I7 = c(1, 'dom7');
const IV7 = c(4, 'dom7');
const V7 = c(5, 'dom7');

/**
 * Ten presets, one flat list, name only — modelled on `PRESET_TUNINGS` (§2). No
 * root: loading keeps the player's current root and switches only tonality. The
 * numerals each name are exactly what `numeralOf()` produces; the six after the
 * classics exist to prove the inference and the exceptions on load.
 */
export const PRESET_PROGRESSIONS: Preset[] = [
  { name: 'I–V–vi–IV', tonality: 'major', chords: [c(1, 'major'), c(5, 'major'), c(6, 'minor'), c(4, 'major')] },
  { name: 'I–vi–IV–V', tonality: 'major', chords: [c(1, 'major'), c(6, 'minor'), c(4, 'major'), c(5, 'major')] },
  { name: 'ii–V–I', tonality: 'major', chords: [c(2, 'min7'), V7, c(1, 'maj7')] },
  { name: '12-bar blues', tonality: 'major', chords: [I7, I7, I7, I7, IV7, IV7, I7, I7, V7, IV7, I7, V7] },
  { name: 'Mixolydian rock', tonality: 'major', chords: [c(1, 'major'), c(7, 'major', { alter: -1 }), c(4, 'major')] },
  { name: 'Dorian vamp', tonality: 'minor', chords: [c(1, 'minor'), c(4, 'major')] },
  { name: 'Borrowed iv', tonality: 'major', chords: [c(1, 'major'), c(4, 'major'), c(4, 'minor'), c(1, 'major')] },
  { name: 'Secondary dominant', tonality: 'major', chords: [c(1, 'major'), c(5, 'dom7', { of: { degree: 5 } }), V7, c(1, 'major')] },
  { name: 'Andalusian cadence', tonality: 'minor', chords: [c(1, 'minor'), c(7, 'major'), c(6, 'major'), c(5, 'major')] },
  { name: 'Minor ii–V–i', tonality: 'minor', chords: [c(2, 'm7♭5'), V7, c(1, 'minor')] },
];

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

// ---- parent scale inference & exceptions (spec §3) -----------------------------

/** Two shipped keys are not modal names; the other seven already are (§3). The
 *  keys are never renamed — they persist verbatim in saved `{kind:'scale'}` favorites. */
const MODAL_NAME: Record<string, string> = {
  'Major (Ionian)': 'Ionian',
  'Natural minor (Aeolian)': 'Aeolian',
};
const modalName = (scaleKey: string) => MODAL_NAME[scaleKey] ?? scaleKey;

/** The inverse, for TICKET-027's Scale bridge: a modal display name back to its
 *  `SCALES` key. Only the two mapped names differ; the rest pass through. */
export function scaleKeyOf(modal: string): string {
  for (const [key, name] of Object.entries(MODAL_NAME)) if (name === modal) return key;
  return modal;
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** Interval name of a note relative to the key tonic, e.g. "♯4" — via `note()`. */
const intervalFromTonic = (tonic: string, name: string): string =>
  note(tonic, mod(notePc(name) - notePc(tonic), 12), mod(LETTERS.indexOf(name[0]) - LETTERS.indexOf(tonic[0]), 7)).interval;

/** A chord tone outside the parent, paired with the parent note it displaces. */
export type Alteration = { play: Note; insteadOf: Note; interval: string };
export type ParentAdvice = {
  scaleKey: string; // a SCALES key
  name: string; // modal display name, e.g. "C Ionian"
  exceptions: Map<number, Alteration[]>; // chord index → its outside notes
  /** Function label per chord, or null for a diatonic chord. */
  labels: (string | null)[];
  strained: boolean;
};

const isDiminished = (q: keyof typeof CHORDS) => CHORDS[q].intervals.includes(6);

/** Every non-diatonic chord's function, from its numeral (§3). */
function functionLabel(key: Key, ch: Chord): string {
  if (ch.of) {
    const tgt = degNumeral(degMinorish(key.tonality, ch.of.degree), ch.of);
    return isDiminished(ch.quality)
      ? `secondary leading-tone chord of ${tgt}`
      : `secondary dominant of ${tgt}`;
  }
  const parallel: Tonality = key.tonality === 'major' ? 'minor' : 'major';
  const parKey = parallel === 'major' ? 'Major (Ionian)' : 'Natural minor (Aeolian)';
  const parPcs = new Set(scaleNotes(key.root, parKey).map((n) => n.pc));
  if (chordNotesOf(key, ch).every((n) => parPcs.has(n.pc))) return `borrowed from ${key.root} ${parallel}`;
  return `${numeralOf(key, ch)} — outside the key`;
}

/**
 * The parent scale to solo with, plus per-chord exceptions (§3). Score the nine
 * shipped 7-note scales rooted on the tonic by role-weighted chord-tone coverage
 * (3rd/7th count 2, root/5th/other count 1), walking the chords as stored so a
 * repeat counts as prominence. Ties break by declaration order in `SCALES`.
 * Returns null for an empty progression — no chords means every scale scores 0
 * and the tie-break would confidently name the wrong thing (§4.6).
 */
export function inferParent(prog: Progression): ParentAdvice | null {
  if (!prog.chords.length) return null;
  const tonic = prog.key.root;

  let best: { scaleKey: string; score: number; pcs: Set<number> } | null = null;
  for (const [scaleKey, f] of Object.entries(SCALES)) {
    if (f.intervals.length !== 7) continue; // pentatonics/blues can only lose to their parents
    const pcs = new Set(scaleNotes(tonic, scaleKey).map((n) => n.pc));
    let score = 0;
    for (const ch of prog.chords)
      for (const n of chordNotesOf(prog.key, ch))
        if (pcs.has(n.pc)) score += n.role === '3rd' || n.role === '7th' ? 2 : 1;
    // Strictly greater, so the first-declared scale wins an exact tie.
    if (!best || score > best.score) best = { scaleKey, score, pcs };
  }
  const { scaleKey, pcs } = best!;
  const parentNotes = scaleNotes(tonic, scaleKey);

  const exceptions = new Map<number, Alteration[]>();
  prog.chords.forEach((ch, i) => {
    const alts: Alteration[] = [];
    for (const n of chordNotesOf(prog.key, ch)) {
      if (pcs.has(n.pc)) continue;
      const insteadOf = parentNotes.find((p) => p.name[0] === n.name[0]) ?? n;
      alts.push({ play: n, insteadOf, interval: intervalFromTonic(tonic, n.name) });
    }
    if (alts.length) exceptions.set(i, alts);
  });

  return {
    scaleKey,
    name: `${tonic} ${modalName(scaleKey)}`,
    exceptions,
    labels: prog.chords.map((ch, i) => (exceptions.has(i) ? functionLabel(prog.key, ch) : null)),
    strained: exceptions.size > prog.chords.length / 2,
  };
}

// ---- typed-symbol back-analysis (spec §1, TICKET-023) --------------------------

const wrap12 = (n: number) => mod(n + 6, 12) - 6;
const norm = (s: string) => s.replace(/#/g, '♯').replace(/b/g, '♭');

/** Human-readable list of what a typed symbol may end with, for the soft warning. */
export const SUPPORTED_SUFFIXES = Object.values(CHORDS)
  .map((f) => f.suffix || 'major')
  .join(', ');

/**
 * Back-analyse a typed chord symbol to a numeral (§1): the typed letter picks the
 * degree (so in C major `C♯` is ♯I and `D♭` is ♭II), the accidental sets `alter`,
 * and the suffix must match a shipped `CHORDS` suffix. Returns null for anything
 * outside the vocabulary — the caller warns softly and stores nothing.
 */
export function parseChord(key: Key, text: string): Chord | null {
  const m = text.trim().match(/^([A-Ga-g])([#♯b♭𝄪𝄫]*)(.*)$/);
  if (!m) return null;
  const rootName = m[1].toUpperCase() + norm(m[2]);
  const suffix = norm(m[3]).trim().replace(/^dim7$/, '°7').replace(/^dim$/, '°').replace(/^aug$/, '+');
  const entry = Object.entries(CHORDS).find(([, f]) => f.suffix === suffix);
  if (!entry) return null;

  const ls = mod(LETTERS.indexOf(rootName[0]) - LETTERS.indexOf(key.root[0]), 7);
  const diatonicPc = mod(notePc(key.root) + degSemis(key.tonality)[ls], 12);
  const alter = wrap12(notePc(rootName) - diatonicPc);
  if (Math.abs(alter) > 1) return null; // double accidentals are outside the ±1 vocabulary
  const quality = entry[0] as Chord['quality'];
  return alter === 0 ? { degree: ls + 1, quality } : { degree: ls + 1, quality, alter: alter as -1 | 1 };
}

// ---- neck rendering (spec §4.4, §4.7) ------------------------------------------

/**
 * The whole-neck dot map: the parent scale as small faded name dots underneath,
 * the current chord's tones as full-size role-coloured dots on top, and each of
 * the current chord's outside notes ringed in `--warn` (§3, §4.4). Later tickets
 * add the forward layers (ghosts, cut rings) on top.
 */
export function progressionDots(
  key: Key,
  chord: Chord | undefined,
  advice: ParentAdvice | null,
  index: number,
): Map<number, Dot> {
  const dots = new Map<number, Dot>();

  // Parent scale first, so a shared pitch class is overwritten by the fuller chord dot.
  if (advice) {
    for (const n of scaleNotes(key.root, advice.scaleKey)) {
      dots.set(n.pc, { name: n.name, label: n.name, colors: ['var(--c-scale)'], faded: true, badge: '', role: n.interval });
    }
  }

  if (!chord) return dots;
  const outside = new Set((advice?.exceptions.get(index) ?? []).map((a) => a.play.pc));
  for (const n of chordNotesOf(key, chord)) {
    dots.set(n.pc, {
      name: n.name,
      label: n.name,
      colors: [ROLE_COLOR[n.role]],
      faded: false,
      badge: '',
      role: n.interval,
      warnRing: outside.has(n.pc),
    });
  }
  return dots;
}
