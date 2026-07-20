---
id: TICKET-018
title: Bridge a progression chord to the Chord and Arpeggio tabs
label: wayfinder:grilling
status: open
assignee: null
blocked_by: []
map: MAP-002
---

## Question

Graduated from fog once [TICKET-013](013-tab-layout.md) fixed the layout: the progression rail
now has a concrete place for a per-chord action, and TICKET-013 also establishes the tab bar
that a bridge would navigate.

"Send this chord to the Chord view / Arpeggio view" — what exactly crosses over, and what
happens to where you were?

- Which targets are offered, and from where — an action on a rail entry, on the neck, or in the
  swaps block under the neck?
- What carries across: the chord's root and type obviously, but also the tuning, and the key?
  The target tabs have no notion of a key, so the chord arrives stripped of the context that
  made it interesting — is that acceptable, or does something have to travel with it?
- The progression tab shows a chord *against a parent scale*. The Arpeggio tab shows it alone.
  Is the useful bridge actually to the **Scale** tab with the inferred parent, rather than to
  the chord itself?
- Does switching tabs lose the progression? The shipped app holds one `content` state; leaving
  and returning must not silently reset the progression or the step you were on.
- Is there a way back — a breadcrumb to the progression you came from — or is it one-way?
