import { expect, test } from 'vitest';
import { render } from 'svelte/server';
import App from './App.svelte';

/**
 * Smoke test: the unit tests cover the theory, but only rendering catches an app
 * that blows up on mount. Server rendering needs no browser and no extra deps.
 */
test('the app renders the default view — C major on a standard-tuned neck', () => {
  const { body } = render(App);

  expect(body).toContain('Guitar Map');
  expect(body).toContain('C Major (Ionian)');
  expect(body).toContain('frets 5–9');
  expect(body).toContain('Diatonic triads');

  // The whole neck renders: frets 0–24 inclusive, one column each (§4).
  expect(body.match(/class="fretnum/g)).toHaveLength(25);
  // Every dot carries a text label and an ARIA label, so nothing is colour-only (§1).
  expect(body).toContain('aria-label="E, 3, string 1 fret 0"');
  expect(body).toContain('aria-label="B, 7, string 6 fret 7"');
});
