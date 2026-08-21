# Phase 1 — Foundation & Domain Contract

**Implements:** Milestone 2 (schemas), and is a precondition for every other phase.
**Status:** Implemented. INV-01–INV-16 passing; INV-17–INV-25 pending by design. Evidence in `docs/evidence/PHASE_01.md`.
**Parallelism:** None. Phase 1 is a single sequential unit; P2 and P3 unblock on its acceptance.

---

## C. Phase 1 Specification

### C.1 Purpose

Phase 1 produces the domain contract and the executable invariant harness. It ships no
product experience. Its value is that after Phase 1, the architectural invariants in the
specification are enforced by failing tests rather than by intention, and no later phase
can violate them without turning the build red.

The load-bearing deliverable is the **approval fold**: the function that reduces a tool's
approved authorship events into a tool version body. After Phase 1, "every material
compiled behavior has provenance" is a computable equality, not a review checklist.

### C.2 Scope — what Phase 1 builds

**1. Project foundation**
TypeScript in strict mode, Next.js App Router scaffold with a placeholder root page and no
product UI, Vitest, ESLint, `.gitignore`, `.env.example` naming server-only model variables.
Scripts: `typecheck`, `lint`, `test`, `build`.

**2. Ports (`src/core/ports/`)**
- `Clock` — `now(): IsoTimestamp`. The only source of time available to the domain.
- `IdFactory` — `next(kind): Id`, producing sequential, human-readable identifiers matching
  the specification's examples (`event_014`, `tool_version_002`, `trial_004`,
  `summary_001`, `grant_camera_flight_lab` style). The counter is an input, so identical
  inputs yield identical identifiers.
- Repository interfaces for tools, versions, events, trials, profiles, grants, summaries.
  Interfaces only. Phase 2 implements them against IndexedDB; Phase 3 may use an in-memory
  implementation behind the same interfaces.

**3. Canonical serialization (`src/core/serialization/`)**
- `canonicalJson(value)` — key-sorted, stable-number, no-whitespace serialization. This is
  the project's equality primitive for determinism and immutability assertions.
- `deepFreeze(value)` — applied to every tool version the domain hands out.
No content hashing. Canonical JSON string comparison is sufficient and adds no dependency
or surface area.

**4. Schemas (`src/core/schema/`)**
Strict Zod schemas for all seven §9 objects: `ChildProfile`, `ToolDefinition`, `ToolVersion`,
`AuthorshipEvent`, `ExperimentTrial`, `PermissionGrant`, `ParentSummary`. Every object
schema rejects unknown keys. No `z.any()`, no `z.record(z.unknown())` in a material position.

Plus the closed vocabularies:
- `ToolKind` — enum with exactly one member: `experiment_comparator`.
- `MetricId` — enum limited to the metrics Flight Lab supports.
- `InputField` — enum limited to `design_name`, `distance_m`, `obstruction`, `note`.
- `RuleCondition` — `{ field: InputField, equals: boolean | string | number }`. No expression
  strings, no operator soup. Widening the operator set is a specification change.
- `RuleEffect` — `{ set: 'trial.valid', value: boolean }`.
- `CandidateMutation` — discriminated union over a closed operation set:
  `add_input`, `add_metric`, `remove_metric`, `add_rule`, `remove_rule`.
  Any other operation fails parsing.

**5. Ledger (`src/core/ledger/`)**
- Append-only event log semantics. `append` rejects an event whose id already exists and
  rejects out-of-order sequence numbers. There is no update and no delete operation in the
  ledger API surface; tool-level deletion in Phase 7 removes whole streams, it does not edit
  events.
- Entry kinds: a **candidate** entry (a proposed mutation, from actor `child` or `ai`) and an
  **approval** entry (actor `child`, referencing a candidate id). Ruling R2 / deviation D-01.
- `childApproved` is exposed as a derived read-model field so records match the shape
  documented in §9.4, but nothing in the system writes it directly.
- `foldApprovedEvents(events) -> ToolVersionBody` — the canonical definition of what a tool
  version means. Candidates without a matching approval entry are excluded. An approval
  entry whose actor is not `child` is excluded. Order is the ledger sequence order.

**6. Disclosure registry (`src/core/disclosure/simulations.ts`)**
Typed registry where each entry must declare what is simulated, what is genuinely real, and
the surface where the disclosure is shown. The type makes an undisclosed entry impossible to
construct.

