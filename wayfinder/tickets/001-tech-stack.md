---
id: TICKET-001
title: Choose tech stack and hosting
label: wayfinder:grilling
status: closed
assignee: marcin
blocked_by: []
---

## Question

What framework/language, rendering approach (SVG/canvas/DOM), and hosting should the spec
commit to? The data model computes shapes client-side from theory + tuning definitions
(see map Notes), so a backend is likely unnecessary — confirm whether that holds, and pick
a concrete frontend stack and where it deploys.

## Resolution

**Stack: Svelte 5 + TypeScript, built with Vite** to a static bundle.

**Rendering: SVG** for the fretboard. Each fret line and note dot is a real SVG element,
so per-note click/hover handlers, per-chord/per-degree coloring, shape-outline overlays
(TICKET-009), and accessibility come for free, and it stays crisp at any size / printable.
Canvas was rejected (hand-rolled hit-testing, no DOM a11y, no animation need here); CSS-grid
DOM was rejected (awkward for realistic neck proportions and overlay outlines).

**Hosting: static, no backend.** All scale/chord/tuning shapes are computed client-side from
interval formulas + tuning definitions (map Notes), so there is no API, DB, or auth. Deploy
the static bundle to any static host — Cloudflare Pages / Netlify / GitHub Pages are
interchangeable; the choice is not load-bearing and can be made at deploy time. Favorites
persist via `localStorage` (TICKET-006). A backend is only revisited if sharing/accounts
graduate from the fog — explicitly not built at launch.
