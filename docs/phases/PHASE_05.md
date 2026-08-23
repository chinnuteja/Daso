# Phase 5 — Compiler & Deterministic Runtime

**Implements:** Milestone 4 — compile approved authorship into immutable tool versions, execute
the Flight Lab rule vocabulary without a model, and replay existing trials under a corrected
version so validity and ranking visibly change.
**Status:** Specified; not implemented.
**Dependencies:** P1–P4 implemented and green. P6 and P7 remain blocked until this phase freezes
the compiler, runtime-result, and active-version contracts.
**Primary exit proof:** the same stored trials rank Dart first under v1; after the child approves
the obstruction correction and v2 is compiled, the obstructed Dart trial becomes invalid and
Falcon ranks first. The replay performs no model call and changes no stored observation.

---

## C. Phase 5 Specification

### C.1 Purpose

This is the phase where Teach Daso stops being a guided form and becomes the product thesis:
a child-authored, inspectable method turns into a reusable deterministic tool. The compiler
may only express behavior justified by approved ledger events. The runtime may only interpret
the closed data vocabulary already frozen in P1. Neither component may guess, call a model,
execute generated code, or rewrite history.

The magical moment is not a decorative winner card. It is a proof the child can inspect:
their original tool produced one answer; their approved correction produced a new immutable
version; the same evidence then produced a different, explainable answer.

### C.2 Audited starting point and required foundation corrections

The audit found strong foundations: approved-event folding already produces the canonical
`ToolVersionBody`; approval is a separate child-authored event; the ten-state orchestrator is
pure; repositories have memory and IndexedDB implementations; four stored trials already form
the required v1/v2 replay fixture.

It also found two integration gaps that become correctness bugs the moment P5 writes versions.
They are part of P5, not optional cleanup:

1. **Version activation is not atomic.** `ToolVersionRepository.save` and
   `ToolDefinitionRepository.save` are separate operations. Saving an immutable version and
   then updating `currentVersionId` can leave a definition pointing at a missing version after
   interruption. P5 must introduce one repository-level atomic compilation commit spanning
   `toolVersions` and `tools` in both persistence implementations. Do not add an eighth
   repository: extend the version repository with a narrowly named operation such as
   `saveAndActivate(version, definition)`.
2. **The journey persists a dangling placeholder.** `JourneyFlow` currently seeds a
   `ToolDefinition` whose `currentVersionId` is `tool_version_001` before that version exists,
   and callers stamp trials with the same placeholder. P5 must remove that seed. Journey
   initialization stores the profile only; the first real compilation atomically creates the
   tool definition and v1. Trial capture resolves the active version through repositories,
   never from a UI-supplied version id.

Both corrections touch earlier-phase paths. They require BUILD_STATE decision-log entries and
tests that preserve the durable intent of the original invariants.

### C.3 Frozen contracts

Phase 5 must not widen any of these contracts:

- exactly one tool kind: `experiment_comparator`;
- exactly ten orchestrator states and the existing event vocabulary;
- the P1 `ToolVersion`, rule, input, metric, trial, event, and provenance schemas;
- D-01 approval semantics: a separate child-actor approval event;
- seven repository families and local-first persistence;
- exactly two permitted model roles and route paths; P5 creates or calls neither;
- no arbitrary code, expression interpreter, dynamic import, locale-sensitive ordering, wall
  clock, or randomness in `src/core`;
- existing ledger entries and experiment observations are append-only historical facts.

The only allowed state-table amendment is listed in C.6: `inputs_confirmed` may add the
existing `request_compile` intent. It may not introduce a new state, event, or intent kind.

### C.4 Pure compiler contract

Create a compiler in `src/core/compiler/**` with these semantics:

1. Input is the ordered ledger plus explicit compilation metadata supplied by the application
   layer (`versionId`, `compiledAt`). The core compiler reads no clock, id factory, repository,
   browser API, or network.
2. It folds only approved authorship events using the existing P1 fold. The version body is the
   fold result, not a second mapping that can drift from provenance.
3. Every material field's `sourceEventId` is therefore present and equal to the approved event
   that introduced it. Existing provenance invariants remain green.
4. The returned `ToolVersion` is schema-valid and deeply frozen. No later compilation may
   alter v1 or any nested value inside it.
5. Canonical equality is the existing canonical JSON primitive. Do not add content hashing.
6. Idempotency is decided before requesting a new id or time: if the canonical folded body is
   equal to the active saved version body, return that version and perform no write. Repeated
   compilation of an unchanged ledger consumes no id and creates no extra version.

The pure compiler does not save or activate anything. Application code owns that transaction.

### C.5 Atomic compilation application contract

