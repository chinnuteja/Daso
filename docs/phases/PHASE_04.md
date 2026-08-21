# Phase 4 — Teaching Agent & Approval Gate

**Implements:** Milestone 3 (constrained Teaching Agent interface, candidate structured mutations, required child approval, rejection of invalid or unsupported mutations).
**Status:** Implemented. INV-01–INV-19 and INV-26–INV-56 passing; INV-20–INV-25 pending by design. Evidence in `docs/evidence/PHASE_04.md`.
**Parallelism:** Runs concurrently with P5. P4 consumes the mutation vocabulary and fold frozen
in P1 and the `TeachingSource` port frozen in P3. It shares no file with P5.

---

## C. Phase 4 Specification

### C.1 Purpose

Phase 4 introduces the first model into the system, and the entire phase is an exercise in
giving it as little authority as possible. The Teaching Agent interprets a child's language
into a *candidate* mutation. It cannot approve one, cannot write one, and cannot invent a
behaviour outside the vocabulary Phase 1 froze.

The load-bearing deliverable is the **rejection path**: a schema validator and a safety policy
engine, both written in code and both sitting between the model and the ledger. After Phase 4,
Milestone 3's verification — "no tool rule can be created without an approved provenance
event" — holds because there is no code path from a model response to a compiled behaviour
that skips the child's explicit approval.

Phase 3 already made the orchestrator deterministic and the approval gate explicit; Phase 4
replaces the scripted responder with a real model behind a single route, without widening
anything the earlier phases closed. The measure of success is that almost nothing about the
flow changes when the model arrives.

### C.2 Scope — what Phase 4 builds

**1. Schema validator (`src/core/validator/`)**
Specification §7.4's six checks, as pure functions over a candidate mutation:

| Check | Rejection condition |
|---|---|
| Matches the supported tool schema | `CandidateMutation.parse` fails, or the operation is outside the closed set |
| References approved capabilities | The mutation names a capability with no `PermissionGrant` in scope |
| Uses valid input and output types | A `RuleCondition` field is outside `InputField`, or an effect target is not `trial.valid` |
| Stays within resource limits | The mutation would exceed the declared caps in C.2.3 |
| Contains complete provenance | The candidate carries a pre-stamped `sourceEventId`, or names a source event that does not exist in the stream |
| Can be represented deterministically | The mutation carries an expression string, a function, a non-finite number, or anything without a canonical JSON form |

Validation is implemented in code, not delegated to an LLM (§7.4, last line). The validator
returns a structured verdict — `{ ok: true }` or `{ ok: false, reasons }` — never a thrown
error for an ordinary rejection, because a rejection is a normal product event the child sees.

**2. Safety policy engine (`src/core/policy/`)**
Specification §7.5's nine boundaries as a closed enumeration, each with its own denial reason:
no arbitrary network calls, no unapproved contacts, no background microphone or camera
capture, no continuous location tracking, no generated native code, no filesystem access
outside the sandbox, no tool-to-tool access without an explicit capability, no public
publishing, no undeclared model invocation during Runner Mode.

The engine denies by default. A request that matches no explicit allowance is denied, so a
boundary nobody thought to enumerate fails closed rather than open.

**3. Resource limits (`src/core/validator/limits.ts`)**
Declared constants, not magic numbers scattered through call sites: maximum rules per tool,
maximum inputs, maximum metrics, maximum candidate length, maximum pending candidates per
step. These exist so "stays within resource limits" is a checkable predicate rather than a
sentence in a document.

**4. The Teaching Agent route (`src/app/api/agents/teaching/route.ts`)**
Ruling R3's first permitted model file. This is the only path in the repository from which a
model may be reached. The route:

- accepts a minimal request: the current orchestrator state and the child's utterance, and
  nothing else (§11.2 — the cloud does not receive the complete child history);
- calls exactly one model provider through a narrow transport seam;
- validates the response against the `TeachingMove` union frozen in Phase 3, server-side,
  before returning it;
- returns a rejection when the response does not parse. A malformed or free-form answer is an
  error, never a passthrough.

The evidence route (`src/app/api/agents/evidence/route.ts`) is still not created. It is P7's.

**5. Teaching Agent client (`src/adapters/agents/teaching.ts`)**
A typed client implementing the `TeachingSource` port exactly as Phase 3 froze it. Because the
port is unchanged, the orchestrator, the screens, and the journey do not know whether they are
talking to the scripted responder or the model. Swapping the implementation is a composition
choice, not a rewrite — which is the point of having frozen the port before the agent existed.

