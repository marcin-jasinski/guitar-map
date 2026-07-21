---
id: TICKET-018
title: Bridge a progression chord to the Chord and Arpeggio tabs
label: wayfinder:grilling
status: closed
assignee: Marcin
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

## Resolution

A bridge is only worth building where the target tab can do something this one cannot. The
progression tab has **no audio** (charting decision) and **no position or octave window**
(TICKET-013), so those are the gaps, and they fix both the targets and the count.

### Two bridges, placed by scope

```
rail entry ⋮          ▶ Play this chord    → Chord tab (root, type)
parent scale header   ♪ Solo on C Ionian   → Scale tab (root, inferred scale)
```

**Placement follows scope.** "Play this chord" is per-chord, so it lives on the rail entry.
"Solo on <parent>" is progression-level, so it lives beside the parent-scale name above the
neck. Putting both on the rail entry would imply a per-chord scale — precisely the chord-scale
model already ruled out of scope on this map.

**No Arpeggio bridge.** The progression neck already draws the chord's tones across the whole
neck, so that bridge would land the player somewhere showing *less*. The third item would cost
every rail entry a line for a view that mostly duplicates the one it left.

### Per-tab content state; the tab bar is the way back

`App.svelte`'s single `content` becomes **one content state per tab**, so a tab remembers what
it was showing for the session. Returning to Progression restores the progression, its key and
its step exactly. The bridge is then simply "set the target tab's content, then switch to it".

**No breadcrumb.** The Progression tab in the bar is already the way back and is where the
player will look; a transient "← from C major · iv" element would bring its own lifetime
questions — when it clears, whether it survives editing the scale you landed on, what a second
bridge does to it — for a return path that already exists.

Note the behaviour change this implies: the shipped `setKind()` carries the root across when
switching content kind. With per-tab memory, a plain tab switch keeps whatever that tab held.
That is the standard expectation of a tab bar, and the "carry it over" case is now served
explicitly by the bridges.

**Tuning stays app-global**, not per-tab — it already reads that way, with the picker in the
sidebar and a favorite embedding it. Only content is remembered per tab.

### What travels, and what doesn't

- **To the Scale tab**: the key's root plus the inferred scale name. The Scale tab has no notion
  of a key, but root + scale encodes everything the inference concluded, so nothing is lost.
- **To the Chord tab**: the chord's derived root and type only. The chord genuinely **arrives
  stripped of its context** — no key, no function label, no parent scale. Accepted: the reason
  to go there is to *hear* it, and the context is one click away in the tab bar.
