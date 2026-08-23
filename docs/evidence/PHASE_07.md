# Phase 7 evidence packet

**Date:** 2026-08-23
**Spec:** `docs/phases/PHASE_07.md` section E.2
**Build ledger:** `docs/BUILD_STATE.md`
**Branch:** `orchestration/phase-07-plan`
**Base commit:** `213c03d74c8e471ab8d4e3c60d9e65e70215d409`
**Implementation commit:** `3cb3bfc4b8665f4b13e5489975cd597db1dd2b68`
**Status:** Implemented — gates green. P1 privacy/attribution fix applied on this branch. Not architecturally accepted. The PR was not merged.

---

## 1. Submitted tree

Changed files (implementation + tests + evidence). Next.js-generated `AGENTS.md` /
`CLAUDE.md` are not included.

### Core and ports
- `src/core/reuse/orphanedFork.ts`
- `src/core/reuse/index.ts`
- `src/core/evidence/schema.ts`
- `src/core/evidence/project.ts`
- `src/core/evidence/validate.ts`
- `src/core/evidence/render.ts`
- `src/core/evidence/buildParentSummary.ts`
- `src/core/evidence/index.ts`
- `src/core/dataRights/exportTool.ts`
- `src/core/dataRights/index.ts`
- `src/core/ports/evidence.ts`
- `src/core/ports/repositories.ts`

### Adapters and routes
- `src/app/api/agents/evidence/route.ts`
- `src/app/api/agents/teaching/route.ts` (comment only: second route now exists)
- `src/adapters/agents/evidence.ts`
- `src/adapters/agents/index.ts`
- `src/adapters/evidence/scripted.ts`
- `src/adapters/persistence/atomicCommit.ts`
- `src/adapters/persistence/index.ts`
- `src/adapters/persistence/memory/deleteGraph.ts`
- `src/adapters/persistence/memory/tools.ts`
- `src/adapters/persistence/memory/profiles.ts`
- `src/adapters/persistence/indexedDb/deleteGraph.ts`
- `src/adapters/persistence/indexedDb/tools.ts`
- `src/adapters/persistence/indexedDb/profiles.ts`

### UI
- `src/app/parent/page.tsx`
- `src/app/page.tsx`
- `src/ui/copy/parent.ts`
- `src/ui/flows/parentEvidence/loadParentEvidence.ts`
- `src/ui/flows/parentEvidence/downloadExport.ts`
- `src/ui/flows/parentEvidence/ParentEvidenceFlow.tsx`
- `src/ui/flows/parentEvidence/index.ts`
- `src/ui/screens/ParentEvidenceScreen.tsx`
- `src/ui/screens/HomeScreen.tsx`
- `src/ui/screens/RunnerScreen.tsx`
- `src/ui/components/SavedToolTile.tsx`
- `src/ui/components/ChoiceButton.tsx`
- `src/ui/components/ChoiceButton.module.css`
- `src/ui/flows/runner/loadRunner.ts`
- `src/ui/flows/runner/RunnerFlow.tsx`
- `src/ui/flows/runner/savedTiles.ts`

### Tests
- `tests/invariants/inv-24-summary-grounding.test.ts` (promoted; `-pending` removed)
- `tests/invariants/inv-25-deletion.test.ts` (promoted; `-pending` removed)
- `tests/invariants/inv-73-evidence-projection.test.ts`
- `tests/invariants/inv-74-evidence-route.test.ts`
- `tests/invariants/inv-75-export.test.ts`
- `tests/invariants/inv-76-atomic-delete.test.ts`
- `tests/invariants/inv-77-orphaned-fork.test.ts`
- `tests/invariants/inv-78-parent-evidence-flow.test.ts`
- `tests/invariants/inv-79-runner-no-evidence.test.ts`
- `tests/invariants/inv-01-model-roles.test.ts`
- `tests/invariants/inv-38-zero-model-calls.test.ts`
- `tests/invariants/inv-48-single-model-path.test.ts`
- `tests/invariants/inv-52-no-client-credential.test.ts`
- `tests/invariants/inv-63-trial-resolves-active-version.test.ts`
- `tests/conformance/repositories.ts`
- `tests/unit/evidence/grounding.test.ts`
- `tests/unit/dataRights/exportTool.test.ts`
- `tests/unit/adapters/evidence.test.ts`
- `tests/integration/phase-07-generate-export-delete.test.ts`
- `tests/integration/phase-07-orphaned-attribution.test.ts`
- `tests/support/evidenceGraph.ts`

