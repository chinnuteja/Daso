# Phase 7 — Parent Evidence & Data Rights

**Implements:** Milestone 6 — evidence-grounded parent summary, supporting-event view, local
export, and real local deletion.

**Prerequisite:** Phase 6 is architecturally accepted on `main` at
`670fbb0a147295f3ccdac874d48a29dba2239223`. P7 begins from that exact baseline.

**Status:** Planned. This document is an implementation contract, not evidence that P7 exists.

---

## A. Outcome

A parent can open a saved Flight Lab and see an evidence-grounded account of Maya's thinking:
the question, a recorded observation, the rule she taught, how the rule changed a result, and
a real-world conversation prompt. The screen exposes the precise stored events supporting the
account without exposing raw recordings.

The parent can export the complete local graph for one tool and can delete either that tool or
the child's local profile. Deletion is a real, atomic store mutation; it is never a visual hide.
After a reload, the deleted records cannot be read from IndexedDB.

The load-bearing property is stricter than `ParentSummary`'s existing non-empty
`evidenceEventIds` field: no free-form model sentence can enter storage. The Evidence Agent
can choose and order records from a deliberately limited local projection; a pure renderer
turns those selected records into the parent-facing clauses. A candidate selection is rejected
unless every reference names an item in that exact projection. Therefore every displayed claim
has a concrete, stored reference, and a plausible invented claim cannot be persisted.

---

## B. Frozen contracts P7 must preserve

1. R1 remains absolute: a version body is the fold of approved ledger events. P7 never
   recompiles, edits, or reinterprets a `ToolVersion`.
2. R2 remains absolute: ledger history is append-only until a whole tool graph is deleted.
   P7 adds no event editing or summary-derived event.
3. R3 changes from one permitted model path to exactly two:
   `src/app/api/agents/teaching/route.ts` and
   `src/app/api/agents/evidence/route.ts`. No other source file may reference a model host,
   credential, SDK, or provider transport.
4. The Evidence Agent is not an author of child behaviour. It cannot create a rule, trial,
   version, approval, grant, or profile. It may only select items from a supplied evidence
   projection for a parent-facing summary.
5. `src/core/**` stays pure: no React, browser, fetch, repository, model, wall clock, random,
   or `Blob` access. The existing `Clock` and `IdFactory` are injected at the composition edge.
6. The P6 fork contract is frozen. `forkedFrom` can still be written only through
   `saveForkSnapshot`; P7 must not alter copied ledger entries, versions, or source data.
7. Runner Mode remains offline and model-free. P7 may make it resilient when a source profile
   is deleted, but it may not import an evidence/agent module or perform a fetch.
8. `ParentSummary` is the frozen §9.7 stored shape. Do not add `claims`, raw observations,
   model output, or a transcript to it. Claim selections are transient validated input; the
   stored summary remains `{ summaryId, childId, toolId, text, evidenceEventIds, createdAt }`.
9. No raw video, capture, audio, location, contact, transcript, new tool kind, public sharing,
   cross-device sync, or new package dependency belongs in P7.

---

## C. Build contract

### C.1 Evidence projection and deterministic grounding

Create a pure `src/core/evidence/` module. It is the single source of truth for the
evidence-projection, selection validation, and parent-clause rendering rules.

The projection is derived locally from exactly one existing tool graph:

- the `ToolDefinition` display name and owner id;
- the active `ToolVersion` identity and rule/metric facts needed to explain the current result;
- the stored `ExperimentTrial` facts needed for the observed example, including trial id,
  design, obstruction, validity under the active version, and no raw media;
- approved candidate and approval ledger facts needed to say what the child chose or taught.

Do not include the full ledger, arbitrary original-input history, profile data other than the
minimum display name needed by the local renderer, grants, summaries, or an unrelated tool's
data. The projection is a closed, strict schema with three typed reference variants:
`trial`, `candidate`, and `version`. Each has one `EvidenceReferenceId` and only the factual
fields its renderer needs. It is built from parsed domain objects, sorted canonically by
identifier, and contains no duplicate reference id.

The response shape accepted from an Evidence Source is also closed and intentionally tiny:

```ts
type EvidenceSelection = {
  readonly evidenceEventIds: readonly EvidenceReferenceId[];
};
```