The scripted source remains and remains the default in tests, so the gate commands still pass
with no network access.

**6. Rejection surfaces (`src/ui/`)**
The child sees why something was refused, in their reading band. A rejected candidate is not a
silent no-op and not a stack trace: it is a sentence, and the flow returns to the state the
orchestrator's existing table already defines for `candidate_rejected`. No new orchestrator
state, no new event kind.

**7. Adversarial fixtures (`tests/fixtures/adversarial/`)**
Model responses that a prompt injection would plausibly produce: an operation outside the
closed set, a rule carrying an expression string, a request to add a network capability, an
attempt to emit an approval, a response containing executable code, a response carrying the
full ledger back. Each has a named test asserting it is rejected.

**8. Invariant tests**
`tests/invariants/` gains INV-47 … INV-56, and INV-18 and INV-19 are promoted from pending to
asserted.

### C.3 Out of scope for Phase 4 — explicit rejection list

Phase 4 must not contain: the compiler entry point or `ToolVersion` creation (P5); the
deterministic evaluator, metrics, medians, or ranking (P5); fork semantics or the second-child
scenario (P6); the evidence route, the parent summary, grounding validation, export, or delete
(P7); motion polish, the README, or the demo (P8).

Phase 4 must also not widen anything already frozen: no new orchestrator state or event, no
new member of `CandidateMutation`, no new `MetricId` or `InputField`, no new field on any §9
object, and no change to the `TeachingMove` union beyond what P3 defined. A model that needs
the vocabulary widened to be useful is a model being asked to do the child's job.

Above all, Phase 4 must not create a path by which a model response becomes behaviour without
an explicit child approval. That is the phase's entire subject.

### C.4 File ownership

Phase 4 exclusively owns and may create these paths.

```
src/core/validator/schemaValidator.ts
src/core/validator/provenance.ts
src/core/validator/limits.ts
src/core/validator/index.ts
src/core/policy/boundaries.ts
src/core/policy/engine.ts
src/core/policy/index.ts
src/app/api/agents/teaching/route.ts     THE ONLY permitted model call in this phase (R3)
src/adapters/agents/teaching.ts          typed client implementing the frozen TeachingSource port
src/adapters/agents/index.ts
src/ui/copy/rejections.ts                child-facing refusal copy, per reading band
tests/invariants/inv-47 … inv-56 *.test.ts
tests/fixtures/adversarial/**
docs/BUILD_STATE.md                      architect-owned; implementer proposes, architect merges
```

Seven paths are **not** owned by Phase 4 and require an entry in the BUILD_STATE decision log
before they are touched. Two of them are downstream invariant amendments, which is exactly the
situation B.4 anticipates when a frozen artifact's assumptions change.

| Path | Change required | Justification to record |
|---|---|---|
| `package.json` | add exactly one model provider SDK | The route needs a transport. One provider, named in the decision log, behind a seam thin enough to replace. A second provider is a specification change. |
| `.env.example` | comment only, if the chosen provider needs a variable P1 did not anticipate | P1 already declared `TEACHING_AGENT_CREDENTIAL` and `MODEL_PROVIDER_BASE_ADDRESS`, server-only, empty in version control. P4 consumes them. Adding a `NEXT_PUBLIC_` variable is a rejection condition, not a decision. |
| `tests/invariants/inv-01-model-roles.test.ts` | "neither permitted model route exists" becomes "exactly the teaching route exists"; the SDK scan gains a path allowance for that one file | INV-01 asserted a Phase 1 fact. R3 always permitted two paths; P4 creates the first. The scan must still fail for a model reference anywhere else. |
| `tests/invariants/inv-38-zero-model-calls.test.ts` | "the only TeachingSource implementation is the scripted one" becomes "exactly two implementations exist, and neither is reachable from Runner Mode" | P3 asserted zero model calls when no agent existed. The durable property — the runner and the offline path reach no model — is preserved and tightened, not weakened. |
| `tests/invariants/inv-18-validation-pending.test.ts` | pending test replaced by an asserting test | INV-18 is P4-owned; the placeholder was written in P1 to be replaced here. |
| `tests/invariants/inv-19-safety-policy-pending.test.ts` | pending test replaced by an asserting test | INV-19 is P4-owned; same reason. |
| `src/ui/screens/ReviewMutationScreen.tsx`, `src/ui/flows/JourneyFlow.tsx` | render the validator and policy verdict; compose the agent client | P3 owns these files. The approval gate exists; P4 adds the refusal reason and swaps the source behind the frozen port. No new state or event. |

