# Kale Phase 01 — shared capability foundation

**Branch:** `orchestration/kale-00-baseline` (Phase 1 work in progress)

**Status:** implementation complete; gates green; no Draw UI has been claimed or added.

## What this phase establishes

The product now has a small shared language for the two planned slices:

`child work + child words → bounded proposal → local grounding → child approval → deterministic capability`

Phase 1 adds only the contracts and local storage needed to make that lifecycle real later. It does not
pretend a model understands a whole drawing, alter Flight Lab behaviour, or add a fake demo screen.

- `draw_pattern` supports only repeat of the **child-selected** vector mark, with bounded spacing and
  size-profile choices.
- `flight_validity` supports only `exclude_obstructed_trial`.
- `ModelIntent` accepts a bounded proposal or a bounded clarification. It cannot represent approval,
  saving, arbitrary code, an image-generation request, or an invented capability kind.
- A `TeachingRequestV2` contains child words, a SHA-256 digest of trusted local context, and a small
  model-safe projection. It never contains document identifiers, raw strokes, or bitmap data.
- `checkIntentGrounding()` is an explicit local semantic guard: an otherwise valid Flight exclusion is
  rejected when the selected trial is not obstructed.

## Source preservation and migration

- A `DrawDocument` is the mutable child-authored vector workspace.
- A `MarkSnapshot` is an immutable copy of the exact selected stroke(s), tied to source document revision
  and digest. A later edit to the drawing cannot silently change a saved capability's source.
- IndexedDB moved from v1 to v2 additively. `drawDocuments` and `markSnapshots` are new stores; no legacy
  tool, version, ledger, trial, grant, summary, or profile record is rewritten.
- The persistence boundary gains one cohesive `drawAssets` repository family rather than generic blobs or
  separate repositories for each Draw gesture. Tool/profile graph deletion also removes associated mark
  snapshots and child-owned draw documents.

## Explicit deferrals

The legacy `ToolVersion`, legacy compiler/runtime and legacy ledger remain untouched. Their migration into
the shared capability execution path belongs to the atomic-commit phase, where it can be proven without a
dual-write window. There is no Phase 1 model endpoint, preview renderer, canvas, or approval UI.

## Proofs

| Check | Result |
| --- | --- |
| Bounded context/intent unit suite | 4 passed |
| Additive v1→v2 IndexedDB migration proof | passed |
| Memory and IndexedDB repository conformance | passed, including immutable source snapshot |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 104 files, 303 tests passed |
| `npm run build` | exit 0; all legacy routes preserved |

## Browser regression

The in-app browser opened `http://127.0.0.1:3012/` after the v2 upgrade. The existing Kale Memory Lab home
surface rendered with its navigation and experience controls; the screenshot was inspected live. This is a
regression render only: Phase 1 intentionally contains no new interaction surface. The local tab is kept
open for the next phase.

## Exit decision

Phase 2 can implement the Draw canvas and direct-manipulation source selection on this foundation. It must
keep the model projection bounded and use `MarkSnapshot`, not a regenerated or beautified image, as the
canonical source mark.
