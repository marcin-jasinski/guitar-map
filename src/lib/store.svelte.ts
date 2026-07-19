/**
 * Favorites + auto-collected custom tunings in localStorage (spec §8).
 * A favorite is a full, self-contained view snapshot — the tuning is embedded,
 * not referenced, so loading one always restores exactly what was saved.
 */
import { PRESET_TUNINGS, autoLabel, chordSymbol, type FretWindow, type Tuning } from './theory';

export type ChordSlot = { root: string; type: string };

export type Content =
  | { kind: 'scale'; root: string; scale: string; degree: number | null }
  | { kind: 'arpeggio'; root: string; chord: string }
  | { kind: 'chord'; slots: ChordSlot[] };

export type LabelMode = 'names' | 'degrees' | 'intervals';

/**
 * How much of the neck to draw.
 * - `position` — the 4–6 fret window; a single chord thins to a fingering.
 * - `octaves` — 1–3 full octaves upward from one root occurrence, `anchor`
 *   indexing the root pitches found across every string.
 * - `whole` — every occurrence, all 25 frets, no emphasis.
 */
export type Display = {
  mode: 'position' | 'octaves' | 'whole';
  octaves: number;
  anchor: number;
};

export type Favorite = {
  id: string;
  name: string;
  tuning: Tuning;
  content: Content;
  window: FretWindow;
  labelMode: LabelMode;
  /** Optional so favorites saved before display modes existed still load. */
  display?: Display;
};

export type Store = { version: 1; favorites: Favorite[]; customTunings: Tuning[] };

const KEY = 'guitar-map/v1';
export const SOFT_CAP = 50;

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Store) : null;
    if (parsed?.version === 1) return parsed;
  } catch {
    // Corrupt or unavailable storage is not worth losing the app over.
  }
  return { version: 1, favorites: [], customTunings: [] };
}

export const store = $state<Store>(load());

$effect.root(() => {
  $effect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      // Quota or private mode — the session still works, it just won't persist.
    }
  });
});

export const describeContent = (c: Content) =>
  c.kind === 'scale' ? `${c.root} ${c.scale}`
  : c.kind === 'arpeggio' ? `${chordSymbol(c.root, c.chord)} arpeggio`
  : c.slots.map((s) => chordSymbol(s.root, s.type)).join(' + ');

export const favoriteName = (f: Omit<Favorite, 'id' | 'name'>) =>
  [
    describeContent(f.content),
    f.tuning.name || autoLabel(f.tuning),
    `frets ${f.window.startFret}–${f.window.startFret + f.window.width - 1}`,
  ].join(' — ');

/**
 * Everything entering the store gets flattened to plain data here rather than at
 * each call site. `structuredClone` throws on a `$state` proxy, so a caller that
 * forgot to snapshot used to fail silently; `$state.snapshot` deep-copies both
 * proxied and plain values, so callers can hand over whatever they hold.
 */
const plain = <T>(value: T): T => $state.snapshot(value) as T;

export function addFavorite(snapshot: Omit<Favorite, 'id' | 'name'>): string | null {
  store.favorites.push({
    ...plain(snapshot),
    id: crypto.randomUUID(),
    name: favoriteName(snapshot),
  });
  // A favorite embeds its tuning, but the tuning is also collected separately so
  // it shows up in the picker on its own (§8).
  collectTuning(snapshot.tuning);
  return store.favorites.length > SOFT_CAP
    ? `You have ${store.favorites.length} favorites — over the ${SOFT_CAP} suggested. Consider deleting a few.`
    : null;
}

const key = (t: Tuning) => JSON.stringify(t.strings);

/**
 * Collect a custom tuning into the persisted picker list. Called on an explicit
 * save and when a favorite is saved — not on every edit, since §5 keeps
 * unsaved custom tunings session-only.
 *
 * Returns false when the strings are already a built-in preset and nothing was
 * stored, so the caller can say as much instead of leaving a Save button that
 * looks broken.
 */
export function collectTuning(t: Tuning): boolean {
  const named = { ...plain(t), name: t.name || autoLabel(t) };

  const existing = store.customTunings.find((x) => key(x) === key(named));
  if (existing) {
    existing.name = named.name; // saving the same strings again is how you rename
    return true;
  }
  if (PRESET_TUNINGS.some((x) => key(x) === key(named))) return false;

  store.customTunings.push(named);
  return true;
}