**7. Invariant harness (`tests/invariants/`)**
One file per architectural invariant. Invariants whose subject does not exist yet are
present as explicitly pending tests naming the phase that will satisfy them, so the suite
doubles as a machine-readable specification of remaining work.

**8. Spec fixtures (`tests/fixtures/spec/`)**
The example JSON documents from §9 copied verbatim, plus a hand-built Flight Lab ledger
fixture that reproduces the §6 narrative through Scene 5.

### C.3 Out of scope for Phase 1 — explicit rejection list

Phase 1 must not contain: any product screen, any IndexedDB code, any model call or agent
adapter, the orchestrator state machine, the safety policy engine, the compiler entry point,
the rule evaluator, the evidence grounding validator, or any styling system beyond what the
Next.js scaffold generates. Work delivered in these areas during Phase 1 will be rejected
even if correct, because it consumes contracts that Phase 1 has not yet frozen.

### C.4 File ownership

Phase 1 exclusively owns and may create these paths. No other phase may modify them without
an entry in the BUILD_STATE decision log.

```
package.json  tsconfig.json  next.config.*  vitest.config.*  eslint.config.*
.gitignore  .env.example
src/app/layout.tsx                       placeholder only
src/app/page.tsx                         placeholder only
src/core/ports/clock.ts
src/core/ports/ids.ts
src/core/ports/repositories.ts
src/core/serialization/canonicalJson.ts
src/core/serialization/deepFreeze.ts
src/core/schema/primitives.ts
src/core/schema/vocabulary.ts
src/core/schema/childProfile.ts
src/core/schema/toolDefinition.ts
src/core/schema/toolVersion.ts
src/core/schema/authorshipEvent.ts
src/core/schema/experimentTrial.ts
src/core/schema/permissionGrant.ts
src/core/schema/parentSummary.ts
src/core/schema/mutation.ts
src/core/schema/index.ts
src/core/ledger/types.ts
src/core/ledger/append.ts
src/core/ledger/fold.ts
src/core/disclosure/simulations.ts
tests/fixtures/spec/*.json
tests/fixtures/ledger/flightLab.ts
tests/invariants/*.test.ts
tests/unit/**
docs/BUILD_STATE.md                      architect-owned; implementer proposes, architect merges
```

### C.5 Non-negotiable implementation constraints

1. `src/core/**` imports nothing except `zod` and other `src/core` modules.
2. No `Date`, `Math.random`, or `crypto.randomUUID` in `src/core/**`.
3. No `eval`, `new Function`, or dynamic `import()` with a non-literal specifier anywhere.
4. No model SDK, model host URL, or API key reference anywhere in the repository.
5. No `any`, no `as` casts that widen or bypass a schema, no `@ts-expect-error` in `src/core`.
6. Every domain type is derived from its Zod schema (`z.infer`), never declared twice.
7. The seven §9 example JSON documents parse without modification. If a schema cannot accept
   the specification's own example, the schema is wrong — do not edit the fixture.

---

## D. Phase 1 Acceptance Tests

Acceptance is mechanical. Every test below must exist by the stated identifier and pass.
A phase claiming completion without a named passing test for each row is rejected.

### D.1 Invariant tests

