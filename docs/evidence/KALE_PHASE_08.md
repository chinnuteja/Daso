# Kale Phase 08 — Flight and Draw share a capability brain

Base: `6d457bb` (Phase 7 saved Draw reuse).

Status: implemented and locally verified; not independently architecturally accepted. No merge or deployment is claimed.

## Product result

`/draw` remains the child-artwork hero. `/flight` is the second vertical slice: a child selects a recorded observation, explains what it means, checks a bounded suggestion against a contrasting observation, previews the real consequence, and approves a lasting rule. It is not a chat transcript or a second custom compiler.

Flight starts with **six explicitly labelled practice observations**. Two obstructed Dart throws make Dart lead before the rule. The approved obstruction rule changes the winner to Falcon. A clear Falcon throw at the same 8.9 m distance stays counted. Before and after use the same persisted records and identities; no after-fixture replaces them. Later, new child-entered observations can change the winner again: the result is computed, not staged.

## The shared primitive

Both workbenches call `beginCapabilityReview` and the same `capabilities.commitApprovedCapability` repository port. Both use the same ordered ledger, latest-child-edit/rejection fold, immutable version envelope, context digest, active-version check, and atomic activation boundary.

- `child_intent` preserves the child's typed words and trusted-context digest.
- `capability_candidate` identifies a model suggestion versus an explicit manual child choice.
- A child edit remains a separate event. Rejected candidates cannot activate.
- `child_approval` is the only shared operation that can create the version and move the active pointer.
- The new shared API requires reviewed context for **both** kinds, in types and at runtime. Missing context is not a bypass.
- Memory rereads source records before an atomic snapshot write. IndexedDB rereads them in the activation transaction; crypto finishes before that transaction starts.
- Interrupted saves roll back all writes. Exact retry is idempotent; conflicting retry keys fail.

Draw-specific source geometry remains in Draw. Flight-specific observation facts remain in Flight. The two share authority and persistence, not an oversized generic renderer. Flight's restricted adapter targets the existing deterministic ranking runtime. The original child vector mark remains canonical in Draw.

The legacy `commitDrawApproval` entry point remains for existing P5 callers and fixtures; its historical no-context input shape is preserved. New Draw and Flight UI do **not** use it. There is no claim that old history has been retroactively enriched with context.

## Semantic grounding and model boundary

Flight permits only `exclude_obstructed_trial` or a clarification. The model cannot supply an arbitrary predicate, number filter, save command, capability kind, or approval.

Local checks run before and after interpretation. A proposed obstruction rule needs a stated exclusion reason and a selected observation whose recorded obstruction is true. The grounding card quotes a phrase from the child's actual sentence. Distance-only statements, denied collisions, requests *not* to exclude, clear observations, and unrecorded timing need clarification. Saving rechecks the selected record and same-distance clear counterexample from storage.

This is a conservative **bounded English proof**, not a general semantic theorem, multilingual tutor, or proof that a child's assertion is scientifically correct. Unknown facts stay unknown. The child explicitly checks the proposed behavior before saving; choosing the manual setting is attributed to the child, never fabricated as an AI suggestion.

The existing `/api/agents/teaching` route and approved OpenRouter model/provider remain the only interpretation path. Outbound data is the typed sentence plus minimized obstacle/setup/availability facts. Stored measurements, trial IDs, child IDs, drawing vectors and drawings are not sent. A child may themselves type a measurement into their sentence; that sentence is sent as disclosed. The key stays server-side and was not staged. A missing provider produces a real unavailable state, not a fabricated suggestion.

## Browser verification

Controlled Chrome production preview: `http://127.0.0.1:3013`.

1. Chose a prediction, entered words without selecting a throw, and received a useful selection error.
2. Selected obstructed Dart 8.9 m and typed `That throw shouldn't count because it hit the chair.` The real provider returned the bounded rule. The card quoted `hit the chair` and the recorded obstacle fact.
3. Preview showed **Dart → Falcon**, **6 → 4 counted throws**, and clear Falcon 8.9 m still counted. It was labelled not saved. Rejecting the preview returned to the unchanged baseline.
4. Distance-only words received a local clarification. Timing-after-landing received an unknown-timing clarification. Selecting a clear throw with obstacle words received a fact-conflict clarification. These did not approve anything.
5. Repeated the supported live-model flow, child-saved version 1, and reloaded. The immutable rule and distinct child/model/computed authorship were retained.
6. Recorded clear and obstructed new throws. One counted and the other did not, using the saved rule locally.
7. Temporarily started the same local production server with an empty `OPENROUTER_API_KEY`. Interpretation became unavailable; saved-rule reload and a new recorded throw still worked. This is **provider-disabled reuse**, not a claim of service-worker installation or cold-load offline caching.
8. Reopened the existing Draw source, reviewed manual settings, changed spacing, named and saved a new tool through the same shared port. The source drawing remained unchanged. Existing saved Draw tools remain available.
9. Verified desktop 1280×900, tablet 1024×1366 and mobile 390×844. No horizontal overflow was observed. Mobile has persistent work-area links instead of requiring a long search for the teaching panel. Excluded cards remain readable. Controls have focus styling and minimum touch targets. Reduced-motion CSS removes trial transitions; OS-level reduced-motion emulation and a complete accessibility audit are not claimed.

Screenshots:

- [Live-model before/after preview](assets/kale-phase-08-preview.jpg)
- [Tablet persisted rule](assets/kale-phase-08-tablet.jpg)
- [Mobile local reuse](assets/kale-phase-08-mobile.jpg)

## Automated verification

`tests/integration/kale-phase-08-shared-brain.test.ts` exercises memory, fresh IndexedDB, and a version-1 IndexedDB upgrade containing legacy Flight data. Existing tools, versions, ledger and observations survive unchanged. Both kinds exercise shared ordering, required context, child-only authority, idempotency and stale-source rejection. Other cases cover source-mark substitution, interrupted activation, same-input replay after reopening, zero fetch access, new observations resolving the stored active version, wrong model predicates, and semantic counterexamples.

Final command results are recorded after the final production build, without a concurrent build rewriting `.next`:

| Gate | Result |
| --- | --- |
| Targeted shared-brain + Draw-authority tests | 2 files, 26 passed |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0; `/flight`, Draw and all legacy routes present |
| `npm test` | 113 files, 348 passed |

Next emits a non-blocking warning about an outside-repository home-directory lockfile. No dependency or object store was added. No additional model route was introduced.

## Remaining scope

The in-visit prediction is deliberately labelled temporary; it is not stored as a learning outcome. The single Flight capability has no invented parameter controls: a child rejects it and edits their words or explicitly chooses the manual setting. Data remains local-device authority, not authenticated identity. The practice tool is reopened through `/flight`; the existing Draw library is still Draw-specific.

Phases 9–12 remain: unified parent evidence/data rights, unified product polish, hardening/accessibility, and deployment/founder handoff. Those are not silently counted as finished by this phase.
