# Local-markdown issue tracker convention

No external tracker is wired up for this repo, so wayfinder falls back to plain markdown files here.

- Maps live at `wayfinder/map.md` (MAP-001) and `wayfinder/map-NNN.md` for every map after it.
- Each ticket is a file under `wayfinder/tickets/NNN-slug.md` with frontmatter:
  ```yaml
  id: TICKET-NNN
  title: <title>
  label: wayfinder:<research|prototype|grilling|task>
  status: open | closed
  assignee: null | <name>
  blocked_by: [TICKET-NNN, ...]
  map: MAP-NNN
  ```
  Ticket numbers are unique across all maps; `map:` says which map owns the ticket.
- `wayfinder/backlog.md` holds standalone briefs — decided work with no fog, owned by no map.
- **Claim** a ticket by setting `assignee`.
- **Blocking**: a ticket is unblocked when every id in `blocked_by` points at a ticket with `status: closed`.
- **Frontier query**: tickets with `status: open`, `assignee: null`, and all `blocked_by` entries closed.
  A **closed map can still own open tickets**: a map closes when its destination is reached, and
  for a spec map the destination is the spec, not the build. The query is over tickets and ignores
  the owning map's status, so nothing is lost — MAP-002 is the worked example.
- **Resolving** a ticket: append a `## Resolution` section to its file, set `status: closed`, then add a one-line pointer under the map's `## Decisions so far`.
