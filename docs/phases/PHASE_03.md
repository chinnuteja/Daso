# Phase 3 — Orchestrator & Tablet Shell

**Implements:** Milestone 1 (tablet shell, Flight Lab story path, state-machine transitions, design language).
**Status:** Implemented. INV-01–INV-17 and INV-26–INV-46 passing; INV-18–INV-25 pending by design. Evidence in `docs/evidence/PHASE_03.md`.
**Parallelism:** Runs concurrently with P5. P3 freezes the orchestrator state set that P4 and P6
consume, so the state and event vocabularies must land before either begins.

---

## C. Phase 3 Specification

### C.1 Purpose

Phase 3 gives the frozen domain a body. It ships the guided creation flow, the tablet shell,
and the state machine that decides what the child is asked next. It ships no model call and no
compiler.

The load-bearing deliverable is the **total transition function**: `transition(state, event)`
over exactly the ten §7.2 states, defined for every pair, living in the pure kernel where it
physically cannot perform I/O. After Phase 3, "the orchestrator is deterministic, not a third
agent" is a property the type checker and an exhaustive table test enforce, which is the
mechanical control for risk E.4.

Milestone 1's verification — a user completes the full scripted journey — is Phase 3's exit
criterion, preserved verbatim. The journey is *structurally* complete here: every screen,
every state, real captured trials, real approvals appended to the ledger. Results and ranking
are not part of it. The specification assigns "the obstructed trial changes from valid to
invalid and the ranking updates deterministically" to Milestone 4, which is Phase 5. Phase 3
must not anticipate that proof by computing a result.

### C.2 Scope — what Phase 3 builds

**1. Orchestrator states (`src/core/orchestrator/states.ts`)**
An enum with exactly the ten members §7.2 lists, in that order:
`IMAGINE`, `DEFINE_METRICS`, `DEFINE_INPUTS`, `PREDICT`, `COLLECT_TRIALS`, `INSPECT_ANOMALY`,
`PROPOSE_CORRECTION`, `REVIEW_MUTATION`, `COMPILE`, `RUN`. An eleventh member is a
specification change, not an implementation detail.

**2. Orchestrator events (`src/core/orchestrator/events.ts`)**
A closed discriminated union. Proposed membership, frozen at Phase 3 exit:
`goal_stated`, `metric_selected`, `metrics_confirmed`, `input_selected`, `inputs_confirmed`,
`prediction_recorded`, `trial_recorded`, `collection_finished`, `anomaly_selected`,
`correction_explained`, `candidate_offered`, `candidate_approved`, `candidate_rejected`,
`compile_acknowledged`, `runner_opened`, `back_requested`.
An event outside the union has no representation and cannot be dispatched.

**3. Transition function (`src/core/orchestrator/transition.ts`)**
`transition(state, event) -> TransitionResult`. Total: every one of the
`states × events` pairs yields a defined result. A pair that is not a legal advance yields an
explicit `{ kind: 'ignored' }`, never a thrown error and never an implicit fall-through. A
legal advance yields `{ kind: 'advanced', next, intents }`.

**Intents, not actions.** The orchestrator emits what should happen — `request_interpretation`,
`record_trial`, `append_candidate`, `append_approval`, `request_compile`, `open_runner` — and
performs none of it. The composition layer executes intents against the Phase 2 repositories.
This is what keeps §7.2's "never write an approved tool version directly" structural rather
than procedural.

**4. Teaching source port (`src/core/ports/teaching.ts`)**
The interface the Teaching Agent will implement in Phase 4, with its response type as a closed
union matching §7.3's four permitted moves: a clarifying question, two or three alternatives, a
candidate mutation, or an age-appropriate explanation. Free text is not a member, so free text
is not a channel through which behaviour can reach the ledger. Freezing this union in Phase 3
is the mechanical control for risk E.3.

**5. Scripted teaching source (`src/adapters/teaching/scripted.ts`)**
Phase 3's only implementation: a deterministic, fixture-driven responder that replays the §6
narrative. No model, no network, no randomness. It exists so Milestone 1's journey is real
while §8's two model-driven roles remain unbuilt.

**6. Tablet shell and screens (`src/ui/`)**
Tablet-first, touch-first, at the reading band on the child's profile. Screens, one per
narrative beat: home tiles, imagine, define metrics, define inputs, predict, capture trial,
inspect anomaly, review mutation, compile preview, runner, and the "why this tool does this"
panel built on the Phase 2 authorship projection.

