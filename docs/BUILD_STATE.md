# Teach Daso — Build State

**Maintained by:** technical architect / build orchestrator
**Normative source:** `TEACH_DASO_PRODUCT_AND_ARCHITECTURE.md`
**Last updated:** 2026-08-21. Phase 5 implemented on `orchestration/phase-05-plan`; awaiting orchestrator review. INV-01–INV-21 and INV-26–INV-64 passing; INV-22–INV-25 pending by specification.

This file is the single source of truth for what is built, what is proven, and what has
drifted. A phase is not complete because it runs. It is complete when its acceptance tests
are named here and passing, and no undeclared deviation exists.

---

## 1. Phase status

| Phase | Name | Milestone | Status | Accepted on |
|---|---|---|---|---|
| P1 | Foundation & Domain Contract | M2 (schemas) | **Implemented — gates green** | 2026-08-19 |
| P2 | Persistence & Inspection | M2 | **Implemented — gates green** | 2026-08-20 |
| P3 | Orchestrator & Tablet Shell | M1 | **Implemented — gates green** | 2026-08-20 |
| P4 | Teaching Agent & Approval Gate | M3 | **Implemented — gates green** | 2026-08-20 |
| P5 | Compiler & Deterministic Runtime | M4 | **Implemented — gates green; not architecturally accepted** | — |
| P6 | Keep & Reuse | M5 | Blocked on P5 | — |
| P7 | Parent Evidence & Data Rights | M6 | Blocked on P5 | — |
| P8 | Founder-Facing Polish | M7 | Blocked on all | — |

Parallel-safe sets once unblocked: `{P4, P5}`, `{P6, P7}`. P3 froze the orchestrator state set
that P4 and P6 consume. P5 may proceed against synthetic ledgers in storage.

---

## 2. Invariant ledger

Each architectural invariant, the test that enforces it, and whether that enforcement
currently exists. "Asserted" means a named test passes. Nothing else counts.

| Invariant | Spec ref | Enforcing test | Phase | State |
|---|---|---|---|---|
| Only Teaching Agent and Evidence Agent are model-driven | §8 | INV-01, INV-38, INV-48 | P1, P3, P4 | **Asserted** (INV-01 and INV-38 amended in P4; INV-48 is the P4 path count) |
| Teaching Orchestrator is deterministic / state-machine driven | §7.2 | INV-17, INV-36, INV-37 | P3 | **Asserted** |
| AI cannot approve its own mutations | §7.3, §12 | INV-10, INV-41, INV-47 | P1, P3, P4 | **Asserted** |
| Every material compiled behavior has provenance | §4.1, §7.6 | INV-09, INV-11 | P1 | **Asserted** |
| ToolVersion objects are immutable | §9.3, §12 | INV-13 | P1 | **Asserted** (also on versions read from storage) |
| Runner Mode makes no model calls | §7.5, §14 | INV-43, INV-22 | P3, P6 | **INV-43 asserted** (static precursor). INV-22 pending P6 |
| Identical version + trial data yields identical results | §17 | INV-03, INV-14, INV-15, INV-20 | P1, P5 | **Asserted** (INV-20 promoted in P5) |
| Child data is local-first | §11.1 | INV-26 | P2 | **Asserted** (`inv-26-local-first.test.ts`) |
| Parent summaries cite supporting evidence events | §7.8, §12 | INV-24 | P7 | Pending |
| Generated tools never execute arbitrary generated code | §5, §7.5 | INV-04, INV-08 | P1 | **Asserted** |
| Simulated capabilities are explicitly disclosed | §15 | INV-16, INV-46 | P1, P3 | **Asserted** (capture-screen surface rendered) |
| Flight Lab is the only implemented tool kind | §15, §20 | INV-05 | P1 | **Asserted** |
| Domain remains portable to native Android | §13 | INV-02, INV-34 | P1, P2 | **Asserted** |
| Safety policy boundaries are enforced in code | §7.5 | INV-19 | P4 | **Asserted** |
| Reuse forks rather than mutating the original | §12 | INV-23 | P6 | Pending |
| Deletion is real, not decorative | §11.4 | INV-31, INV-25 | P2, P7 | **INV-31 asserted** (storage-level). INV-25 pending P7 |

P2 also asserts INV-27 (reload), INV-28 (no event edit), INV-29 (integrity), INV-30 (two implementations), INV-32 (no media), INV-33 (id counters), INV-35 (inspection is a projection).

P3 also asserts INV-39 (scripted journey), INV-40 (authorship visible), INV-42 (no unrestricted chat), INV-44 (UI defines no persisted shape), INV-45 (orchestrator never writes a version).

P4 also asserts INV-18 (validation is code), INV-47 (agent cannot approve), INV-48 (single model path), INV-49 (server-side response validation), INV-50 (prompt-injection fixtures), INV-51 (§11.2 minimality), INV-52 (no client credential), INV-53 (provenance before append), INV-54 (resource limits), INV-55 (capability allowlist), INV-56 (approval never touches the network).

