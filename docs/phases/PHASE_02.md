# Phase 2 — Persistence & Inspection

**Implements:** Milestone 2 (local event store, persisted trials and authorship events, inspection).
**Status:** Implemented. INV-01–INV-16 and INV-26–INV-35 passing; INV-17–INV-25 pending by design. Evidence in `docs/evidence/PHASE_02.md`.
**Parallelism:** Runs concurrently with P3. P2 owns both repository implementations; the
in-memory one ships first so P3 is never blocked waiting on IndexedDB.

---

## C. Phase 2 Specification

### C.1 Purpose

Phase 2 makes the domain contract survive a page reload. It ships no teaching experience and
no design language. Its value is that after Phase 2, "the child's data is local-first,
inspectable, and append-only" is a property of running storage rather than a property of an
interface that nothing implements.

The load-bearing deliverable is the **repository conformance suite**: one executable contract
that both the in-memory and the IndexedDB implementations must satisfy identically. After
Phase 2, swapping the storage engine — including for a future native Android implementation
(§13) — is a mechanical exercise, because the definition of correct storage behaviour lives
in a test rather than in the head of whoever wrote the IndexedDB code.

Phase 2 does not extend the domain. It consumes the schemas, ports, and fold frozen by
Phase 1 and adds exactly one thing the domain deliberately lacks: a place to put bytes.

### C.2 Scope — what Phase 2 builds

**1. Database definition (`src/adapters/persistence/database.ts`)**
One IndexedDB database, `teach-daso`, at schema version 1. Object stores, one per §9 object
plus a meta store:

| Store | Key path | Indexes |
|---|---|---|
| `childProfiles` | `childId` | — |
| `tools` | `toolId` | `ownerChildId` |
| `toolVersions` | `versionId` | `toolId` |
| `ledgerEntries` | `eventId` | `toolId`, `[toolId, sequence]` (unique) |
| `trials` | `trialId` | `toolId` |
| `grants` | `grantId` | `toolId` |
| `summaries` | `summaryId` | `toolId` |
| `meta` | `key` | — |

Migrations are additive only. A migration may add a store or an index. No migration may
rewrite, renumber, or reorder an existing ledger entry (risk E.11).

**2. Repository implementations (`src/adapters/persistence/`)**
Two implementations of the seven Phase 1 ports, behind the identical interfaces:
- `memory/` — a synchronous-backed in-memory store, delivered **first** so P3 can build the
  orchestrator and shell against real repository semantics on day one.
- `indexedDb/` — the durable implementation, one module per repository.

Neither implementation may author domain data. Adapters persist what they are handed;
`createdAt` values continue to arrive from the injected `Clock`, never from the adapter.

**3. Validation at the storage boundary**
Every record is parsed through its Zod schema **on write and on read**. A record that a hand
edit, a partial write, or a future migration has corrupted fails loudly at the boundary
instead of flowing into the domain as a plausible-looking object. Tool versions are returned
deep-frozen, so INV-13 continues to hold for objects that came off disk.

**4. Append-only enforcement in storage (`ledgerEntries`)**
The storage layer repeats the Phase 1 append rules rather than trusting its caller:
- writing an `eventId` that already exists throws;
- writing a `sequence` that does not strictly follow the stream's highest sequence throws;
- the unique `[toolId, sequence]` index makes a duplicate position a database-level error.
There is no update path and no single-event delete path. Deletion exists only as whole-stream
`deleteByTool`.

**5. Ledger integrity check (`src/core/ledger/integrity.ts`)**
A pure predicate over a stored stream: sequences start at 1, increase by exactly 1, contain no
gap, and carry no duplicate event id. The IndexedDB adapter runs it when a tool's stream is
first loaded. A gap means an event was dropped, which is silent provenance corruption — it
must fail at open time, not at compile time (risk E.11).

**6. Identifier counter persistence (`src/adapters/persistence/idCounters.ts`)**
`IdFactory.snapshot()` is written to the `meta` store; on reopen the factory is seeded from it.
A reopened session continues `event_016` rather than reissuing `event_001`.

