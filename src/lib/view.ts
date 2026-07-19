/**
 * Turns a `Content` selection into what the fretboard actually draws, and into
 * the notes audio plays. Keeping this pure keeps `Fretboard.svelte` dumb: it
 * renders whatever pitch classes it is handed.
 */
import type { Content, Display, LabelMode } from './store.svelte';
import {
  CHORDS,
  LAST_FRET,
  chordNotes,
  diatonicTriads,
  fretMidi,
  notePc,
  scaleNotes,
  type FretWindow,
  type Note,
  type Role,
  type Tuning,
} from './theory';

export type Dot = {
  name: string;
  label: string;
  /** One colour normally; 2–3 when chords share the note in overlay (§9). */
  colors: string[];
  faded: boolean;
  /** Non-colour cue for overlay chord identity, e.g. "1·3" (§9). */
  badge: string;
  /** Spoken role, for the ARIA label. */
  role: string;
};

const ROLE_COLOR: Record<Role, string> = {
  root: 'var(--c-root)',
  '3rd': 'var(--c-triad)',
  '5th': 'var(--c-fifth)',
  '7th': 'var(--c-seventh)',
  other: 'var(--c-ext)',
};

/** Overlay chord-identity hues (§9): distinguishable under the common colour
 *  vision deficiencies, and always paired with a numeric badge so identity is
 *  never carried by colour alone. */
export const CHORD_COLORS = ['var(--c-ch1)', 'var(--c-ch2)', 'var(--c-ch3)'];

const label = (n: Note, mode: LabelMode) =>
  mode === 'names' ? n.name : mode === 'degrees' ? n.degree : n.interval;

/** Overlay locks labels to note names, and chord/arpeggio have no scale-degree
 *  context to number against (§3, §9). */
export function effectiveLabelMode(content: Content, mode: LabelMode): LabelMode {
  if (content.kind === 'chord' && content.slots.length > 1) return 'names';
  if (content.kind !== 'scale' && mode === 'degrees') return 'names';
  return mode;
}

export function noteMap(content: Content, mode: LabelMode): Map<number, Dot> {
  const m = effectiveLabelMode(content, mode);
  const dots = new Map<number, Dot>();
  const put = (n: Note, colors: string[], faded: boolean, badge = '') =>
    dots.set(n.pc, { name: n.name, label: label(n, m), colors, faded, badge, role: n.interval });

  if (content.kind === 'scale') {
    const triad = content.degree
      ? diatonicTriads(content.root, content.scale)[content.degree - 1]
      : undefined;
    const highlit = new Set(triad?.notes.map((n) => n.pc));

    for (const n of scaleNotes(content.root, content.scale)) {
      // With a triad selected the scale fades back; without one it keeps its own
      // interval colours (§3, §7).
      const inTriad = triad ? highlit.has(n.pc) : true;
      put(n, [inTriad ? ROLE_COLOR[n.role] : 'var(--c-scale)'], !inTriad);
    }
    // Re-key the triad's three notes to root/3rd/5th of the *triad* (§7).
    for (const n of triad?.notes ?? []) put(n, [ROLE_COLOR[n.role]], false);
    return dots;
  }

  if (content.kind === 'arpeggio') {
    // An arpeggio renders identically to a single chord (§2) — only playback differs.
    for (const n of chordNotes(content.root, content.chord)) put(n, [ROLE_COLOR[n.role]], false);
    return dots;
  }

  if (content.slots.length === 1) {
    const { root, type } = content.slots[0];
    for (const n of chordNotes(root, type)) put(n, [ROLE_COLOR[n.role]], false);
    return dots;
  }

  // Overlay: colour encodes chord identity, and a shared note splits its fill
  // between the chords that contribute it (§9).
  const owners = new Map<number, { note: Note; slots: number[] }>();
  content.slots.forEach((slot, i) => {
    for (const n of chordNotes(slot.root, slot.type)) {
      const entry = owners.get(n.pc) ?? { note: n, slots: [] };
      entry.slots.push(i);
      owners.set(n.pc, entry);
    }
  });
  for (const { note, slots } of owners.values()) {
    dots.set(note.pc, {
      name: note.name,
      label: note.name,
      colors: slots.map((i) => CHORD_COLORS[i]),
      faded: false,
      badge: slots.map((i) => i + 1).join('·'),
      role: slots.length > 1 ? `shared by chords ${slots.map((i) => i + 1).join(' and ')}` : `chord ${slots[0] + 1}`,
    });
  }
  return dots;
}

// ---- which board positions to draw ---------------------------------------------

export const cellKey = (string: number, fret: number) => `${string}:${fret}`;

/** A run of strings stopped at one fret by a single finger. */
export type Barre = { fret: number; from: number; to: number };
export type Board = {
  cells: Set<string>;
  barre: Barre | null;
  /** Chord tones the chosen voicing leaves out — sometimes nothing complete is
   *  reachable in the window, and saying so beats quietly showing a lie. */
  omits: string[];
};