### Evidence
- `docs/evidence/PHASE_07.md`
- `docs/evidence/assets/capture-phase-07.mjs`
- `docs/evidence/assets/phase-07-parent-evidence.png`
- `docs/evidence/assets/phase-07-deletion-proof.png`
- `docs/BUILD_STATE.md`

---

## 2. Gate output

All commands ran serially. No command called a live model.

### Targeted invariant files (E.1)

```
npx vitest run tests/invariants/inv-01-model-roles.test.ts tests/invariants/inv-24-summary-grounding.test.ts tests/invariants/inv-25-deletion.test.ts tests/invariants/inv-48-single-model-path.test.ts tests/invariants/inv-52-no-client-credential.test.ts tests/invariants/inv-73-evidence-projection.test.ts tests/invariants/inv-74-evidence-route.test.ts tests/invariants/inv-75-export.test.ts tests/invariants/inv-76-atomic-delete.test.ts tests/invariants/inv-77-orphaned-fork.test.ts tests/invariants/inv-78-parent-evidence-flow.test.ts tests/invariants/inv-79-runner-no-evidence.test.ts

 Test Files  12 passed (12)
      Tests  26 passed (26)
```

Exit 0.

### `npm run typecheck`

```
> tsc --noEmit
```

Exit 0. No diagnostics.

### `npm run lint`

```
> eslint src tests eslint.config.mjs vitest.config.ts next.config.ts
```

Exit 0. No errors, no warnings.

### `npm test` (before build)

```
 Test Files  93 passed (93)
      Tests  268 passed (268)
```

Exit 0. No `todo`. INV-24 and INV-25 are asserting tests.

### `npm run build`

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/agents/evidence
├ ƒ /api/agents/teaching
├ ○ /inspect
├ ○ /journey
├ ○ /parent
└ ○ /run
```

Exit 0. Exactly two model routes.

### `npm test` (after build — acceptance result)

```
 Test Files  93 passed (93)
      Tests  268 passed (268)