It has 2–5 unique ids. It contains no free text, claimed facts, summary body, tool mutation,
approval, or storage instruction. A selection is accepted only when all ids appear in the
one local projection built for the request and the required Flight Lab story is present:

1. one recorded observation (`trial_004` in the scripted fixture);
2. one child-approved rule correction (`event_014` in the scripted fixture); and
3. the active version that contains that correction (`tool_version_002` in the scripted
   fixture); and
4. one approved definition decision that grounds the question (`event_001` in the scripted
   fixture).

The pure renderer takes only the validated selection and projection and produces all factual
clauses. Its Flight Lab output must state, in child/parent-readable words:

- the question Maya chose to investigate, grounded in her approved definition decision;
- the obstructed observed throw;
- the child-taught exclusion rule; and
- that the active version now treats the obstructed Dart trial as not counted.

The suggested conversation is a deterministic, non-factual prompt such as “Ask Maya what made
that throw unfair.” It needs no additional data claim and must not pretend a notification was
sent. Parent Summary delivery remains honestly disclosed as simulated under R7.

**Prediction truthfulness:** P3 persists only the transition `prediction_recorded`; it does not
persist which design Maya predicted or any wording of that prediction. P7 must not manufacture
a prediction in a parent summary, export, or screenshot. It shows the stored question and the
conversation prompt instead. Record this as proposed product-spec deviation **D-02** in the
evidence packet and `BUILD_STATE`: Scene 8's prediction bullet is not demonstrable from the
frozen local data model. Do not "fix" it by adding an ungrounded field or event in P7.

`buildParentSummary` creates the frozen `ParentSummary` only after validation, consumes an
injected `IdFactory` (`summary`) and `Clock`, canonicalizes the reference order, and parses the
result through `ParentSummary`. Repeating the same projection, selection, ids, and clock must
produce byte-identical output. A selector cannot directly call `summaries.save`.

### C.2 Evidence port, adapter, and second permitted route

Add `src/core/ports/evidence.ts`:

```ts
interface EvidenceSource {
  select(request: EvidenceRequest): Promise<EvidenceSelection>;
}
```

`EvidenceRequest` contains only the strict local projection from C.1. It has no ledger,
trials array, `ChildProfile`, raw capture, prior chat, permission grant, or unrelated tool
data. The request schema rejects extra keys.

Add `src/app/api/agents/evidence/route.ts`, R3's second and final permitted model route. It
mirrors the teaching-route safety shape:

- parse the minimal `EvidenceRequest` before calling its injected/provider transport;
- validate the raw response against `EvidenceSelection` server-side;
- return `{ ok: false, reasons: ['invalid_request' | 'invalid_selection'] }` for malformed
  inputs/outputs; never pass raw model output through;
- read the existing server-only provider variables only in this file; do not add a provider,
  dependency, client credential, or `NEXT_PUBLIC_` variable;
- export the pure testable interpreter helper and stub its transport in tests.

Add `src/adapters/agents/evidence.ts` as the typed HTTP client implementing `EvidenceSource`.
It sends the projection to only `/api/agents/evidence` and parses the returned closed selection.

Add a deterministic local `EvidenceSource` composition for the demo and tests. It selects the
same facts from the supplied projection; it is not fixture prose and it does not fabricate an
event. The parent flow must work with network/model access disabled. The optional remote source
is composed only at the parent-evidence boundary, never in Journey or Runner Mode.

Amend INV-01 and INV-48, rather than weakening them: both permitted route files must exist,
and every model/credential/host reference outside those two paths must still fail. Amend the
client-bundle scan allowance only if its existing test requires the second route to be named;
the actual built client must still contain neither a credential nor model host.

### C.3 Parent evidence flow and screen

Create `src/ui/flows/parentEvidence/` and a client `/parent?tool=<ToolId>` route using the
existing `TabletShell`. Add an explicit “Parent evidence” action for an owner tile on Home; the
route must also handle a pasted/invalid/missing tool id safely.

Loading is read-only and follows this order:

1. parse `tool`, load definition, owner profile, active version, ledger, trials, and latest
   stored summary for that exact tool;
2. fail closed with a parent-safe integrity message if the definition/version/ledger cannot
   satisfy R1, the owner is missing, or the selected summary belongs to another child/tool;
