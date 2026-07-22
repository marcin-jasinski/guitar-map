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
    PROG_CAP,
    chordSymbolOf,
    inferParent,
    numeralOf,
    progressionDots,
    type Chord,
    type Tonality,
  } from './progression';
  import { board } from './view';

  let { content = $bindable(), tuning }: { content: Content; tuning: Tuning } = $props();
  // Only rendered when the active tab is the progression, so the cast always holds.
  let prog = $derived(content as ProgressionContent);

  let current = $derived(prog.chords[prog.step]);
  let advice = $derived(inferParent(prog));
  let swaps = $derived(advice?.exceptions.get(prog.step) ?? []);
  let dots = $derived(progressionDots(prog.key, current, advice, prog.step));
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
  <h3>Progression</h3>
  <ol class="rail">
    {#each prog.chords as ch, i}
      <li>
        <button class="entry" class:on={i === prog.step} onclick={() => (prog.step = i)}>
          <b>{numeralOf(prog.key, ch)}</b>
          <span>{chordSymbolOf(prog.key, ch)}</span>
          {#if advice?.labels[i]}<em>{advice.labels[i]}</em>{/if}
        </button>
      </li>
    {/each}
    <li>
      <button class="add" onclick={addChord} disabled={prog.chords.length >= PROG_CAP} aria-label="Add chord">
        ＋
      </button>
    </li>
  </ol>

  <h3>Key</h3>
  <div class="row">
    <select bind:value={prog.key.root} aria-label="Key root">
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

  .swaps { list-style: none; padding: 0; margin: 8px 0 0; font-size: 0.8rem; }
  .swaps li { margin-top: 2px; }
  .swaps b { color: var(--warn); font-family: var(--font-mono); }
  .swaps .deg { color: var(--muted); font-family: var(--font-mono); font-size: 0.74rem; }
  .add { width: 100%; color: var(--muted); }
  .seg { display: flex; gap: 4px; margin-top: 6px; }
  .seg button { flex: 1; text-transform: capitalize; }
  .hint { color: var(--muted); font-size: 0.78rem; margin: 8px 0 0; }
</style>
