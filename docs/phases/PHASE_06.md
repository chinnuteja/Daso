# Phase 6 — Keep & Reuse

**Implements:** Milestone 5 — turn the compiled Flight Lab into a persistent child-created
tile, execute it in a model-free Runner Mode, and prove that a second child can inherit Maya's
reasoning without gaining a write path into Maya's tool.
**Status:** Specified; not implemented.
**Dependencies:** P1–P5 architecturally accepted and green. P5 freezes compiler, active-version,
runtime-result, replay, and trial-capture contracts. P7 may proceed in parallel; P8 remains
blocked until P6 and P7 are accepted.

This file is an executable implementation contract. The normative authority remains
`TEACH_DASO_PRODUCT_AND_ARCHITECTURE.md`; `docs/ENGINEERING_PLAN.md` and
`docs/BUILD_STATE.md` record the accepted architecture and invariant state.

---

## A. Product Outcome

Phase 6 delivers the defining magical moment:

> A child teaches the computer something another child can use the next day.

The proof must be real, connected, and inspectable:

1. Maya finishes the accepted P5 journey and returns home.
2. A saved tile is loaded from IndexedDB, not inserted as fixture UI.
3. Opening it loads its active immutable version and evaluates stored trials with the pure P5
   runtime. Runner Mode reaches no teaching source, model route, or hidden generation.
4. A visible Day-2 path lets a second local child try Maya's tool.
5. Before the second child can save an observation, the application creates a separate,
   second-child-owned fork in one atomic commit.
6. The fork retains a structural reference to the exact source tool/version, carries a
   re-keyed provenance ledger, and compiles to the same behavior.
7. When the second child's plane touches an object, the inherited rule rejects that trial and
   the interface truthfully says that Maya taught the rule.
8. Maya's definition, versions, ledger, trials, grants, and summaries remain byte-identical.

The experience is not a gallery, marketplace, clone of Daso, or generic app generator. It is
one trusted host runtime executing one narrow child-authored tool kind.

---

## B. Audited Starting Point

The P5 baseline already provides:

- a real root-page tool list loaded with `tools.listByOwner`;
- a basic saved tile linking to `/run?tool=...`;
- a `/run` route that loads trials and an authorship explanation;
- immutable active versions and same-tool pointer enforcement;
- pure `replay(version, trials)` with metric-aware deterministic ranking;
- trial capture that resolves `currentVersionId` in the application layer;
- memory and IndexedDB repository implementations;
- static Runner import-graph precursors INV-38 and INV-43.

The current surface is not yet Milestone 5:

- the tile does not show real creator/observation/correction evidence;
- `/run` lists raw observations but never loads the active version or calls `replay`;
- Runner Mode cannot record a new observation;
- there is no second-child identity or reuse path;
- a naïve second-child write would append trials to Maya's tool;
- there is no atomic fork operation or durable lineage;
- INV-22 and INV-23 are still todo placeholders.

These are P6 correctness requirements, not polish work.

---

## C. Architecture Contract

### C.1 Frozen contracts

Phase 6 must preserve:

- exactly one tool kind, `experiment_comparator`;
- the ten-state teaching orchestrator and its frozen event/intent vocabulary;
- D-01 approval as a separate child-actor ledger entry;
- `ToolVersionBody === foldApprovedEvents(toolLedger)` for every stored tool version;
- immutable tool versions and historical trials;
- the P5 `RuntimeResult` shape and metric/ranking semantics;
- active-version resolution through repositories before capture or replay;
- seven repository families, with memory and IndexedDB conformance;
- exactly two permitted model-route paths and no model access from Runner Mode;
- local-first storage and no public sharing, feed, reward, or marketplace;
- injected clock/id ports and no randomness, wall clock, or browser I/O in `src/core`.

P6 may not amend INV-38 or INV-43 to make implementation easier. It must promote INV-22 and
INV-23 and keep the stricter precursor assertions green.

