<script lang="ts">
  /** Preset picker + custom tuning builder (spec §5). Validation warns, never blocks. */
  import { PRESET_TUNINGS, ROOTS, autoLabel, tuningWarnings, type Pitch, type Tuning } from './theory';
  import { collectTuning, store } from './store.svelte';

  let { tuning = $bindable() }: { tuning: Tuning } = $props();

  let name = $state('');
  let all = $derived([...PRESET_TUNINGS, ...store.customTunings]);
  let warnings = $derived(tuningWarnings(tuning));
  let label = $derived(tuning.name || autoLabel(tuning));

  const set = (strings: Pitch[]) => (tuning = { name: undefined, strings });

  function edit(i: number, patch: Partial<Pitch>) {
    set(tuning.strings.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  }

  function addString() {
    const top = tuning.strings.at(-1)!;
    set([...tuning.strings, { ...top }]);
  }

  function save() {
    const named = { ...tuning, name: name.trim() || autoLabel(tuning) };
    collectTuning(named);
    tuning = named;
    name = '';
  }
</script>

<h3>Tuning</h3>
<select
  aria-label="Tuning preset"
  value={label}
  onchange={(e) => {
    const found = all.find((t) => (t.name || autoLabel(t)) === e.currentTarget.value);
    if (found) tuning = structuredClone($state.snapshot(found));
  }}
>
  {#each all as t}
    {@const n = t.name || autoLabel(t)}
    <option value={n}>{n} — {autoLabel(t)}</option>
  {/each}
  {#if !all.some((t) => (t.name || autoLabel(t)) === label)}
    <option value={label}>{label} (unsaved)</option>
  {/if}
</select>

<details>
  <summary>Customise strings ({tuning.strings.length})</summary>

  <!-- Ordered low → high, matching the fretboard bottom → top. -->
  {#each tuning.strings as p, i}
    <div class="row">
      <span class="num">{i + 1}</span>
      <select aria-label="String {i + 1} note" value={p.note} onchange={(e) => edit(i, { note: e.currentTarget.value })}>
        {#each ROOTS as n}<option value={n}>{n}</option>{/each}
      </select>
      <select
        aria-label="String {i + 1} octave"
        value={String(p.octave)}
        onchange={(e) => edit(i, { octave: Number(e.currentTarget.value) })}
      >
        {#each { length: 9 } as _, o}<option value={String(o)}>{o}</option>{/each}
      </select>
      <button
        class="x" aria-label="Remove string {i + 1}"
        disabled={tuning.strings.length <= 4}
        onclick={() => set(tuning.strings.filter((_, k) => k !== i))}>×</button
      >
    </div>
  {/each}

  <div class="row">
    <button onclick={addString} disabled={tuning.strings.length >= 8}>+ Add string</button>
  </div>

  {#each warnings as w}
    <p class="warn" role="status">⚠ {w}</p>
  {/each}

  <div class="row">
    <input bind:value={name} placeholder={autoLabel(tuning)} aria-label="Tuning name" />
    <button onclick={save}>Save tuning</button>
  </div>
</details>

<style>
  .num { color: var(--muted); font-size: 0.75rem; width: 1em; }
  input { flex: 1; min-width: 0; }
</style>