The application path handling `request_compile` must:

1. load the approved ledger and the current tool definition/version, if any;
2. fold the candidate body and perform the idempotency comparison before consuming clock/id;
3. allocate injected `tool_version_###` and `compiledAt` only for a genuinely new body;
4. compile and validate the immutable version;
5. build either the first `ToolDefinition` or an updated copy whose `currentVersionId` is the
   new version, preserving owner, name, kind, and original `createdAt` on updates;
6. commit the version and definition in one memory or IndexedDB transaction;
7. return the committed version and current replay result to the UI.

The IndexedDB implementation must use a single read-write transaction over both stores. A
duplicate version, validation error, injected transaction failure, or constraint failure must
leave the prior active pointer unchanged. The memory implementation must provide equivalent
all-or-nothing behavior so repository conformance tests exercise the same contract twice.

A committed `ToolDefinition.currentVersionId` must always resolve to a stored `ToolVersion`
for the same tool. No placeholder id may remain in `src/ui/**` or the live application flow.

### C.6 Compilation points in the existing journey

Two moments compile:

- On `DEFINE_INPUTS + inputs_confirmed`, retain the existing transition to `PREDICT` and add
  the existing `request_compile` intent. This creates v1 before the first trial is captured.
- On `REVIEW_MUTATION + candidate_approved`, retain the existing transition and compile the
  approved correction into v2.

This is an explicit amendment to the P3-owned transition table and scripted-journey test. Add
a BUILD_STATE decision explaining that the state/event vocabulary and deterministic table are
unchanged; only the already-frozen compile side-effect intent is emitted at the first point
where a runnable version can exist. The orchestrator still performs no I/O and never creates a
version itself.

Trial capture must accept child-entered observation data and tool identity, then look up the
definition and active version in the application layer. The UI must not provide
`toolVersionIdAtCapture`. Reject capture if the tool or active version does not resolve. Once
stored, `toolVersionIdAtCapture`, observation values, and `validAtCapture` are historical and
must never be rewritten by replay.

### C.7 Deterministic runtime contract

Create a pure runtime in `src/core/runtime/**`. Given a specific `ToolVersion` and trials, it
returns evaluated projections and ranking; it performs no I/O and persists nothing.

**Rule application**

- Begin each projection with the stored `validAtCapture` value.
- Evaluate the closed equality condition from the frozen schema. A matching rule may change
  only the frozen effect target `trial.valid` to its boolean effect value.
- Apply rules in their stored order. Do not parse strings as expressions or add a generic rule
  engine.
- Return a new projection containing the original trial identity and
  `validUnderCurrentVersion`; do not mutate or deep-freeze the caller's input as a side effect.

**Metrics and ranking**

- Group valid projected trials by `designName`. Designs with zero valid trials are excluded
  from the ranking and reported separately as insufficient evidence.
- Convert each `distanceM` to integer millimetres with `Math.round(distanceM * 1000)` before
  aggregation. Core calculations and comparisons use those integers.
- `median_distance`: sort millimetres ascending; odd count selects the middle; even count uses
  the arithmetic mean of the two middle integers. Represent the result deterministically; do
  not use locale formatting in core.
- `consistency`: spread in millimetres, `max - min`; lower is better.
- Ranking order is: median distance descending, then consistency ascending, then
  `designName` ascending by JavaScript code-point comparison. Do not rely on sort stability.
- A runtime result must identify the version used, projected validity for every supplied
  trial, per-design metric values, ordered ranking, winner when one exists, and insufficient
  designs. Define and freeze this result shape in P5 for P6/P7 to consume.

With the existing spec fixtures, v1 has no obstruction exclusion: the obstructed Dart trial
remains valid and Dart's median 7.5 m beats Falcon's 7.4 m. Under v2 the approved
`exclude_obstructed_flight` rule invalidates that trial; Dart falls to 6.1 m and Falcon wins.

### C.8 Child-facing compile proof

`CompilePreviewScreen` must render real application results, not fixture copy:

- the immutable version id just compiled;
- a concise list of inputs, metrics, and active rules derived from that version;
- the current winner and ranking;
- after v2, which stored trial changed validity and a before/after winner comparison;
- authorship/provenance language appropriate to the existing reading-band system.

The full saved Runner Mode tile and reuse/fork interactions remain P6. P5 may make the compile
preview truthful; it must not implement the P6 experience early.

### C.9 File ownership

Phase 5 may create:

