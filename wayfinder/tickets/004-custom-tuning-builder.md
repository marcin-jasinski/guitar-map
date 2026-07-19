---
id: TICKET-004
title: Design custom tuning builder UX
label: wayfinder:grilling
status: closed
assignee: marcin
blocked_by: []
---

## Question

Custom tunings are in scope (map Decisions). How does a user build one: pick a note per
string from a dropdown, type note names, or drag a pitch per string? How many strings does
the builder support (fixed at 6, or variable)? Does it validate/warn on unplayable or
enharmonically confusing input, and can a custom tuning be named and saved (ties to
TICKET-006)?

## Resolution

**Note input: per-string note dropdown + octave selector.** Each string is a row with a
note-letter dropdown (C, C♯, … B) and an octave selector, so a string's pitch is fully
specified as note + octave with no free-text parsing. This is unambiguous, mobile-friendly,
and supports wide/drop tunings (unlike note-only). Steppers were rejected as tedious for
from-scratch entry; typing was rejected for the parsing/enharmonic ambiguity it invites.

**String count: variable (~4–8).** Add/remove string rows; default layout is the current
tuning's string count (6 for the standard presets). This honors the "any tuning just works"
preference — 7- and 8-string guitars and 4-string bass are all supported because shapes are
computed from the tuning definition. The fretboard renderer (TICKET-007) must therefore take
string count from the tuning, not hard-code 6.

**Validation: warn, never block.** Any set of pitches is accepted — nothing is "unplayable"
to the app since shapes are computed regardless. Soft, non-blocking warnings surface obvious
oddities (e.g. strings not in ascending pitch order, or an extreme interval between adjacent
strings). Save is never disabled.

**Naming/save: optional name, persisted via favorites.** A custom tuning has an optional name
field defaulting to an auto-label built from its pitches (e.g. "E A D G C F"). Persistence is
handled by TICKET-006 — a saved custom tuning is one of the things the favorites/localStorage
schema must hold (tuning = ordered list of {note, octave} + optional name). Unnamed/unsaved
custom tunings remain fully usable within the session.
