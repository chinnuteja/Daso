# Phase 1 evidence packet

**Date:** 2026-08-19
**Spec:** `docs/phases/PHASE_01.md` section D.4
**Build ledger:** `docs/BUILD_STATE.md`

---

## 1. Gate commands

All four exited zero. No network was required beyond the already-installed `node_modules`.

### `npm run typecheck`

```
> teach-daso@0.1.0 typecheck
> tsc --noEmit
```

Exit 0. No diagnostics.

### `npm run lint`

```
> teach-daso@0.1.0 lint
> eslint src tests eslint.config.mjs vitest.config.ts next.config.ts
```

Exit 0. No errors, no warnings.

(`eslint .` previously warned on an anonymous default export in `eslint.config.mjs`; that export is now named. The script lints owned source rather than walking `node_modules`.)

### `npm test`

```
> teach-daso@0.1.0 test
> vitest run

 Test Files  16 passed | 9 skipped (25)
      Tests  49 passed | 9 todo (58)
```

Exit 0.

Verbose listing (`vitest run --reporter=verbose`) on the same suite:

**Passing — INV-01 … INV-16**

- INV-01: src/** is non-empty; no model SDK/host/API-key reference; neither permitted model route exists
- INV-02: src/core/** non-empty; imports only zod or src/core; no react/next/node/idb; no fetch/browser globals
- INV-03: src/core/** non-empty; no Date.now / new Date / Math.random / crypto.randomUUID / toLocale*
- INV-04: src/** non-empty; no eval / Function constructor / string-bodied timer; no non-literal import()
- INV-05: ToolKind.options deep-equals `['experiment_comparator']`
- INV-06: all seven §9 fixtures parse unmodified
- INV-07: all seven §9 schemas reject one extra unknown key
- INV-08: unlisted mutation rejected; RuleCondition field closed; RuleEffect target is `trial.valid`; expression-string rule rejected
- INV-09: fold of Flight Lab ledger equals §9.3 body (minus versionId/compiledAt)
- INV-10: AI candidate excluded; AI approval does not admit; child approval admits
- INV-11: unapproved child candidate excluded; fixture `note` input excluded
- INV-12: no update/delete export; duplicate event id throws; non-monotonic sequence throws
- INV-13: folded version deeply frozen; nested assignment throws TypeError; canonical JSON unchanged
- INV-14: key-insertion order independent; fold replay produces identical canonical JSON
- INV-15: identical seeds produce `event_014`, `tool_version_002`, `trial_004`, `summary_001`
- INV-16: registry fields non-empty; schema and type reject missing whatIsSimulated / whatIsReal / disclosedAt

**Pending — INV-17 … INV-25** (vitest `todo`, each names its owning phase)

- INV-17: pending — owning phase P3
- INV-18: pending — owning phase P4
- INV-19: pending — owning phase P4
- INV-20: pending — owning phase P5
- INV-21: pending — owning phase P5
- INV-22: pending — owning phase P6
- INV-23: pending — owning phase P6
- INV-24: pending — owning phase P7
- INV-25: pending — owning phase P7

### `npm run build`

```
▲ Next.js 16.3.1 (Turbopack)
✓ Compiled successfully
✓ Generating static pages (3/3)

Route (app)
┌ ○ /
└ ○ /_not-found
```

Exit 0. Placeholder root route only.

---

## 2. File tree of `src/` and `tests/`

```
src/
  app/
    layout.tsx
    page.tsx
  core/
    disclosure/
      simulations.ts
    ledger/
      append.ts
      fold.ts
      types.ts
    ports/
      clock.ts
      ids.ts
      repositories.ts
    schema/
      authorshipEvent.ts
      childProfile.ts
      experimentTrial.ts
      index.ts
      mutation.ts
      parentSummary.ts
      permissionGrant.ts
      primitives.ts
      toolDefinition.ts
      toolVersion.ts
      vocabulary.ts
    serialization/
      canonicalJson.ts
      deepFreeze.ts

tests/
  fixtures/
    ledger/
      flightLab.ts
    spec/
      authorshipEvent.json
      childProfile.json
      experimentTrial.json
      parentSummary.json
      permissionGrant.json
      toolDefinition.json
      toolVersion.json
  invariants/
    inv-01-model-roles.test.ts
    inv-02-domain-purity.test.ts
    inv-03-determinism-inputs.test.ts
    inv-04-no-dynamic-code.test.ts
    inv-05-tool-kind.test.ts
    inv-06-spec-fixtures.test.ts
    inv-07-unknown-keys.test.ts
    inv-08-closed-mutation.test.ts
    inv-09-fold-provenance.test.ts
    inv-10-ai-cannot-self-approve.test.ts
    inv-11-unapproved-excluded.test.ts
    inv-12-append-only.test.ts
    inv-13-version-immutable.test.ts
    inv-14-canonical-equality.test.ts
    inv-15-deterministic-ids.test.ts
    inv-16-simulation-disclosure.test.ts
    inv-17-orchestrator-pending.test.ts
    inv-18-validation-pending.test.ts
    inv-19-safety-policy-pending.test.ts
    inv-20-replay-pending.test.ts
    inv-21-obstructed-ranking-pending.test.ts
    inv-22-runner-mode-pending.test.ts
    inv-23-fork-pending.test.ts
    inv-24-summary-grounding-pending.test.ts
    inv-25-deletion-pending.test.ts
  support/
    sourceTree.ts
    specJson.ts
```

No `src/adapters`, `src/ui`, compiler, orchestrator, policy, validator, or agent routes.

Helpers `tests/support/*.ts` are not listed in PHASE_01 C.4; they exist only so static-scan and fixture-load tests read files from disk. They are not domain code.

---

## 3. `src/core/ledger/fold.ts`

Candidates enter the body only when a child approval entry references them. `sourceEventId`
is stamped from the candidate id. `childApproved` is derived only in `foldAuthorshipRecords`.

```typescript
import { AuthorshipEvent } from '../schema/authorshipEvent';
import { CandidateMutation, toDocumentedMutation } from '../schema/mutation';
import { EventId, ToolId } from '../schema/primitives';
import { ToolVersionBody } from '../schema/toolVersion';
import { InputField, MetricId, ToolRule } from '../schema/vocabulary';
import { deepFreeze } from '../serialization/deepFreeze';
import { CandidateEntry, Ledger, LedgerEntry, compareEntries } from './types';

export class LedgerFoldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerFoldError';
  }
}

export function foldApprovedEvents(entries: readonly LedgerEntry[]): ToolVersionBody {
  const ordered = orderedLedger(entries);
  const approvedIds = childApprovedCandidateIds(ordered);

  const inputs: InputField[] = [];
  const metrics: MetricId[] = [];
  let rules: readonly ToolRule[] = [];
  let ruleChanges = 0;

  for (const entry of ordered) {
    if (entry.entryKind !== 'candidate' || !approvedIds.has(entry.eventId)) {
      continue;
    }

    const mutation: CandidateMutation = entry.candidateMutation;

    switch (mutation.operation) {
      case 'add_input': {
        if (!inputs.includes(mutation.input)) {
          inputs.push(mutation.input);
        }
        break;
      }
      case 'add_metric': {
        if (!metrics.includes(mutation.metric)) {
          metrics.push(mutation.metric);
        }
        break;
      }
      case 'remove_metric': {
        const index = metrics.indexOf(mutation.metric);
        if (index !== -1) {
          metrics.splice(index, 1);
        }
        break;
      }
      case 'add_rule': {
        rules = withRule(rules, {
          ruleId: mutation.rule.ruleId,
          when: mutation.rule.when,
          effect: mutation.rule.effect,
          sourceEventId: entry.eventId,
        });
        ruleChanges += 1;
        break;
      }
      case 'remove_rule': {
        rules = rules.filter((rule) => rule.ruleId !== mutation.ruleId);
        ruleChanges += 1;
        break;
      }
      default:
        return assertExhaustive(mutation);
    }
  }

  const body = ToolVersionBody.parse({
    toolId: singleToolId(ordered),
    version: 1 + ruleChanges,
    inputs,
    metrics,
    rules,
  });

  return deepFreeze(body);
}

export function foldAuthorshipRecords(
  entries: readonly LedgerEntry[],
): readonly AuthorshipEvent[] {
  const ordered = orderedLedger(entries);
  const approvedIds = childApprovedCandidateIds(ordered);

  const records = ordered
    .filter((entry): entry is CandidateEntry => entry.entryKind === 'candidate')
    .map((entry) =>
      AuthorshipEvent.parse({
        eventId: entry.eventId,
        toolId: entry.toolId,
        actor: entry.actor,
        type: entry.type,
        originalInput: entry.originalInput,
        candidateMutation: toDocumentedMutation(entry.candidateMutation),
        childApproved: approvedIds.has(entry.eventId),
        createdAt: entry.createdAt,
      }),
    );

  return deepFreeze(records);
}

function childApprovedCandidateIds(ordered: readonly LedgerEntry[]): ReadonlySet<EventId> {
  const candidateIds = new Set<EventId>(
    ordered.filter((entry) => entry.entryKind === 'candidate').map((entry) => entry.eventId),
  );

  const approved = new Set<EventId>();
  for (const entry of ordered) {
    if (entry.entryKind === 'approval' && entry.actor === 'child' && candidateIds.has(entry.approves)) {
      approved.add(entry.approves);
    }
  }

  return approved;
}

function orderedLedger(entries: readonly LedgerEntry[]): readonly LedgerEntry[] {
  const parsed = Ledger.parse(entries);
  if (parsed.length === 0) {
    throw new LedgerFoldError('a ledger with no entries describes no tool and cannot be folded');
  }
  return [...parsed].sort(compareEntries);
}

function singleToolId(ordered: readonly LedgerEntry[]): ToolId {
  const toolIds = new Set<ToolId>(ordered.map((entry) => entry.toolId));
  if (toolIds.size !== 1) {
    throw new LedgerFoldError(
      `a fold covers one tool stream, but these entries name ${toolIds.size} tools: ` +
        [...toolIds].sort().join(', '),
    );
  }
  const [toolId] = [...toolIds];
  if (toolId === undefined) {
    throw new LedgerFoldError('a ledger with no entries describes no tool and cannot be folded');
  }
  return toolId;
}

function withRule(rules: readonly ToolRule[], rule: ToolRule): readonly ToolRule[] {
  const index = rules.findIndex((held) => held.ruleId === rule.ruleId);
  if (index === -1) {
    return [...rules, rule];
  }
  return rules.map((held, at) => (at === index ? rule : held));
}

function assertExhaustive(value: never): never {
  throw new LedgerFoldError(`unhandled candidate mutation: ${JSON.stringify(value)}`);
}
```

Comments in the repository file are omitted above for brevity; the executable text matches `src/core/ledger/fold.ts`.

---

## 4. `src/core/schema/mutation.ts`

Closed operation set: `add_input`, `add_metric`, `remove_metric`, `add_rule`, `remove_rule`.
`RuleDraft` has no `sourceEventId` and no expression string.

```typescript
import { z } from 'zod';

import { RuleId } from './primitives';
import { InputField, MetricId, RuleCondition, RuleEffect } from './vocabulary';

export const MUTATION_OPERATIONS = [
  'add_input',
  'add_metric',
  'remove_metric',
  'add_rule',
  'remove_rule',
] as const;

export const RuleDraft = z.strictObject({
  ruleId: RuleId,
  when: RuleCondition,
  effect: RuleEffect,
});
export type RuleDraft = z.infer<typeof RuleDraft>;

export const CandidateMutation = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('add_input'), input: InputField }),
  z.strictObject({ operation: z.literal('add_metric'), metric: MetricId }),
  z.strictObject({ operation: z.literal('remove_metric'), metric: MetricId }),
  z.strictObject({ operation: z.literal('add_rule'), rule: RuleDraft }),
  z.strictObject({ operation: z.literal('remove_rule'), ruleId: RuleId }),
]);
export type CandidateMutation = z.infer<typeof CandidateMutation>;

export const DocumentedMutation = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('add_input'), input: InputField }),
  z.strictObject({ operation: z.literal('add_metric'), metric: MetricId }),
  z.strictObject({ operation: z.literal('remove_metric'), metric: MetricId }),
  z.strictObject({ operation: z.literal('add_rule'), rule: RuleId }),
  z.strictObject({ operation: z.literal('remove_rule'), rule: RuleId }),
]);
export type DocumentedMutation = z.infer<typeof DocumentedMutation>;

export function toDocumentedMutation(mutation: CandidateMutation): DocumentedMutation {
  switch (mutation.operation) {
    case 'add_input':
      return { operation: 'add_input', input: mutation.input };
    case 'add_metric':
      return { operation: 'add_metric', metric: mutation.metric };
    case 'remove_metric':
      return { operation: 'remove_metric', metric: mutation.metric };
    case 'add_rule':
      return { operation: 'add_rule', rule: mutation.rule.ruleId };
    case 'remove_rule':
      return { operation: 'remove_rule', rule: mutation.ruleId };
    default:
      return assertExhaustive(mutation);
  }
}

function assertExhaustive(value: never): never {
  throw new Error(`unhandled candidate mutation operation: ${JSON.stringify(value)}`);
}
```

---

## 5. Deviations from PHASE_01.md

**None undeclared.** D-01 (approval as a separate child-actor ledger entry; `childApproved` derived) was already accepted by the owner before implementation.

Implementation notes that are not spec deviations:

- `append` is the write operation named by INV-12; `appendEntry` is an alias.
- `IdFactory.next('grant')` issues `grant_001`. The §9.6 example `grant_camera_flight_lab` remains valid under `GrantId` for hand-authored semantic grants.
- Next.js 16 requires `jsx: "react-jsx"` in `tsconfig.json`.
- `tests/support/` holds test-only filesystem helpers.

Automatic-rejection checklist (PHASE_01 D.5):

| Condition | Result |
|---|---|
| A rule is representable as a string to evaluate | Fail closed: INV-08 |
| Provenance is a caller-supplied field | Fail closed: fold stamps `sourceEventId` |
| Any path sets `childApproved` directly | Fail closed: only `foldAuthorshipRecords` derives it |
| Fold admits by actor rather than child approval | Fail closed: INV-10, INV-11 |
| `z.any()` / `z.unknown()` / passthrough in material position | Absent |
| Spec fixture edited to make a schema pass | Unmodified §9 JSON; INV-06 |
| Product UI, persistence, agent, compiler, or runtime in the diff | Absent |
| `docs/BUILD_STATE.md` not updated | Updated |