INV-43 (Runner Mode reaches no teaching module) is **not** amended. If introducing the agent
requires changing INV-43, the composition is wrong.

### C.5 Non-negotiable implementation constraints

1. `src/core/**` continues to import nothing except `zod` and other `src/core` modules.
   The validator and the policy engine are pure; INV-02 and INV-03 are unchanged.
2. Validation and policy are code. No model is consulted to decide whether something is valid,
   safe, or permitted.
3. The model is reachable from exactly one file. A model SDK import, host URL, or credential
   anywhere else fails INV-01.
4. The route validates the model response against the frozen `TeachingMove` union before it
   returns. An unparsed model response never leaves the route.
5. The `TeachingSource` port is unchanged. The agent client implements it; it does not extend
   it, and no caller learns which implementation it holds.
6. Every candidate is validated and policy-checked *before* any ledger append. An invalid
   candidate never reaches storage, so the ledger never contains a fact the system rejected.
7. Approval stays local, explicit, and child-actor. It never traverses the network, is never a
   model output, and is never inferred from a model response.
8. The route request carries the current state and the child's utterance. It does not carry the
   ledger, the trials, the profile, or prior turns (§11.2).
9. The credential is read server-side only. No `NEXT_PUBLIC_` model variable, and no
   key-shaped string in any client chunk (E.10).
10. Rejections are structured values, not thrown errors, and are rendered as child-facing copy
    from `src/ui/copy/**`. The kernel gains no strings.
11. Runner Mode's import graph is unchanged. INV-43 must still pass untouched.
12. No compiler, no evaluator, no computed ranking. Milestone 4 remains P5's.

---

## D. Phase 4 Acceptance Tests

Acceptance is mechanical. Every test below must exist by the stated identifier and pass.
A phase claiming completion without a named passing test for each row is rejected.

### D.1 Invariant tests

| ID | Invariant (spec ref) | Assertion |
|---|---|---|
| INV-18 | Validation is code, not model-delegated; invalid mutations are rejected (§7.4) | Each of §7.4's six checks has a negative case that the validator rejects and a positive case it accepts. Static scan: `src/core/validator/**` imports no adapter, performs no I/O, and contains no model reference. Promoted from the pending placeholder written in Phase 1. |
| INV-19 | Safety policy denies each §7.5 boundary (§7.5) | Nine named cases, one per §7.5 boundary, each denied with its own reason. A request matching no explicit allowance is denied by default. Promoted from the pending placeholder written in Phase 1. |
| INV-47 | The Teaching Agent cannot approve its own suggestion (§7.3, §12) | The `TeachingMove` union has no member that expresses approval, and the agent client emits no `append_approval` intent — a static scan of `src/adapters/agents/**` finds no such reference. An AI-authored approval entry, if constructed by hand, is still excluded by the fold (INV-10 remains green). |
| INV-48 | Model access exists at exactly one file path in Phase 4 (§8, ruling R3) | `src/app/api/agents/teaching/route.ts` exists; `src/app/api/agents/evidence/route.ts` does not. No file outside the permitted path references a model SDK, model host, or API key. |
| INV-49 | The route validates the model response server-side (§7.3, E.3) | Given a model transport stubbed to return free text, an unknown move kind, an extra key, or an operation outside the closed set, the route responds with a rejection and returns no move. Given a valid scripted move, it returns it unchanged. No network is required to run this test. |
| INV-50 | Prompt injection cannot widen behaviour (§12, §7.4) | Every fixture in `tests/fixtures/adversarial/**` is rejected: an unlisted operation, an expression string in a rule, executable code in a field, a request for a network capability, an attempted self-approval, and a response echoing the full ledger. Each names the check that rejected it. |
| INV-51 | The route receives minimal context (§11.2) | The request schema has exactly the fields C.2.4 lists; parsing rejects a request carrying a ledger, trials, a profile, or a transcript. A test asserts the outbound body for a real step contains no event id and no trial id. |
| INV-52 | No model credential or host reaches the client (E.10) | The credential is read only inside the permitted route file. No `NEXT_PUBLIC_` model variable exists in `.env.example` or the source. A scan of the built client chunks finds no model host and no key-shaped string. |
| INV-53 | Provenance completeness is enforced before append (§7.4, §4.1) | A candidate carrying a pre-stamped `sourceEventId` is rejected — provenance is stamped by the fold, never supplied. A candidate whose named source event is absent from the stream is rejected. Both are rejected before any repository call. |
| INV-54 | Resource limits are enforced (§7.4) | Exceeding each declared cap in `limits.ts` produces a rejection naming that cap. The caps are exported constants, and a test asserts no call site hardcodes a competing number. |
| INV-55 | Capability references are allowlisted (§7.4, §7.5) | A mutation naming a capability with no in-scope `PermissionGrant` is rejected. A grant that has expired does not admit it. `Capability` membership is unchanged from Phase 1. |
| INV-56 | Approval never traverses the network (§7.3, §11.1) | The code path from the approval action to the ledger append contains no `fetch`, no route call, and no agent import — asserted by transitive import scan from the approval handler. A journey run with the model transport hard-disabled still reaches an approved rule in the fold. |