```
src/core/compiler/compile.ts
src/core/compiler/index.ts
src/core/runtime/types.ts
src/core/runtime/rules.ts
src/core/runtime/metrics.ts
src/core/runtime/replay.ts
src/core/runtime/index.ts
tests/unit/compiler/**
tests/unit/runtime/**
tests/integration/phase-05-compile-replay.test.ts
tests/invariants/inv-57-atomic-compilation.test.ts
tests/invariants/inv-58-no-dangling-active-version.test.ts
tests/invariants/inv-59-idempotent-compilation.test.ts
tests/invariants/inv-60-version-history-immutable.test.ts
tests/invariants/inv-61-runtime-pure.test.ts
tests/invariants/inv-62-metric-ranking-contract.test.ts
tests/invariants/inv-63-trial-resolves-active-version.test.ts
tests/invariants/inv-64-phase-05-reload-proof.test.ts
docs/evidence/PHASE_05.md
```

These existing paths may be amended only for the stated purpose:

| Path | Allowed amendment |
|---|---|
| `src/core/ports/repositories.ts` | Add the atomic version-save/definition-activation contract without adding a repository family. |
| `src/adapters/persistence/memory/versions.ts` | Implement all-or-nothing compilation commit. |
| `src/adapters/persistence/indexedDb/versions.ts` | Implement a single transaction across tool-version and tool-definition stores. |
| persistence conformance tests | Exercise the new atomic contract for memory and IndexedDB, including rollback. |
| `src/core/orchestrator/transition.ts` | Emit existing `request_compile` on `inputs_confirmed`; change no state/event vocabulary. |
| `src/ui/flows/executeIntents.ts` | Replace compile preview-only folding with idempotent atomic persistence; resolve active version on trial capture. |
| `src/ui/flows/JourneyFlow.tsx` | Remove placeholder tool/version persistence and carry real compile/replay results. |
| `src/ui/screens/CompilePreviewScreen.tsx` | Render the real version and replay comparison. |
| affected P3/P4 journey and invariant tests | Amend expectations only where C.6 changes the compile point; preserve their durable assertions. |
| `docs/BUILD_STATE.md` | Record decisions, invariant results, gate counts, evidence, and deviations truthfully. |

Any additional production path requires an evidence-packet explanation. A schema change,
dependency addition, repository-family addition, new orchestrator vocabulary, or model-path
change requires owner approval before implementation.

### C.10 Out of scope

Do not implement: the saved Runner tile, second-child reuse, forking, or original-version
protection UI (P6); Evidence Agent, parent summary, grounding validator, export/delete UI, or
coordinated data-rights flow (P7); a second tool kind, computer vision, sensor inference,
native APK, public sharing, generalized rule language, live model evaluation, founder demo
polish, or animation work (P8 or out of prototype scope).

Do not rewrite observations to make the new result look correct. Replay is a projection over
history, not a migration of history.

### C.11 Implementation order and checkpoints

1. **Lock tests around current fixtures.** Promote INV-20/21 and add failing runtime unit cases
   for rules, odd/even median, spread, deterministic ties, and insufficient evidence.
2. **Build the pure runtime.** Run runtime tests and INV-20/21 before touching persistence/UI.
3. **Build the pure compiler.** Prove body equality, provenance, deep immutability, and
   idempotency decision behavior.
4. **Add atomic repository commit.** Implement memory first, then IndexedDB; run the same
   conformance/rollback suite against both and verify reload.
5. **Integrate compile points and trial capture.** Remove the placeholder, amend the transition,
   persist v1/v2, and resolve the active version at capture. Run P1–P4 invariant tests here.
6. **Render the real compile proof.** Wire preview state to actual compiler/runtime output;
   add component/integration assertions that prevent fixture-only ranking text.
7. **Run all gates and produce evidence.** Update BUILD_STATE only with results actually
   observed.

If a checkpoint fails, fix it before proceeding. Do not defer a red earlier-phase invariant
to the final sweep.

---

## D. Phase 5 Acceptance Tests

### D.1 Existing pending invariants promoted

| ID | Assertion |
|---|---|
| INV-20 | Repeated runtime calls with the same canonical version and trials produce byte-identical canonical results; input values are unchanged; no clock/id/network/storage/model seam is reachable. |
| INV-21 | Existing fixtures prove trial 4 valid and Dart first under v1; under v2 only the obstructed trial changes to invalid, Dart becomes 6.1 m, Falcon remains 7.4 m and ranks first. Stored trials remain byte-identical. |

### D.2 New phase invariants