3. build the C.1 projection locally; if no valid saved summary exists, request a selection from
   the composed Evidence Source, validate it locally, render and save exactly one summary using
   persisted id counters and the browser clock;
4. if an existing summary exists, revalidate every cited id against the current graph before
   rendering it. Do not silently render a stale or dangling summary.

The parent screen must show, without raw JSON by default:

- heading: “What Maya taught Flight Lab” (using stored display names, never hardcoded fixture
  labels);
- the grounded summary clauses plus a clearly marked suggested conversation;
- a “Why this is supported” list with friendly labels and the concrete ids, including
  `trial_004`, `event_014`, and `tool_version_002` in the scripted demo;
- “Stored on this tablet” language and the existing honest disclosure that delivery to a parent
  is not implemented; and
- Data controls: View stored data, Export this tool, Delete this tool, and Delete Maya's local
  profile.

“View stored data” may use a compact, parent-readable count/list view of the exact local graph.
It must not introduce a second inspection data model or display raw capture. The diagnostic
`/inspect` page is not the parent screen and must not be made the product UI.

### C.4 Canonical local export

Add a pure `src/core/dataRights/exportTool.ts` builder. Given one parsed existing tool graph,
it returns a strict, versioned local export shape:

```json
{
  "format": "teach-daso/tool-export-v1",
  "tool": "…ToolDefinition…",
  "versions": ["…all ToolVersion records for tool…"],
  "ledger": ["…all LedgerEntry records for tool…"],
  "trials": ["…all ExperimentTrial records for tool…"],
  "grants": ["…all PermissionGrant records for tool…"],
  "summaries": ["…all ParentSummary records for tool…"]
}
```

Arrays are canonical by their identifier/ledger sequence. The builder validates that each
record belongs to the named tool and that the active definition/version and ledger fold pass
R1. It does not include the profile, unrelated tools, id-counter metadata, browser state,
provider output, credentials, or raw media.

The UI serializes this shape with existing `canonicalJson`, creates a browser download only
after user action, and names it from the tool id. Browser `Blob`/object URL code stays in
`src/ui/**`; it must revoke the object URL and never enter `src/core/**`. The parent screen
states exactly what is exported and that it is local data.

### C.5 Atomic tool and profile deletion

P7 introduces coordinated **operations**, not a new persistence family or object store.
Keep existing per-stream `deleteByTool` methods for low-level conformance only; no product UI
may compose them. Add these explicit all-or-nothing methods to existing repository families:

```ts
repositories.tools.deleteToolGraph(toolId)
repositories.profiles.deleteProfileGraph(childId)
```

`deleteToolGraph` removes, in one memory snapshot / one IndexedDB read-write transaction:

- the `ToolDefinition`;
- every `ToolVersion` for the tool;
- every `LedgerEntry` (candidate and approval provenance) for the tool;
- every `ExperimentTrial` for the tool;
- every `PermissionGrant` for the tool; and
- every `ParentSummary` for the tool.

It is idempotent: deleting a missing graph succeeds without writing a partial substitute.
It never deletes the owner profile by itself. On injected failure, the complete pre-delete
graph remains readable. The IndexedDB transaction includes every affected existing store;
there is no observable sequence of separate deletes.

`deleteProfileGraph` finds all tools owned by that child and atomically deletes each complete
owned graph plus the profile record in one memory snapshot / one IndexedDB transaction. It is
also idempotent and failure-atomic. It never deletes a tool owned by another child.

**Fork / source-deletion rule:** a P6 fork is independently owned and has its own re-keyed
ledger, version, and trials. Deleting Maya's source tool or profile does **not** delete Leo's
copy. The local source definition/profile can therefore be absent while a fork's `forkedFrom`
is historical provenance. Update Runner loading/rendering so this is a valid, safe state:

- a fork whose source profile is present still credits Maya exactly as P6 does;
- a fork whose source profile has been deleted still runs from its own version and ledger,
  but says “Inherited from a profile that was deleted” rather than revealing/guessing a name;
- no source tool, profile, ledger, version, trial, or summary is read as a fallback;
- the normal P6 source-present Day-2 proof remains unchanged.

