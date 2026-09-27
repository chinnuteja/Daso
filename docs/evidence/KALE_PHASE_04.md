# Kale Phase 04 — deterministic Draw preview

**Base:** `0ddb971` (Phase 3: exact mark and directed path)

**Status:** implemented and gated; not architecturally accepted.

## What landed

- `buildDeterministicDrawPreview` is a pure local geometry runtime. It takes only the current
  child-selected source stroke(s), the child-directed ordered guide path, and four direct controls:
  spacing, first size, last size, and whether marks turn with the path.
- The default makes repeats get smaller from start to end. The child can adjust every control in the
  workbench and immediately see the result in a separate SVG derived-preview layer.
- The original source vectors are neither changed nor copied into a saved tool. The workbench states
  this plainly: **temporary local preview**; it has not become a tool.
- Missing/stale selections, missing paths, overly dense repeats, and excessive derived geometry reject
  with specific recoverable messages. Limits are 80 stamps and 32,768 derived points.
- Draw startup now falls back to an explicitly non-durable in-memory desk if local IndexedDB is absent,
  blocked, or has not opened within two seconds. The child is never left on a permanently disabled start
  screen merely because local storage is unavailable.

## Proofs

| Check | Result |
| --- | --- |
| Deterministic preview + purity proofs | 2 files, 4 tests passed |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 107 files, 311 tests passed |
| `npm run build` | compiled, typechecked, and generated the current `.next/BUILD_ID` artifact |

The focused tests prove repeated calls produce the same output, the final mark is smaller, only the
selected source stroke is reused, the input document is unchanged, and `preview.ts` imports no model,
persistence, browser, clock, or randomness seam.

## Browser limitation

The controlled browser environment renders the Draw route but does not run React client effects. It keeps
the initial buttons disabled even after the resilience fallback was added, without a client console error.
That means it cannot honestly certify pointer drawing or control adjustments. A normal-browser human pass
must verify: practice dragon → select a scale → draw a path → preview → alter every control → hide preview
→ refresh. Do not treat the browser shell screenshot as an interaction proof.

## Deliberate deferrals

There is still no wording-to-intent model call, semantic grounding confirmation, child approval, immutable
capability, or saved/offline reuse. Phase 4 is a proof of deterministic visual derivation only.
