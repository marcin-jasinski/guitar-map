# Issue tracker: Local Markdown

No external tracker is wired up for this repo (no git remote). Issues, specs (a spec is sometimes called a PRD), and the wayfinder map all live as markdown files under `wayfinder/`.

The authoritative layout is described in [`wayfinder/TRACKER.md`](../../wayfinder/TRACKER.md) — read it first. Summary below.

## Conventions

- The **map** lives at `wayfinder/map.md`.
- **Tickets** are one file per issue at `wayfinder/tickets/NNN-slug.md`, numbered from `001`, with YAML frontmatter (`id`, `title`, `label`, `status`, `assignee`, `blocked_by`).
- **Specs / PRDs** for a feature live under `wayfinder/<feature-slug>/spec.md`.
- Triage state is the `status:` field in a ticket's frontmatter (`open` | `closed`). No `triage` skill is installed, so there is no separate label vocabulary — see `docs/agents/triage-labels.md` only if that changes.
- Conversation/history appends to the bottom of the file (e.g. under a `## Resolution` heading when closing).

## When a skill says "publish to the issue tracker"

Create a new file under `wayfinder/` — a ticket at `wayfinder/tickets/NNN-slug.md` (next free number), or a spec at `wayfinder/<feature-slug>/spec.md`. Create the directory if needed.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the ticket number directly.

## Wayfinding operations (used by `/wayfinder`)

- **Map**: `wayfinder/map.md` — Destination / Notes / Decisions-so-far / Not-yet-specified body.
- **Child ticket**: `wayfinder/tickets/NNN-slug.md`, numbered from `001`, with the question in the body. `label:` records the ticket type; `status:` records `open`/`closed`; `assignee:` records the claim.
- **Blocking**: a `blocked_by: [TICKET-NNN, ...]` frontmatter list. A ticket is unblocked when every id it lists points at a `status: closed` ticket.
- **Frontier**: scan `wayfinder/tickets/` for files that are `status: open`, `assignee: null`, and fully unblocked; lowest number wins.
- **Claim**: set `assignee` before any work.
- **Resolve**: append the answer under a `## Resolution` heading, set `status: closed`, then add a one-line pointer under the map's `## Decisions so far`.