### C.2 Allowed ToolDefinition shape correction: explicit fork lineage

Add one optional strict object to `ToolDefinition`:

```ts
forkedFrom?: {
  toolId: ToolId;
  versionId: ToolVersionId;
  ownerChildId: ChildId;
}
```

Semantics:

- absent means the tool was created through the teaching journey;
- present means this tool is a fork of the named immutable source snapshot;
- `toolId` and `versionId` identify the immediate source snapshot;
- `ownerChildId` identifies the child whose authorship is inherited in this P6 one-generation
  reuse scenario;
- the target `ownerChildId` on the enclosing definition is always the second child;
- the target tool id must differ from `forkedFrom.toolId`;
- `forkedFrom.versionId` must belong to `forkedFrom.toolId` and be that definition's active
  version at fork commit time;
- the object is metadata only. Runtime behavior still comes exclusively from the target's
  compiled version and approved target ledger.

This is an allowed P6 shape correction, not a new capability or product-spec deviation. The
normative spec requires a second-child-owned fork while also showing that Maya taught the
inherited rule; the existing definition cannot persist both facts. The §9.2 fixture must
continue to parse unchanged, unknown keys must still fail, and non-fork definitions must
serialize exactly as before. Do not add lineage to `ToolVersion`, `ExperimentTrial`, or ledger
entries, and do not add a new persisted entity or object store.

P6 supports a single-generation demo fork. Fork-of-fork authorship and merging are explicitly
out of scope.

### C.3 Pure fork builder

Create `src/core/reuse/**` as pure domain code. It receives:

- the source `ToolDefinition`, its active `ToolVersion`, and its complete ordered ledger;
- a target tool id, target owner child id, target display name;
- one injected replacement event id for every source ledger entry;
- one injected target version id and one injected fork timestamp.

It returns a deeply frozen fork snapshot containing a target definition, target version, and
target ledger. It performs no repository, clock, id-factory, browser, network, or model access.

The builder must:

1. reject a missing/cross-tool/non-active source version;
2. prove the source active version body equals the fold of the source ledger before copying;
3. preserve ledger order, sequence, actor, event type, original input, candidate mutation,
   approval relationship, and timestamps;
4. replace every event id, target every entry at the new tool id, and remap each approval's
   `approves` reference to the corresponding replacement candidate id;
5. reject duplicate/missing replacement ids or any incomplete approval mapping;
6. compile the target version from the re-keyed target ledger with the existing compiler;
7. set the target definition's owner to the second child and its `forkedFrom` value to the
   exact source snapshot;
8. copy no trials, grants, summaries, id-counter records, or source definition/version object;
9. leave all caller inputs byte-identical and deeply immutable where already frozen.

The target version number is the fold-derived behavior version. A fork of Maya's v2 therefore
starts with one stored target snapshot whose `version` is `2`; do not lie by renumbering it to
1 and do not bypass R1 with a copied version body.

Tool-id allocation is deterministic application logic. Given a source id and the target
owner's existing tool ids, choose `${sourceToolId}-copy`, then `-copy-2`, `-copy-3`, and so on.
Do not add a random UUID, wall-clock suffix, or new `IdKind` merely for the slug.

### C.4 Atomic fork persistence

Extend `ToolVersionRepository` with one narrow atomic operation such as
`saveForkSnapshot(snapshot)`. This preserves seven repository families; do not introduce a
`ForkRepository`.

Memory and IndexedDB implementations must provide the same contract:

- read and validate the source definition and exact active source version;
- reject an existing target tool id, target version id, target event id, or non-empty target
  ledger;
- validate every target object with the frozen schemas;
- prove target definition/version/tool ids and active pointer agree;
- prove the target version body canonically equals `foldApprovedEvents(targetLedger)`;
- commit the target ledger, target immutable version, and target definition all-or-nothing;
- expose an injected test failure after at least one target record has been written;
- on any validation, constraint, collision, or injected failure, leave both source and target
  stores exactly as they were.

