<script lang="ts">
  /**
   * The chord-progression tab (spec §4): a left rail of numerals read top to
   * bottom, and a whole-neck view of the current chord's tones. No position
   * window, no octave view, no audio — a soloist over changes wants every
   * occurrence, not a box (§4.4). The app-global label/display/audio controls are
   * simply not rendered here, so other tabs find them untouched (§4.2).
   */
  import Fretboard from './Fretboard.svelte';
  import { ROOTS, type Tuning } from './theory';
  import type { Content, ProgressionContent } from './store.svelte';
  import {
    PRESET_PROGRESSIONS,
    PROG_CAP,
    SUPPORTED_SUFFIXES,
    awkwardTransitions,
    chordCandidates,
    chordSymbolOf,
    inferParent,
    keyShift,
    numeralOf,
    parseChord,
    progressionDots,
    shiftPins,
    solveChain,
    voicingReadout,
    type Chord,
    type Preset,
    type Tonality,
  } from './progression';
  import { board, chordTypes } from './view';

  let { content = $bindable(), tuning }: { content: Content; tuning: Tuning } = $props();
  // Only rendered when the active tab is the progression, so the cast always holds.
  let prog = $derived(content as ProgressionContent);

  let current = $derived(prog.chords[prog.step]);
  let advice = $derived(inferParent(prog));
  let swaps = $derived(advice?.exceptions.get(prog.step) ?? []);
  let dots = $derived(progressionDots(prog.key, current, advice, prog.step));

  // The voicing chain — never drawn as a shape, only read out; it is the frame
  // the guide-tone line hangs on (§5).
  let voicings = $derived(solveChain(prog, tuning));
  let currentVoicing = $derived(voicings[prog.step]);
  let cands = $derived(current ? chordCandidates(tuning, prog.key, current) : []);
  const sameFrets = (a: (number | null)[], b: (number | null)[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  let shapeIndex = $derived(currentVoicing ? cands.findIndex((c) => sameFrets(c, currentVoicing.frets)) : -1);
  let awkward = $derived(awkwardTransitions(prog, tuning, voicings));
  // §4.7: reuse board()'s 'whole' branch verbatim — it lights every cell whose
  // pitch class is in `dots`. The window is ignored in whole mode.
  let neck = $derived(
    board(tuning, { startFret: 0, width: 5 }, content, dots, { mode: 'whole', octaves: 1, anchor: 0 }),
  );

  const WIN = { startFret: 0, width: 5 };
  const noop = () => {};

  /** Stepping wraps — the progression is a loop (§4.3). */
  function nudge(d: number) {
    const n = prog.chords.length;
    if (!n) return;
    prog.step = (((prog.step + d) % n) + n) % n;
  }

  function addChord() {
    if (prog.chords.length >= PROG_CAP) return;
    prog.chords = [...prog.chords, { degree: 1, quality: 'major' } satisfies Chord];
    prog.step = prog.chords.length - 1;
  }

  /** Loading a preset keeps the current root and switches only the tonality (§2). */
  function loadPreset(p: Preset) {
    prog.key.tonality = p.tonality;
    prog.chords = structuredClone(p.chords);
    prog.step = 0;
  }

  // ---- editor (TICKET-023) ------------------------------------------------------
  let editing = $state(false);
  let symbolInput = $state('');
  let warn = $state('');
  let pinWarn = $state('');

  // ---- override stepper & key transposition (TICKET-024) ------------------------
  const setPin = (frets: (number | null)[]) =>
    (prog.chords = prog.chords.map((ch, k) => (k === prog.step ? { ...ch, pin: [...frets] } : ch)));
  const clearPin = () => (prog.chords = prog.chords.map((ch, k) => (k === prog.step ? { ...ch, pin: undefined } : ch)));

  function stepShape(d: number) {
    if (!cands.length) return;
    const i = shapeIndex < 0 ? 0 : shapeIndex;
    setPin(cands[Math.max(0, Math.min(cands.length - 1, i + d))]);
  }

  /** Changing the root transposes pinned overrides by the nearest signed interval;
   *  ones that can't survive drop with a soft note (§5). */
  function changeRoot(next: string) {
    const dropped = shiftPins(prog, keyShift(prog.key.root, next), tuning);
    prog.key.root = next;
    pinWarn = dropped.length
      ? `Overrides on ${dropped.map((i) => chordSymbolOf(prog.key, prog.chords[i])).join(', ')} reverted to auto — they couldn't move with the key.`
      : '';
  }

  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= prog.chords.length) return;
    const chords = [...prog.chords];
    [chords[i], chords[j]] = [chords[j], chords[i]]; // a pin rides with its chord
    prog.chords = chords;
    if (prog.step === i) prog.step = j;
    else if (prog.step === j) prog.step = i;
  }

  function remove(i: number) {
    prog.chords = prog.chords.filter((_, k) => k !== i);
    if (prog.step >= prog.chords.length) prog.step = Math.max(0, prog.chords.length - 1);
  }

  /** Editing a chord clears only that chord's pin (§5); reorder/remove keep it. */
  const edit = (i: number, patch: Partial<Chord>) =>
    (prog.chords = prog.chords.map((ch, k) => (k === i ? { ...ch, ...patch, pin: undefined } : ch)));

  function addBySymbol() {
    const ch = parseChord(prog.key, symbolInput);
    if (!ch) {
      warn = `"${symbolInput.trim()}" isn't supported. Try a root plus one of: ${SUPPORTED_SUFFIXES}.`;
      return;
    }
    if (prog.chords.length >= PROG_CAP) return;
    prog.chords = [...prog.chords, ch];
    prog.step = prog.chords.length - 1;
    symbolInput = '';
    warn = '';
  }
