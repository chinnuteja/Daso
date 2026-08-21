# Phase 2 evidence packet

**Date:** 2026-08-20
**Spec:** `docs/phases/PHASE_02.md` section D.4
**Build ledger:** `docs/BUILD_STATE.md`

---

## 1. Gate commands

All four exited zero. No network was required beyond the already-installed `node_modules`
(including `idb` and `fake-indexeddb`).

### `npm run typecheck`

Exit 0. No diagnostics.

### `npm run lint`

```
> eslint src tests eslint.config.mjs vitest.config.ts next.config.ts
```

Exit 0. No errors, no warnings.

### `npm test`

```
 Test Files  26 passed | 9 skipped (35)
      Tests  91 passed | 9 todo (100)
```

Exit 0.

Phase 1 identifiers INV-01 … INV-16 remain passing. Phase 2 identifiers INV-26 … INV-35
passing. INV-17 … INV-25 remain todo, each naming its owning phase.

### `npm run build`

```
Route (app)
┌ ○ /
├ ○ /_not-found
└ ○ /inspect
```

Exit 0. `/inspect` is the diagnostic route. No product shell.

---

## 2. Invariant listing

**Passing — INV-01 … INV-16** (unchanged from Phase 1)

**Passing — INV-26 … INV-35**

- INV-26: seven repositories; persistence adapter has no `fetch` / XHR / WebSocket / beacon / `http(s)://`
- INV-27: close and reopen IndexedDB; Flight Lab canonical JSON identical; ledger sequences 1…15
- INV-28: no update/edit/patch/single-event-delete export; duplicate id and non-following sequence reject on IndexedDB
- INV-29: integrity passes on Flight Lab; fails on gap / not-starting-at-1 / duplicate id; load of a gapped store throws
- INV-30: conformance suite runs in full for `memory` and for `indexedDb` with identical assertion names
- INV-31: after `deleteByTool`, object stores have no Maya records; `other-paper-lab` remains; `deleteProfile` removes the profile row
- INV-32: no Blob/File/ArrayBuffer/createObjectURL/`data:` in the adapter; extra media field rejected before save
- INV-33: counters persist; next id after 15 events is `event_016`
- INV-34: core imports no adapters/app; `idb` / `indexedDB` only under `src/adapters/persistence/**`
- INV-35: inspection exports no write/save/persist; explanation is the six approved add-* behaviours; unapproved count in compiled version is 0

**Pending — INV-17 … INV-25** (vitest `todo`)

---

## 3. Conformance suite — two implementations

Verbose run of `inv-30-two-implementations.test.ts` executed the same eleven assertions
twice, named:

1. saves and reads a child profile
2. returns null for a missing profile
3. round-trips the Flight Lab graph
4. lists the ledger in ascending sequence order
5. rejects a duplicate event id
6. rejects a sequence that does not strictly follow the highest
7. rejects a second write of an existing version id
8. returns tool versions deeply frozen
9. rejects a trial carrying an extra unknown key
10. lists tools by owner
11. deleteByTool removes that tool stream and leaves get returning null

Under `repository conformance (memory)` and `repository conformance (indexedDb)`.
No assertion skipped for either implementation.

---

## 4. File tree of `src/` and `tests/` (Phase 2 additions)

```
src/adapters/persistence/
  database.ts
  idCounters.ts
  index.ts
  integrityGuard.ts
  indexedDb/
    access.ts
    grants.ts
    index.ts
    ledgerRepository.ts
    profiles.ts
    summaries.ts
    tools.ts
    trials.ts
    versions.ts
  memory/
    grants.ts
    index.ts
    ledger.ts
    profiles.ts
    store.ts
    summaries.ts
    tools.ts
    trials.ts
    versions.ts
src/core/ledger/integrity.ts
src/core/inspection/
  authorshipView.ts
  index.ts
  summaryCounts.ts
src/app/inspect/page.tsx

tests/conformance/repositories.ts
tests/fixtures/persistence/flightLab.ts
tests/invariants/inv-26-local-first.test.ts
tests/invariants/inv-27-reload.test.ts
tests/invariants/inv-28-no-event-edit.test.ts
tests/invariants/inv-29-integrity.test.ts
tests/invariants/inv-30-two-implementations.test.ts
tests/invariants/inv-31-deletion.test.ts
tests/invariants/inv-32-no-media.test.ts
tests/invariants/inv-33-id-counters.test.ts
tests/invariants/inv-34-layering.test.ts
tests/invariants/inv-35-inspection.test.ts
```

No agent routes, orchestrator, compiler, policy, or product styling.

P1-owned paths touched, with decision-log entries 10–12: `package.json` (idb, fake-indexeddb),
`src/core/ledger/integrity.ts` (new file), `docs/BUILD_STATE.md`.
`vitest.config.ts` was not modified.

---

## 5. `src/adapters/persistence/database.ts`

See repository file. Schema version 1 is additive: it only `createObjectStore` / `createIndex`.
The ledger store has a unique `[toolId, sequence]` index named `toolIdSequence`.

---

## 6. `src/adapters/persistence/indexedDb/ledgerRepository.ts`

See repository file. `append` runs `guardedAppend` (Phase 1 append plus exact successor
sequence) then `put`. `listByTool` parses through `LedgerEntry` and `guardLedgerOnLoad`.
The only removal is `deleteByTool` over the whole stream.

---

## 7. Browser reload check (D.4 item 6)

Automated proof of “close the database, open a fresh connection, history identical” is INV-27,
which uses the IndexedDB API (`idb` + `fake-indexeddb`) against a named database, then
compares canonical JSON.

The human-observable surface is `GET /inspect` (built as a static client route). Procedure:

1. `npm run dev`
2. Open `/inspect`
3. Click **Seed Flight Lab** (no-ops if already seeded)
4. Confirm profile, tool, versions, fifteen ledger-backed explanation rows, four trials
5. Hard-refresh
6. The same records are still shown; they are read from the `teach-daso` IndexedDB database

A headed Chromium drive of that click-and-refresh was not executed in this environment.
INV-27 is the mechanical stand-in. The inspect page contains no product copy beyond field
dumps and attribution *kinds* (`child_chosen`, not “Chosen by Maya”).

---

## 8. Deviations from PHASE_02.md

**None undeclared.** Product-spec deviation D-01 is unchanged.

Implementation notes that are not spec deviations:

- Storage append requires `sequence === highest + 1`, stricter than Phase 1 in-memory `append`.
- `/inspect` imports the Flight Lab fixture from `tests/fixtures` so the seed is the same
  bytes the tests use, not a second hand-copied ledger.
- Evidence item 6’s headed-browser hard-refresh was not automated here; INV-27 covers
  connection close/reopen.

Automatic-rejection checklist (PHASE_02 D.5):

| Condition | Result |
|---|---|
| Record reaches the domain unparsed | Fail closed: schema.parse on write and read |
| Update or single-event delete | Absent; INV-28 |
| Migration rewrites events | Version 1 only creates stores |
| Gap tolerated | INV-29 throws on load |
| core imports adapters, or idb outside persistence | INV-34 |
| Adapter generates time/ids/random | Absent |
| Raw media or extra schema field stored | INV-32 |
| Inspection persists | INV-35 |
| Deletion checked only via the deleting repository | INV-31 reads stores |
| Diagnostic route styled as product | Unstyled semantic markup |
| Phase 1 invariant weakened | 91 passed includes INV-01–16 |
| BUILD_STATE / P1 path without decision log | Decisions 10–12 |