IndexedDB must use one read-write transaction spanning `ledgerEntries`, `toolVersions`, and
`tools`. Memory must snapshot and restore those same maps. The existing P5
`saveAndActivate(version, definition)` contract remains unchanged.

Idempotent application behavior is required. Before consuming ids or time, reuse an existing
target-owner tool whose `forkedFrom` exactly matches the requested source tool/version. A
double click must not create two forks. A concurrent collision may reject one transaction,
but it may never produce a partial fork.

### C.5 Runner application boundary

Extract or create small Runner-specific application services that compose repositories,
clock/id ports, the pure reuse builder, and P5 replay. No module reachable from
`src/app/run/page.tsx` may import:

- `src/adapters/agents/**` or `src/adapters/teaching/**`;
- `src/core/ports/teaching.ts`;
- teaching orchestrator events/transitions;
- `JourneyFlow` or `executeIntents`;
- a model SDK, model endpoint, credential, server route, or unrestricted `fetch`.

Do not import `executeIntents` into Runner Mode. Extract the already-correct active-version
trial-capture logic into a neutral application service that both the teaching flow and Runner
flow can call. It must still reject missing, dangling, or other-tool active versions before a
trial write and must stamp `toolVersionIdAtCapture` itself.

A Runner load must:

1. parse the requested tool and viewer child ids through core schemas;
2. load the definition, active version, viewer profile, source-author profile when lineage is
   present, target ledger, and target trials;
3. reject a missing/cross-tool version or a target ledger whose fold does not equal the active
   version body;
4. call real P5 `replay` and build a presentation view from that result;
5. expose structured loading, ready, empty, and integrity-error states rather than crashing or
   silently showing fixture content.

If the viewer does not own the requested source tool, capture remains disabled until the user
chooses **Make my copy**. That action atomically creates or reuses the viewer-owned fork and
then routes to the fork. A second-child trial is never saved under Maya's tool id.

### C.6 Saved tile contract

The root page must render real saved-tool view models loaded from IndexedDB. Each tile shows:

- the stored display name;
- creator name resolved from the owner profile;
- real observation count from the trial repository;
- real approved correction count from the ledger;
- a Runner Mode action;
- a visible Day-2 reuse action for the constrained second-child scenario.

Do not hardcode “9 observations · 2 corrections” when the stored demo currently contains a
different count. Empty state and loading state must be intentional. The teaching CTA remains;
there is no feed, streak, public profile, marketplace, or generic create-app action.

### C.7 Runner experience contract

Runner Mode must render real data from its active version and runtime result:

- tool title and owner/source attribution;
- immutable active version id;
- concise active metrics and rules;
- capture controls for design name, distance, and obstruction using the existing constrained
  Flight Lab vocabulary;
- current validity outcome for the newly captured trial;
- deterministic ranking/winner or an honest insufficient-evidence/empty state;
- the existing child-friendly “Why this tool does this” explanation;
- a visible statement such as “Runs from saved rules — no AI call in Runner Mode.”

For the Day-2 proof, the second child's obstructed trial must be evaluated by the inherited
`exclude_obstructed_flight` rule, stored only in the fork, and shown as not counted. The copy
must be assembled from structured lineage/profile/explanation data so the interface can say
that Maya taught the rule. Do not hardcode a sentence disconnected from the rule or provenance
objects.

Runner Mode contains no teaching chat, model toggle that merely changes decoration, generated
hint, or hidden inference. The proof that model access is off is executable: static import
graph plus an integration test where network/model seams throw if touched.

### C.8 Constrained Day-2 profile

P6 may add one clearly named local fixture/profile for the second-child demo, for example
`child_local_02` / `Leo`. It is a constrained product scenario, not production authentication.
Persist it through the existing profile repository, never through UI-only state, and identify
the active viewer explicitly in the Day-2 route/query state.