This is the explicit answer to §11.4's “what remains”: deletion removes the selected local
tool/profile graph. Another child's independently made copy remains, with its own copied
history and an anonymous historical-lineage marker. The confirmation surface must say this
before deletion; no deletion is triggered by navigation or a single accidental click.

### C.6 Confirmation, completion, and reload UX

Use a two-step, parent-facing confirmation for each destructive action: choose the action,
then explicitly confirm the named tool/profile. While a delete is pending, disable duplicate
controls. On success:

- a tool deletion returns to Home, removes its saved tile, and states that its rules,
  observations, provenance, versions, grants, and parent summaries were removed locally;
- a profile deletion returns to Home, removes all of that child's owned tiles and profile,
  and explains the independent-copy rule above;
- a failure retains the original screen and data, gives a plain failure message, and never
  claims success.

Hard refresh after successful deletion must show the same empty/missing state. The UI may not
retain an in-memory copy as an apparent result after storage deletion.

### C.7 Out of scope

Do not implement push/SMS/email delivery, parental accounts, sign-in, cloud backup, cloud
deletion, access control, analytics, notifications, new model providers, raw-media export,
tool editing, a second tool kind, public sharing, collaboration, fork-of-fork, or P8 visual
polish/demo recording. Do not change the child teaching state machine, compiler, runtime,
rule vocabulary, version wire shape, or P6 atomic fork path.

---

## D. Required tests

Promote the two pending files by renaming them to remove `-pending`; no `todo` may remain for
INV-24 or INV-25.

| ID | Required assertion |
|---|---|
| INV-24 | A summary is created only from a valid local projection; every rendered factual clause has an id in its validated selection; `event_001`, `trial_004`, `event_014`, and `tool_version_002` ground the scripted Flight Lab result. Reject a selection containing a fabricated id, an id from another tool, a duplicate id, too few/missing required evidence types, or a free-text/extra-key model response. No summary is saved on rejection. |
| INV-25 | `deleteToolGraph` removes definition, all versions, trials, ledger entries/provenance, grants, and summaries; `deleteProfileGraph` removes its profile and every complete owned graph. Verify memory and IndexedDB, then close/reopen IndexedDB and prove all six tool streams are empty. |
| INV-73 | R3 now permits exactly the teaching and evidence routes. Static scan fails for a model host/credential/SDK elsewhere; the Evidence request and its outbound body contain only the strict projection and no raw ledger, profile, transcript, raw capture, grant, or unrelated tool identifier. |
| INV-74 | The evidence route rejects malformed request/selection output server-side. The typed client rejects a bad route payload. A model transport is stubbed; no live network is needed. |
| INV-75 | The pure export builder produces canonical, complete, tool-scoped JSON. It rejects a dangling active version, wrong-tool record, broken ledger fold, or foreign record. It contains no profile, meta/id counters, credential, raw media, or unrelated graph. |
| INV-76 | Tool and profile delete are failure-atomic and idempotent in memory and IndexedDB. Inject a failure after one scheduled store mutation; canonical bytes of every preexisting record remain unchanged. Successful retry removes the full intended graph only. |
| INV-77 | Deleting Maya's source profile leaves Leo's independently owned fork intact after reload. Runner reaches `ready`, uses only Leo's ledger/version/trials, and renders anonymous deleted-source lineage; no source record is read or shown. The existing source-present P6 test remains passing. |
| INV-78 | The parent page is grounded in stored data rather than fixture copy: a real scripted journey generates/persists a summary, renders its supporting ids and rule/result relationship, exports the same graph, deletes it through the confirmation flow, and renders no stale data after reload. |
| INV-79 | Runner's static import closure still reaches neither teaching nor evidence adapter/client/route, and a model-disabled Day-2 run passes unchanged. |

Keep every prior invariant asserted. Amend only INV-01, INV-48, INV-52 if necessary for the
second permitted server route, and INV-38 only if its exact source-count wording must name the
new parent-only evidence source. Record every amendment in `docs/evidence/PHASE_07.md`; no
test may be weakened.

Add focused unit tests for `core/evidence/**`, `core/dataRights/**`, route adapter tests, and
an integration test for generate → save → export → delete → IndexedDB reopen. Extend
repository conformance for both atomic methods in memory and IndexedDB.

---