export const contentRoot = (c: Content) => (c.kind === 'chord' ? c.slots[0].root : c.root);

/**
 * Every distinct root *pitch* on the neck, ascending. Roots are gathered from
 * every string rather than just the lowest; a pitch reachable on two strings
 * appears once, because the octave view is defined by pitch, not by where you
 * choose to fret it.
 *
 * With `octaves` set, roots too high for that many octaves to fit on the neck
 * are dropped, so stepping the anchor never lands on a truncated span. If none
 * fit, every root is offered and the span simply runs out at the last fret.
 */
export function rootPitches(tuning: Tuning, content: Content, octaves = 0): number[] {
  const pc = notePc(contentRoot(content));
  const top = fretMidi(tuning, tuning.strings.length - 1, LAST_FRET);
  const found = new Set<number>();
  for (let s = 0; s < tuning.strings.length; s++) {
    for (let f = 0; f <= LAST_FRET; f++) {
      const midi = fretMidi(tuning, s, f);
      if (midi % 12 === pc) found.add(midi);
    }
  }
  const all = [...found].sort((a, b) => a - b);
  const fits = all.filter((m) => m + 12 * octaves <= top);
  return fits.length ? fits : all;
}

const clampIndex = (i: number, len: number) => Math.max(0, Math.min(len - 1, i));

/** Fret span a hand can cover, and the most fingers it has. */
const MAX_SPAN = 5;
const MAX_FINGERS = 4;

/**
 * What makes one playable shape better than another. A chord missing a defining
 * tone is more wrong than a chord in inversion, so completeness outweighs having
 * the root in the bass; both outweigh simply covering more strings.
 */
const COMPLETE = 80;
const ROOT_IN_BASS = 40;
const PER_STRING = 10;
const PER_FINGER = 8;
const PER_FRET_OF_SPAN = 4;

/**
 * Which `(string, fret)` positions get a dot. `noteMap` decides what a pitch
 * class *looks* like; this decides *where* it appears.
 */
export function board(
  tuning: Tuning,
  win: FretWindow,
  content: Content,
  dots: Map<number, Dot>,
  display: Display,
): Board {
  const strings = tuning.strings.length;
  const cells = new Set<string>();

  if (display.mode === 'octaves') {
    const roots = rootPitches(tuning, content, display.octaves);
    const low = roots[clampIndex(display.anchor, roots.length)] ?? 0;
    const high = low + 12 * display.octaves;
    for (let s = 0; s < strings; s++) {
      for (let f = 0; f <= LAST_FRET; f++) {
        const midi = fretMidi(tuning, s, f);
        if (midi >= low && midi <= high && dots.has(midi % 12)) cells.add(cellKey(s, f));
      }
    }
    return { cells, barre: null, omits: [] };
  }

  if (display.mode === 'whole') {
    for (let s = 0; s < strings; s++) {
      for (let f = 0; f <= LAST_FRET; f++) {
        if (dots.has(fretMidi(tuning, s, f) % 12)) cells.add(cellKey(s, f));
      }
    }
    return { cells, barre: null, omits: [] };
  }

  // A single chord in position becomes a chord you can actually play.
  if (content.kind === 'chord' && content.slots.length === 1) {
    return voicing(tuning, win, dots, notePc(content.slots[0].root));
  }

  const hi = Math.min(LAST_FRET, win.startFret + win.width - 1);
  for (let s = 0; s < strings; s++) {
    for (let f = win.startFret; f <= hi; f++) {
      if (dots.has(fretMidi(tuning, s, f) % 12)) cells.add(cellKey(s, f));
    }
  }
  return { cells, barre: null, omits: [] };
}

/** Chord tones with no cell sounding them, by name. */
function missing(tuning: Tuning, cells: Set<string>, dots: Map<number, Dot>): string[] {
  const sounded = new Set(
    [...cells].map((k) => {
      const [s, f] = k.split(':').map(Number);
      return fretMidi(tuning, s, f) % 12;
    }),
  );
  return [...dots.entries()].filter(([pc]) => !sounded.has(pc)).map(([, d]) => d.name);
}

/** `null` at a string means it is not played. */
type Shape = (number | null)[];

/**
 * Work out how the shape is held: the lowest fretted position barres if two or
 * more strings share it, which is what lets a 6-string shape need only 4 fingers.
 * A barre cannot cross a string played open, since the finger would stop it.
 */
function fingering(shape: Shape): { fingers: number; barre: Barre | null } {
  const fretted = shape
    .map((fret, string) => ({ fret, string }))
    .filter((x): x is { fret: number; string: number } => x.fret !== null && x.fret > 0);
  if (!fretted.length) return { fingers: 0, barre: null };

  const low = Math.min(...fretted.map((x) => x.fret));
  const atLow = fretted.filter((x) => x.fret === low);
  if (atLow.length < 2) return { fingers: fretted.length, barre: null };

  const from = Math.min(...atLow.map((x) => x.string));
  const to = Math.max(...atLow.map((x) => x.string));
  for (let s = from; s <= to; s++) if (shape[s] === 0) return { fingers: fretted.length, barre: null };

  const above = fretted.filter((x) => x.fret > low).length;
  return { fingers: 1 + above, barre: { fret: low, from, to } };
}