No child may impersonate the owner by changing a client-supplied display name. Ownership comes
from parsed stored profiles and definitions. Production account switching, sibling management,
remote sync, and authentication remain out of scope.

### C.9 Next.js implementation rule

Before changing an App Router page or query-parameter composition, read the relevant local
Next.js 16.3.1 documentation under `node_modules/next/dist/docs/`, as required by `AGENTS.md`.
Record the guide path consulted in the evidence packet. Do not copy older Next.js API patterns
from memory.

### C.10 File ownership

Phase 6 may create:

```text
src/core/reuse/**
src/ui/flows/runner/**
src/ui/components/SavedToolTile.tsx
src/ui/components/SavedToolTile.module.css
tests/unit/reuse/**
tests/integration/phase-06-keep-reuse.test.ts
tests/invariants/inv-65-saved-tile-grounding.test.ts
tests/invariants/inv-66-fork-provenance.test.ts
tests/invariants/inv-67-atomic-fork.test.ts
tests/invariants/inv-68-fork-idempotency.test.ts
tests/invariants/inv-69-runner-active-version.test.ts
tests/invariants/inv-70-day-two-rule.test.ts
tests/invariants/inv-71-phase-06-reload-proof.test.ts
tests/invariants/inv-72-runner-integrity-failure.test.ts
docs/evidence/PHASE_06.md
docs/evidence/assets/phase-06-saved-tile.png
docs/evidence/assets/phase-06-day-two-rule.png
```

Existing paths may be amended only for the listed purpose:

| Path | Allowed amendment |
|---|---|
| `src/core/schema/toolDefinition.ts` | Add optional strict `forkedFrom` lineage only. |
| `src/core/ports/repositories.ts` | Add the atomic fork-snapshot operation without adding a repository family. |
| `src/adapters/persistence/atomicCommit.ts` | Add a fork rollback test hook. |
| memory/IndexedDB version repositories | Implement the same atomic fork contract. |
| persistence conformance tests | Exercise successful fork and rollback against both implementations. |
| `src/ui/flows/executeIntents.ts` | Use neutral shared active-version trial capture; preserve teaching behavior. |
| `src/app/page.tsx`, `src/ui/screens/HomeScreen.tsx`, screen CSS | Render real saved tile evidence and Day-2 entry. |
| `src/app/run/page.tsx`, `src/ui/screens/RunnerScreen.tsx`, screen CSS | Compose real Runner load/capture/reuse states and result. |
| affected P1–P5 tests | Amend only to accept the declared optional lineage or neutral capture extraction; preserve durable assertions. |
| `docs/BUILD_STATE.md`, `docs/ENGINEERING_PLAN.md` | Record real decisions/results and current phase state. |

Any additional production path must be listed and justified in `docs/evidence/PHASE_06.md`.
A new dependency, repository family, object store, model path, orchestrator state/event/intent,
tool kind, or persisted schema field beyond C.2 requires owner review before implementation.

### C.11 Out of scope

Do not implement:

- Evidence Agent, parent-summary generation/grounding, export, coordinated delete UI, or data
  rights workflow (P7);
- founder-demo animation, recording mode, landing-page polish, PWA packaging, or visual flourish
  unrelated to the functional Day-2 proof (P8);
- teaching or editing inside Runner Mode;
- fork-of-fork lineage, merge, collaboration, public sharing, marketplace, or cross-device sync;
- cloned trials, grants, or summaries;
- a second tool kind, generic rule language, native APK, sensor inference, or model evaluation;
- mutations to Maya's source stream under any second-child path.

---

## D. Build Checklist and Verification Checkpoints