```

Exit 0. INV-52 walked the settled `.next/static` tree.

---

## 3. Evidence-projection table

| Reference | Source record | Exposed facts | Rendered clause | Why no raw/foreign data |
|---|---|---|---|---|
| `event_001` | approved `definition_decision` candidate | `originalInput` | Maya chose to investigate which paper airplane flies the farthest | Only the child's approved wording. No profile object. |
| `trial_004` | stored `ExperimentTrial` | design, obstruction, validity under the active version (via `replay`) | An observed Dart throw touched something | Distance/media are not projected. Validity is recomputed from the active version. |
| `event_014` | approved `rule_correction` candidate | `originalInput`, optional `ruleId` | Maya taught that the throw shouldn't count because it hit the chair | Approval provenance is not dumped; only the approved candidate. |
| `tool_version_002` | active `ToolVersion` | version id, rule ids, `isActive` | The saved version treats that Dart throw as not counted | Version body is not recompiled. No other tool's version is included. |

The projection is built from one tool graph. Grants, summaries, id counters, and unrelated tools are omitted. Items are unique and sorted by id.

---

## 4. Rejection matrix

| Input | Result | Saved? |
|---|---|---|
| fabricated `trial_999` | `EvidenceGroundingError` | no |
| foreign `trial_101` | `EvidenceGroundingError` | no |
| duplicate `trial_004` | `EvidenceGroundingError` | no |
| too few ids (`trial_004` only) | `EvidenceGroundingError` | no |
| missing rule correction | `EvidenceGroundingError` | no |
| free-text string | `EvidenceGroundingError` | no |
| extra key `text` | `EvidenceGroundingError` | no |
| valid closed id list | `ParentSummary` after `ParentSummary.parse` | yes, only from the parent flow after local validation |

The Evidence Source cannot call `summaries.save`. `buildParentSummary` is byte-identical for the same projection, selection, ids, and clock.

---

## 5. Canonical export

Shape:

```json
{
  "format": "teach-daso/tool-export-v1",
  "tool": { "toolId": "mayas-flight-lab" },
  "versions": ["tool_version_001", "tool_version_002"],
  "ledger": ["event_001" … "event_015"],
  "trials": ["trial_001", "trial_002", "trial_003", "trial_004"],
  "grants": ["grant_camera_flight_lab"],
  "summaries": ["summary_001"]
}
```

Membership: every record's `toolId` is `mayas-flight-lab`. Active version fold equals `bodyFromVersion` (R1). Arrays are sorted by id / ledger sequence. Reordering inputs yields the same `canonicalJson` (INV-75).

Excluded: `ChildProfile`, `meta` / id counters, credentials, raw media, `other-paper-lab`. Rejected: dangling `currentVersionId`, foreign version, broken fold.

Browser download uses `canonicalJson` → `Blob` in `src/ui/**` only, filename `{toolId}.json`, object URL revoked.

### Orphaned-fork export (decision 49)

After Maya's profile is deleted, Leo's independently owned fork remains exportable.

- **`displayName` is redacted** in the same `deleteProfileGraph` snapshot/transaction as the source deletion (`A copied tool`). Parent Evidence also emits that anonymous title if a stale row is still present. The copied title `Leo's copy of Maya's Flight Lab` is not written back through `tools.save`.
- **`forkedFrom` is kept** (`toolId`, `versionId`, `ownerChildId`). These are identifiers, not a profile record. The profile that bound `child_local_01` to the display name Maya is gone, so the identifiers cannot be resolved to a person in product UI. Product UI never prints `forkedFrom.toolId`.
- **Parent summaries on the surviving fork are deleted** in that same commit, then regenerated with anonymous teacher wording. Export therefore cannot retain “Maya chose…” / “Leo chose…” text from a pre-deletion summary.
- Parent Evidence shows `ORPHANED_EXPORT_COPY` when `sourceDeleted`: the file is the complete stored graph; the on-screen title is anonymous; lineage identifiers remain as historical provenance and are not shown in the product UI.

This is explicit: Maya can still appear in an orphaned-fork export only as an unresolvable identifier inside `forkedFrom` (for example `mayas-flight-lab` / `child_local_01`), never as a display name or as parent-summary prose.

---

## 6. Atomic deletion failure matrix

| Store | Operation | Injected failure after first mutation | Retry |
|---|---|---|---|
| memory | `deleteToolGraph` | pre-delete canonical bytes of Maya and the unrelated tool unchanged; profile remains | Maya's six streams empty; unrelated tool unchanged; idempotent second call |
| IndexedDB | `deleteToolGraph` | same | same; close/reopen still empty (INV-25) |
| memory | `deleteProfileGraph` | pre-delete bytes unchanged | profile and owned graphs gone; another child's tool not deleted |
| IndexedDB | `deleteProfileGraph` | same | same |

`setFailAfterDeleteWrite` is the test-only switch. Product UI calls only the coordinated operations, not per-stream `deleteByTool`.

---

## 7. Source-deletion / fork-survival

Deleting Maya's profile:

- Maya's definition, versions, ledger, trials, grants, and summaries are gone after IndexedDB reopen.
- Leo's independently owned `mayas-flight-lab-copy` remains with its own re-keyed ledger and version.
- `loadRunner` on Leo's tool is `ready`.
- `sourceAuthor` is null; `sourceDeleted` is true.
- Home and Runner titles are `A copied tool`, not the stored copied title if it named Maya.
- Copy: “Inherited from a profile that was deleted”. No guessed name.
- Parent Evidence attributes inherited `event_001` / `event_014` to “A deleted profile”, never to Maya or Leo.
- The source tool is not read as a fallback.
- INV-70 still passes: when Maya's profile is present, the fork still credits Maya.

This is distinct from missing fork data. A missing Leo tool is still `empty`. A missing Leo version is still `integrity_error`. Only a present fork whose `forkedFrom.ownerChildId` profile is absent is the orphaned-source `ready` state.

---

## 8. Deviations, amendments, extra paths

### Proposed D-02 (not owner-accepted)

P3 never persisted which design Maya predicted. P7 does not invent one. The parent screen shows the stored question (`event_001`) and the suggested conversation “Ask Maya what made that throw unfair.” Scene 8's prediction bullet is not demonstrable from the frozen data model.

### Test amendments (not weakened)

- **INV-01:** both permitted routes must exist; the SDK/credential scan excludes those two paths.
- **INV-48:** both routes exist; no third `src/app/api/agents/*/route.ts`.
- **INV-52:** `process.env.*CREDENTIAL` allowed only in the two route files; teaching still reads `TEACHING_AGENT_CREDENTIAL`; evidence reads `EVIDENCE_AGENT_CREDENTIAL`. Client-chunk walk timeout set to 60s (Windows `.next/static` walk); assertion unchanged.
- **INV-38:** TeachingSource count remains two. Runner additionally must not reach evidence adapters/ports.

### Extra paths (justified)

| Path | Why |
|---|---|
| `src/core/reuse/orphanedFork.ts` | Anonymous title/teacher after source-profile deletion; shared by Home, Runner, Parent Evidence, and coordinated redaction |
| `src/adapters/evidence/scripted.ts` | Deterministic local `EvidenceSource` required by C.2 |
| `src/adapters/persistence/memory/deleteGraph.ts` | Shared all-or-nothing memory delete |
| `src/adapters/persistence/indexedDb/deleteGraph.ts` | Shared all-or-nothing IndexedDB transaction |
| `src/ui/copy/parent.ts` | Parent-safe copy and deleted-source wording |
| `tests/support/evidenceGraph.ts` | Shared Flight Lab projection for INV-24/73/74 |

No new package, store, schema field, orchestrator state, or tool kind.

### Screenshots

- Browser: Chrome (`channel: 'chrome'`), viewport **1024×1366**, `http://localhost:3000`.
- `docs/evidence/assets/phase-07-parent-evidence.png`: real `/parent` after a scripted journey. Grounded clauses, `event_001` / `event_014` / `tool_version_002` / `trial_004`, conversation prompt, local-delivery disclosure.
- `docs/evidence/assets/phase-07-deletion-proof.png`: Home after confirming Maya profile deletion and reload. Maya's tile gone. Leo's copy remains as “A copied tool” with “Inherited from a profile that was deleted”.
- Capture tooling: `docs/evidence/assets/capture-phase-07.mjs` only. Playwright is not a `package.json` dependency.

Next.js 16 `/parent` wraps `useSearchParams()` in `<Suspense>` (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`). Query: `/parent?tool=<ToolId>`.

---

## 9. Unresolved risks

- D-02 remains proposed until the owner accepts that Scene 8's prediction bullet cannot be shown from stored data.
- Architectural acceptance of P7 is independent review; this packet does not claim it.
- Export SHA-256 of the full canonical bytes was not emitted here; INV-75 proves canonical equality and membership instead.
- A stale `.next` tree can make INV-52's chunk walk slow; the serial after-build suite is the client-scan result.