## E. Gate and evidence contract

### E.1 Required commands

Run serially—never concurrently with `npm run build`, because the existing client-chunk scan
may observe a transient `.next` rewrite:

```text
npx vitest run tests/invariants/inv-01-model-roles.test.ts tests/invariants/inv-24-summary-grounding.test.ts tests/invariants/inv-25-deletion.test.ts tests/invariants/inv-48-single-model-path.test.ts tests/invariants/inv-52-no-client-credential.test.ts tests/invariants/inv-73-evidence-projection.test.ts tests/invariants/inv-74-evidence-route.test.ts tests/invariants/inv-75-export.test.ts tests/invariants/inv-76-atomic-delete.test.ts tests/invariants/inv-77-orphaned-fork.test.ts tests/invariants/inv-78-parent-evidence-flow.test.ts tests/invariants/inv-79-runner-no-evidence.test.ts
npm run typecheck
npm run lint
npm test
npm run build
npm test
```

The second full suite is mandatory and is the acceptance result; it proves the built client
scan sees a settled `.next` tree. Record exact test counts and exit codes.

### E.2 Evidence packet

Create `docs/evidence/PHASE_07.md` with:

1. submitted commit, base commit, branch, and exact changed-file list;
2. all gate output, including the final serial full-suite count;
3. an evidence-projection table: each allowed reference, its source record, exposed facts,
   rendered clause, and why no raw recording/foreign data appears;
4. rejection matrix for fabricated/foreign/duplicate/free-text/missing selection cases;
5. canonical export excerpt/sha and the graph-membership table;
6. atomic deletion failure matrix for memory and IndexedDB, plus reopen proof;
7. source-deletion/fork-survival proof distinguishing “deleted source profile” from “missing
   fork data”; and
8. any deviation or extra path, with justification.

Provide two real browser screenshots (not expected text or mocked components):

- `phase-07-parent-evidence.png`: a real `/parent` Flight Lab run showing the grounded summary,
  supporting `trial_004` / `event_014` / `tool_version_002`, the conversation prompt, and the
  local-delivery disclosure;
- `phase-07-deletion-proof.png`: the post-confirmation real Home/parent state after reload,
  showing the deleted tool absent and the clear “what remains” explanation. If showing Leo's
  copy, it must use the anonymous deleted-source wording.

State browser and viewport. Evidence tooling may be added under `docs/evidence/assets/` only;
it is not a production dependency.

### E.3 Automatic rejection conditions

Reject P7 even with green commands if any of these is true:

- a model creates free-text summary claims, a summary can be saved without local selection
  validation, or a fabricated/foreign reference is rendered or stored;
- an Evidence request contains raw ledger/trials/profile/transcript/media or another tool's data;
- a model host, credential, provider SDK, or route is reachable outside R3's two named files;
- ParentSummary, ToolVersion, candidate vocabulary, rule vocabulary, or orchestrator states are
  widened for this phase;
- the export omits a tool-owned persisted stream, includes unrelated/private data, or is not
  canonical;
- the product UI performs separate stream deletes, deletion is cosmetic, a failure leaves a
  partial graph, or IndexedDB reload resurrects a deleted record;
- deleting Maya deletes Leo's independent fork, or a surviving fork displays Maya's identity
  after her profile is deleted;
- Runner Mode imports/reaches evidence or model code, or P6's source-present Day-2 behaviour
  regresses;
- a screenshot is fixture text rather than a real persisted browser run;
- any prior invariant is skipped, weakened, or silently amended; or
- `docs/BUILD_STATE.md` claims P7 is accepted before independent architectural review.

---

## F. Cursor implementation sequence

1. Add pure evidence schemas/projection/validator/renderer and unit tests first. Promote
   INV-24 before adding UI or a model route.
2. Add the Evidence port, route, client, deterministic local source, and R3/static tests.
3. Build the parent flow and prove persistence/rehydration with a real scripted graph.
4. Add canonical export builder and browser download surface with tests.
5. Add the two atomic deletion operations to memory and IndexedDB, including injected-failure
   tests and the P6 orphaned-source Runner adjustment.
6. Add confirmation/reload UI proof, run all gates serially, create the evidence packet, commit,
   and push. Do **not** merge or claim architectural acceptance.