**7. Inspection read models (`src/core/inspection/`)**
Pure projections over stored events, computed — never stored:
- the §10 child-facing authorship explanation, as **structured** entries carrying a subject
  (`{ kind: 'metric' | 'input' | 'rule', … }`) and an attribution
  (`child_chosen`, `ai_suggested_child_accepted`, `child_taught`);
- the §10 internal authorship summary counts.
Core holds no display copy and no locale formatting. The words "Chosen by Maya" are assembled
by the presentation layer from the structured attribution, which is what keeps the projection
portable to a native implementation (§13) and free of `toLocale*` (INV-03).

**8. Diagnostic inspection route (`src/app/inspect/page.tsx`)**
One deliberately unstyled route that renders the stored profile, tool, versions, trials, and
the authorship explanation. It exists to make M2's verification observable — refresh the
browser, the history is still there. It is a diagnostic surface, not the product's inspection
screen; P3 owns the tablet shell and design language, and P8 owns polish.

**9. Conformance and invariant tests**
`tests/conformance/repositories.ts` exports one suite, parameterised by a factory, asserting
the full repository contract. It is executed twice: once against memory, once against
IndexedDB. `tests/invariants/` gains INV-26 … INV-35, one file per invariant.

### C.3 Out of scope for Phase 2 — explicit rejection list

Phase 2 must not contain: the Teaching Agent or any model call, the orchestrator state
machine, the safety policy engine, the compiler, the rule evaluator, the evidence grounding
validator, the export file format, cloud synchronisation, encryption-at-rest, media capture or
media storage, the tablet shell, the design language, or any styling beyond unstyled semantic
markup on the diagnostic route. Work delivered in these areas during Phase 2 will be rejected
even if correct, because it belongs to a phase whose contract is not yet frozen.

Phase 2 must also not widen the domain: no new §9 field, no new store that holds a shape
absent from `src/core/schema`, and no persisted object that the UI defined for its own
convenience (risk E.1).

### C.4 File ownership

Phase 2 exclusively owns and may create these paths.

```
src/adapters/persistence/database.ts            store layout, open, migrations
src/adapters/persistence/integrityGuard.ts      runs the pure check on load
src/adapters/persistence/idCounters.ts
src/adapters/persistence/index.ts               composes the Repositories object
src/adapters/persistence/memory/*.ts            one module per repository
src/adapters/persistence/indexedDb/*.ts         one module per repository
src/core/ledger/integrity.ts                    NEW FILE in a P1-owned directory — see below
src/core/inspection/authorshipView.ts
src/core/inspection/summaryCounts.ts
src/core/inspection/index.ts
src/app/inspect/page.tsx                        diagnostic, unstyled
tests/conformance/repositories.ts
tests/invariants/inv-26 … inv-35 *.test.ts
tests/fixtures/persistence/**
tests/unit/**                                   shared with P1; additive only
```

Three paths are **not** owned by Phase 2 and require an entry in the BUILD_STATE decision log
before they are touched, per PHASE_01 C.4:

| Path | Change required | Justification to record |
|---|---|---|
| `package.json` | add `idb` (dependency), `fake-indexeddb` (devDependency) | `idb` is confined to `src/adapters/persistence/**` by INV-34; hand-rolled transaction wrappers are the most common source of silent IndexedDB data loss. `fake-indexeddb` makes storage testable in the existing `node` test environment. |
| `src/core/ledger/integrity.ts` | new file inside a P1-owned directory | Sequence continuity is a property of the ledger, not of IndexedDB. Keeping it pure means the native Android implementation inherits the same rule instead of reimplementing it. |
| `docs/BUILD_STATE.md` | invariant ledger, decision log, phase status | Architect-owned; implementer proposes, architect merges. |

`vitest.config.ts` is deliberately **not** modified. Persistence tests import
`fake-indexeddb/auto` at the top of the file that needs it, so the test environment stays as
Phase 1 froze it.

### C.5 Non-negotiable implementation constraints

1. `src/core/**` continues to import nothing except `zod` and other `src/core` modules.
   INV-02 is unchanged and must still pass; `src/core/inspection` and
   `src/core/ledger/integrity.ts` are pure.
