# Teach Daso — Engineering Plan

**Owner:** Technical architect / build orchestrator
**Normative source:** `TEACH_DASO_PRODUCT_AND_ARCHITECTURE.md`
**Status:** Phases 1–5 architecturally accepted. Phase 6 is fully specified in `docs/phases/PHASE_06.md`; Phase 7 remains unblocked and outlined, and Phase 8 waits for P6/P7 acceptance.

This document is subordinate to the product and architecture definition. Where this
document and the specification disagree, the specification wins and this document is
wrong and must be corrected.

---

## A. Repository Architecture

### A.1 Stack ruling

| Concern | Decision | Justification in spec |
|---|---|---|
| Language | TypeScript, `strict: true`, no `any` in `src/core` | §14 |
| App framework | Next.js (App Router), tablet-first, installable PWA | §13, §14 |
| Local store | IndexedDB via a repository interface owned by `core` | §11.1 |
| Runtime validation | Zod, strict object schemas | §14 |
| Teaching lifecycle | Explicit finite state machine, hand-written | §7.2, §14 |
| Model access | Two server routes only, no client-side model SDK | §8, §11.2, §14 |
| Rule evaluation | Deterministic evaluator in application code | §4.3, §7.7 |
| Tests | Vitest, plus a dedicated executable invariant suite | §14, §19.8 |

### A.2 Layering

Four layers. Dependencies point downward only. This is enforced by an automated test,
not by convention.

```
  ui         React components, screens, flows            (may import core types only)
  adapters   IndexedDB persistence, agent HTTP clients   (implements core ports)
  app        Next.js routing + the two model endpoints   (composition root)
  core       Pure domain: schema, ledger, validator,     (imports nothing but zod)
             policy, compiler, runtime, orchestrator
```

`src/core` is a portable domain kernel. It may not import React, Next, browser globals,
Node builtins, `fetch`, or any persistence library. It may not read the wall clock or any
randomness source; time and identifier generation arrive through injected ports. This is
what makes replay determinism (§17 Determinism) and future portability to native Android
(§13) mechanically true rather than aspirational.

### A.3 Directory layout

```
teach-daso/
├─ src/
│  ├─ app/                          Next.js App Router — composition root
│  │  ├─ layout.tsx  page.tsx
│  │  └─ api/
│  │     └─ agents/
│  │        ├─ teaching/route.ts    THE ONLY permitted Teaching Agent model call
│  │        └─ evidence/route.ts    THE ONLY permitted Evidence Agent model call
│  ├─ core/                         PURE. no react / no dom / no io / no clock / no random
│  │  ├─ ports/                     Clock, IdFactory, repository interfaces
│  │  ├─ serialization/             canonical JSON, deep freeze
│  │  ├─ schema/                    zod schemas for §9 objects + mutation vocabulary
│  │  ├─ ledger/                    append-only event log, approval fold
│  │  ├─ validator/                 schema + provenance validation            (Phase 4)
│  │  ├─ policy/                    safety policy engine                      (Phase 4)
│  │  ├─ compiler/                  ToolVersion compilation                   (Phase 5)
│  │  ├─ runtime/                   deterministic evaluator + replay          (Phase 5)
│  │  ├─ orchestrator/              teaching state machine                    (Phase 3)
│  │  ├─ evidence/                  grounding validator for summaries         (Phase 7)
│  │  └─ disclosure/                registry of honestly simulated capabilities
│  ├─ adapters/
│  │  ├─ persistence/               IndexedDB implementations of core ports   (Phase 2)
│  │  └─ agents/                    typed clients for the two api routes      (Phase 4/7)
│  └─ ui/
│     ├─ shell/  components/  screens/  flows/                                (Phase 3+)
├─ tests/
│  ├─ invariants/                   one file per architectural invariant
│  ├─ unit/  integration/
│  └─ fixtures/spec/                literal JSON copied from spec §9
└─ docs/
   ├─ BUILD_STATE.md                living build ledger (architect-owned)
   ├─ ENGINEERING_PLAN.md           this file
   └─ phases/PHASE_0N.md            per-phase specification + acceptance tests
```

### A.4 Architectural rulings that shape the repository

**R1 — A ToolVersion is defined as a fold over its approved authorship events.**
The compiler does not "attach" provenance to a version. A version body is *produced by
reducing the approved authorship events for that tool*. Validity is then a pure equality
check: `fold(approvedEvents) === storedVersionBody`. A behavior with no approved event
cannot survive the fold, so §12 "AI Secretly Authors the Tool" becomes impossible by
construction rather than by policy. This is the single most important ruling in the repo.

**R2 — Approval is a distinct ledger entry, never a field the author sets.**
An append-only log (§10) cannot have `childApproved` flipped after the fact, and an actor
that can write its own approval flag can approve its own mutation. Candidate mutations are
appended unapproved; a separate child-actor approval entry references the candidate. The
spec's `childApproved` field (§9.4) is preserved as a *derived* read-model field so stored
and exported records match the documented shape. Registered as deviation **D-01**.