| ID | Invariant (spec ref) | Assertion |
|---|---|---|
| INV-01 | Only two model-driven roles (§8) | Static scan of `src/**` finds zero references to model SDKs, model host URLs, or API-key env names. In Phase 1 the two permitted route files do not yet exist, so the permitted count is zero. |
| INV-02 | Domain purity / portability (§13, §14) | Static scan: no import in `src/core/**` resolves outside `src/core` except `zod`. Fails on react, next, node builtins, `idb`, `fetch`. |
| INV-03 | Determinism has no hidden inputs (§17) | Static scan: `src/core/**` contains no `Date.now`, `new Date(`, `Math.random`, `crypto.randomUUID`, or `toLocaleString`. |
| INV-04 | No arbitrary generated code executes (§5, §7.5, §12) | Static scan of `src/**`: zero `eval(`, `new Function(`, and no `import(` with a non-literal argument. |
| INV-05 | Flight Lab is the only tool kind (§15, §20) | `ToolKind.options` deep-equals `['experiment_comparator']`. |
| INV-06 | Spec data model is honoured (§9) | Each of the seven §9 example JSON fixtures parses successfully against its schema, unmodified. |
| INV-07 | No silent capability creep through data (§4.1) | Each schema rejects an object carrying one extra unknown key. Seven negative cases. |
| INV-08 | Mutation vocabulary is closed (§7.3, §7.4, §12) | `CandidateMutation` rejects an unlisted operation; `RuleCondition` rejects a field outside `InputField`; `RuleEffect` rejects a target other than `trial.valid`; a rule carrying an expression string is rejected. |
| INV-09 | Provenance is structural, not decorative (§4.1, §7.6, §12) | `foldApprovedEvents` over the Flight Lab fixture ledger produces a body deep-equal to the §9.3 `tool_version_002` example (fields other than `versionId`/`compiledAt`, which come from injected ports). |
| INV-10 | AI cannot approve its own mutation (§7.3, §12) | A candidate authored by actor `ai` with no child approval entry does not appear in the fold. Adding an approval entry whose actor is `ai` still does not admit it. Adding a child approval entry does admit it. |
| INV-11 | Unapproved behavior cannot reach a version (§17 Authorship) | A candidate authored by actor `child` but never approved does not appear in the fold. |
| INV-12 | Ledger is append-only (§10) | The ledger module exports no update or delete function. `append` with a duplicate event id throws. `append` with a non-monotonic sequence throws. |
| INV-13 | ToolVersion objects are immutable (§9.3, §12) | A version returned by the domain is deeply frozen; assignment to a nested rule field throws in strict mode; the object's canonical JSON is unchanged after the attempt. |
| INV-14 | Canonical equality is order-independent (§17 Determinism) | `canonicalJson` of two objects differing only in key insertion order produces identical strings; the fold run twice over the same fixture produces identical canonical JSON. |
| INV-15 | Identifiers are deterministic (§17 Determinism) | Two `IdFactory` instances seeded identically produce identical id sequences, matching the spec's zero-padded format. |
| INV-16 | Simulations must be disclosed (§15) | Every registry entry has non-empty `whatIsSimulated`, `whatIsReal`, and `disclosedAt`; a test asserts the type rejects an entry missing any of them. |

### D.2 Pending invariants recorded in Phase 1

These must exist in the harness as explicitly pending tests naming their owning phase, so
that the remaining architectural obligations are visible in test output from day one.

| ID | Invariant | Owning phase |
|---|---|---|
| INV-17 | Orchestrator is a deterministic state machine over exactly the ten §7.2 states | P3 |
| INV-18 | Validation is code, not model-delegated; invalid mutations rejected | P4 |
| INV-19 | Safety policy denies each §7.5 boundary | P4 |
| INV-20 | Identical version + trial data yields identical results | P5 |
| INV-21 | Obstructed trial flips valid→invalid under v2 and the ranking changes | P5 |
| INV-22 | Runner Mode reaches no agent module and works with model access disabled | P6 |
| INV-23 | Second-child reuse forks; the original version body is byte-identical after | P6 |
| INV-24 | Every parent-summary claim maps to an existing event id; fabricated summary rejected | P7 |
| INV-25 | Tool deletion removes definitions, versions, trials, and events from local storage | P7 |

### D.3 Gate commands

All four must exit zero on a clean checkout with no network access beyond package install:

```
npm run typecheck
npm run lint
npm test
npm run build
```

### D.4 Required evidence packet

Phase 1 will not be reviewed without all of the following:

1. Full terminal output of the four gate commands.
2. Verbose test output listing every INV-01 … INV-16 identifier as passing and
   INV-17 … INV-25 as pending.
3. The actual file tree of `src/` and `tests/`, for comparison against C.4.
4. The contents of `src/core/ledger/fold.ts` and `src/core/schema/mutation.ts`, which are the
   two files where an architectural violation is most likely to hide.
5. A statement of any deviation from this document, with justification, proposed for the
   BUILD_STATE deviation register. Undeclared deviations are grounds for rejection even if
   the tests pass.

### D.5 Automatic rejection conditions

Phase 1 is rejected, regardless of a green suite, if any of the following is true:

- A rule is representable as a string to be parsed or evaluated at runtime.
- Provenance is a field the caller supplies rather than a consequence of the fold.
- Any code path can set `childApproved` directly.
- The fold accepts an event by actor rather than by the presence of a child approval entry.
- A schema uses `z.any()`, `z.unknown()`, or passthrough in a material position.
- A spec fixture was edited to make a schema pass.
- Product UI, persistence, agent, compiler, or runtime code appears in the diff.
- `docs/BUILD_STATE.md` was not updated.