P5 asserts INV-20 and INV-21 and adds INV-57 (atomic compilation commit), INV-58 (no dangling active version), INV-59 (idempotent compilation), INV-60 (immutable version history), INV-61 (pure runtime), INV-62 (exact metric/ranking contract), INV-63 (trial resolves active version), and INV-64 (memory + IndexedDB/reopen milestone proof). INV-22–INV-25 remain pending for P6/P7.

---

## 3. Deviation register

| ID | Deviation | Rationale | Status |
|---|---|---|---|
| D-01 | Approval is recorded as a separate child-actor ledger entry referencing a candidate entry, rather than as a boolean the event author writes. §9.4's `childApproved` is preserved as a derived read-model field so stored and exported records match the documented shape. | An append-only ledger (§10) cannot have a field flipped after the fact, and any actor able to write its own approval flag can approve its own mutation, defeating §7.3 and §12. | **Accepted by owner** |

Phase 4 introduces no new deviations from the product specification. D-01 remains the only accepted product-spec deviation.

Phase 5 introduces no new product-spec deviations. The required earlier-phase integration corrections (atomic version activation and removal of the dangling placeholder) are recorded as implementation decisions 24–30. D-01 remains the only accepted product-spec deviation.

### Considered and rejected

- **Content hash on `ToolVersion`.** Rejected in P1.
- **Provenance map attached to `ToolVersion`.** Rejected in P1.
- **Hand-rolled IndexedDB transaction wrappers instead of `idb`.** Rejected. Silent data loss in ad-hoc IDB code is the usual form of E.11.
- **An eleventh orchestrator state.** Rejected. Extra memory in the machine would be a specification change.
- **Free-text chat wired to mutation creation.** Rejected. Child language reaches the ledger only as `originalInput` beside a structured candidate.
- **Displaying a ranking, median, or winner in Phase 3.** Rejected. That proof belongs to Milestone 4 / P5.
- **A model-provider SDK in `package.json`.** Rejected. One `fetch` against `MODEL_PROVIDER_BASE_ADDRESS` in the one permitted route file is the thinnest transport. An SDK would be a second way to name a vendor.
- **A `NEXT_PUBLIC_` flag to swap the teaching source.** Rejected. That inlines configuration into the client bundle (E.10). Composition stays in `JourneyFlow`; tests and the default session stay scripted.
- **Amending INV-43 so the runner can share teaching utilities.** Rejected. If introducing the agent required changing INV-43, the composition would be wrong.

---

## 4. Decision log

| # | Decision | Reason |
|---|---|---|
| 1 | Next.js App Router, TypeScript strict, Zod, Vitest, IndexedDB | §14 recommended stack |
| 2 | `src/core` is a pure kernel importing only `zod` | §13 portability and §17 determinism |
| 3 | A tool version body is *defined as* the fold of its approved authorship events (ruling R1) | Provenance as equality |
| 4 | Model access permitted at exactly two file paths (ruling R3) | §8 two-role limit |
| 5 | Milestone 1's product skeleton is delivered by Phase 3 | E.1 |
| 6 | Time and identifiers arrive through injected ports | Spec identifier examples; replay |
| 7 | No content hashing; canonical JSON is the equality primitive | Smallest sufficient mechanism |
| 8 | Next.js 16 `jsx` is `react-jsx` | Required by Next.js 16 |
| 9 | Ledger write export is named `append`; `appendEntry` remains as an alias | PHASE_01 INV-12 |
| 10 | Add `idb` (dependency) and `fake-indexeddb` (devDependency) | PHASE_02 C.4: `idb` confined to `src/adapters/persistence/**` by INV-34; `fake-indexeddb` keeps `vitest.config.ts` unchanged |
| 11 | Add `src/core/ledger/integrity.ts` inside a P1-owned directory | Sequence continuity is a ledger property, not an IndexedDB property; a native port inherits the same predicate |
| 12 | Persistence `append` requires `sequence === highest + 1` | PHASE_02 C.2.4 and INV-29; Phase 1 `append` still allows gaps in memory-only reductions, but nothing durable may contain one |
| 13 | Replace `src/app/page.tsx` placeholder with the tablet shell home | The placeholder existed until a product surface existed. Milestone 1 is that surface (PHASE_03 C.4) |
| 14 | `src/app/layout.tsx` loads design tokens and a tablet viewport | The shell needs a root; no product logic is added to the layout (PHASE_03 C.4) |
| 15 | Add `src/core/ports/teaching.ts` inside a P1-owned directory | The teaching contract is a port. Freezing the closed response union before P4 stops the agent becoming a chatbot (E.3) |
| 16 | Replace `inv-17-orchestrator-pending.test.ts` with an asserting test | INV-17 is P3-owned. The pending placeholder was written in P1 to be replaced here |
| 17 | `npm run build` runs Next with `--max-old-space-size=8192` | Next's bundled typecheck of the full `tsconfig` include (src + tests) exhausted the default Node heap on this machine. `npm run typecheck` already covers the same files; the raised heap makes the build gate finish |
| 18 | No model-provider SDK; the teaching route uses `fetch` against `MODEL_PROVIDER_BASE_ADDRESS` | The thinnest seam that still reaches a provider. A second provider is a specification change. Credentials stay server-only |
| 19 | Amend INV-01: exactly the teaching route exists; the SDK/credential scan allows that one file | INV-01 asserted a Phase 1 fact. R3 always permitted two paths; P4 creates the first. A model reference anywhere else still fails |
| 20 | Amend INV-38: exactly two TeachingSource implementations; neither is reachable from Runner Mode | P3 asserted zero model calls when no agent existed. The durable property — the runner reaches no model — is preserved and tightened |
| 21 | Replace INV-18 and INV-19 pending tests with asserting tests; render refusal copy on ReviewMutationScreen and compose the agent client in JourneyFlow | INV-18 and INV-19 are P4-owned. The approval gate already existed; P4 adds the refusal reason and swaps the source behind the frozen port. No new orchestrator state or event |
| 22 | `executeIntents` validates and policy-checks a candidate before `ledger.append` | Constraint C.5.6: an invalid candidate never reaches storage. Structured rejection, not a thrown error |
| 23 | `.env.example` comment only: P4 consumes `TEACHING_AGENT_CREDENTIAL` and `MODEL_PROVIDER_BASE_ADDRESS` | P1 already declared the server-only credentials. Adding a `NEXT_PUBLIC_` variable is a rejection condition |
| 24 | Extend `ToolVersionRepository` with `saveAndActivate(version, definition)` rather than an eighth repository | PHASE_05 C.2/C.5: version save and definition activation must be one all-or-nothing commit in memory and IndexedDB |
| 25 | `DEFINE_INPUTS + inputs_confirmed` emits the existing `request_compile` intent | PHASE_05 C.6. State and event vocabularies are unchanged; the first runnable version can exist only after inputs are confirmed |
| 26 | Journey initialization stores the profile only; the first compile atomically creates the tool definition and v1 | PHASE_05 C.2: the P3 placeholder `currentVersionId` was a dangling pointer the moment P5 wrote versions |
| 27 | Trial capture looks up `currentVersionId` in repositories and stamps it; UI drafts have no version id | PHASE_05 C.6 / INV-63. Historical `toolVersionIdAtCapture` is never rewritten by replay |
| 28 | Freeze `RuntimeResult` in `src/core/runtime/types.ts` | PHASE_05 C.7: P6/P7 consume this shape. It is not a §9 object and is not persisted |
| 29 | Add `src/adapters/persistence/atomicCommit.ts` as a test-only abort switch | INV-57 must inject failure after the version row is written. Production callers never set it |
| 30 | Amend INV-39 and INV-45 journey expectations so compiled versions are stored | Durable properties remain: fold equals §9.3; the orchestrator still contains no `versions`/`ToolVersion`/`save`. Composition now writes v1 and v2 |