Two rules shape every screen. Suggestions from Daso are visibly distinguishable from the
child's own decisions (§7.1, §17 Authorship). No material mutation reaches the ledger without
an explicit approval action by the child (§7.1, §7.3).

**7. Copy layer (`src/ui/copy/`)**
Phase 2 kept display words out of the kernel: the projection returns `child_chosen`, not
"Chosen by Maya". Phase 3 owns the mapping from attribution kinds, subjects, and states to
words, per reading band. The kernel gains no strings.

**8. Design language**
Plain CSS Modules, already supported by Next.js. No component library, no CSS framework, no
new runtime dependency. Large targets, high contrast, restrained motion. No rewards, streaks,
progress bars that imply obligation, notifications, or feed — §12's "disguised engagement
loop" threat is a design constraint here, not a P8 cleanup task.

**9. Capture-screen disclosures**
The Phase 1 registry declares that `automatic_distance_measurement` and
`obstruction_detection` are disclosed at `in_product_capture_screen`. Phase 3 builds that
screen, so Phase 3 is where those two disclosures become visible. A registry entry naming a
surface that exists but does not show it is a broken promise (§15, ruling R7).

**10. Journey and invariant tests**
`tests/journey/` drives the full Scene 1 → Scene 6 path through the orchestrator and the
Phase 2 repositories. `tests/invariants/` gains INV-36 … INV-46, and INV-17 is promoted from
pending to asserted.

### C.3 Out of scope for Phase 3 — explicit rejection list

Phase 3 must not contain: any model SDK, model host, or agent route; the schema validator or
safety policy engine (P4); the compiler entry point, `ToolVersion` creation, or any write to
the versions repository (P5); the deterministic evaluator, metrics, medians, or ranking (P5);
fork semantics or the second-child scenario (P6); the parent view, export, or delete UI (P7);
motion polish, the README, or the demo recording (P8).

Phase 3 must also not widen the domain: no new §9 field, no new persisted shape, and no schema
defined in `src/ui`. The UI consumes domain types; it does not author them (risk E.1).

Above all, Phase 3 must not display a computed result. Showing a ranking, a median, or a
"winner" before Phase 5 exists means the number was invented.

### C.4 File ownership

Phase 3 exclusively owns and may create these paths.

```
src/core/orchestrator/states.ts
src/core/orchestrator/events.ts
src/core/orchestrator/transition.ts
src/core/orchestrator/index.ts
src/core/ports/teaching.ts               NEW FILE in a P1-owned directory — see below
src/adapters/teaching/scripted.ts
src/ui/shell/**
src/ui/screens/**
src/ui/components/**
src/ui/flows/**
src/ui/copy/**
src/app/journey/**                       the guided creation flow
src/app/run/**                           Runner Mode entry
tests/journey/**
tests/invariants/inv-36 … inv-46 *.test.ts
tests/fixtures/script/**                 the scripted teaching fixture
docs/BUILD_STATE.md                      architect-owned; implementer proposes, architect merges
```

Five paths are **not** owned by Phase 3 and require an entry in the BUILD_STATE decision log
before they are touched.

| Path | Change required | Justification to record |
|---|---|---|
| `src/app/page.tsx` | P1 placeholder becomes the shell entry | The placeholder existed precisely until a product surface existed. Milestone 1 is that surface. |
| `src/app/layout.tsx` | design tokens, fonts, viewport for tablet | The shell needs a root; no product logic is added to the layout. |
| `src/core/ports/teaching.ts` | new file inside a P1-owned directory | The teaching contract is a port, and ports live in the kernel. Freezing the closed response union before P4 is what stops the agent becoming a chatbot (E.3). |
| `tests/invariants/inv-17-orchestrator-pending.test.ts` | pending test replaced by an asserting test | INV-17 is P3-owned. Its pending placeholder was written in P1 to be replaced here. |
| `docs/BUILD_STATE.md` | phase status, invariant ledger, decision log | Architect-owned. |

No change to `package.json` is expected. If a UI dependency is proposed, it requires its own
decision-log entry and a stated reason why CSS Modules and React are insufficient.

### C.5 Non-negotiable implementation constraints

1. `src/core/**` continues to import nothing except `zod` and other `src/core` modules.
   INV-02 is unchanged and must still pass.