- [ ] **1. Lock the fork and Runner tests before production changes**
  Spec ref: `§3.5`, `§7.5–7.7`, `§12`, `§14`, `Milestone 5`; this phase C.1–C.4.
  What to build: Promote INV-22/23, add unit cases for re-keying/approval remapping, and add
  failing memory/IndexedDB conformance cases for atomic fork success and rollback.
  Acceptance: Tests fail for the intended missing behavior while every accepted P1–P5 test
  remains green.
  Verify: Run explicit INV-22/23/66/67 paths plus repository conformance tests.

- [ ] **2. Add the minimal lineage shape**
  Spec ref: `§9.2`, `§12 Threat: Another Child Alters Maya's Original Tool`; this phase C.2.
  What to build: Add only optional strict `forkedFrom` to ToolDefinition and focused schema
  tests for legacy fixture compatibility, unknown-key rejection, and invalid lineage.
  Acceptance: §9.2 JSON parses byte-for-byte unchanged; target owner and source owner/version
  can both be represented after reload.
  Verify: Run INV-06, INV-07, and new lineage unit tests.

- [ ] **3. Build the pure fork snapshot**
  Spec ref: `§4.1`, `§7.6`, `§10`, `§12`; this phase C.3.
  What to build: Implement pure ledger re-keying, approval remapping, deterministic target id
  selection, source-fold validation, and compilation of the target snapshot.
  Acceptance: Target fold equals target version body; source canonical bytes do not change;
  no target behavior lacks approved provenance.
  Verify: Run reuse unit tests plus INV-09/10/11/13/14/15/23/66.

- [ ] **4. Make fork persistence atomic twice**
  Spec ref: `§11.1`, `§12`; this phase C.4.
  What to build: Add `saveForkSnapshot` to the existing version repository and implement one
  transaction across the three stores in memory and IndexedDB.
  Acceptance: Success writes exactly one target graph; every injected/collision/validation
  failure writes nothing; source bytes are unchanged in both implementations.
  Verify: Run conformance, INV-23/67/68, and IndexedDB reopen cases.

- [ ] **5. Extract the neutral trial-capture seam**
  Spec ref: `§7.7`, `§9.5`, `§14`; P5 C.6; this phase C.5.
  What to build: Move active-version resolution and trial stamping into a Runner-safe neutral
  application service used by JourneyFlow composition and Runner composition.
  Acceptance: Existing journey behavior is unchanged; UI cannot supply a version id; Runner
  imports no teaching/orchestrator path.
  Verify: Run INV-38/39/43/45/63 and targeted neutral-capture tests.

- [ ] **6. Load and execute the real Runner read model**
  Spec ref: `§7.5–7.7`, `§14`; this phase C.5/C.7.
  What to build: Load definition/version/ledger/trials/profiles, validate integrity, call P5
  replay, and render loading/empty/ready/error states.
  Acceptance: Version id, validity, metrics, ranking, winner, and explanation all derive from
  repositories/runtime; missing/corrupt state produces no write and no fake result.
  Verify: Run INV-20/21/22/43/61/62/69/72 and Runner integration tests with fetch/model seams
  set to throw.

- [ ] **7. Ground the saved tile in local evidence**
  Spec ref: `§3.5`, `Scene 6`, `Milestone 5`; this phase C.6.
  What to build: Compose stored tool/profile/trial/ledger counts into the root tile and add the
  visible constrained Day-2 reuse action.
  Acceptance: Refresh shows the real tile and counts; no fixture-only “9/2” claim appears;
  empty/loading states are intentional.
  Verify: Run INV-27/35/64/65 and manually refresh the home route after the P5 journey.

- [ ] **8. Complete the second-child fork and capture path**
  Spec ref: `§3.5`, `Scene 7`, `§12`, `Milestone 5`; this phase C.4–C.8.
  What to build: Persist the constrained second profile, require Make my copy, create/reuse an
  owned fork, capture one obstructed trial in it, and replay.
  Acceptance: The trial belongs only to the fork, is rejected by the inherited rule, and the
  UI truthfully attributes that rule to Maya. Maya's entire graph remains canonical-byte
  identical.
  Verify: Run INV-22/23/66–71 and the full Day-2 integration test.