2. Dependencies point one way. Adapters import core. No `src/core` module imports
   `src/adapters`, ever.
3. `idb` and the IndexedDB API are reachable only from `src/adapters/persistence/**`.
4. Every record is schema-parsed on write and on read. No unchecked value crosses the
   storage boundary in either direction.
5. No `any`, no `as` cast that widens or bypasses a schema, no `@ts-expect-error`. IndexedDB
   returns `unknown`; it is narrowed by parsing, never by assertion.
6. Adapters never generate time, identifiers, or randomness. They persist values the domain
   already produced through its injected ports.
7. The ledger store exposes no update and no single-event delete. Whole-stream `deleteByTool`
   is the only removal.
8. No `Blob`, `File`, `ArrayBuffer`, or `data:` URL is written to any store. Flight Lab
   persists a derived measurement and an obstruction flag (§11.3).
9. No network call anywhere in `src/adapters/persistence/**`. Local-first means the store has
   no remote (§11.1, §11.2).
10. Migrations are additive. A migration that would rewrite or reorder existing events is a
    specification change, not an implementation detail.

---

## D. Phase 2 Acceptance Tests

Acceptance is mechanical. Every test below must exist by the stated identifier and pass.
A phase claiming completion without a named passing test for each row is rejected.

### D.1 Invariant tests

| ID | Invariant (spec ref) | Assertion |
|---|---|---|
| INV-26 | Child data is local-first (§11.1, §11.2) | All seven repositories resolve against on-device storage. Static scan of `src/adapters/persistence/**` finds zero `fetch(`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, and zero `http://` or `https://` literal. |
| INV-27 | Reload preserves the complete history (M2 verification, §11.1) | Write the Flight Lab profile, tool, versions, fifteen ledger entries, and four trials through the repositories; close the database; reopen from a fresh connection; read every entity back. Canonical JSON is identical, and `listByTool` returns the ledger in ascending sequence order. |
| INV-28 | Persistence cannot edit an event (§10) | The persistence module exports no update, edit, patch, or single-event delete function. Appending a duplicate `eventId` rejects. Appending a `sequence` that does not strictly follow the stream's highest rejects. Both rejections are observed against the durable implementation, not only in memory. |
| INV-29 | A dropped or reordered event fails loudly (§10, E.11) | The integrity check passes on the contiguous Flight Lab stream. It fails on a stream with a gap (1,2,4), on a stream not starting at 1, and on a stream carrying a duplicate event id. Loading a tool whose stored stream has a gap throws rather than returning a short history. |
| INV-30 | One contract, two implementations (§13, §14) | `tests/conformance/repositories.ts` runs in full against both the memory and the IndexedDB implementations. Every assertion passes for both; no test is skipped for either. |
| INV-31 | Storage deletion is real (§11.4) | After `deleteByTool`, the tool's definition, versions, ledger entries, trials, grants, and summaries are absent from every store — verified by reading each store directly, not by calling the repository that just deleted them. An unrelated tool's records are untouched. Deleting the child profile removes the profile record. |
| INV-32 | No raw media is persisted (§11.3) | Static scan: no `Blob`, `File`, `ArrayBuffer`, `createObjectURL`, or `data:` literal in `src/adapters/persistence/**`. Negative case: an object carrying a media field is rejected by the schema before it can reach a store (INV-07 already forbids the extra key; this asserts the storage path does not bypass it). |
| INV-33 | Identifier counters survive a reload (§17 Determinism) | Seed a factory, consume identifiers, persist the snapshot, reopen, and seed a new factory from storage. The next identifier continues the sequence and does not collide with any id already in the ledger store. |
| INV-34 | Layering is one-way (§13, §14) | Static scan: no module under `src/core/**` imports from `src/adapters` or `src/app`. `idb` and `indexedDB` appear only under `src/adapters/persistence/**`. INV-02 still passes unchanged. |
| INV-35 | Inspection is a projection, not a second source of truth (§4.1, §10, E.1) | The inspection module exports no write, save, or persist function. Over the Flight Lab fixture, the authorship explanation contains exactly the approved behaviours — `median_distance` attributed `child_chosen`, `consistency` attributed `ai_suggested_child_accepted`, `exclude_obstructed_flight` attributed `child_taught` — and excludes the three unapproved candidates. The summary counts report zero unapproved decisions present in the compiled version. |

