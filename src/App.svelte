<script lang="ts">
  import Favorites from './lib/Favorites.svelte';
  import Fretboard from './lib/Fretboard.svelte';
  import Progression from './lib/Progression.svelte';
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
    fretMidi,
    notePc,
    type Tuning,
  } from './lib/theory';
  import {
    describeContent,
    type Content,
    type Display,
    type Favorite,
    type LabelMode,
  } from './lib/store.svelte';
  import {
    CHORD_COLORS,
    board,
    chordVoicing,
    chordVoicings,
    contentRoot,
    rootAnchors,
    effectiveLabelMode,
    noteMap,
    scaleRun,
    usableAnchors,
  } from './lib/view';

  type Tab = Content['kind'];
  const DEFAULT_CONTENT: Record<Tab, Content> = {
    scale: { kind: 'scale', root: 'C', scale: 'Major (Ionian)', degree: null },
    chord: { kind: 'chord', slots: [{ root: 'C', type: 'major' }] },
    arpeggio: { kind: 'arpeggio', root: 'C', chord: 'maj7' },
    // The hardcoded tracer bullet: I V7/V V7 I exercises the `of` field (§1).
    progression: {
      kind: 'progression',
      key: { root: 'C', tonality: 'major' },
      chords: [
        { degree: 1, quality: 'major' },
        { degree: 5, quality: 'dom7', of: { degree: 5 } },
        { degree: 5, quality: 'dom7' },
        { degree: 1, quality: 'major' },
      ],
      step: 0,
    },
  };
  const TABS: Tab[] = ['scale', 'chord', 'arpeggio', 'progression'];

  let tuning = $state<Tuning>(structuredClone(PRESET_TUNINGS[0]));
  let tab = $state<Tab>('scale');
  let content = $state<Content>(structuredClone(DEFAULT_CONTENT.scale));
  // Inactive tabs park their content here; the active tab's lives in `content`.
  const stash: Partial<Record<Tab, Content>> = {};
  let win = $state({ startFret: 5, width: 5 });
  let labelMode = $state<LabelMode>('names');
  // Default to the position: the whole neck at once is the reference view, not
  // the working one.
  let display = $state<Display>({ mode: 'position', octaves: 1, anchor: 0 });

  let dots = $derived(noteMap(content, labelMode));
  let neck = $derived(board(tuning, win, content, dots, display));

  // A single chord steps through shapes; everything else steps through roots.
  let oneChord = $derived(content.kind === 'chord' && content.slots.length === 1);
  let voicings = $derived(
    oneChord ? chordVoicings(tuning, dots, notePc(contentRoot(content))) : [],
  );
  let anchors = $derived(
    display.mode === 'octaves' ? usableAnchors(tuning, content, dots, display.octaves) : [],
  );
  let steps = $derived(oneChord ? voicings.length : anchors.length);
  let step = $derived(Math.max(0, Math.min(steps - 1, display.anchor)));

  let anchorMidi = $derived(anchors[step]?.midi ?? 0);
  // Scientific pitch notation, so the readout names an actual pitch: "C3 → C5".
  let anchorOctave = $derived(Math.floor(anchorMidi / 12) - 1);
  let rootLabel = $derived(`${contentRoot(content)}${anchorOctave}`);
  let topLabel = $derived(`${contentRoot(content)}${anchorOctave + display.octaves}`);
  let voicingFrets = $derived(
    [...(voicings[step]?.cells ?? [])].map((k) => Number(k.split(':')[1])).filter((f) => f > 0),
  );
  let activeLabel = $derived(effectiveLabelMode(content, labelMode));
  let triads = $derived(content.kind === 'scale' ? diatonicTriads(content.root, content.scale) : []);
  let root = $derived(
    content.kind === 'chord' ? content.slots[0].root
    : content.kind === 'progression' ? content.key.root
    : content.root,
  );
  let slots = $derived(content.kind === 'chord' ? content.slots : []);

  // The window clamps to the neck; near an edge the clicked fret stays inside it
  // but may not be dead-centre (§4).
  const clamp = (start: number) => Math.max(0, Math.min(LAST_FRET + 1 - win.width, start));
  const center = (fret: number) => (win.startFret = clamp(fret - Math.floor(win.width / 2)));

  /** ◄ ► steps whatever the current view is a list of: chord shapes, roots, or
   *  failing both, the window itself. */
  function nudge(d: number) {
    if (oneChord || display.mode === 'octaves') {
      display.anchor = Math.max(0, Math.min(steps - 1, step + d));
    } else {
      win.startFret = clamp(win.startFret + d);
    }
  }

  /** Picking a fret width is also a statement that you want the window back. */
  function setWidth(w: number) {
    win.width = w;
    win.startFret = clamp(win.startFret);
    display.mode = 'position';
  }

  function setOctaves(n: number) {
    display.octaves = n;
    display.mode = 'octaves';
    display.anchor = Math.min(display.anchor, usableAnchors(tuning, content, dots, n).length - 1);
  }

  /** Changing what is shown invalidates which shape or root you were on. */
  const resetStep = () => (display.anchor = 0);

  /** Each tab remembers its own content; a plain switch never carries the root
   *  across (the bridges do that, TICKET-027). Tuning and the display controls
   *  stay app-global. */
  function switchTab(next: Tab) {
    if (next === tab) return;
    stash[tab] = content;
    content = stash[next] ?? structuredClone(DEFAULT_CONTENT[next]);
    tab = next;
  }

  /** Selecting the same degree again clears it, back to the plain scale (§7). */
  function selectDegree(degree: number | null) {
    if (content.kind !== 'scale') return;
    content = { ...content, degree: content.degree === degree ? null : degree };
  }

  function play() {
    // In octave mode play exactly what is drawn: the span from the anchor root.
    const octaves = display.mode === 'octaves' ? display.octaves : 1;
    if (content.kind === 'scale') {
      playSequence(scaleRun(content.root, content.scale, startMidi(), octaves));
    } else if (content.kind === 'arpeggio') {
      playSequence(chordVoicing(tuning, win, content.root, content.chord));
    }
  }

  /** Where a scale run begins: the chosen root in octave mode, else the lowest
   *  root reachable in the window. */
  function startMidi(): number {
    if (display.mode === 'octaves') return anchorMidi;
    const inWin = rootAnchors(tuning, content).map((a) => a.midi).find(
      (m) => m >= fretMidi(tuning, 0, win.startFret) && m <= fretMidi(tuning, tuning.strings.length - 1, win.startFret + win.width - 1),
    );
    return inWin ?? rootAnchors(tuning, content)[0]?.midi ?? 60;
  }

  const snapshot = () => ({
    tuning: structuredClone($state.snapshot(tuning)),
    content: structuredClone($state.snapshot(content)),
    window: { ...win },
    labelMode,
    display: { ...display },
  });

  function loadFavorite(f: Favorite) {
    tuning = structuredClone($state.snapshot(f.tuning));
    const c = structuredClone($state.snapshot(f.content)) as Content;
    // A favorite loads into the tab that owns its kind, so it lands somewhere the
    // player can see rather than writing into a hidden tab (spec §7).
    stash[tab] = content;
    tab = c.kind;
    content = c;
    win = { ...f.window };
    labelMode = f.labelMode;
    display = { ...(f.display ?? { mode: 'position', octaves: 1, anchor: 0 }) };
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

<div class="tabs" role="tablist" aria-label="View">
  {#each TABS as t}
    <button role="tab" aria-selected={tab === t} onclick={() => switchTab(t)}>{t}</button>
  {/each}
</div>

<main>
  {#if content.kind === 'progression'}
    <Progression bind:content {tuning} />
  {:else}
  <aside>
    {#if content.kind === 'scale'}
      <div class="row">
        <select bind:value={content.root} aria-label="Root note" onchange={resetStep}>
          {#each ROOTS as r}<option value={r}>{r}</option>{/each}
        </select>
        <select bind:value={content.scale} aria-label="Scale" onchange={() => (selectDegree(null), resetStep())}>
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
        <select bind:value={content.root} aria-label="Root note" onchange={resetStep}>
          {#each ROOTS as r}<option value={r}>{r}</option>{/each}
        </select>
        <select bind:value={content.chord} aria-label="Chord type" onchange={resetStep}>
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
          <select bind:value={slot.root} aria-label="Chord {i + 1} root" onchange={resetStep}>
            {#each ROOTS as r}<option value={r}>{r}</option>{/each}
          </select>
          <select bind:value={slot.type} aria-label="Chord {i + 1} type" onchange={resetStep}>
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

    <h3>Show</h3>
    <!-- A chord is a shape to hold, so it offers shapes; a scale or arpeggio is
         a pattern to run, so it offers a position or a span of octaves. -->
    <div class="seg" role="group" aria-label="How much of the neck to show">
      {#if oneChord}
        <button aria-pressed={display.mode !== 'whole'} onclick={() => (display.mode = 'position')}>
          Voicings
        </button>
      {:else}
        <button aria-pressed={display.mode === 'position'} onclick={() => (display.mode = 'position')}>
          Position
        </button>
        <button aria-pressed={display.mode === 'octaves'} onclick={() => (display.mode = 'octaves')}>
          Octaves
        </button>
      {/if}
      <button aria-pressed={display.mode === 'whole'} onclick={() => (display.mode = 'whole')}>
        Whole neck
      </button>
    </div>

    {#if display.mode !== 'whole' && !oneChord}
      {#if display.mode === 'position'}
        <div class="seg" role="group" aria-label="Window width">
          {#each [4, 5, 6] as w}
            <button aria-pressed={win.width === w} onclick={() => setWidth(w)}>{w} frets</button>
          {/each}
        </div>
      {:else}
        <div class="seg" role="group" aria-label="How many octaves">
          {#each [1, 2, 3] as n}
            <button aria-pressed={display.octaves === n} onclick={() => setOctaves(n)}>{n} oct</button>
          {/each}
        </div>
      {/if}
    {/if}

    {#if display.mode !== 'whole'}
      <div class="row">
        <button class="x" aria-label="Previous" onclick={() => nudge(-1)}>◄</button>
        <span class="readout">
          {#if oneChord}
            {voicingFrets.length ? `frets ${Math.min(...voicingFrets)}–${Math.max(...voicingFrets)}` : 'open'}
          {:else if display.mode === 'octaves'}
            {rootLabel} → {topLabel}
          {:else}
            frets {win.startFret}–{win.startFret + win.width - 1}
          {/if}
        </span>
        <button class="x" aria-label="Next" onclick={() => nudge(1)}>►</button>
      </div>
      {#if oneChord}
        <p class="muted">Shape {step + 1} of {steps}, low to high.</p>
      {:else if display.mode === 'octaves'}
        <p class="muted">Root {step + 1} of {steps}, across every string.</p>
      {/if}
    {/if}

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
    <Fretboard
      {tuning} {dots} {win}
      cells={neck.cells}
      barre={neck.barre}
      ghosts={neck.ghosts}
      showWindow={display.mode === 'position'}
      onCenter={center}
      onPlayNote={playNote}
      onPickRoot={(anchor) => (display.anchor = anchor)}
    />
    <p class="hint">
      {#if display.mode === 'whole'}
        Every occurrence across the neck, all read equally. Click a fret to centre a position.
      {:else if display.mode === 'octaves'}
        {display.octaves} octave{display.octaves > 1 ? 's' : ''} up from {rootLabel}. Dashed roots
        are the other places this shape starts — click one to move there. ← → steps too.
      {:else if oneChord}
        A shape you can hold: root included{neck.barre
          ? `, barred at fret ${neck.barre.fret}`
          : ''}. ← → step through the {steps} shapes up the neck.
      {:else}
        Notes in the position. Click a fret to move it; ← → nudge it. Click any note to hear it.
      {/if}
      {#if neck.omits.length}
        <span class="omit">Nothing complete fits here — omits {neck.omits.join(', ')}.</span>
      {/if}
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
  {/if}
</main>

<style>
  header { padding: 20px 24px 4px; }
  header h1 { font-size: 1.2rem; margin: 0; letter-spacing: -0.01em; }
  header p { color: var(--muted); font-size: 0.84rem; margin: 2px 0 0; }

  /* The neck grows into the space up to 1920; past that the whole page centres
     rather than stretching. */
  header, .tabs, main { max-width: 1920px; margin: 0 auto; }

  .tabs { display: flex; gap: 4px; padding: 8px 24px 0; }
  .tabs button { text-transform: capitalize; padding: 7px 16px; }
  .tabs button[aria-selected='true'] {
    background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 700;
  }
  main { display: grid; grid-template-columns: 350px minmax(0, 1fr); gap: 20px; padding: 16px 24px 60px; align-items: start; }
  @media (max-width: 900px) { main { grid-template-columns: 1fr; } }

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
  .omit { color: var(--warn); }

  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; list-style: none; padding: 0; margin: 10px 0 0; font-size: 0.78rem; color: var(--muted); }
  .legend li { display: inline-flex; align-items: center; gap: 6px; }
  .legend i { width: 13px; height: 13px; border-radius: 50%; flex: none; }
  .legend i.split { background: linear-gradient(90deg, var(--c-ch1) 50%, var(--c-ch2) 50%); }
</style>