**R3 — Model access exists at exactly two file paths.**
`src/app/api/agents/teaching/route.ts` and `src/app/api/agents/evidence/route.ts`. A static
test fails the build if a model SDK, model endpoint URL, or API key is referenced anywhere
else. This makes §8 (two model-driven roles) and §7.5 (no undeclared model invocation in
Runner Mode) enforceable rather than declarative.

**R4 — No dynamic code execution anywhere.**
No `eval`, no `new Function`, no expression-string interpreters, no variable dynamic
`import()`. Rules are data in a closed vocabulary, interpreted by a hand-written evaluator.
Enforced by static test (§5, §7.5, §12).

**R5 — Determinism is a property of `core`, not of tests.**
No `Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID()`, or locale-sensitive
formatting inside `src/core`. Identifiers are sequential and human-readable (`event_014`,
`tool_version_002`), matching the spec examples, produced by an injected `IdFactory` whose
counter is persisted. Ordering, rounding, and tie-breaking are specified explicitly, never
left to sort stability or floating-point accident.

**R6 — One tool kind.**
`ToolDefinition.kind` is an enum with exactly one member, `experiment_comparator`. Adding a
second member is a specification change requiring explicit approval, not an implementation
detail (§15 Out of Scope, §20 "Prototype Looks Broader Than It Is").

**R7 — Nothing may be simulated without being registered.**
`src/core/disclosure/simulations.ts` is the sole registry of honestly simulated capabilities
(§15). Each entry must carry what is simulated, what is real, and where the disclosure is
surfaced to the user. A simulated behavior absent from the registry is a rejected build.

---

## B. Phase Dependency Graph

### B.1 Phases and milestone traceability

| Phase | Name | Implements milestone | Primary exit proof |
|---|---|---|---|
| P1 | Foundation & Domain Contract | M2 (schemas), prerequisite for all | Spec §9 example JSON parses; fold reproduces §9.3 version |
| P2 | Persistence & Inspection | M2 | Reload preserves complete experiment and authorship history |
| P3 | Orchestrator & Tablet Shell | M1 | Full scripted journey completes; zero model calls in the flow |
| P4 | Teaching Agent & Approval Gate | M3 | No rule can exist without an approved provenance entry |
| P5 | Compiler & Deterministic Runtime | M4 | Obstructed trial flips valid→invalid under v2; ranking changes |
| P6 | Keep & Reuse | M5 | Runner Mode passes with model access disabled |
| P7 | Parent Evidence & Data Rights | M6 | Ungrounded summary rejected; delete removes all traces |
| P8 | Founder-Facing Polish | M7 | Naive viewer restates the thesis after one viewing |

Milestone 1 is delivered by P3 rather than first. The specification's M1 already requires
"define state-machine transitions," and building product UI over temporary in-memory data
before the domain contract exists is the primary drift vector in this project (see E.1).
M1's verification statement is preserved verbatim as P3's exit criterion, so nothing in the
product intent is lost — only the order in which the contract is frozen.

### B.2 Graph

```
                    ┌─────────────────────────────┐
                    │ P1 Foundation & Domain      │
                    │    Contract                 │
                    └──────────┬──────────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
      ┌────────────────────┐      ┌────────────────────────┐
      │ P2 Persistence &   │      │ P3 Orchestrator &      │
      │    Inspection      │      │    Tablet Shell        │
      └──────────┬─────────┘      └───────────┬────────────┘
                 │                            │
                 ├────────────┬───────────────┘
                 ▼            ▼
   ┌────────────────────┐  ┌──────────────────────────────┐
   │ P4 Teaching Agent  │  │ P5 Compiler & Deterministic  │
   │    & Approval Gate │  │    Runtime                   │
   └──────────┬─────────┘  └───────────┬──────────────────┘
              │                        │
              └───────────┬────────────┘
                          ▼
              ┌───────────┴───────────┐
              ▼                       ▼
   ┌─────────────────────┐  ┌──────────────────────────┐
   │ P6 Keep & Reuse     │  │ P7 Parent Evidence &     │
   │    (Runner Mode)    │  │    Data Rights           │
   └──────────┬──────────┘  └────────────┬─────────────┘
              └────────────┬─────────────┘
                           ▼
              ┌────────────────────────┐
              │ P8 Founder Polish      │
              └────────────────────────┘
```

### B.3 Safe parallelism

| Set | May run concurrently | Condition |
|---|---|---|
| {P2, P3} | Yes | P1 contract frozen. P3 consumes in-memory repositories behind the same ports P2 implements. |
| {P4, P5} | Yes | The candidate-mutation vocabulary is frozen in P1. P5 develops against synthetic approved ledgers; it never needs a live agent. |
| {P6, P7} | Yes | Disjoint surfaces: Runner Mode / fork vs. summarizer / export-delete. Both read compiled versions read-only. |

