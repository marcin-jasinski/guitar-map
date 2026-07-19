<script lang="ts">
  import Favorites from './lib/Favorites.svelte';
  import Fretboard from './lib/Fretboard.svelte';
  import TuningPicker from './lib/TuningPicker.svelte';
  import { playNote, playSequence, strum } from './lib/audio';
  import {
    CHORDS,
    LAST_FRET,
    PRESET_TUNINGS,
    ROOTS,
    SCALES,
    chordSymbol,
    diatonicTriads,
    type Tuning,
  } from './lib/theory';
  import { describeContent, type Content, type Favorite, type LabelMode } from './lib/store.svelte';
  import { CHORD_COLORS, chordVoicing, effectiveLabelMode, noteMap, scaleRun } from './lib/view';

  let tuning = $state<Tuning>(structuredClone(PRESET_TUNINGS[0]));
  let content = $state<Content>({ kind: 'scale', root: 'C', scale: 'Major (Ionian)', degree: null });
  let win = $state({ startFret: 5, width: 5 });
  let labelMode = $state<LabelMode>('names');

  let dots = $derived(noteMap(content, labelMode));
  let activeLabel = $derived(effectiveLabelMode(content, labelMode));
  let triads = $derived(content.kind === 'scale' ? diatonicTriads(content.root, content.scale) : []);
  let root = $derived(content.kind === 'chord' ? content.slots[0].root : content.root);
  let slots = $derived(content.kind === 'chord' ? content.slots : []);

  // The window clamps to the neck; near an edge the clicked fret stays inside it
  // but may not be dead-centre (§4).
  const clamp = (start: number) => Math.max(0, Math.min(LAST_FRET + 1 - win.width, start));
  const center = (fret: number) => (win.startFret = clamp(fret - Math.floor(win.width / 2)));
  const nudge = (d: number) => (win.startFret = clamp(win.startFret + d));

  function setWidth(w: number) {
    win.width = w;
    win.startFret = clamp(win.startFret);
  }

  /** Switching content type carries the root across rather than resetting it. */
  function setKind(kind: Content['kind']) {
    if (kind === content.kind) return;
    content =
      kind === 'scale' ? { kind, root, scale: 'Major (Ionian)', degree: null }
      : kind === 'arpeggio' ? { kind, root, chord: 'maj7' }
      : { kind, slots: [{ root, type: 'major' }] };
  }

  /** Selecting the same degree again clears it, back to the plain scale (§7). */
  function selectDegree(degree: number | null) {
    if (content.kind !== 'scale') return;
    content = { ...content, degree: content.degree === degree ? null : degree };
  }

  function play() {
    if (content.kind === 'scale') playSequence(scaleRun(tuning, win, content.root, content.scale));
    else if (content.kind === 'arpeggio') playSequence(chordVoicing(tuning, win, content.root, content.chord));
  }

  const snapshot = () => ({
    tuning: structuredClone($state.snapshot(tuning)),
    content: structuredClone($state.snapshot(content)),
    window: { ...win },
    labelMode,
  });

  function loadFavorite(f: Favorite) {
    tuning = structuredClone($state.snapshot(f.tuning));
    content = structuredClone($state.snapshot(f.content));
    win = { ...f.window };
    labelMode = f.labelMode;
  }

  const LABEL_MODES: LabelMode[] = ['names', 'degrees', 'intervals'];
  let locked = $derived(content.kind === 'chord' && content.slots.length > 1);
  let offeredModes = $derived(
    content.kind === 'scale' ? LABEL_MODES : (['names', 'intervals'] as LabelMode[]),
  );
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') nudge(-1);
    if (e.key === 'ArrowRight') nudge(1);
  }}
/>

<header>
  <h1>Guitar Map</h1>
  <p>Scale, chord and arpeggio shapes in any tuning — computed, never authored.</p>
</header>

