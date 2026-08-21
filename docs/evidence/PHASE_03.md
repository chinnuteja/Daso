# Phase 3 evidence packet

**Date:** 2026-08-20
**Spec:** `docs/phases/PHASE_03.md` section D.4
**Build ledger:** `docs/BUILD_STATE.md`

---

## 1. Gate commands

All four exited zero. No network was required beyond the already-installed `node_modules`.

### `npm run typecheck`

Exit 0. No diagnostics.

### `npm run lint`

```
> eslint src tests eslint.config.mjs vitest.config.ts next.config.ts
```

Exit 0. No errors, no warnings.

### `npm test`

```
 Test Files  39 passed | 8 skipped (47)
      Tests  112 passed | 8 todo (120)
```

Exit 0.

Passing identifiers: INV-01 … INV-17 and INV-26 … INV-46.
Pending identifiers (vitest `todo`, each naming its owning phase): INV-18 … INV-25.

Phase 1 and Phase 2 invariants still pass unmodified. INV-17 is promoted from pending to asserted.

### `npm run build`

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /inspect
├ ○ /journey
└ ○ /run
```

Exit 0. `/` is the tablet shell. `/journey` is the guided creation flow. `/run` is Runner Mode.
`/inspect` remains the Phase 2 diagnostic.

The build script runs Next with `--max-old-space-size=8192` (decision log #17). Default Node
heap OOM'd during Next's bundled typecheck of the full `tsconfig` include.

---

## 2. Invariant listing

**Passing — INV-01 … INV-16** (unchanged from Phase 1)

**Passing — INV-17** (promoted)

- INV-17: `ORCHESTRATOR_STATES` deep-equals the ten §7.2 members in order

**Passing — INV-26 … INV-35** (unchanged from Phase 2)

**Passing — INV-36 … INV-46**

- INV-36: 160 defined `(state, event)` pairs; identical on repeat; table printed
- INV-37: orchestrator source has no `async` / `await` / `Promise` / `fetch`; imports stay in `src/core`
- INV-38: journey and runner reach no model SDK or `src/adapters/agents`; only TeachingSource implementation is `src/adapters/teaching/scripted.ts`
- INV-39: Scene 1 → Scene 6 reaches `RUN`; four trials persisted; fold equals the §9.3 body; versions repository unused
- INV-40: `AuthorshipRow` requires `attribution`; `child_chosen` and `ai_suggested_child_accepted` copy differ in every reading band
- INV-41: only `candidate_approved` produces `append_approval`; declining the correction leaves the rule absent from the fold
- INV-42: no file with a free-text input also names `append_candidate`; the capture note is an observation field
- INV-43: no module reachable from `src/app/run/page.tsx` imports teaching
- INV-44: `src/ui/**` and `src/app/**` declare no `z.object` / `z.strictObject`
- INV-45: orchestrator source contains no `versions` / `ToolVersion` / `save`; journey does not write a version
- INV-46: `automatic_distance_measurement` and `obstruction_detection` `whatIsSimulated` / `whatIsReal` text render on the capture screen

**Pending — INV-18 … INV-25** (vitest `todo`)

---

## 3. Transition table (D.4.3)

INV-36 evaluated `10 states × 16 events = 160` pairs. Legal advances (all other pairs are
`{ kind: "ignored" }`):

| State | Event | Next | Intents |
|---|---|---|---|
| IMAGINE | goal_stated | DEFINE_METRICS | request_interpretation |
| DEFINE_METRICS | metric_selected | DEFINE_METRICS | append_candidate |
| DEFINE_METRICS | candidate_offered | DEFINE_METRICS | append_candidate |
| DEFINE_METRICS | candidate_approved | DEFINE_METRICS | append_approval |
| DEFINE_METRICS | candidate_rejected | DEFINE_METRICS | — |
| DEFINE_METRICS | metrics_confirmed | DEFINE_INPUTS | request_interpretation |
| DEFINE_METRICS | back_requested | IMAGINE | — |
| DEFINE_INPUTS | input_selected | DEFINE_INPUTS | append_candidate |
| DEFINE_INPUTS | candidate_offered | DEFINE_INPUTS | append_candidate |
| DEFINE_INPUTS | candidate_approved | DEFINE_INPUTS | append_approval |
| DEFINE_INPUTS | candidate_rejected | DEFINE_INPUTS | — |
| DEFINE_INPUTS | inputs_confirmed | PREDICT | — |
| DEFINE_INPUTS | back_requested | DEFINE_METRICS | — |
| PREDICT | prediction_recorded | COLLECT_TRIALS | — |
| PREDICT | back_requested | DEFINE_INPUTS | — |
| COLLECT_TRIALS | trial_recorded | COLLECT_TRIALS | record_trial |
| COLLECT_TRIALS | collection_finished | INSPECT_ANOMALY | — |
| COLLECT_TRIALS | back_requested | PREDICT | — |
| INSPECT_ANOMALY | anomaly_selected | PROPOSE_CORRECTION | request_interpretation |
| INSPECT_ANOMALY | back_requested | COLLECT_TRIALS | — |
| PROPOSE_CORRECTION | correction_explained | PROPOSE_CORRECTION | request_interpretation |
| PROPOSE_CORRECTION | candidate_offered | REVIEW_MUTATION | append_candidate |
| PROPOSE_CORRECTION | candidate_rejected | PROPOSE_CORRECTION | — |
| PROPOSE_CORRECTION | back_requested | INSPECT_ANOMALY | — |
| REVIEW_MUTATION | candidate_approved | COMPILE | append_approval, request_compile |
| REVIEW_MUTATION | candidate_rejected | PROPOSE_CORRECTION | — |
| REVIEW_MUTATION | back_requested | PROPOSE_CORRECTION | — |
| COMPILE | compile_acknowledged | COMPILE | — |
| COMPILE | runner_opened | RUN | open_runner |
| RUN | back_requested | COMPILE | — |

The full 160-row dump is printed by `inv-36-total-transition.test.ts`.

---

## 4. File tree (P3-owned and P1-touched)

```
src/core/orchestrator/
  states.ts  events.ts  transition.ts  index.ts
src/core/ports/teaching.ts
src/adapters/teaching/scripted.ts
src/ui/shell/           TabletShell.tsx  tokens.css
src/ui/copy/            attribution.ts  states.ts  subjects.ts  disclosures.ts
src/ui/components/      AuthorshipRow  ChoiceButton  SuggestionCard
src/ui/screens/         Home Imagine DefineMetrics DefineInputs Predict
                        CaptureTrial InspectAnomaly ProposeCorrection
                        ReviewMutation CompilePreview Runner WhyPanel
src/ui/flows/           executeIntents.ts  JourneyFlow.tsx  browserClock.ts
src/app/page.tsx        src/app/layout.tsx
src/app/journey/page.tsx
src/app/run/page.tsx
tests/journey/
tests/fixtures/script/flightLab.ts
tests/invariants/inv-17-orchestrator.test.ts
tests/invariants/inv-36 … inv-46 *.test.ts
tests/support/importGraph.ts
```

P1-owned paths touched, each with a BUILD_STATE decision-log entry: `src/app/page.tsx` (#13),
`src/app/layout.tsx` (#14), `src/core/ports/teaching.ts` (#15), INV-17 pending test replaced
(#16), `package.json` build heap (#17).

---

## 5. Load-bearing files (D.4.5)

`src/core/orchestrator/transition.ts` is a total table over `(state, event)`. It emits
intents and performs none of them. There is no model call and no fall-through that throws.

`src/core/ports/teaching.ts` freezes the Teaching Agent's moves as a closed Zod union:
clarifying question, two or three alternatives, candidate mutation, explanation. Free text
is not a member.

---

## 6. Walkthrough (D.4.6)

No separate video file was produced in this implementation session. The reproducible
walkthrough is the executable journey:

- Mechanical: INV-39 drives Scene 1 → Scene 6 through `transition` and the Phase 2
  in-memory repositories, reaches `RUN`, persists four trials, and asserts
  `foldApprovedEvents` equals the §9.3 body. INV-41 is the declined-correction variant.
- Interactive: `/journey` on the tablet shell (layout viewport `device-width`, shell max
  width 52rem, touch targets 3.5rem). Capture-screen disclosures render on the trial
  screen (INV-46). Approval is an explicit separate action on `ReviewMutationScreen`.
  Suggestions use dashed “Daso suggests” treatment; child decisions use a solid green edge.
- Runner Mode: `/run` lists recorded throws and the authorship panel. It imports no
  teaching module (INV-43). It displays no ranking, median, or winner.

Viewport target: 1024×768 tablet. Browser: any current Chromium-family browser serving the
Next production build. Recording a founder-facing demo remains P8.

---

## 7. Deviations (D.4.7)

None from the product specification. D-01 remains the only accepted product-spec deviation.

Tooling decision #17 (Node heap for `next build`) is not a product deviation.
