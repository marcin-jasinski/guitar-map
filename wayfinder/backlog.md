# Backlog — standalone briefs

Small, decided work items that don't belong to a map: the way to done is already clear, so
hand one of these to an implementation agent as-is. Ruled out of scope of
[MAP-002](map-002.md) while charting it.

## B1 — Tone.js sample-based guitar tone

**Promoted to [TICKET-028](tickets/028-tonejs-guitar-tone.md)** so it shows up in the frontier
query. The brief's constraints moved there in full; nothing lives here any more.

## B2 — Download the current neck diagram

The fretboard is already SVG ([`src/lib/Fretboard.svelte`](../src/lib/Fretboard.svelte)), so
serialise the live `<svg>` element and hand it over as a download — PNG via a canvas draw,
or the SVG itself, whichever ends up shorter. No new dependency.

- Filename should describe the view, and `favoriteName()` in
  [`src/lib/store.svelte.ts`](../src/lib/store.svelte.ts) already builds exactly that string.
- Inline any CSS the SVG relies on — a serialised SVG carries no stylesheet with it.

## B3 — Reset view to default

A button that returns the app to its startup state: default tuning, default content, default
fret window, default label mode, default display mode. The initial values already exist where
the app's state is created — reset means re-applying them, not inventing a new default set.
Leave favorites and saved custom tunings alone.
