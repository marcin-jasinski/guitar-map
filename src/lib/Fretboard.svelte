<script lang="ts">
  /**
   * Whole-neck horizontal fretboard with the position window highlighted in place
   * (spec §3, §4). String count comes from the tuning — never hard-coded (§5).
   *
   * Dumb by design: it draws whatever pitch classes `dots` hands it.
   */
  import { LAST_FRET, fretMidi, type FretWindow, type Tuning } from './theory';
  import { cellKey, type Barre, type Dot, type NeckSelection } from './view';

  let {
    tuning,
    dots,
    cells,
    barre,
    ghosts,
    showWindow,
    win,
    lines = [],
    selection = $bindable(null),
    onCenter,
    onPlayNote,
    onPickRoot,
  }: {
    tuning: Tuning;
    dots: Map<number, Dot>;
    /** Which `(string, fret)` positions get a dot — see `board`. */
    cells: Set<string>;
    /** Set when the shape can be held with one finger across a run of strings. */
    barre: Barre | null;
    /** Other roots this shape could start from, as cell → anchor index. */
    ghosts: Map<string, number>;
    /** The window is only meaningful in position mode; elsewhere nothing is emphasised. */
    showWindow: boolean;
    win: FretWindow;
    /** Guide-tone lines as cell-key pairs, drawn as arrowed `--accent` strokes (§6). */
    lines?: { from: string; to: string }[];
    /** Dragged-out region of neck. The parent owns it — it filters `cells` — but
     *  the gesture and the Clear control live here, where the neck is. */
    selection?: NeckSelection | null;
    onCenter: (fret: number) => void;
    onPlayNote: (midi: number) => void;
    /** Re-anchor the octave view on one of the faint roots. */
    onPickRoot: (anchor: number) => void;
  } = $props();

  const FRET_W = 46;
  const STRING_H = 34;
  const PAD_L = 46;
  const PAD_T = 22;
  const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
  const DOUBLE_INLAYS = [12, 24];

  let count = $derived(tuning.strings.length);
  let width = $derived(PAD_L + (LAST_FRET + 1) * FRET_W + 18);
  let height = $derived(PAD_T + count * STRING_H + 26);

  const x = (fret: number) => PAD_L + fret * FRET_W;
  // String 0 is the lowest pitch and sits at the bottom, as on a chart.
  let y = $derived((s: number) => PAD_T + (count - 1 - s) * STRING_H + STRING_H / 2);

  /** Pie wedge, so a shared overlay note splits its fill between contributing chords. */
  function wedge(cx: number, cy: number, r: number, i: number, n: number) {
    if (n === 1) return '';
    const a = (k: number) => (-Math.PI / 2) + (2 * Math.PI * k) / n;
    const [x0, y0] = [cx + r * Math.cos(a(i)), cy + r * Math.sin(a(i))];
    const [x1, y1] = [cx + r * Math.cos(a(i + 1)), cy + r * Math.sin(a(i + 1))];
    return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${2 / n > 1 ? 1 : 0} 1 ${x1},${y1} Z`;
  }

  const inWindow = (f: number) => f >= win.startFret && f < win.startFret + win.width;
  const barred = (s: number, f: number) =>
    !!barre && barre.fret === f && s >= barre.from && s <= barre.to;

  // ---- drag to isolate a region of neck -----------------------------------------

  let svg: SVGSVGElement;
  let drag = $state<{ s0: number; f0: number; s1: number; f1: number } | null>(null);
  // Not $state: only read back inside the click that follows the drag.
  let dragged = false;

  const clamp = (v: number, hi: number) => Math.max(0, Math.min(hi, v));

  /** Which cell a pointer is over. The viewBox scales with the column, so client
   *  pixels are converted through the rendered size rather than assumed 1:1. */
  function cellAt(e: PointerEvent) {
    const r = svg.getBoundingClientRect();
    const ux = ((e.clientX - r.left) * width) / r.width;
    const uy = ((e.clientY - r.top) * height) / r.height;
    return {
      s: clamp(count - 1 - Math.round((uy - PAD_T - STRING_H / 2) / STRING_H), count - 1),
      f: clamp(Math.round((ux - PAD_L) / FRET_W), LAST_FRET),
    };
  }

  let marquee = $derived.by(() => {
    if (drag) {
      return {
        fromString: Math.min(drag.s0, drag.s1), toString: Math.max(drag.s0, drag.s1),
        fromFret: Math.min(drag.f0, drag.f1), toFret: Math.max(drag.f0, drag.f1),
      };
    }
    return selection;
  });

  function down(e: PointerEvent) {
    // ponytail: mouse and pen only — claiming touch here would take the neck's
    // horizontal scroll away. Add a `touch-action` dance if tablets ask for it.
    if (e.pointerType === 'touch') return;
    const { s, f } = cellAt(e);
    drag = { s0: s, f0: f, s1: s, f1: f };
    dragged = false;
    svg.setPointerCapture(e.pointerId);
  }

  function moved(e: PointerEvent) {
    if (!drag) return;
    const { s, f } = cellAt(e);
    if (s !== drag.s0 || f !== drag.f0) dragged = true;
    drag = { ...drag, s1: s, f1: f };
  }

  /** A drag that never left its starting cell is a click, and is left alone. */
  function up() {
    if (dragged && marquee) selection = marquee;
    drag = null;
  }
</script>

<!-- Escape is the gesture people already try; the button is the one a keyboard
     user can reach. Making a selection is mouse-only — the neck is fully usable
     without one, so nothing is lost, only unavailable. -->
<svelte:window onkeydown={(e) => e.key === 'Escape' && (selection = null)} />

<div class="selbar">
  {#if selection}
    <span>
      Showing strings {selection.fromString + 1}–{selection.toString + 1}, frets
      {selection.fromFret}–{selection.toFret}.
    </span>
    <button onclick={() => (selection = null)}>Clear selection</button>
  {:else}
    <span>Drag across the neck to show only that part of it.</span>
  {/if}
</div>

<div class="scroll">
  <svg
    bind:this={svg}
    viewBox="0 0 {width} {height}" role="group" aria-label="Fretboard"
    onpointerdown={down} onpointermove={moved} onpointerup={up} onpointercancel={up}
    onclickcapture={(e) => { if (dragged) { e.stopPropagation(); dragged = false; } }}
  >
    <defs>
      <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--wood-2)" />
        <stop offset="1" stop-color="var(--wood-1)" />
      </linearGradient>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
      </marker>
    </defs>

    <rect
      x={PAD_L - FRET_W * 0.5} y={PAD_T - 8}
      width={(LAST_FRET + 1) * FRET_W} height={count * STRING_H + 16}
      rx="6" fill="url(#wood)"
    />

    <!-- The position window is emphasis on the whole neck, not a separate view (§4).
         Outside position mode every drawn note is equally in play, so there is
         nothing to emphasise and the band would only mislead. -->
    {#if showWindow}
      <rect
        x={x(win.startFret) - FRET_W * 0.5} y={PAD_T - 8}
        width={win.width * FRET_W} height={count * STRING_H + 16}
        fill="var(--accent)" opacity=".14" stroke="var(--accent)" stroke-width="2" rx="4"
      />
    {/if}

    {#each INLAYS as f}
      <circle cx={x(f)} cy={PAD_T + (count * STRING_H) / 2} r="5" fill="var(--inlay)" opacity=".4" />
    {/each}
    {#each DOUBLE_INLAYS as f}
      <circle cx={x(f)} cy={PAD_T + count * STRING_H * 0.3} r="5" fill="var(--inlay)" opacity=".4" />
      <circle cx={x(f)} cy={PAD_T + count * STRING_H * 0.7} r="5" fill="var(--inlay)" opacity=".4" />
    {/each}

    {#each { length: LAST_FRET } as _, i}
      <line
        x1={x(i + 1) - FRET_W / 2} y1={PAD_T - 4} x2={x(i + 1) - FRET_W / 2} y2={PAD_T + count * STRING_H + 4}
        stroke="var(--wire)" stroke-width={i === 0 ? 4 : 2}
      />
    {/each}

    {#each tuning.strings as pitch, s}
      <line
        x1={PAD_L - FRET_W * 0.42} y1={y(s)} x2={x(LAST_FRET) + 12} y2={y(s)}
        stroke="var(--string)" stroke-width={1 + (count - 1 - s) * 0.3}
      />
      <text x={PAD_L - FRET_W * 0.55} y={y(s) + 4} class="edge" text-anchor="end">{pitch.note}</text>
    {/each}

    <!-- Click any fret to centre the window on it (§4). Deliberately not a tab
         stop: 25 of these would bury the note dots, and ← → already move the
         window from the keyboard. -->
    {#each { length: LAST_FRET + 1 } as _, f}
      <g role="presentation" onclick={() => onCenter(f)}>
        <rect
          x={x(f) - FRET_W / 2} y={PAD_T - 8} width={FRET_W} height={count * STRING_H + 16}
          fill="transparent" class="fretzone"
        />
        <text x={x(f)} y={height - 8} class="fretnum" class:on={showWindow && inWindow(f)} text-anchor="middle">{f}</text>
      </g>
    {/each}

    {#if barre}
      <rect
        x={x(barre.fret) - 13} y={y(barre.to) - 13}
        width="26" height={y(barre.from) - y(barre.to) + 26}
        rx="13" fill="var(--ink)" opacity=".22"
      />
    {/if}

    {#each tuning.strings as _, s}
      {#each { length: LAST_FRET + 1 } as _, f}
        {@const midi = fretMidi(tuning, s, f)}
        {@const key = cellKey(s, f)}
        {@const played = cells.has(key)}
        {@const ghost = !played && ghosts.has(key)}
        {@const dot = played || ghost ? dots.get(midi % 12) : undefined}
        {#if dot}
          <!-- §4.5's next-chord ghost draws dashed like the octave-view ghost, but
               in --accent; both share the outlined, panel-filled, ink-labelled look. -->
          {@const outline = played && !!dot.outline}
          {@const dashed = ghost || outline}
          <!-- Open strings read as the ring every chart draws them as, so a note
               sounded by the nut is never mistaken for one you have to fret. -->
          {@const open = played && f === 0 && !outline}
          {@const r = dashed ? 11 : dot.faded ? 10 : 13}
          <g
            role="button" tabindex="0"
            class="dot" class:faded={dot.faded && played && !outline} class:ghost class:outline
            aria-label={ghost
              ? `Start the shape from ${dot.name}, string ${s + 1} fret ${f}`
              : `${dot.name}, ${dot.role}, ${open ? `open string ${s + 1}` : `string ${s + 1} fret ${f}`}${outline ? ', next chord' : ''}${dot.cutRing ? ', held into the next chord' : ''}${barred(s, f) ? ', barred' : ''}`}
            onclick={() => (ghost ? onPickRoot(ghosts.get(key)!) : onPlayNote(midi))}
            onkeydown={(e) =>
              (e.key === 'Enter' || e.key === ' ') &&
              (e.preventDefault(), ghost ? onPickRoot(ghosts.get(key)!) : onPlayNote(midi))}
          >
            {#if dashed}
              <circle
                cx={x(f)} cy={y(s)} r={r} fill="var(--panel)"
                stroke={outline ? 'var(--accent)' : dot.colors[0]} stroke-width="2" stroke-dasharray="3 2.5"
              />
            {:else}
              <circle
                cx={x(f)} cy={y(s)} r={r}
                fill={open ? 'var(--panel)' : dot.colors[0]}
                stroke={open ? dot.colors[0] : 'none'} stroke-width="3.5"
              />
              <!-- An open note in overlay keeps its numeric badge, which carries
                   chord identity on its own, rather than filling the ring in. -->
              {#if dot.colors.length > 1 && !open}
                {#each dot.colors as color, i}
                  <path d={wedge(x(f), y(s), r, i, dot.colors.length)} fill={color} />
                {/each}
              {/if}
              {#if !open}
                <circle cx={x(f)} cy={y(s)} r={r + 2.5} fill="none" stroke={dot.colors[0]} stroke-width="1.6" opacity=".5" />
              {/if}
              <!-- §3's exception note: a chord tone outside the parent scale, ringed in --warn. -->
              {#if dot.warnRing}
                <circle cx={x(f)} cy={y(s)} r={r + 3.5} fill="none" stroke="var(--warn)" stroke-width="2" />
              {/if}
              <!-- §6's held common tone: a ring of panel colour cut into the dot — shape, not hue. -->
              {#if dot.cutRing}
                <circle cx={x(f)} cy={y(s)} r={r * 0.52} fill="none" stroke="var(--panel)" stroke-width="3" />
              {/if}
            {/if}
            <!-- Every dot always carries its text label, so nothing is encoded by colour alone (§1). -->
            <text x={x(f)} y={y(s) + 3.5} text-anchor="middle" class="lbl" class:ink={dashed || open}>{dot.label}</text>
            {#if dot.badge && !dashed}
              <circle cx={x(f) + r} cy={y(s) - r} r="7" fill="var(--panel)" stroke={dot.colors[0]} stroke-width="1.2" />
              <text x={x(f) + r} y={y(s) - r + 3} text-anchor="middle" class="badge">{dot.badge}</text>
            {/if}
          </g>
        {/if}
      {/each}
    {/each}

    <!-- Outline only, drawn over everything: the region it frames is the only one
         with notes in it, so there is nothing outside to dim. -->
    {#if marquee}
      <rect
        x={x(marquee.fromFret) - FRET_W / 2} y={y(marquee.toString) - STRING_H / 2}
        width={(marquee.toFret - marquee.fromFret + 1) * FRET_W}
        height={(marquee.toString - marquee.fromString + 1) * STRING_H}
        class="marquee" rx="4"
      />
    {/if}

    <!-- Guide-tone lines: the only stroke on this tab (§6). Drawn last, over the dots. -->
    {#each lines as ln}
      {@const a = ln.from.split(':').map(Number)}
      {@const b = ln.to.split(':').map(Number)}
      <line
        x1={x(a[1])} y1={y(a[0])} x2={x(b[1])} y2={y(b[0])}
        class="guide" marker-end="url(#arrow)"
      />
    {/each}
  </svg>
</div>

<style>
  .scroll { overflow-x: auto; padding-bottom: 6px; }
  .selbar {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    color: var(--muted); font-size: 0.78rem; margin-bottom: 6px;
  }
  .selbar button { font-size: 0.72rem; padding: 3px 9px; }
  .marquee { fill: none; stroke: var(--accent); stroke-width: 2; stroke-dasharray: 6 4; pointer-events: none; }
  /* Grows to fill the column; below min-width the neck scrolls rather than
     shrinking the dots into illegibility. */
  svg { display: block; width: 100%; min-width: 1040px; font-family: var(--font-mono); }
  .edge, .fretnum { fill: var(--muted); font-size: 11px; }
  .fretnum.on { fill: var(--accent); font-weight: 700; }
  .fretzone { cursor: pointer; }
  .fretzone:hover { fill: var(--accent); opacity: 0.07; }
  .dot { cursor: pointer; }
  .dot.faded { opacity: 0.5; }
  .dot.ghost { opacity: 0.4; }
  .dot.ghost:hover { opacity: 0.95; }
  .dot.outline { opacity: 0.7; }
  .guide { stroke: var(--accent); stroke-width: 2.5; opacity: 0.9; pointer-events: none; }
  .dot:hover { filter: brightness(1.15); }
  .dot:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .lbl { fill: #fff; font-size: 11px; font-weight: 700; paint-order: stroke; }
  .lbl.ink { fill: var(--ink); font-size: 10px; }
  .badge { fill: var(--ink); font-size: 8px; font-weight: 700; }
</style>
