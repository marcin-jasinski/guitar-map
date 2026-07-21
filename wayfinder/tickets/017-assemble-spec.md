---
id: TICKET-017
title: Assemble the build-ready progression explorer spec
label: wayfinder:task
status: closed
assignee: Marcin
blocked_by: [TICKET-011, TICKET-012, TICKET-013, TICKET-014, TICKET-015, TICKET-016, TICKET-018]
map: MAP-002
---

## Question

Nothing left to decide — consolidate the resolutions of TICKET-010 through TICKET-016, plus
TICKET-018, into
one build-ready spec at `wayfinder/guitar-map/progressions-spec.md`, in the same shape and
voice as the shipped [`guitar-map/spec.md`](../guitar-map/spec.md), and link it from MAP-002's
Destination as the destination reached.

Assembling is where contradictions between separately-made decisions surface — flag any, and
resolve them rather than papering over them.

## Resolution

Spec written: [`guitar-map/progressions-spec.md`](../guitar-map/progressions-spec.md) — ten
sections in the shipped spec's shape and voice, each citing its source ticket, plus a **§10
Contradictions** section and cross-cutting build notes.

Five contradictions surfaced and were resolved in the spec rather than deferred:

1. **The Andalusian preset was written in the wrong notation.** TICKET-011 listed it as
   `i ♭VII ♭VI V`, but TICKET-010 fixes minor keys to natural-minor degrees, where VII and VI are
   *already* flat — the ♭ would mean a doubly-flattened degree. Corrected to `i VII VI V`.
   "Mixolydian rock" keeps its `♭VII`, which is correct because that preset is in a major key.
2. **The guide-tone control collapsed from three settings to one.** TICKET-013 specified
   off / next / whole progression; TICKET-015 dropped the whole-progression path after
   prototyping it. Resolved in favour of the later decision, made against a real voicing chain.
3. **TICKET-018's title promises an Arpeggio bridge** its own resolution drops. The spec ships
   two bridges — Chord and Scale. The title is stale, not the decision.
4. **`setKind()`'s shipped root-carrying behaviour changes** under per-tab content state.
   Accepted deliberately and stated in the spec so it is not later discovered as a regression.
5. **The spec amends `spec.md` §8**: `window` and `labelMode` become optional on `Favorite`, and
   `Content` gains a fourth member. Neither bumps the store version; both are backward
   compatible.

The destination is reached — the map has no open tickets and nothing left to decide.