- [ ] **9. Prove reload and model-off operation visually**
  Spec ref: `§11.1`, `§14`, `Milestone 5 verification`; this phase C.5–C.7.
  What to build: Reopen IndexedDB, reopen both the saved source and fork, and capture evidence
  screenshots of the saved tile and inherited-rule outcome using real app state.
  Acceptance: Reload resolves both active versions and the fork lineage; the Runner proof
  completes while any network/model access throws.
  Verify: Run INV-22/23/71, production build, and inspect both evidence images at tablet size.

- [ ] **10. Produce the auditable Phase 6 handoff**
  Spec ref: `§19`, `Milestone 5`; this phase E.4–E.6.
  What to build: Fill `docs/evidence/PHASE_06.md`, update BUILD_STATE truthfully, and list every
  changed path/deviation/risk without self-accepting the architecture.
  Acceptance: Targeted tests and all four gates are recorded from the submitted commit; only
  INV-24/25 remain todo; no undeclared deviation exists.
  Verify: Run the commands in E.3 on the final tree and compare the evidence packet to actual
  terminal output and Git diff.

Do not skip forward after a failed checkpoint. Fix the earliest red invariant before UI or
evidence work continues.

---

## E. Acceptance Tests

### E.1 Existing pending invariants promoted

| ID | Assertion |
|---|---|
| INV-22 | The full Runner load/capture/replay path succeeds with network/model seams hard-disabled, and no transitive import from `/run` reaches teaching, agents, model routes, credentials, or teaching orchestration. |
| INV-23 | A second-child session creates/reuses a separate owned fork; after capture and reload, canonical bytes for Maya's definition, every version, complete ledger, trials, grants, and summaries are unchanged. |

Rename both files to remove `-pending`. The tests must assert; do not leave a todo under a new
name.

### E.2 New phase invariants

| ID | Assertion |
|---|---|
| INV-65 | Every saved tile field is grounded in stored definition/profile/trial/approved-ledger data; refresh reproduces it and fixture-only counts cannot appear. |
| INV-66 | A fork re-keys one complete ledger, remaps approvals, compiles from that target ledger, retains exact source lineage, copies no trials/grants/summaries, and leaves source inputs unchanged. |
| INV-67 | Atomic fork success/rollback passes against memory and IndexedDB; injected failure after a partial internal write leaves no target record and changes no source record. |
| INV-68 | Repeating reuse for the same target owner and exact source snapshot returns the existing fork before consuming ids/time or writing; collisions never produce a partial or second fork. |
| INV-69 | Runner resolves the stored active same-tool version, validates ledger/body integrity, and renders the exact P5 runtime result. Missing/cross-tool state is an error before capture. |
| INV-70 | In the Day-2 fork, an obstructed trial is stamped with the fork's active version, stored only under the fork id, evaluated invalid, and attributed through real lineage/provenance to Maya. |
| INV-71 | IndexedDB close/reopen retains the source tile, fork ownership/lineage/ledger/version/trial, and reproduces byte-identical replay while the source remains byte-identical. |
| INV-72 | Runner integrity failures produce a structured child-safe error, zero trial/fork writes, zero model/network calls, and no fixture ranking or attribution. |

All accepted P1–P5 invariants remain asserted. After P6, INV-24 and INV-25 are the only todo
invariants and remain owned by P7.

### E.3 Targeted and full gates

Run targeted tests throughout implementation, then all gates on the final submitted commit.
No gate may require internet or a live model.

```text
npx vitest run tests/invariants/inv-22-runner-mode.test.ts tests/invariants/inv-23-fork.test.ts tests/invariants/inv-65-saved-tile-grounding.test.ts tests/invariants/inv-66-fork-provenance.test.ts tests/invariants/inv-67-atomic-fork.test.ts tests/invariants/inv-68-fork-idempotency.test.ts tests/invariants/inv-69-runner-active-version.test.ts tests/invariants/inv-70-day-two-rule.test.ts tests/invariants/inv-71-phase-06-reload-proof.test.ts tests/invariants/inv-72-runner-integrity-failure.test.ts
npm run typecheck
npm run lint
npm test
npm run build
```