/**
 * Search every combination of one-note-per-string (or muted) inside the window
 * and keep the most playable one. Brute force is fine here: a chord offers at
 * most a couple of frets per string, so this is a few thousand cheap checks.
 *
 * Hard requirements — the root must sound, the played strings must be adjacent
 * (no muted string in the middle), and the shape must fit one hand.
 */
function voicing(tuning: Tuning, win: FretWindow, dots: Map<number, Dot>, rootPc: number): Board {
  const strings = tuning.strings.length;
  const hi = Math.min(LAST_FRET, win.startFret + win.width - 1);

  const options: Shape[] = [];
  for (let s = 0; s < strings; s++) {
    const opts: (number | null)[] = [null];
    for (let f = win.startFret; f <= hi; f++) {
      if (dots.has(fretMidi(tuning, s, f) % 12)) opts.push(f);
    }
    options.push(opts);
  }

  let best: { shape: Shape; barre: Barre | null; score: number } | null = null;
  const shape: Shape = new Array(strings).fill(null);

  const consider = () => {
    const played = shape.map((f, s) => (f === null ? -1 : s)).filter((s) => s >= 0);
    if (played.length < 3) return;
    if (played.at(-1)! - played[0] !== played.length - 1) return; // no interior mutes

    const pcs = played.map((s) => fretMidi(tuning, s, shape[s]!) % 12);
    if (!pcs.includes(rootPc)) return;

    const frets = played.map((s) => shape[s]!).filter((f) => f > 0);
    const span = frets.length ? Math.max(...frets) - Math.min(...frets) : 0;
    if (span > MAX_SPAN) return;

    const { fingers, barre } = fingering(shape);
    if (fingers > MAX_FINGERS) return;

    const score =
      (dots.size === new Set(pcs).size ? COMPLETE : 0) +
      (pcs[0] === rootPc ? ROOT_IN_BASS : 0) +
      PER_STRING * played.length -
      PER_FINGER * fingers -
      PER_FRET_OF_SPAN * span;

    if (!best || score > best.score) best = { shape: [...shape], barre, score };
  };

  const walk = (s: number) => {
    if (s === strings) return consider();
    for (const option of options[s]) {
      shape[s] = option;
      walk(s + 1);
    }
    shape[s] = null;
  };
  walk(0);

  if (!best) {
    // Nothing playable in this window — fall back to the lowest chord tone per
    // string so the board never goes blank.
    const cells = new Set<string>();
    for (let s = 0; s < strings; s++) {
      for (let f = win.startFret; f <= hi; f++) {
        if (dots.has(fretMidi(tuning, s, f) % 12)) {
          cells.add(cellKey(s, f));
          break;
        }
      }
    }
    return { cells, barre: null, omits: missing(tuning, cells, dots) };
  }

  const chosen: { shape: Shape; barre: Barre | null } = best;
  const cells = new Set<string>();
  chosen.shape.forEach((f, s) => f !== null && cells.add(cellKey(s, f)));
  return { cells, barre: chosen.barre, omits: missing(tuning, cells, dots) };
}

// ---- playback note selection (§6) ---------------------------------------------

/** Every pitch of a given class reachable inside the position window, ascending. */
function inWindow(tuning: Tuning, win: FretWindow, pc: number): number[] {
  const out: number[] = [];
  for (let s = 0; s < tuning.strings.length; s++) {
    for (let f = win.startFret; f < win.startFret + win.width; f++) {
      const midi = fretMidi(tuning, s, f);
      if (midi % 12 === pc) out.push(midi);
    }
  }
  return out.sort((a, b) => a - b);
}

/** One voicing of the chord: the lowest playable occurrence of each chord tone
 *  in the window, so a strum sounds like a shape rather than every octave. */
export function chordVoicing(tuning: Tuning, win: FretWindow, root: string, type: string): number[] {
  return chordNotes(root, type)
    .map((n) => inWindow(tuning, win, n.pc)[0])
    .filter((m): m is number => m !== undefined)
    .sort((a, b) => a - b);
}

/** The scale ascending from `startMidi`, closing on the root `octaves` up, so
 *  playback matches however many octaves the board is showing. */
export function scaleRun(root: string, scale: string, startMidi: number, octaves = 1): number[] {
  const intervals = scaleNotes(root, scale).map((n, _, all) => (n.pc - all[0].pc + 12) % 12);
  const run: number[] = [];
  for (let o = 0; o < octaves; o++) run.push(...intervals.map((iv) => startMidi + iv + 12 * o));
  run.push(startMidi + 12 * octaves);
  return run;
}

export const chordTypes = Object.keys(CHORDS);
