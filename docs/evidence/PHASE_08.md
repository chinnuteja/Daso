# Phase 8 evidence packet

**Date:** 2026-08-26
**Spec:** `docs/phases/PHASE_08.md`
**Build ledger:** `docs/BUILD_STATE.md`
**Branch:** `orchestration/phase-08-plan`
**Base:** Phase 7 accepted on `main` at `92680888abafb97c0784f65c0ee21b057fd9968e`
**Status:** Architecturally accepted at `87f1cce9c324b802205f5794ef7ddf35aa36bce0`. Acceptance gates are recorded below.

---

## 1. What this phase makes visible

A child notices an unfair throw, teaches a lasting rule, sees the same stored throws change, another child uses an independently owned copy, and a parent can see why. Flight Lab remains the only tool. No schema, store, model path, or dependency was added.

## 2. Changed paths

### Visual system and shell
- `src/ui/shell/tokens.css`
- `src/ui/shell/TabletShell.module.css`
- `src/ui/screens/screens.module.css`
- `src/ui/components/ChoiceButton.tsx`
- `src/ui/components/ChoiceButton.module.css`
- `src/ui/components/ProgressRail.tsx`
- `src/ui/components/ProgressRail.module.css`
- `src/ui/copy/progressRail.ts`

### Product surfaces
- `src/ui/screens/HomeScreen.tsx`
- `src/ui/components/SavedToolTile.tsx`
- `src/ui/flows/JourneyFlow.tsx`
- `src/ui/screens/CaptureTrialScreen.tsx`
- `src/ui/screens/ReviewMutationScreen.tsx`
- `src/ui/screens/CompilePreviewScreen.tsx`
- `src/ui/screens/RunnerScreen.tsx`
- `src/ui/screens/ParentEvidenceScreen.tsx`
- `src/ui/copy/disclosures.ts`

### Founder package
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/THREAT_MODEL.md`
- `docs/demo/README.md`
- `docs/demo/encode-demo.mjs`
- `docs/demo/manifest.json`
- `docs/demo/frames/*.png`
- `docs/demo/teach-daso-90s.webm`
- `docs/BUILD_STATE.md`
- `docs/evidence/PHASE_08.md`
- `docs/evidence/assets/capture-phase-08.mjs`
- `docs/evidence/assets/phase-08-*.png`

### Tests
- `tests/invariants/inv-80-founder-experience.test.ts`
- `tests/invariants/inv-81-accessibility.test.ts`
- `tests/invariants/inv-82-founder-docs.test.ts`
- `tests/invariants/inv-83-demo-manifest.test.ts`

Next.js-generated `AGENTS.md` / `CLAUDE.md` are not included.

## 3. Screenshots

Browser: the in-app Chromium browser against production Next.js servers at
`http://localhost:3001` and a fresh-storage definition run at `http://localhost:3002`.
The checked-in capture script remains reproducible evidence tooling; the final frames below
were inspected from real product state, not mocked markup.

| File | What it shows |
|---|---|
| `phase-08-home-empty.png` | Promise, one primary **Start with a question**, empty state |
| `phase-08-home-320.png` / `768` / `1024` | Same Home at the three required widths |
| `phase-08-home-saved.png` | Child-created tile with real counts; secondary actions quieter |
| `phase-08-imagine.png` | Progress rail on Question; next action |
| `phase-08-define.png` | A fresh run with the required median-distance metric selected |
| `phase-08-capture.png` | Go throw then record; manual-measurement disclosure |
| `phase-08-approval.png` | Maya said this; Daso cannot approve |
| `phase-08-compile.png` | `tool_version_002`, **Before: Dart leads**, **Now: Falcon leads**, trial_004 flip, Your words became a rule |
| `phase-08-runner.png` | Leo’s independently owned copy; **Saved rules — works without AI**; Maya still present (source not deleted) |
| `phase-08-parent.png` | Grounded narrative first; supporting records; data rights below |
| `phase-08-delete-focus.png` | Confirm-delete control focused |

Demo frames: `docs/demo/frames/00-thesis.png` … `05-parent.png`.

## 4. Accessibility, responsive behaviour, and demo honesty

- Interactive CSS uses `--target: 44px`, `:focus-visible`, `prefers-reduced-motion`, and `overflow-x: hidden`. INV-81 asserts the source contract.
- Production-browser checks at 320px, 768px, and 1024px found no horizontal overflow on Home. The 320px pass also covered `/journey`, `/run`, and `/parent` with no overflow.
- A live target-size audit covered the core routes. Every interactive control meets the 44px target; the native 24px checkbox is contained by its 44px clickable label. Delete confirmation was captured with the destructive control visibly focused.
- `docs/demo/teach-daso-90s.webm` is a finished, 90-second, 1024×1366 VP8 walkthrough assembled from the six real production frames. `docs/demo/encode-demo.mjs` rebuilds it with the Playwright-bundled minimal FFmpeg and the already-installed transitive `sharp`; no package dependency was added. WebM is used because that local encoder does not contain H.264.
- An axe/Lighthouse report and answers from an unfamiliar human viewer were not produced or invented. The independent three-question human comprehension check remains **pending** and is not represented as automated evidence.

## 5. Disclosures

All four R7 registry entries appear in `README.md` and on their declared product surfaces (capture, runner, parent). After source-profile deletion, Runner keeps the disclosure but replaces the Maya-named “what is real” sentence with anonymous copy (decision 53) so P7 privacy does not regress. D-01 and D-02 are named. No screen claims camera measurement, a sent SMS, cloud sync, or a stored prediction result.

## 6. Gate output

Serial acceptance run on `orchestration/phase-08-plan` after the founder-quality completion pass. Commands were not run concurrently with a development or production server.

| Command | Exit |
|---|---|
| `npx vitest run tests/invariants/inv-80-founder-experience.test.ts tests/invariants/inv-81-accessibility.test.ts tests/invariants/inv-82-founder-docs.test.ts tests/invariants/inv-83-demo-manifest.test.ts` | 0 — **4 files, 4 passed** |
| `npm run typecheck` | 0 — no diagnostics |
| `npm run lint` | 0 — no errors or warnings |
| `npm test` | 0 — **97 files, 272 passed** |
| `npm run build` | 0 — routes `/`, `/inspect`, `/journey`, `/parent`, `/run`, `ƒ /api/agents/teaching`, `ƒ /api/agents/evidence` |
| `npm test` (after build) | 0 — **97 files, 272 passed** |

The P7 orphaned-attribution integration test is included in the full suite (2 passed). After Maya’s profile is deleted, Runner still shows the R7 second-child disclosure, but the on-screen “what is real” line does not contain `Maya`.

No schema, repository contract, model path, dependency, tool kind, disclosure, deletion rule,
or deterministic runtime behaviour changed in the completion pass. Human comprehension remains
an external validation follow-up; it is not a code or architecture blocker.