</script>

<!-- ↑ ↓ step; they preventDefault so a step doesn't also scroll the rail (§4.3),
     and keep the shipped INPUT/SELECT/TEXTAREA guard so editor fields keep theirs. -->
<svelte:window
  onkeydown={(e) => {
    if (e.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); nudge(-1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); nudge(1); }
  }}
/>

<aside>
  <h3>Load</h3>
  <!-- One picker; the Saved group joins here in TICKET-026. -->
  <select
    aria-label="Load a progression"
    value=""
    onchange={(e) => {
      const p = PRESET_PROGRESSIONS.find((x) => x.name === e.currentTarget.value);
      if (p) loadPreset(p);
      e.currentTarget.value = '';
    }}
  >
    <option value="" disabled>Load a progression…</option>
    <optgroup label="Presets">
      {#each PRESET_PROGRESSIONS as p}<option value={p.name}>{p.name}</option>{/each}
    </optgroup>
  </select>

  <h3>Progression</h3>
  <ol class="rail">
    {#each prog.chords as ch, i}
      <li>
        <button class="entry" class:on={i === prog.step} onclick={() => (prog.step = i)}>
          <b>{numeralOf(prog.key, ch)}</b>
          <span>{chordSymbolOf(prog.key, ch)}</span>
          {#if advice?.labels[i]}<em>{advice.labels[i]}</em>{/if}
        </button>
        {#if editing}
          <div class="edit">
            <select value={ch.degree} onchange={(e) => edit(i, { degree: +e.currentTarget.value })} aria-label="Degree">
              {#each [1, 2, 3, 4, 5, 6, 7] as d}<option value={d}>{d}</option>{/each}
            </select>
            <select
              value={ch.alter ?? 0}
              onchange={(e) => edit(i, { alter: +e.currentTarget.value === 0 ? undefined : (+e.currentTarget.value as -1 | 1) })}
              aria-label="Accidental"
            >
              <option value={-1}>♭</option><option value={0}>♮</option><option value={1}>♯</option>
            </select>
            <select value={ch.quality} onchange={(e) => edit(i, { quality: e.currentTarget.value as Chord['quality'] })} aria-label="Quality">
              {#each chordTypes as q}<option value={q}>{q}</option>{/each}
            </select>
            <select
              value={ch.of?.degree ?? 0}
              onchange={(e) => edit(i, { of: +e.currentTarget.value ? { degree: +e.currentTarget.value } : undefined })}
              aria-label="Secondary target"
            >
              <option value={0}>/—</option>
              {#each [1, 2, 3, 4, 5, 6, 7] as d}<option value={d}>/{d}</option>{/each}
            </select>
            <button class="x" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
            <button class="x" onclick={() => move(i, 1)} disabled={i === prog.chords.length - 1} aria-label="Move down">↓</button>
            <button class="x" onclick={() => remove(i)} aria-label="Remove chord">✕</button>
          </div>
        {/if}
      </li>
    {/each}
    <li>
      <button class="add" onclick={addChord} disabled={prog.chords.length >= PROG_CAP} aria-label="Add chord">
        ＋
      </button>
    </li>
  </ol>

  <button class="wide" onclick={() => (editing = !editing)}>{editing ? 'Done' : 'Edit progression'}</button>
  {#if editing}
    <div class="row">
      <input
        class="symbol"
        placeholder="Add by symbol, e.g. Dm7"
        bind:value={symbolInput}
        onkeydown={(e) => e.key === 'Enter' && addBySymbol()}
        aria-label="Add chord by symbol"
      />
      <button class="x" onclick={addBySymbol} disabled={prog.chords.length >= PROG_CAP} aria-label="Add typed chord">＋</button>
    </div>
    {#if warn}<p class="warn">{warn}</p>{/if}
  {/if}

  <h3>Key</h3>
  <div class="row">
    <select value={prog.key.root} onchange={(e) => changeRoot(e.currentTarget.value)} aria-label="Key root">
      {#each ROOTS as r}<option value={r}>{r}</option>{/each}
    </select>
  </div>
  <div class="seg" role="group" aria-label="Tonality">
    {#each ['major', 'minor'] as const as t}
      <button aria-pressed={prog.key.tonality === t} onclick={() => (prog.key.tonality = t as Tonality)}>{t}</button>
    {/each}
  </div>
</aside>

<section>
  <!-- The parent scale is named once, above the neck — it is constant across the
       progression (§4.2). Empty progressions run no inference (§4.6). -->
  <h2>{advice ? `parent: ${advice.name}` : 'Add a chord to begin'}</h2>
  <Fretboard
    {tuning}
    {dots}
    cells={neck.cells}
    barre={null}
    ghosts={neck.ghosts}
    showWindow={false}
    win={WIN}
    onCenter={noop}
    onPlayNote={noop}
    onPickRoot={noop}
  />
  <p class="hint">
    {#if prog.chords.length}
      Every occurrence of the current chord's tones over the faded parent scale. Step with ↑ ↓ or
      click a rail entry.
    {:else}
      Add a chord to begin. Nothing is wrong — an empty progression just has nothing to show yet.
    {/if}
  </p>

  <!-- The voicing is never drawn; it surfaces only as a readout, doubling as the
       override stepper (§5). -->
  {#if currentVoicing}
    <div class="voicing">
      <span class="readout">{voicingReadout(currentVoicing.frets)}</span>
      <button class="x" onclick={() => stepShape(-1)} disabled={shapeIndex <= 0} aria-label="Lower voicing">◄</button>
      <span class="shape">
        {#if cands.length}Shape {(shapeIndex < 0 ? 0 : shapeIndex) + 1} of {cands.length}{/if}
        {#if currentVoicing.pinned}· pinned{/if}
      </span>
      <button class="x" onclick={() => stepShape(1)} disabled={shapeIndex >= 0 && shapeIndex >= cands.length - 1} aria-label="Higher voicing">►</button>
      {#if currentVoicing.pinned}<button class="x" onclick={clearPin}>Clear</button>{/if}
    </div>
  {/if}

  <!-- Swaps are sentences, so they sit under the neck, not in the rail (§4.2). -->
  {#if swaps.length}
    <ul class="swaps">
      {#each swaps as s}
        <li>play <b>{s.play.name}</b> instead of {s.insteadOf.name} <span class="deg">({s.interval})</span></li>
      {/each}
    </ul>
  {/if}
  {#if advice?.strained}
    <p class="warn">Over half these chords need an exception — the parent scale is a loose fit here.</p>
  {/if}
  {#if awkward.length}
    <p class="warn">
      A wide reach on this tuning: {awkward.map((i) => `${chordSymbolOf(prog.key, prog.chords[i])} → ${chordSymbolOf(prog.key, prog.chords[i + 1])}`).join(', ')}.
    </p>
  {/if}
  {#if pinWarn}<p class="warn">{pinWarn}</p>{/if}
</section>

<style>
  /* Component-scoped, so they mirror App.svelte's panel shell for this tab. */
  aside { background: var(--panel); border: 1px solid var(--hair); border-radius: 12px; padding: 14px; }
  section { min-width: 0; }
  section h2 { font-size: 1rem; margin: 0 0 10px; font-family: var(--font-mono); }

  .rail { list-style: none; padding: 0; margin: 6px 0 0; display: flex; flex-direction: column; gap: 4px; }
  .entry {
    width: 100%; display: flex; align-items: baseline; gap: 8px; text-align: left;
    border-left: 3px solid transparent;
  }
  .entry.on { border-left-color: var(--accent); background: var(--accent); color: var(--accent-ink); }
  .entry { flex-wrap: wrap; }
  .entry b { font-family: var(--font-mono); font-size: 0.9rem; min-width: 3.5em; }
  .entry span { font-size: 0.76rem; color: var(--muted); }
  .entry.on span { color: inherit; }
  .entry em { flex-basis: 100%; font-size: 0.68rem; font-style: normal; color: var(--muted); }
  .entry.on em { color: inherit; }

  .voicing { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
  .voicing .readout { font-family: var(--font-mono); font-size: 0.9rem; letter-spacing: 0.04em; }
  .voicing .shape { font-size: 0.74rem; color: var(--muted); min-width: 8em; text-align: center; }

  .swaps { list-style: none; padding: 0; margin: 8px 0 0; font-size: 0.8rem; }
  .swaps li { margin-top: 2px; }
  .swaps b { color: var(--warn); font-family: var(--font-mono); }
  .swaps .deg { color: var(--muted); font-family: var(--font-mono); font-size: 0.74rem; }
  .add { width: 100%; color: var(--muted); }
  .wide { width: 100%; margin-top: 8px; }
  .symbol { flex: 1; min-width: 0; margin-top: 0; }

  .edit { display: flex; flex-wrap: wrap; gap: 3px; margin: 3px 0 2px; }
  .edit select { width: auto; flex: 1 1 auto; min-width: 0; margin-top: 0; padding: 3px 4px; font-size: 0.72rem; }
  .edit .x { padding: 3px 6px; }
  .seg { display: flex; gap: 4px; margin-top: 6px; }
  .seg button { flex: 1; text-transform: capitalize; }
  .hint { color: var(--muted); font-size: 0.78rem; margin: 8px 0 0; }
</style>