---

## 5. Open risks

- **E.1 UI-first shaping of the domain** — INV-44: `src/ui` and `src/app` declare no Zod object schemas. The teaching route parses with the frozen core `TeachingRequest` / `TeachingMove`; it does not declare a `z.object` in `src/app`.
- **E.2 Provenance becomes decorative** — still INV-09 / INV-11; storage cannot edit events (INV-28). INV-53 now rejects a pre-stamped `sourceEventId` before append.
- **E.3 Teaching Agent drifts into a chatbot** — the response union is frozen and validated server-side (INV-49, INV-42, INV-47). An unparsed model response never leaves the route.
- **E.4 Orchestrator asks the model what to do next** — INV-17 / INV-36 / INV-37: total pure table, no I/O in the kernel. Unchanged in P4.
- **E.6 Nondeterminism in results** — INV-03/14/15 plus INV-20 and INV-62: millimetre integers, total ranking order, byte-identical replay.
- **E.10 Model credentials in the client** — INV-52: credential read only in the teaching route; built client chunks have no host or key-shaped string.
- **E.11 Persistence drift silently drops events** — INV-29 integrity check on load; unique `[toolId, sequence]` index.

---

## 6. Simulation disclosures

Unchanged from Phase 1. Registry at `src/core/disclosure/simulations.ts`. Capture-screen
entries are rendered by `CaptureDisclosures` (INV-46).

---

## 7. Evidence received

Phase 1 D.4 packet: `docs/evidence/PHASE_01.md`.
Phase 2 D.4 packet: `docs/evidence/PHASE_02.md`.
Phase 3 D.4 packet: `docs/evidence/PHASE_03.md`.
Phase 4 D.4 packet: `docs/evidence/PHASE_04.md`.
Phase 5 D.4 packet: `docs/evidence/PHASE_05.md`.

Gate commands on 2026-08-21 (Phase 5 implementation, not yet accepted):

| Command | Exit |
|---|---|
| targeted INV-20/21/57–64 | 0 — **20 passed** |
| `npm run typecheck` | 0 |
| `npm run lint` | 0 |
| `npm test` | 0 — **199 passed, 4 todo** |
| `npm run build` | 0 — routes `/`, `/inspect`, `/journey`, `/run`, `ƒ /api/agents/teaching` |

INV-01 … INV-21 and INV-26 … INV-64 passing. INV-22 … INV-25 todo/pending.

No undeclared deviations. D-01 remains the only accepted product-spec deviation. This update does not claim architectural acceptance.