### D.2 Pending invariants after Phase 4

INV-18 and INV-19 leave this table, asserted. These remain pending tests in the harness, each
naming its owning phase, and must still appear as pending in Phase 4's test output.

| ID | Invariant | Owning phase | Effect of Phase 4 |
|---|---|---|---|
| INV-20 | Identical version + trial data yields identical results | P5 | Unchanged; the evaluator is still unbuilt |
| INV-21 | Obstructed trial flips valid→invalid under v2 and the ranking changes | P5 | The rule now arrives through a validated agent path, but the ranking remains P5's proof |
| INV-22 | Runner Mode reaches no agent module and works with model access disabled | P6 | Now meaningful for the first time: an agent module exists to be excluded. INV-43 and INV-56 are its static precursors |
| INV-23 | Second-child reuse forks; the original version body is byte-identical after | P6 | Unchanged |
| INV-24 | Every parent-summary claim maps to an existing event id; fabricated summary rejected | P7 | The second permitted model route is still uncreated |
| INV-25 | Tool deletion removes definitions, versions, trials, and events from local storage | P7 | Unchanged |

### D.3 Gate commands

All four must exit zero on a clean checkout with no network access beyond package install.
The suite must not require a live model: the route's tests stub the transport.

```
npm run typecheck
npm run lint
npm test
npm run build
```

### D.4 Required evidence packet

Phase 4 will not be reviewed without all of the following:

1. Full terminal output of the four gate commands.
2. Verbose test output listing every INV-01 … INV-19 and INV-26 … INV-56 identifier as passing
   and INV-20 … INV-25 as pending. Phase 1, 2, and 3 invariants must still pass; the two
   amended files (INV-01, INV-38) must be shown before and after, with the amendment visible.
3. The rejection matrix: each adversarial fixture, the check that rejected it, and the child-
   facing sentence produced. This is the phase's central artifact.
4. The actual file tree of `src/` and `tests/`, for comparison against C.4.
5. The contents of `src/app/api/agents/teaching/route.ts`, which is the single most
   security-relevant file in the repository, and `src/core/policy/engine.ts`.
6. The exact outbound request body for one real teaching step, demonstrating §11.2 minimality.
7. A recorded walkthrough showing a model-interpreted suggestion being approved, and a second
   showing one being rejected with its reason. State the browser, version, and viewport.
8. A statement of any deviation from this document, with justification, proposed for the
   BUILD_STATE deviation register. Undeclared deviations are grounds for rejection even if the
   tests pass.

### D.5 Automatic rejection conditions

Phase 4 is rejected, regardless of a green suite, if any of the following is true:

- A model can be reached from any file other than the permitted teaching route.
- A model response reaches the ledger without passing the validator and the policy engine.
- The model's response is used unparsed, or parsing failure falls back to a permissive default.
- Any code path lets a model response become behaviour without an explicit child approval.
- Validation or policy consults a model to make its decision.
- The policy engine allows by default, or a §7.5 boundary has no named denial test.
- The `TeachingSource` port, `CandidateMutation`, the orchestrator states, or any §9 schema was
  widened to accommodate the model.
- A credential appears in client code, in a `NEXT_PUBLIC_` variable, or in a built chunk.
- The route request carries the ledger, the trials, the profile, or a conversation transcript.
- Runner Mode can reach an agent module, or INV-43 required amendment.
- A computed ranking, median, or winner appears anywhere.
- INV-01 or INV-38 was weakened rather than amended — the amended tests must still fail for a
  model reference outside the permitted path and for a model reachable from the runner.
- A Phase 1, 2, or 3 invariant was modified, weakened, or skipped to make Phase 4 pass.
- `docs/BUILD_STATE.md` was not updated, or an unowned file was changed without a
  decision-log entry.
