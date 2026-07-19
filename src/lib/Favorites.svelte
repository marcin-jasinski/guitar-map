<script lang="ts">
  /** Favorites panel: save the current view, then load / rename / delete (spec §8). */
  import { SOFT_CAP, addFavorite, store, type Favorite } from './store.svelte';

  let {
    snapshot,
    onLoad,
  }: { snapshot: () => Omit<Favorite, 'id' | 'name'>; onLoad: (f: Favorite) => void } = $props();

  let notice = $state<string | null>(null);

  function save() {
    notice = addFavorite(snapshot());
  }
</script>

<h3>Favorites</h3>
<button onclick={save}>★ Save this view</button>
{#if notice}<p class="warn" role="status">⚠ {notice}</p>{/if}

<ul>
  {#each store.favorites as fav (fav.id)}
    <li>
      <button class="load" onclick={() => onLoad(fav)} title="Load this view">{fav.name}</button>
      <button
        class="x" aria-label="Rename {fav.name}"
        onclick={() => {
          const next = prompt('Rename favorite', fav.name);
          if (next?.trim()) fav.name = next.trim();
        }}>✎</button
      >
      <button
        class="x" aria-label="Delete {fav.name}"
        onclick={() => (store.favorites = store.favorites.filter((f) => f.id !== fav.id))}>×</button
      >
    </li>
  {/each}
</ul>
{#if !store.favorites.length}
  <p class="muted">Nothing saved yet. Up to about {SOFT_CAP} fit comfortably.</p>
{/if}

<style>
  ul { list-style: none; margin: 10px 0 0; padding: 0; }
  li { display: flex; gap: 4px; align-items: stretch; margin-bottom: 4px; }
  .load {
    flex: 1; text-align: left; font-size: 0.76rem; line-height: 1.3;
    padding: 5px 8px; min-width: 0;
  }
</style>
