# Kale Phase 05 — child authority and atomic activation

**Base:** `35b6edfb37960e8bbc8c10e073a9d3249883b92c` (Phase 4 deterministic preview)

**Status:** implemented and gated; not architecturally accepted.

## What landed

- A generic local capability lifecycle store now holds v2 definitions, immutable Draw versions and
  append-only capability events. It is deliberately separate from Flight Lab's legacy compiler
  records: that avoids pretending that a vector-mark tool is a distance-ranking tool.
- The Draw review rail keeps the artifact visible while it says: **you drew**, **starting idea**,
  **your change**, and **only you can save it**. The Phase 5 starting idea is deterministic and
  visibly not a model response; real bounded language interpretation arrives in Phase 6.
- A child edit is a distinct event, not a mutation of the initial candidate. Rejection creates a
  permanent ineligible state for that candidate. No active behavior changes before save.
- Child approval re-reads current Draw state, verifies selection freshness, creates the immutable
  selected-mark snapshot, writes the child approval, writes the immutable Draw version and points
  the definition at it in one memory/IndexedDB transaction.
- Retry keys make duplicate saves return the original committed version. The write path rolls back
  fully if it fails after its first snapshot write. Capability records now also participate in the
  existing local graph-deletion transaction.
- A blocked local database still uses the explicitly non-durable fallback; the UI never calls the
  remote teaching route or a model during review/save.

## Proofs

| Check | Result |
| --- | --- |
| Draw authority unit tests | 4 passed: child-only authority, edit provenance, rejection, idempotency, rollback |
| Memory + IndexedDB conformance | 45 passed, including atomic capability activation |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 108 files, 317 tests passed |
| `npm run build` | compiled, typechecked and generated the current `.next/BUILD_ID` artifact |

## Honest limitations / next phase boundary

- Phase 5 uses a plainly labelled deterministic starting idea and a fixed child-intent sentence.
  It does **not** claim to understand child language. Phase 6 replaces only that narrow seam with
  a bounded, privacy-minimized interpretation request and grounding confirmation.
- The controlled browser harness still renders server HTML without React client hydration. It
  therefore cannot exercise the review buttons or pointer canvas, even though normal client code
  is bundled and the local-storage fallback is present. No browser interaction claim is made here.
- Pending/rejected drafts are durable event records, but Phase 7 will add the returning-user saved
  tool library/reuse surface. A saved tool is not yet usable on a new path in this phase.