2. The orchestrator is pure. `src/core/orchestrator/**` contains no `async`, no `await`, no
   `Promise`, no repository import. A module that cannot perform I/O cannot ask a model what
   to do next (E.4).
3. `transition` is total. Every `(state, event)` pair returns a defined result. No `default:`
   branch that throws, and no `undefined` return.
4. The orchestrator emits intents and executes none of them. It never appends to the ledger
   and never writes a `ToolVersion`.
5. Natural-language interpretation reaches the flow only through the `TeachingSource` port,
   and only as a member of the closed response union.
6. No model SDK, model host URL, or API key anywhere. The two permitted route files still do
   not exist.
7. Runner Mode imports no teaching module and no agent adapter, on any import path.
8. `src/ui/**` defines no Zod object schema and no persisted shape. Types come from
   `src/core/schema`.
9. Display copy lives in `src/ui/copy/**`. The kernel gains no strings and no `toLocale*`.
10. Every candidate mutation is rendered with its actor attribution, and approval is an
    explicit, separate action. No screen may approve on the child's behalf, and no
    auto-advance may skip `REVIEW_MUTATION`.
11. No rewards, streaks, notification prompts, or infinite surfaces (§12).
12. No computed experiment result of any kind (§ Milestone 4 belongs to P5).

---

## D. Phase 3 Acceptance Tests

Acceptance is mechanical. Every test below must exist by the stated identifier and pass.
A phase claiming completion without a named passing test for each row is rejected.

### D.1 Invariant tests

| ID | Invariant (spec ref) | Assertion |
|---|---|---|
| INV-17 | Orchestrator is a deterministic state machine over exactly the ten §7.2 states (§7.2) | The state enum's members deep-equal `['IMAGINE','DEFINE_METRICS','DEFINE_INPUTS','PREDICT','COLLECT_TRIALS','INSPECT_ANOMALY','PROPOSE_CORRECTION','REVIEW_MUTATION','COMPILE','RUN']`. Promoted from the pending placeholder written in Phase 1. |
| INV-36 | Transitions are a total function (§7.2, E.4) | For every state × event pair, `transition` returns a defined result; the count of evaluated pairs equals `states.length * events.length`; no pair throws. Calling the same pair twice returns identical results. |
| INV-37 | The orchestrator cannot perform I/O (§7.2, §8, E.4) | Static scan of `src/core/orchestrator/**`: no `async`, `await`, `Promise`, `fetch`, and no import resolving outside `src/core`. No import of any repository port implementation. |
| INV-38 | Zero model calls in the flow (§8, P3 exit proof) | Static scan of every module reachable from the journey and runner entry points: no model SDK, model host, or API-key reference, and no import of `src/adapters/agents` (which does not yet exist). The only `TeachingSource` implementation in the repository is the scripted one. |
| INV-39 | The full scripted journey completes (Milestone 1 verification) | A test drives Scene 1 → Scene 6 through `transition` and the Phase 2 repositories: reaches `RUN`; the ledger holds the approved candidates and their child approval entries; four trials are persisted; `foldApprovedEvents` over the resulting ledger equals the §9.3 body. No model is invoked. |
| INV-40 | AI suggestions are visibly distinguishable from child decisions (§7.1, §17 Authorship) | Every rendered authorship row carries an attribution from the Phase 2 projection, and the rendering function requires it — a row constructed without an attribution fails to type-check and fails to render. `ai_suggested_child_accepted` and `child_chosen` produce different, non-empty copy in every reading band. |
| INV-41 | No material mutation without explicit approval (§7.1, §7.3) | Dispatching every event other than `candidate_approved` from `REVIEW_MUTATION` produces no `append_approval` intent. Only `candidate_approved` produces one. A journey variant that declines the correction ends with the rule absent from the fold. |
| INV-42 | The child interface is not an unrestricted chat (§5, §7.1) | No free-text input is wired to mutation creation: static scan finds no path from a text input handler to an `append_candidate` intent. Child language reaches the flow only as `originalInput` recorded verbatim alongside a structured candidate, never as the candidate itself. |
| INV-43 | Runner Mode reaches no teaching module (§7.5, precursor to INV-22) | Transitive import-graph test from the Runner Mode entry point: no module reachable from it imports `src/core/orchestrator`'s teaching intents, the `TeachingSource` port, or any teaching adapter. |
| INV-44 | The UI defines no persisted shape (E.1) | Static scan of `src/ui/**` and `src/app/**`: no `z.object`/`z.strictObject` declaration, and no value written to a repository that was not produced from a `src/core/schema` type. |
| INV-45 | The orchestrator never writes a tool version (§7.2) | `src/core/orchestrator/**` contains no reference to `versions`, `ToolVersion`, or `save`. The compile intent is a request; Phase 3 executes it by rendering the fold read-only, and the versions repository is never called in the journey test. |
| INV-46 | Capture-screen disclosures are shown (§15, ruling R7) | Every registry entry whose `disclosedAt` includes `in_product_capture_screen` — `automatic_distance_measurement` and `obstruction_detection` — has its `whatIsSimulated` and `whatIsReal` text present in the rendered capture screen. Adding a registry entry naming that surface without rendering it fails the test. |