<main>
  <aside>
    <h3>Content</h3>
    <div class="seg" role="group" aria-label="Content type">
      {#each ['scale', 'chord', 'arpeggio'] as const as kind}
        <button aria-pressed={content.kind === kind} onclick={() => setKind(kind)}>{kind}</button>
      {/each}
    </div>

    {#if content.kind === 'scale'}
      <div class="row">
        <select bind:value={content.root} aria-label="Root note">
          {#each ROOTS as r}<option value={r}>{r}</option>{/each}
        </select>
        <select bind:value={content.scale} aria-label="Scale" onchange={() => selectDegree(null)}>
          {#each Object.keys(SCALES) as s}<option value={s}>{s}</option>{/each}
        </select>
      </div>
      <button class="wide" onclick={play}>▶ Play scale</button>

      <!-- Seven-note scales only; for pentatonic/blues the selector is hidden, not disabled (§7). -->
      {#if triads.length}
        <h3>Diatonic triads</h3>
        <div class="chips">
          {#each triads as t}
            <button
              aria-pressed={content.degree === t.degree}
              onclick={() => selectDegree(t.degree)}
            >
              <b>{t.numeral}</b><span>{t.symbol}</span>
            </button>
          {/each}
        </div>
        {#if content.degree}
          <button class="wide" onclick={() => selectDegree(null)}>Clear triad</button>
        {/if}
      {/if}
    {:else if content.kind === 'arpeggio'}
      <div class="row">
        <select bind:value={content.root} aria-label="Root note">
          {#each ROOTS as r}<option value={r}>{r}</option>{/each}
        </select>
        <select bind:value={content.chord} aria-label="Chord type">
          {#each Object.keys(CHORDS) as c}<option value={c}>{c}</option>{/each}
        </select>
      </div>
      <button class="wide" onclick={play}>▶ Play arpeggio</button>
    {:else}
      {#each slots as slot, i}
        <div class="row">
          {#if slots.length > 1}
            <span class="swatch" style="background:{CHORD_COLORS[i]}" aria-hidden="true">{i + 1}</span>
          {/if}
          <select bind:value={slot.root} aria-label="Chord {i + 1} root">
            {#each ROOTS as r}<option value={r}>{r}</option>{/each}
          </select>
          <select bind:value={slot.type} aria-label="Chord {i + 1} type">
            {#each Object.keys(CHORDS) as c}<option value={c}>{c}</option>{/each}
          </select>
          <button
            class="x" aria-label="Play {chordSymbol(slot.root, slot.type)}"
            onclick={() => strum(chordVoicing(tuning, win, slot.root, slot.type))}>▶</button
          >
          {#if slots.length > 1}
            <button
              class="x" aria-label="Remove chord {i + 1}"
              onclick={() => (content = { kind: 'chord', slots: slots.filter((_, k) => k !== i) })}>×</button
            >
          {/if}
        </div>
      {/each}
      {#if slots.length < 3}
        <button class="wide" onclick={() => (content = { kind: 'chord', slots: [...slots, { root, type: 'major' }] })}>
          + Add chord
        </button>
      {/if}
    {/if}

    <h3>Position window</h3>
    <div class="row">
      <button class="x" aria-label="Move window down a fret" onclick={() => nudge(-1)}>◄</button>
      <span class="readout">frets {win.startFret}–{win.startFret + win.width - 1}</span>
      <button class="x" aria-label="Move window up a fret" onclick={() => nudge(1)}>►</button>
    </div>
    <div class="seg" role="group" aria-label="Window width">
      {#each [4, 5, 6] as w}
        <button aria-pressed={win.width === w} onclick={() => setWidth(w)}>{w}</button>
      {/each}
    </div>

    <h3>Labels</h3>
    <!-- In overlay the toggle greys out rather than disappearing, and returns at
         one chord (§9). Degrees need a tonic, so chord/arpeggio omit them (§3). -->
    <div class="seg" role="group" aria-label="Note labels">
      {#each offeredModes as m}
        <button aria-pressed={activeLabel === m} disabled={locked} onclick={() => (labelMode = m)}>{m}</button>
      {/each}
    </div>
    {#if locked}
      <p class="muted">Locked to note names while more than one chord is shown.</p>
    {/if}

    <TuningPicker bind:tuning />
    <Favorites {snapshot} onLoad={loadFavorite} />
  </aside>

  <section>
    <h2>{describeContent(content)}</h2>
    <Fretboard {tuning} {dots} {win} onCenter={center} onPlayNote={playNote} />
    <p class="hint">
      Click a fret number or the neck to centre the window; ← → nudge it. Click any note to hear it.
    </p>
    <ul class="legend">
      {#if slots.length > 1}
        {#each slots as slot, i}
          <li><i style="background:{CHORD_COLORS[i]}"></i>{i + 1} — {chordSymbol(slot.root, slot.type)}</li>
        {/each}
        <li><i class="split"></i>split fill = shared note</li>
      {:else}
        <li><i style="background:var(--c-root)"></i>root</li>
        <li><i style="background:var(--c-triad)"></i>3rd</li>
        <li><i style="background:var(--c-fifth)"></i>5th</li>
        <li><i style="background:var(--c-seventh)"></i>7th</li>
        <li><i style="background:var(--c-ext)"></i>other chord tone</li>
        {#if content.kind === 'scale'}<li><i style="background:var(--c-scale)"></i>scale tone</li>{/if}
      {/if}
    </ul>
  </section>
</main>

<style>
  header { padding: 20px 24px 4px; }
  header h1 { font-size: 1.2rem; margin: 0; letter-spacing: -0.01em; }
  header p { color: var(--muted); font-size: 0.84rem; margin: 2px 0 0; }

  main { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 20px; padding: 16px 24px 60px; align-items: start; }
  @media (max-width: 780px) { main { grid-template-columns: 1fr; } }

  aside { background: var(--panel); border: 1px solid var(--hair); border-radius: 12px; padding: 14px; }
  section { min-width: 0; }
  section h2 { font-size: 1rem; margin: 0 0 10px; font-family: var(--font-mono); }

  .seg { display: flex; gap: 4px; margin-top: 6px; }
  .seg button { flex: 1; text-transform: capitalize; }
  .wide { width: 100%; margin-top: 6px; }
  .readout { flex: 1; text-align: center; font-family: var(--font-mono); font-size: 0.78rem; color: var(--muted); }

  .chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 6px; }
  .chips button { display: flex; flex-direction: column; gap: 1px; padding: 4px 2px; line-height: 1.1; }
  .chips b { font-family: var(--font-mono); font-size: 0.8rem; }
  .chips span { font-size: 0.66rem; color: var(--muted); }
  .chips button[aria-pressed='true'] span { color: inherit; }

  .swatch {
    width: 20px; height: 20px; border-radius: 50%; flex: none; color: #fff;
    font-size: 0.7rem; font-weight: 700; display: grid; place-items: center;
  }
  .hint { color: var(--muted); font-size: 0.78rem; margin: 8px 0 0; }

  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; list-style: none; padding: 0; margin: 10px 0 0; font-size: 0.78rem; color: var(--muted); }
  .legend li { display: inline-flex; align-items: center; gap: 6px; }
  .legend i { width: 13px; height: 13px; border-radius: 50%; flex: none; }
  .legend i.split { background: linear-gradient(90deg, var(--c-ch1) 50%, var(--c-ch2) 50%); }
</style>
