# Local-markdown issue tracker convention

No external tracker is wired up for this repo, so wayfinder falls back to plain markdown files here.

- The map lives at `wayfinder/map.md`.
- Each ticket is a file under `wayfinder/tickets/NNN-slug.md` with frontmatter:
  ```yaml
  id: TICKET-NNN
  title: <title>
  label: wayfinder:<research|prototype|grilling|task>
  status: open | closed
  assignee: null | <name>
  blocked_by: [TICKET-NNN, ...]
  ```
- **Claim** a ticket by setting `assignee`.
- **Blocking**: a ticket is unblocked when every id in `blocked_by` points at a ticket with `status: closed`.
- **Frontier query**: tickets with `status: open`, `assignee: null`, and all `blocked_by` entries closed.
- **Resolving** a ticket: append a `## Resolution` section to its file, set `status: closed`, then add a one-line pointer under the map's `## Decisions so far`.
