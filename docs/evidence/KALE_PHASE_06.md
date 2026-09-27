# Kale Phase 06 — bounded interpretation seam and honest manual authority

**Base:** `52ef73b` (Phase 5 child authority and atomic activation)

**Status:** local interpretation boundary and manual-authority experience implemented and gated;
not architecturally accepted. Live model connection is deliberately pending owner approval of the
configured provider destination.

## What landed

- The existing `/api/agents/teaching` route now accepts a second, explicitly versioned bounded
  request shape. It validates an output only as a closed `ModelIntent`: a Draw proposal, a Flight
  proposal, or one clarification question. It cannot carry approval, persistence, arbitrary tools,
  or a new capability kind.
- The route's Draw provider payload contains only `childWords`, a context digest, and one of two
  availability fact sets. For Draw that is precisely **selected mark available** and **guide path
  available**. The source drawing, pixels, vectors, selected-mark data, document IDs, path IDs,
  profile information, and ledger are never present in the outbound body.
- `groundDrawInterpretation` is a second, local meaning check. A schema-valid proposal must still
  agree with the child’s words. For example, “make it nicer” cannot become a repeat rule; a
  smaller-toward-end proposal requires words that support shrinking; and an unsupported capability
  kind is rejected.
- The Draw experience no longer fabricates a fixed child sentence or credits an AI for a local
  default. A child writes what the selected mark should do, sees the exact bounded settings that
  will be reviewed, and can change them before creating a `manual` / `child` candidate. The
  provenance rail displays their real words and says **You chose**, not **Kale suggested**.
- The existing model-backed client adapter is implemented and tested at the serialization boundary,
  but is intentionally not connected to the browser button yet. No child words are sent to an
  unverified provider host. The visible experience therefore says so plainly and remains fully
  usable without a model.

## Proofs

| Check | Result |
| --- | --- |
| Focused semantic grounding, client minimization, route validation and authority tests | 4 files, 14 tests passed |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 110 files, 322 tests passed |
| Production build | exit 0 — optimized Next build compiled and typechecked |

## Explicit boundary before live model use

The application already has an environment-configured route from earlier work, but this phase does
not assume that a URL supplied through `MODEL_PROVIDER_BASE_ADDRESS` is an approved processor for a
child’s words. Before wiring the browser action to that route, the product owner must approve the
provider destination and data-processing choice. Once approved, the click will use the existing
`requestDrawInterpretation` adapter, run `groundDrawInterpretation` locally, show the quote plus
bounded explanation, and still require the child to edit/reject/approve.

No model approval or automatic save is possible in either state.

## Browser check

The local app was opened at `http://127.0.0.1:3012/draw`. The available controlled-browser
surface rendered the server HTML but did not hydrate React, leaving the initial storage-open action
pending and its buttons disabled. This is a limitation of that automation surface, not evidence of
an interactive pass. The interactive pointer/IndexedDB flow needs one normal-browser manual check
before acceptance.
