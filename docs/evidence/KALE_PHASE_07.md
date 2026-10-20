# Kale Phase 07 — saved Draw tools run locally on a fresh path

**Base:** `f96bd8a` (Phase 6 bounded interpretation and child authority)

**Status:** implemented and gated; not independently architecturally accepted.

## What landed

- A child-approved Draw version is now useful after the original teaching session. `/draw/library`
  lists that child’s active `draw_pattern` definitions, resolves each immutable version and
  selected-mark snapshot, and lets the child choose one.
- The child draws a **new path** and presses **Use on this path**. The saved runtime applies the
  exact stored vector mark and saved controls locally. It accepts no language, agent, model,
  persistence, browser, or clock dependency.
- The page says what is protected in plain language: “Your original mark remains the source,”
  shows the immutable version and snapshot identity, and explicitly says “no AI call.” A fresh
  path is a temporary new use, not an edit to the saved capability.
- `buildDrawPreviewFromSource` is the small generic geometry seam used by both the teaching
  preview and the saved-tool runtime. It is not a second renderer or a Draw-specific model path.
- Browser testing found and fixed a real React synthetic-event defect in the fresh-path drag. The
  coordinate is now read before its queued state update, so a pointer drag cannot access a cleared
  event target.

## Proofs

| Check | Result |
| --- | --- |
| Saved runtime unit tests | deterministic reuse, immutable source/version preservation, mismatch rejection |
| `Kale INV-13` | saved runtime contains no model, network, persistence, browser, clock, or randomness seam |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 112 files, 326 tests passed before and after production build |
| `npm run build` | exit 0; `/draw/library` is present in the production route manifest |

## Controlled production-browser check

Using the production build at `http://127.0.0.1:3013`, the flow was exercised through the real
browser UI:

1. Opened **Practice dragon**, selected the child’s scale, and drew its path.
2. Used **Review my settings instead** (no model request), named and child-saved **My tail
   scales** as immutable version 1.
3. Reloaded `/draw/library`; the saved tile, version, and source-mark snapshot were present.
4. Drew a new path, pressed **Use on this path**, and observed **“Applied locally: 8 repeats from
   your original mark. Kale was not asked.”**

The temporary dev server at port 3012 did not hydrate under the controlled Chrome surface; the
production browser at port 3013 did hydrate and is the evidence surface for this phase.

## Deliberate boundary

This phase proves one Draw capability is reusable without AI. It does not yet broaden Flight Lab
or Bridge Bench to this v2 capability runtime. That is the next integration phase, and it should
share this small primitive rather than duplicate it.