| ID | Assertion |
|---|---|
| INV-57 | Atomic compilation commit passes against memory and IndexedDB. Injected failure/duplicate after version write cannot alter the active definition pointer or leave a partial version. |
| INV-58 | No live flow stores a tool before v1 exists; every persisted `currentVersionId` resolves to a same-tool version after commit and IndexedDB reopen. No placeholder version constant remains in `src/ui/**`. |
| INV-59 | Compiling an unchanged approved ledger returns the active version, performs zero repository writes, and consumes neither the id factory nor clock. Version count and canonical bytes remain unchanged. |
| INV-60 | After compiling v2, v1 and all nested values are byte-identical to their pre-v2 snapshot and reject attempted mutation. The definition points to v2 while both versions remain readable. |
| INV-61 | Runtime source is pure and model-free; static import scan excludes adapters/app/UI/browser/Node I/O. Calling it does not mutate trials/version and performs no repository write. |
| INV-62 | Exact metric semantics pass for odd/even median, millimetre rounding, spread, median tie, consistency tie, lexical final tie, zero-valid-trial exclusion, and empty input. |
| INV-63 | Trial capture resolves the current version from repositories and stamps it. Missing tool, dangling version, or cross-tool version is rejected before save; UI call sites cannot supply a version id. |
| INV-64 | Full milestone path passes for memory and IndexedDB/reopen: compile v1, record four trials, compile v2, reopen, resolve v2, retain v1, and reproduce both expected rankings with an unmodified ledger/trial history. |

All existing asserted invariants remain green. INV-22–INV-25 remain pending for P6/P7. Any
amended earlier-phase test must show that its durable property became stricter or remained
identical; disabling or loosening it rejects the phase.

### D.3 Targeted and full gates

Run targeted tests during implementation, then all four complete gates on a clean checkout.
No command may require a live model or internet connection.

```
npx vitest run tests/invariants/inv-20* tests/invariants/inv-21* tests/invariants/inv-57* tests/invariants/inv-58* tests/invariants/inv-59* tests/invariants/inv-60* tests/invariants/inv-61* tests/invariants/inv-62* tests/invariants/inv-63* tests/invariants/inv-64*
npm run typecheck
npm run lint
npm test
npm run build
```

If shell glob expansion differs on the implementation machine, pass the ten explicit test
file paths. Do not replace the full suite with the targeted command.

### D.4 Required evidence packet

`docs/evidence/PHASE_05.md` must include:

1. complete output and exit status for targeted tests and all four gates;
2. a table listing every passing invariant and the still-pending INV-22–INV-25;
3. canonical JSON for compiled v1 and v2, plus proof that v1 bytes did not change;
4. canonical replay output showing per-trial validity and ordered ranking under both versions;
5. memory and IndexedDB atomic-failure/rollback evidence, including state before and after;
6. IndexedDB reopen evidence showing the definition points to stored v2 and v1 still exists;
7. before/after snippets or diff for the P3 transition amendment and removal of the placeholder;
8. the actual changed file tree and import-boundary scan for compiler/runtime;
9. a screenshot or recording of the real compile preview showing the v1→v2 explanation;
10. a statement of every deviation or the exact sentence `No undeclared deviations.`

### D.5 Automatic rejection conditions

Reject Phase 5 even if tests are green when any of the following is true:

- version save and definition activation are separate non-atomic commits;
- a stored definition can point to a missing or different-tool version;
- the UI chooses or supplies `toolVersionIdAtCapture`;
- unchanged compilation consumes an id/time, writes, or creates a duplicate version;
- v2 compilation overwrites, deletes, or mutates v1;
- runtime replay mutates or persists trial observations or historical validity;
- compiler/runtime reaches a model, repository, network, browser API, clock, or randomness;
- a rule uses `eval`, `new Function`, expression strings, dynamic imports, or vocabulary outside
  the frozen schema;
- metric results depend on floating-point accident, locale, input order, or sort stability;
- ranking/validity shown in UI is fixture text rather than real runtime output;
- a prior invariant is skipped, deleted, or weakened without an approved decision;
- the phase widens schemas/state/events/repository families/model paths or adds dependencies;
- P6/P7/P8 work is mixed into the phase;
- BUILD_STATE or the evidence packet claims results not present in the submitted commit.

### D.6 Implementation-agent handoff

> Implement Phase 5 from `docs/phases/PHASE_05.md`. First read the normative product document,
> engineering plan, build state, Phases 1–4, and the orchestration loop. Treat the phase file as
> an executable contract. Follow C.11 in order and stop if satisfying it requires any unlisted
> schema, state, event, repository, dependency, model path, or product deviation. Do not invent
> alternatives. Preserve all P1–P4 invariants, implement and run INV-20/21 and INV-57–64, then
> run typecheck, lint, the full test suite, and build. Produce `docs/evidence/PHASE_05.md` and a
> truthful proposed BUILD_STATE update. Return the commit id, changed paths, exact gate output,
> deviations, and unresolved risks; do not self-approve the phase.
