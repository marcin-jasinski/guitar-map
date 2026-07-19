/**
 * Turns a `Content` selection into what the fretboard actually draws, and into
 * the notes audio plays. Keeping this pure keeps `Fretboard.svelte` dumb: it
 * renders whatever pitch classes it is handed.
 */
import type { Content, LabelMode } from './store.svelte';
import {
  CHORDS,
  LAST_FRET,
  chordNotes,
  diatonicTriads,
  fretMidi,
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

/**
 * Which `(string, fret)` cells actually get a dot. `noteMap` decides what a pitch
 * class *looks* like; this decides *where* it appears, which is what makes the
 * position window worth having.
 *
 * - Whole neck: every occurrence, everywhere — the reference view.
 * - Window, single chord: **one note per string**, so the shape is a fingering
 *   rather than a cloud of every chord tone in reach.
 * - Window, anything else: every occurrence inside the window. Scales and
 *   arpeggios want the full in-position pattern, and an overlay of 2–3 chords
 *   is about comparing them, so thinning it to one per string would hide the
 *   overlaps that are the whole point (§9).
 */
export function visibleCells(
  tuning: Tuning,
  win: FretWindow,
  content: Content,
  dots: Map<number, Dot>,
  wholeNeck: boolean,
): Set<string> {
  const cells = new Set<string>();
  const lo = wholeNeck ? 0 : win.startFret;
  const hi = wholeNeck ? LAST_FRET : Math.min(LAST_FRET, win.startFret + win.width - 1);
  // ponytail: lowest chord tone on each string. Good enough to finger; a real
  // voicing chooser (root in the bass, minimal stretch) is the upgrade path.
  const onePerString = !wholeNeck && content.kind === 'chord' && content.slots.length === 1;

  for (let s = 0; s < tuning.strings.length; s++) {
    for (let f = lo; f <= hi; f++) {
      if (!dots.has(fretMidi(tuning, s, f) % 12)) continue;
      cells.add(cellKey(s, f));
      if (onePerString) break;
    }
  }
  return cells;
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

/** One ascending octave of the scale, starting from the lowest root in the window. */
export function scaleRun(tuning: Tuning, win: FretWindow, root: string, scale: string): number[] {
  const notes = scaleNotes(root, scale);
  const start = inWindow(tuning, win, notes[0].pc)[0];
  if (start === undefined) return [];
  const intervals = notes.map((n) => (n.pc - notes[0].pc + 12) % 12);
  return [...intervals, 12].map((iv) => start + iv);
}

export const chordTypes = Object.keys(CHORDS);