Everything else is strictly sequential. P8 requires all prior phases accepted.

### B.4 Contract freeze points

A phase may not begin until the artifacts it consumes are frozen. Changing a frozen
artifact later requires an entry in the BUILD_STATE decision log and re-running the
invariant suite of every downstream phase.

| Freeze point | Frozen at end of | Consumed by |
|---|---|---|
| Domain schemas (§9 objects) | P1 | all |
| Candidate mutation vocabulary | P1 | P4, P5 |
| Ledger fold semantics | P1 | P4, P5, P7 |
| Repository port interfaces | P1 | P2, P3 |
| Orchestrator state set (§7.2, exactly 10 states) | P3 | P4, P6 |
| ToolVersion wire shape | P5 | P6, P7 |

---

## E. Risks That Could Cause Architectural Drift

Ranked by likelihood × damage. Each carries a mechanical control, because a risk with only
a written mitigation is an unmitigated risk.

**E.1 — UI-first shaping of the domain model.** *(highest)*
Building the story path with temporary in-memory data first tends to produce a data model
that mirrors screen state rather than authorship. The provenance ledger degrades into a
display log. **Control:** P1 freezes schemas and the fold before any product UI exists; the
UI layer may import core types but may never define its own persisted shapes.

**E.2 — Provenance becomes decorative.**
`sourceEventId` is populated everywhere and enforced nowhere, so a rule with a fabricated
or dangling reference compiles. **Control:** ruling R1 — version body must equal the fold of
approved events. A dangling reference produces a fold mismatch and fails compilation.

**E.3 — The Teaching Agent drifts into a chatbot.**
"Just let it answer freely here" is a one-line change that converts a constrained
interpreter into the general chatbot §5 forbids. **Control:** the agent's response type is a
closed union — clarifying question, two-or-three alternatives, candidate mutation,
age-appropriate explanation — schema-validated server-side; free text is never a channel
through which behavior reaches the compiler.

**E.4 — The Orchestrator asks the model what to do next.**
The state machine acquires a "let the model pick the next state" escape hatch and the
deterministic core silently becomes a third agent. **Control:** `src/core/orchestrator`
lives in the pure layer and physically cannot perform I/O; transitions are a total function
over `(state, event)`, exhaustively tested.

**E.5 — Runner Mode acquires a model dependency.**
A "nicer explanation" or "helpful hint" in the runner reintroduces inference into the
offline path, breaking §14's central runtime rule. **Control:** static import-graph test —
no module reachable from the Runner Mode entry point may reach `src/adapters/agents`; plus
a P6 integration test executed with model access hard-disabled.

**E.6 — Nondeterminism leaks into results.**
`Date.now()` in a compiler, unstable sort on ties, locale number formatting, or float
accumulation in median/consistency makes identical inputs produce differing output.
**Control:** R5 static scan; explicit total ordering and rounding rules; a replay test that
runs the same version and trial set twice and compares canonical JSON.

**E.7 — Reuse mutates the original tool.**
Day-2 second-child usage writes into Maya's version because it is the convenient object in
hand, violating §12's fork requirement and ToolVersion immutability. **Control:** deep
freeze on every loaded version, plus a P6 test asserting Maya's version body is byte-identical
before and after the second child's full session.

**E.8 — Scope creep into a second tool kind.**
A "generic" second experiment type looks like architectural strength but converts the
artifact into the app generator §5 disowns. **Control:** R6 single-member enum; the invariant
test asserts the enum's exact membership.

**E.9 — Simulation quietly implies real capability.**
Simulated distance measurement is presented with a camera viewfinder and the demo now
overclaims computer vision. **Control:** R7 disclosure registry; P8 asserts every registry
entry appears in the README and at its declared in-product surface.

**E.10 — Model credentials or calls reach the client bundle.**
**Control:** R3 static scan; server-only environment variable naming convention; a build-output
scan asserting no key-shaped string or model host appears in client chunks.

**E.11 — Persistence drift silently drops events.**
An IndexedDB migration reindexes the ledger and loses or reorders events, corrupting
provenance invisibly. **Control:** P2 stores events append-only with a monotonic sequence;
a startup integrity check verifies sequence continuity; overwriting an existing event id throws.

**E.12 — Parent summary quietly loosens grounding.**
Grounding is downgraded to "at least one event id" so plausible-sounding summaries pass.
**Control:** P7 validator requires every claim clause to map to an existing event id, and a
negative test asserts a fabricated-but-plausible summary is rejected.

**E.13 — Documentation drift.**
`docs/BUILD_STATE.md` stops reflecting reality and phase acceptance becomes narrative.
**Control:** a phase is not accepted until BUILD_STATE's invariant table cites a passing,
named test for each invariant claimed complete.