Note on INV-35: §10's printed counts (11 / 9 / 2 / 3 / 0) illustrate a fuller session than the
Scene 5 fixture. The assertion is against the counts the fixture actually implies, plus the
invariant that the unapproved count is zero. Do not tune the fixture to reproduce the
illustration.

### D.2 Pending invariants after Phase 2

Phase 2 changes no ownership. These remain pending tests in the harness, each naming its
owning phase, and must still appear as pending in Phase 2's test output.

| ID | Invariant | Owning phase | Effect of Phase 2 |
|---|---|---|---|
| INV-17 | Orchestrator is a deterministic state machine over exactly the ten §7.2 states | P3 | Unchanged |
| INV-18 | Validation is code, not model-delegated; invalid mutations rejected | P4 | Unchanged |
| INV-19 | Safety policy denies each §7.5 boundary | P4 | Unchanged |
| INV-20 | Identical version + trial data yields identical results | P5 | Unchanged |
| INV-21 | Obstructed trial flips valid→invalid under v2 and the ranking changes | P5 | Trials now replay from storage rather than from a fixture |
| INV-22 | Runner Mode reaches no agent module and works with model access disabled | P6 | Unchanged |
| INV-23 | Second-child reuse forks; the original version body is byte-identical after | P6 | Byte-identity is now checkable across a reload |
| INV-24 | Every parent-summary claim maps to an existing event id; fabricated summary rejected | P7 | The events a claim must map to are now durable |
| INV-25 | Tool deletion removes definitions, versions, trials, and events from local storage | P7 | INV-31 is its storage-level precondition; INV-25 stays P7 because it asserts the product-level data-rights flow |

### D.3 Gate commands

All four must exit zero on a clean checkout with no network access beyond package install:

```
npm run typecheck
npm run lint
npm test
npm run build
```

### D.4 Required evidence packet

Phase 2 will not be reviewed without all of the following:

1. Full terminal output of the four gate commands.
2. Verbose test output listing every INV-01 … INV-35 identifier as passing and
   INV-17 … INV-25 as pending. Phase 1's sixteen invariants must still pass unmodified; a
   Phase 2 change that turns a Phase 1 invariant red is a regression, not a trade-off.
3. Verbose output of the conformance suite showing it executed twice, once per implementation,
   with identical assertion names.
4. The actual file tree of `src/` and `tests/`, for comparison against C.4.
5. The contents of `src/adapters/persistence/indexedDb/ledgerRepository.ts` and
   `src/adapters/persistence/database.ts`, which are the two files where an append-only or
   migration violation is most likely to hide.
6. A real-browser check, because `fake-indexeddb` is not the shipping engine: load `/inspect`
   after seeding the Flight Lab data, hard-refresh, and capture the rendered history before and
   after. State the browser and version.
7. A statement of any deviation from this document, with justification, proposed for the
   BUILD_STATE deviation register. Undeclared deviations are grounds for rejection even if the
   tests pass.

### D.5 Automatic rejection conditions

Phase 2 is rejected, regardless of a green suite, if any of the following is true:

- A stored record reaches the domain without being parsed by its schema.
- Any code path can update or delete a single ledger event.
- A migration rewrites, renumbers, or reorders an existing event.
- A gap in a stored sequence is tolerated, repaired silently, or logged and ignored.
- `src/core` imports an adapter, or `idb`/`indexedDB` appears outside
  `src/adapters/persistence/**`.
- An adapter generates a timestamp, an identifier, or a random value.
- A store holds raw media, or a field absent from `src/core/schema`.
- The inspection layer persists anything, or holds a shape the domain does not define.
- Deletion is asserted only through the repository that performed it, rather than by reading
  the underlying stores.
- The diagnostic route acquires styling, navigation, or product copy that pre-empts P3.
- A Phase 1 invariant was modified, weakened, or skipped to make Phase 2 pass.
- `docs/BUILD_STATE.md` was not updated, or a P1-owned file was changed without a decision-log
  entry.
