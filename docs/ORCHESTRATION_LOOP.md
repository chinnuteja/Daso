# Teach Daso — Orchestration and Implementation Loop

**Purpose:** define the repeatable contract between the product owner, the architecture
orchestrator, and the implementation agent for every remaining phase.
**Applies from:** Phase 5 onward.

The repository is the shared memory of the project. Git records accepted checkpoints and
reviewable changes; it does not replace tests, evidence, or architectural review.

---

## 1. Roles

| Role | Responsibility |
|---|---|
| Product owner | Sets product intent, approves material scope changes and accepted deviations. |
| Architecture orchestrator | Audits the current build, writes one executable phase contract, reviews the implementation against it, runs independent gates, and accepts or rejects the phase. |
| Implementation agent | Implements only the active phase, preserves frozen contracts, runs every required test, and produces the evidence packet. |

The implementation agent may choose local code structure only where the phase file leaves a
choice open. It may not silently change product semantics, weaken an invariant, skip a test,
or expand the phase because another feature looks convenient.

---

## 2. The loop

1. **Freeze the baseline.** `main` must represent the latest accepted phase and all four gate
   commands must be green. Record the exact test count and known pending invariants.
2. **Audit before planning.** Read the normative product document, engineering plan, build
   state, prior phase files, current schemas, ports, adapters, flows, tests, and accepted
   deviations. A phase plan is written against the code that exists, not the architecture one
   remembers.
3. **Specify one phase.** Create `docs/phases/PHASE_0N.md` with all sections in §3 below. Do
   not specify the next dependent phase until the current phase freezes its contracts.
4. **Implement on a phase branch.** Use `phase/0N-short-name` or a similarly narrow branch.
   Do not mix unrelated cleanup, dependency upgrades, or later-phase work into it.
5. **Produce evidence.** The implementation agent runs the targeted invariant tests and the
   complete gates, updates `docs/evidence/PHASE_0N.md`, and proposes truthful updates to
   `docs/BUILD_STATE.md`.
6. **Independent review.** The orchestrator pulls the branch, inspects the complete diff,
   reruns the gates, traces the important behavior through code, checks the evidence packet,
   and tests every automatic rejection condition.
7. **Accept or return.** A green suite is necessary but not sufficient. The orchestrator
   either records precise corrections or accepts the phase. Only an accepted phase is merged
   into `main` and becomes the baseline for the next plan.
8. **Repeat.** Audit the newly accepted implementation before writing the next phase file.

No phase is described as complete merely because the UI works. Completion means the named
invariants pass, the evidence exists, no rejection condition is present, and no undeclared
deviation has been introduced.

---

## 3. Required anatomy of every phase file

Every phase specification must contain:

1. **Metadata:** milestone, status, dependencies, and whether parallel work is genuinely safe.
2. **Purpose and exit proof:** the user-visible result and the single hardest fact the phase
   must prove.
3. **Audited starting point:** what already exists, what is missing, and any earlier-phase gap
   that must be corrected now because the phase first exercises it.
4. **Frozen contracts:** schemas, state vocabulary, repository count, event vocabulary,
   security boundaries, and decisions that the implementer may not widen.
5. **Exact scope:** behavior, pure algorithms, integration seams, persistence semantics, and
   child-facing surfaces.
6. **Explicit out-of-scope list:** later-phase features and tempting shortcuts that must not
   appear.
7. **File ownership:** new paths, existing paths that may be amended, and the decision-log
   entry required for every frozen or prior-phase file touched.
8. **Non-negotiable constraints:** determinism, provenance, local-first storage, model-access
   limits, atomicity, idempotency, and portability rules relevant to the phase.
9. **Named invariant tests:** identifier, specification reference, fixtures, and exact
   assertion. Tests must prove behavior and failure cases, not only line coverage.
10. **Gate commands:** targeted tests followed by typecheck, lint, full test suite, and build.
11. **Evidence packet:** outputs, canonical fixtures, screenshots or recordings where useful,
    import/file-tree proof, and a deviation statement.
12. **Automatic rejection conditions:** architecture violations that reject the phase even
    when all tests happen to pass.
13. **Implementation order:** a dependency-aware sequence with a verification checkpoint after
    each risky seam.
14. **Handoff prompt:** a self-contained instruction block suitable for the implementation
    agent.

If the audit discovers an earlier-phase problem, the phase file must call it out explicitly,
name the files to amend, preserve the original invariant's durable intent, and require a
decision-log entry. It must never hide the correction inside implementation work.

---

## 4. Git discipline

- `main` contains accepted phases only.
- Use one branch and one review unit per phase. Planning may start on an orchestration branch;
  implementation continues on the agreed phase branch or pull request.
- Stage explicit paths. Never sweep unrelated working-tree changes into a commit.
- Keep commits checkpoint-shaped: baseline, contract/tests, core implementation, adapters/UI,
  evidence. The exact split may vary, but each commit must be reviewable.
- Never force-push accepted history and never rewrite the user's unrelated work.
- Do not merge a phase while any gate, invariant, evidence item, or rejection audit is open.
- A dependency lockfile change must correspond to an approved dependency change in the phase
  file.

Git is useful in this loop because it gives the implementation agent an exact contract, lets
the orchestrator audit only the phase delta, and lets a rejected implementation be corrected
without disturbing the last accepted product.

---

## 5. Implementation-agent operating prompt

Use this template for each phase, replacing the phase number and branch name:

> Read `TEACH_DASO_PRODUCT_AND_ARCHITECTURE.md`, `docs/ENGINEERING_PLAN.md`,
> `docs/BUILD_STATE.md`, all prior phase files, and `docs/phases/PHASE_0N.md` before editing.
> Treat `PHASE_0N.md` as the executable contract for this implementation. Implement only its
> scope, in its stated order, and preserve every frozen contract and existing invariant. If a
> requirement conflicts with the current code or would require an unlisted schema, state,
> event, dependency, model path, or product deviation, stop and report the conflict rather
> than improvising. Run each targeted checkpoint while building, then run typecheck, lint,
> the full test suite, and the production build. Create `docs/evidence/PHASE_0N.md` with every
> required artifact and propose an accurate `docs/BUILD_STATE.md` update. Do not claim the
> phase complete; report the branch, commit, gate output, evidence path, deviations, and any
> unresolved risk for orchestrator review.
