# Phase 4 evidence packet

**Date:** 2026-08-20
**Spec:** `docs/phases/PHASE_04.md` section D.4
**Build ledger:** `docs/BUILD_STATE.md`

---

## 1. Gate commands

All four exited zero. No network was required beyond the already-installed `node_modules`.
The suite does not call a live model: INV-49 stubs the transport; the scripted TeachingSource
remains the default in tests and in the journey.

### `npm run typecheck`

Exit 0. No diagnostics.

### `npm run lint`

```
> eslint src tests eslint.config.mjs vitest.config.ts next.config.ts
```

Exit 0. No errors, no warnings.

### `npm test`

```
 Test Files  51 passed | 6 skipped (57)
      Tests  159 passed | 6 todo (165)
```

Exit 0.

Passing identifiers: INV-01 … INV-19 and INV-26 … INV-56.
Pending identifiers (vitest `todo`, each naming its owning phase): INV-20 … INV-25.

Phase 1, 2, and 3 invariants still pass. INV-18 and INV-19 are promoted from pending to
asserted. INV-01 and INV-38 are amended (before/after in §2). INV-43 is untouched.

### `npm run build`

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/agents/teaching
├ ○ /inspect
├ ○ /journey
└ ○ /run
```

Exit 0. `/api/agents/teaching` is the first permitted model route (R3). It is dynamic
(`ƒ`) because it reads server-only credentials. The evidence route is still absent.

---

## 2. Invariant listing and amendments

**Passing — INV-01 … INV-16** (INV-01 amended; others unchanged from Phase 1)

**Passing — INV-17** (P3)

**Passing — INV-18, INV-19** (promoted)

- INV-18: each of §7.4's six checks has a negative case and a positive case; `src/core/validator/**` imports no adapter, performs no I/O, and contains no model reference
- INV-19: nine named §7.5 boundaries, each denied with its own reason; unenumerated intent denied by default

**Passing — INV-26 … INV-46** (INV-38 amended; INV-43 untouched)

**Passing — INV-47 … INV-56**

- INV-47: `TeachingMove` has no approval member; `src/adapters/agents/**` contains no `append_approval`; an AI-authored approval is still excluded by the fold
- INV-48: teaching route exists; evidence route does not; no SDK/host/key outside the permitted path
- INV-49: stubbed transport — free text, unknown kind, extra key, unlisted operation → rejection and no move; a valid scripted move is returned unchanged; no network
- INV-50: every `tests/fixtures/adversarial/**` fixture is rejected and names the check (see §3)
- INV-51: request schema is exactly `{ state, originalInput }`; ledger/trials/profile/transcript extra keys fail parse; outbound body has no `event_` or `trial_` id
- INV-52: credential read only in the teaching route; no `NEXT_PUBLIC_` variable; built `.next/static` chunks contain no model host and no key-shaped string
- INV-53: pre-stamped `sourceEventId` rejected; missing named source event rejected; `ledger.append` is not called
- INV-54: each `limits.ts` cap produces a rejection naming that cap; no competing numeric literal in other validator files
- INV-55: ungranted capability rejected; expired grant does not admit; `Capability` membership unchanged from Phase 1
- INV-56: approval path (`ReviewMutationScreen` + `executeIntents`) reaches no fetch, route, or agent module; scripted journey with the model transport unused still folds `exclude_obstructed_flight`

**Pending — INV-20 … INV-25** (vitest `todo`)

### INV-01 before / after

Phase 1 asserted a Phase 1 fact: neither permitted route existed, and *no* file in `src/**`
could reference a model SDK, host, or credential.

After: exactly `src/app/api/agents/teaching/route.ts` exists; `src/app/api/agents/evidence/route.ts`
does not. The SDK/credential scan **allows that one file** and still fails for a model
reference anywhere else. The durable property — two roles, two files, nothing else — is
preserved. Ruling R3 always permitted this path; P4 creates the first of the two.

### INV-38 before / after

Phase 3 asserted: modules reachable from journey *and* runner reference no model SDK or
`adapters/agents`, and the only `TeachingSource` implementation is the scripted adapter.

After: exactly two implementations exist (`src/adapters/teaching/scripted.ts` and
`src/adapters/agents/teaching.ts`). **Neither is reachable from Runner Mode.** Journey may
import the typed client; it may not import a model SDK or read a credential. The durable
property — the runner and the offline path reach no model — is tightened, not weakened.

INV-43 was not amended. Runner Mode still reaches no teaching module.

---

## 3. Rejection matrix (D.4.3)

Child-facing sentences are the `developing` band (Maya's profile). The kernel returns check
kinds; `src/ui/copy/rejections.ts` maps them to copy.

| Fixture | Check that rejected it | Child-facing sentence |
|---|---|---|
| `unlisted-operation.json` | schema | That change is not a kind Flight Lab can learn. |
| `expression-string-rule.json` | determinism | Flight Lab can only keep changes it can do the same way every time. |
| `executable-code.json` | determinism | Flight Lab can only keep changes it can do the same way every time. |
| `network-capability.json` | arbitrary_network | Flight Lab is not allowed to make network calls. |
| `self-approval.json` | schema | That change is not a kind Flight Lab can learn. |
| `full-ledger-echo.json` | schema | That change is not a kind Flight Lab can learn. |

A malformed model response never becomes a `TeachingMove`. A candidate that fails validation
or policy is not appended (`executeIntents` returns a structured rejection and skips
`ledger.append`). Approval remains a separate child-actor ledger entry.

---

## 4. File tree (P4-owned and decision-logged)

```
src/core/validator/
  schemaValidator.ts  provenance.ts  limits.ts  index.ts
src/core/policy/
  boundaries.ts  engine.ts  index.ts
src/app/api/agents/teaching/route.ts
src/adapters/agents/
  teaching.ts  index.ts
src/ui/copy/rejections.ts
tests/invariants/inv-18-validation-pending.test.ts     (replaced, now asserting)
tests/invariants/inv-19-safety-policy-pending.test.ts  (replaced, now asserting)
tests/invariants/inv-47 … inv-56 *.test.ts
tests/fixtures/adversarial/
  unlisted-operation.json
  expression-string-rule.json
  executable-code.json
  network-capability.json
  self-approval.json
  full-ledger-echo.json
tests/support/validationContext.ts
```

P3/P1 paths touched, each with a BUILD_STATE decision-log entry:

- `tests/invariants/inv-01-model-roles.test.ts` (#19)
- `tests/invariants/inv-38-zero-model-calls.test.ts` (#20)
- `src/ui/screens/ReviewMutationScreen.tsx`, `src/ui/flows/JourneyFlow.tsx` (#21)
- `src/ui/flows/executeIntents.ts` (#22)
- `.env.example` comment only (#23)

`package.json` was **not** given a model-provider SDK (#18). INV-43 was not touched.

---

## 5. Load-bearing files (D.4.5)

### `src/app/api/agents/teaching/route.ts`

```1:66:src/app/api/agents/teaching/route.ts
import { TeachingMove, TeachingRequest } from '../../../../core/ports/teaching';
// ...
export async function interpretTeachingMove(
  body: unknown,
  transport: ModelTransport,
): Promise<{ readonly status: number; readonly payload: TeachingRoutePayload }> {
  const parsedRequest = TeachingRequest.safeParse(body);
  if (!parsedRequest.success) {
    return { status: 400, payload: { ok: false, reasons: ['invalid_request'] } };
  }

  const raw = await transport(parsedRequest.data);
  const parsedMove = TeachingMove.safeParse(raw);
  if (!parsedMove.success) {
    return { status: 422, payload: { ok: false, reasons: ['invalid_move'] } };
  }

  return { status: 200, payload: { ok: true, move: parsedMove.data } };
}
```

The request is the frozen `TeachingRequest` (`state` + `originalInput`). The response is
parsed against the frozen `TeachingMove` union before return. Parsing failure is a
rejection, never a passthrough. Credentials are read only here.

### `src/core/policy/engine.ts`

`evaluatePolicy` allows only the five named teaching allowances and denies each of the nine
§7.5 boundaries by name. Any other intent is `{ ok: false, boundary: 'unenumerated' }`.
There is no default-allow path. The engine does not consult a model.

---

## 6. Outbound request body (D.4.6)

INV-51's real-step body:

```json
{
  "state": "PROPOSE_CORRECTION",
  "originalInput": "That one shouldn't count because it hit the chair"
}
```

No ledger, no trials, no profile, no transcript, no event id, no trial id.

---

## 7. Walkthrough (D.4.7)

No separate video file was produced in this implementation session. The reproducible
walkthrough is the executable pair:

- **Approve:** INV-56 / INV-39 drive Scene 1 → Scene 6 through `transition` and the
  in-memory repositories with the **scripted** TeachingSource (model transport unused).
  The child-authored correction is approved as a separate ledger entry. The fold contains
  `exclude_obstructed_flight` with `sourceEventId` stamped by the fold, not by the proposer.
- **Reject:** INV-50 runs every adversarial fixture through validator + policy and asserts
  the named check plus the child-facing sentence. INV-49 is the same fact at the route:
  free text and an unlisted operation never leave the handler as a move. INV-53 shows
  `ledger.append` is not called for a pre-stamped candidate.

Interactive surface: `/journey` still defaults to `composeTeachingSource('scripted')`.
`ReviewMutationScreen` renders validator/policy refusal copy when composition rejects.
Approval is still the existing `candidate_approved` event — no new orchestrator state.

Viewport target: 1024×768 tablet. Browser: any current Chromium-family browser serving the
Next production build. Recording a founder-facing demo remains P8.

---

## 8. Deviations (D.4.8)

None from the product specification. D-01 remains the only accepted product-spec deviation.

Tooling decision #18 (no model-provider SDK; `fetch` against `MODEL_PROVIDER_BASE_ADDRESS`
in the one permitted file) is not a product deviation. PHASE_04 C.4 listed `package.json`
as requiring a decision if touched; it was not given a second dependency.