Also run the memory and IndexedDB repository conformance files explicitly if they are not in
the targeted command. The full suite, not only targeted P6 tests, is the acceptance gate.

### E.4 Required evidence packet

`docs/evidence/PHASE_06.md` must contain:

1. submitted branch name and full commit SHA;
2. exact output and exit status for targeted tests, typecheck, lint, full suite, and build;
3. a complete invariant table showing INV-22/23/65–72 asserted and only INV-24/25 todo;
4. canonical before/after source graph proving every Maya-owned stream is unchanged;
5. canonical fork definition, lineage, target ledger, target version, and target fold equality;
6. memory and IndexedDB atomic-failure snapshots before and after;
7. idempotent repeat-reuse proof with id/time/write counters;
8. model-off proof: Runner import graph plus integration output with network/model seams throwing;
9. IndexedDB close/reopen proof for source and fork;
10. actual Runner runtime JSON for the second-child obstructed trial;
11. screenshot of the real saved tile and screenshot of the Day-2 inherited-rule outcome;
12. the local Next.js 16 guide path consulted for route/query implementation;
13. actual changed file tree and explanations for every path outside C.10;
14. exact declaration `No undeclared deviations.` or a complete deviation request.

The screenshots must come from real `/` and `/run` executions backed by IndexedDB. Expected
text in a test or a hand-drawn mock is not visual evidence.

### E.5 Automatic rejection conditions

Reject Phase 6 even with green tests if any of the following is true:

- a second-child trial, event, version, grant, or summary is written to Maya's tool id;
- fork persistence uses separate externally visible writes or can leave a partial target;
- a target version body is copied directly instead of compiled from its target approved ledger;
- source event ids are reused, approvals point to source candidates, or provenance equality fails;
- any Maya-owned persisted record changes during the complete Day-2 session;
- a fork is owned by Maya, has no durable source snapshot, or cannot attribute the inherited
  rule after reload;
- trials, grants, or summaries are cloned into the fork;
- Runner imports teaching/orchestrator/agent paths or touches fetch/model/network/credentials;
- Runner displays fixture ranking, rule outcome, counts, creator, or attribution;
- capture accepts a UI-supplied version id or runs before an active same-tool version resolves;
- a fake offline toggle changes only UI decoration while model access remains in the path;
- schema fields beyond C.2, a repository family/store, dependency, model route, tool kind, or
  orchestrator vocabulary are added without owner review;
- an accepted invariant is skipped, deleted, weakened, or renamed without preserving its
  durable assertion;
- P7/P8 or out-of-scope product work is mixed into the phase;
- BUILD_STATE or evidence claims a result not present in the submitted commit;
- the implementation self-marks Phase 6 architecturally accepted or merges its own PR.

### E.6 Implementation-agent handoff

> Implement Phase 6 exactly from `docs/phases/PHASE_06.md` on the Phase 6 branch. First read
> `AGENTS.md`, the relevant local Next.js 16 docs, the normative product document, engineering
> plan, build state, orchestration loop, and Phases 1–5. Treat this phase file as an executable
> contract. Follow section D in order and stop if satisfying it requires any unlisted schema
> field, state/event/intent, repository family/store, dependency, model path, tool kind, or
> product deviation. Do not invent alternatives. Preserve P1–P5, promote INV-22/23, implement
> INV-65–72, run targeted tests and all four full gates, then produce
> `docs/evidence/PHASE_06.md` and a truthful proposed BUILD_STATE update. Return the full commit
> SHA, changed paths, exact gate output, deviations, and unresolved risks. Do not merge and do
> not self-approve Phase 6.