### D.2 Pending invariants after Phase 3

INV-17 leaves this table, asserted. These remain pending tests in the harness, each naming its
owning phase, and must still appear as pending in Phase 3's test output.

| ID | Invariant | Owning phase | Effect of Phase 3 |
|---|---|---|---|
| INV-18 | Validation is code, not model-delegated; invalid mutations rejected | P4 | The candidate path now exists for the validator to sit in front of |
| INV-19 | Safety policy denies each §7.5 boundary | P4 | Unchanged |
| INV-20 | Identical version + trial data yields identical results | P5 | Trials are now captured by the real flow |
| INV-21 | Obstructed trial flips valid→invalid under v2 and the ranking changes | P5 | The anomaly is now flagged through `INSPECT_ANOMALY`; the ranking remains P5's proof |
| INV-22 | Runner Mode reaches no agent module and works with model access disabled | P6 | INV-43 is its static precursor; INV-22 stays P6 because it asserts the offline integration run |
| INV-23 | Second-child reuse forks; the original version body is byte-identical after | P6 | Unchanged |
| INV-24 | Every parent-summary claim maps to an existing event id; fabricated summary rejected | P7 | Unchanged |
| INV-25 | Tool deletion removes definitions, versions, trials, and events from local storage | P7 | Unchanged |

### D.3 Gate commands

All four must exit zero on a clean checkout with no network access beyond package install:

```
npm run typecheck
npm run lint
npm test
npm run build
```

### D.4 Required evidence packet

Phase 3 will not be reviewed without all of the following:

1. Full terminal output of the four gate commands.
2. Verbose test output listing every INV-01 … INV-17 and INV-26 … INV-46 identifier as passing
   and INV-18 … INV-25 as pending. Phase 1 and Phase 2 invariants must still pass unmodified;
   a Phase 3 change that turns an earlier invariant red is a regression, not a trade-off.
3. The full state × event transition table, printed as test output, so a reviewer can read the
   machine rather than infer it from code.
4. The actual file tree of `src/` and `tests/`, for comparison against C.4.
5. The contents of `src/core/orchestrator/transition.ts` and `src/core/ports/teaching.ts`,
   which are the two files where a "let the model decide" escape hatch is most likely to hide.
6. A recorded walkthrough of the journey on a tablet-sized viewport: Scene 1 through Scene 6,
   showing the approval gate, the suggestion-versus-decision distinction, and the capture-screen
   disclosures. State the browser, version, and viewport size.
7. A statement of any deviation from this document, with justification, proposed for the
   BUILD_STATE deviation register. Undeclared deviations are grounds for rejection even if the
   tests pass.

### D.5 Automatic rejection conditions

Phase 3 is rejected, regardless of a green suite, if any of the following is true:

- The orchestrator can perform I/O, await a promise, or consult a model to choose the next state.
- `transition` has a pair that throws, returns `undefined`, or falls through a `default` branch.
- The orchestrator writes a `ToolVersion`, or appends to the ledger itself.
- An eleventh orchestrator state exists.
- Free text reaches the ledger as a mutation, or any screen approves on the child's behalf.
- A suggestion renders without attribution, or renders identically to a child decision.
- A computed ranking, median, or winner appears anywhere in the UI.
- `src/ui` defines a persisted shape, or the UI writes an object the domain does not define.
- Runner Mode can reach a teaching module on any import path.
- A capability declaring `in_product_capture_screen` is absent from the capture screen.
- A reward, streak, notification prompt, or endless surface appears.
- A Phase 1 or Phase 2 invariant was modified, weakened, or skipped to make Phase 3 pass.
- `docs/BUILD_STATE.md` was not updated, or a P1/P2-owned file was changed without a
  decision-log entry.
