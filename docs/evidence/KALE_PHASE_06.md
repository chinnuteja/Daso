# Kale Phase 06 — bounded interpretation seam and honest manual authority

**Base:** `52ef73b` (Phase 5 child authority and atomic activation)

**Status:** bounded interpretation, grounding confirmation, and manual authority are implemented
and gated; not architecturally accepted. Live requests activate only after a server-only
`OPENROUTER_API_KEY` is present locally.

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
- The Draw button is connected to the existing teaching route. It calls the owner-approved
  OpenRouter host, pins `dots-studio/dots-3-note-preview:free` to `atlas-cloud/fp8`, disables
  provider fallbacks, requests structured JSON, and enables provider reasoning without returning
  it to the browser. Reasoning gets a server-only 2,048-token ceiling so the provider can emit its
  final JSON. The route discards `reasoning_details` and parses only the model’s JSON content
  through the closed `ModelIntent` schema.
- The interaction makes meaning visible before a review record exists: **You said**, **Kale
  thinks**, and why it matches. A child can review that suggestion, or ignore it and review their
  own settings instead. Editing a grounded preview returns ownership to the child instead of
  laundering the changed behavior through the model.

## Proofs

| Check | Result |
| --- | --- |
| Focused semantic grounding, client minimization, route validation and authority tests | 4 files, 15 tests passed |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 110 files, 323 tests passed before and after the production build |
| Production build | exit 0 — optimized Next build compiled and typechecked |
| Live synthetic provider check | HTTP 200: `repeat_selected_mark`, `even`, `smaller_toward_end` |

## Local activation

The approved endpoint is `https://openrouter.ai/api/v1/chat/completions`. Put the key in the
untracked local file `DASO/.env.local` as `OPENROUTER_API_KEY=…`; do not paste it into source,
browser fields, or chat. The app sends a request only when the child explicitly presses **Let Kale
read this**. It sends their typed sentence and bounded availability facts only. Once it returns,
`groundDrawInterpretation` runs locally, then the child must still edit/reject/approve.

No model approval or automatic save is possible in either state.

## Browser check

The local app was opened at `http://127.0.0.1:3012/draw`. The available controlled-browser
surface rendered the server HTML but did not hydrate React, leaving the initial storage-open action
pending and its buttons disabled. This is a limitation of that automation surface, not evidence of
an interactive pass. The interactive pointer/IndexedDB flow needs one normal-browser manual check
before acceptance.
