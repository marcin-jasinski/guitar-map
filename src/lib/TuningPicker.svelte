<script lang="ts">
  /** Preset picker + custom tuning builder (spec §5). Validation warns, never blocks. */
  import {
    PRESET_TUNINGS,
    ROOTS,
    autoLabel,
    midiOf,
    pitchFromMidi,
    tuningWarnings,
    type Pitch,
    type Tuning,
  } from './theory';
  import { collectTuning, store } from './store.svelte';

  let { tuning = $bindable() }: { tuning: Tuning } = $props();

  let name = $state('');
  let saved = $state('');
  let all = $derived([...PRESET_TUNINGS, ...store.customTunings]);
  let warnings = $derived(tuningWarnings(tuning));
  let label = $derived(tuning.name || autoLabel(tuning));

  // Highest string first, so the list reads the same way round as the neck.
  // The number still counts up from the lowest string, matching the fretboard.
  let rows = $derived(tuning.strings.map((pitch, index) => ({ pitch, index })).reverse());

  const set = (strings: Pitch[]) => {
    saved = '';
    tuning = { name: undefined, strings };
  };

  function edit(i: number, patch: Partial<Pitch>) {
    set(tuning.strings.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  }

  /** Extra strings go on the bottom, a fourth down — the way 7- and 8-strings
   *  actually extend (B below E, F♯ below B). Change the dropdowns for anything else. */
  function addString() {
    set([pitchFromMidi(Math.max(0, midiOf(tuning.strings[0]) - 5)), ...tuning.strings]);
  }

  function save() {
    const named = { ...$state.snapshot(tuning), name: name.trim() || autoLabel(tuning) };
    const stored = collectTuning(named);
    tuning = named;
    name = '';
    saved = stored
      ? `Saved as “${named.name}” — it is in the tuning list now.`
      : 'Those strings are already a built-in tuning, so nothing was added.';
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

  <div class="strings">
    <span></span>
    <span class="head">note</span>
    <span class="head">octave</span>
    <span></span>

    {#each rows as { pitch, index } (index)}
      <span class="num">{index + 1}</span>
      <select
        aria-label="String {index + 1} note"
        value={pitch.note}
        onchange={(e) => edit(index, { note: e.currentTarget.value })}
      >
        {#each ROOTS as n}<option value={n}>{n}</option>{/each}
      </select>
      <select
        aria-label="String {index + 1} octave"
        value={String(pitch.octave)}
        onchange={(e) => edit(index, { octave: Number(e.currentTarget.value) })}
      >
        {#each { length: 9 } as _, o}<option value={String(o)}>{o}</option>{/each}
      </select>
      <button
        class="x" aria-label="Remove string {index + 1}"
        disabled={tuning.strings.length <= 4}
        onclick={() => set(tuning.strings.filter((_, k) => k !== index))}>×</button
      >
    {/each}
  </div>

  <p class="note">Pitch is note + octave — middle C is C4, so standard low E is E2.</p>

  <div class="row">
    <button onclick={addString} disabled={tuning.strings.length >= 8}>+ Add lower string</button>
  </div>

  {#each warnings as w}
    <p class="warn" role="status">⚠ {w}</p>
  {/each}

  <div class="row">
    <input bind:value={name} placeholder={autoLabel(tuning)} aria-label="Tuning name" />
    <button onclick={save}>Save tuning</button>
  </div>
  {#if saved}<p class="saved" role="status">{saved}</p>{/if}
</details>

<style>
  .strings {
    display: grid;
    grid-template-columns: 1.1em 1fr 3.6em 1.9em;
    gap: 6px;
    align-items: center;
    margin-top: 8px;
  }
  .strings select { width: 100%; margin: 0; }
  .num { color: var(--muted); font-size: 0.75rem; }
  .head {
    color: var(--muted);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .note { color: var(--muted); font-size: 0.72rem; margin: 8px 0 0; line-height: 1.35; }
  .saved { color: var(--c-triad); font-size: 0.72rem; margin: 8px 0 0; line-height: 1.35; }
  input { flex: 1; min-width: 0; }
</style>
