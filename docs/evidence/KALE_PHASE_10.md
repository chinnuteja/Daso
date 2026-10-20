# Kale Phase 10 — one Draw-first studio

Base: `b9b5ee1a1dd564874d5ccea9a230438343c7a848` (Kale Phase 9).
Branch: `orchestration/kale-10-unified-workbench`.
Verification date: 2026-10-02.

Status: implemented with automated gates and real Chrome verification. **Not independently architecturally/UX accepted, merged, deployed or declared founder-ready.** The complete Phase 10 acceptance matrix is not finished: fresh-viewer comprehension and additional accessibility/error-state checks remain open. Do not advance merely on the screenshots.

## What changed

- `/` and `/draw` open a playable blank drawing desk immediately. The supplied dragon is an explicitly labelled practice option, not fabricated child artwork. Earlier writing remains at `/writing`.
- Creation and saved-tool reuse share a studio. Creation stays mounted when switching, preserving a pending review. The artifact precedes the context dock on phones. Embedded tips are skippable; there is no blocking explanatory tour.
- One mark is explicitly confirmed before directing its path. A native mark selector and child-chosen straight-path endpoints provide keyboard alternatives. Preview appears after a usable path; optional controls are collapsed until needed.
- The compact authorship thread distinguishes practice/original source, selection, local preview, starting suggestion/manual settings, and save. The original candidate is read from its immutable event: a later edit cannot be falsely described as the model's suggestion.
- Review previews use the same bounded settings that compilation saves. Save only succeeds through the existing child-approval commit. In-memory fallback cannot advertise a durable save. Saved state removes source/preview editing controls and immediately offers **Use my saved tool on a new path**.
- Saved reuse remains deterministic and imports no model path. Parent evidence explicitly labels supplied practice art, distinguishes model suggestion from manual choice/child edits, and keeps receipts secondary.
- New Draw practice uses only `child_kale_practice_01`. **Reset practice…** opens a native confirmation explaining exactly what is permanent. Cancel gets initial focus; Escape restores the reset trigger. The confirmed implementation calls existing atomic profile-graph deletion, not a database clear. Blank work, older practice and Flight are outside its scope.
- Essential navigation is Draw / Flight Lab / My tools / Parent view; earlier experiments use a quiet disclosure. The phone label becomes More. No capability vocabulary, database version/object store, new repository family or model route was added.

## Tests and gates

| Gate | Final result |
|---|---|
| Targeted Phase 10 + INV-82 | 3 files, 6 tests passed; exit 0 |
| `npm run typecheck` | 0 diagnostics; exit 0 |
| `npm run lint` | exit 0 |
| Full suite after final build | 118 files, 380 tests passed; exit 0 |
| `npm run build` | exit 0; Next 16.3.8 |

Build retains `/`, `/draw`, `/draw/library`, `/flight`, `/parent/tools`, `/writing`, `/lab`, `/library`, `/journey`, `/run`, `/parent`, `/inspect`, and exactly the existing teaching/evidence agent routes.

New tests:

- `kale-phase-10-workbench.test.ts`: Draw landing, preserved writing route, artifact-first CSS, explicit mark/path alternatives, starting suggestion versus child edit, honest practice/draft attribution, scoped confirmation. These are source-contract checks, not substitutes for browser tests.
- `kale-phase-10-practice-reset.test.ts`: disposable IndexedDB graphs prove practice-only scope, preservation of blank/older-practice/Flight data, idempotency and injected-delete rollback.
- INV-82's obsolete “only two legacy tool kinds” sentence assertion was replaced with assertions for the actual Draw/Flight vocabulary, preserved legacy kinds, bounded scope and current routes. Simulation/deviation/no-unbuilt-feature checks remain.

An intermediate post-build test run failed on that stale INV-82 sentence. It was corrected and the final complete suite passed. No failed run is presented as a green gate.

## Real browser verification

Development and production ran on loopback port 3015. `localhost:3015` and `127.0.0.1:3015` are separate browser origins; neither was cleared. Old port-3013 data was not deleted.

1. Fresh landing opened blank work immediately, with disabled actions explaining prerequisites. A fresh saved library showed a next-step empty state, not fake tools.
2. Selected **Practice orange diamond 1**, confirmed **Use this mark**, and chose a straight guide using keyboard endpoint controls. The original supplied strokes remained visible.
3. Manual review could be rejected; no tool activated. Recovery returned focus to the words input. A later pending manual review and its typed name survived switching to the empty saved library and back.
4. Live teaching accepted the synthetic sentence “Repeat this practice scale along my path, smaller toward the end.” It proposed even spacing. The learner separately changed spacing to wide and saved **My dragon scales · Phase 10**. The reviewed path produced 27 repeats before the edit and 16 after it. The UI and parent story retained **AI even → child wide**, not “AI wide”. Artwork was not submitted to the provider.
5. The saved version survived production restart. Keyboard-selected new endpoints produced **6 repeats** with that wide tool, without asking AI. This is a real local runtime result, not a claim that network access was forcibly disabled in this phase.
6. A fresh production-origin manual path produced **9 preview repeats**. Review/save created **My practice scales**, version 1, and moved focus to the immediate saved-tool action. Its parent story says **Their manual choice**, never “Kale suggested”. After the final rebuild, the saved tool and source/path still loaded, and reuse on new endpoints produced **9 repeats** locally.
7. Reopening a source restores drawing/selection/path, not an invented saved review. The UI now says **Current draft not saved as a tool**; the separately saved version remains in the library. An unsaved model sentence is not silently recovered as an approval.
8. Reset confirmation starts on Cancel. Escape closes it, returns focus to Reset practice, and preserves the saved tool. **Delete practice data was not clicked**; no permanent browser deletion was authorized.
9. Production parent story verified source-copy disclosure, supplied-art label, retained review path and local computation. Flight opened its six labelled observations and actual initial Dart ranking. Earlier experiments → Writing preference opened the preserved writing route.
10. Production layouts checked at 1440×1000 desktop, 1024×1366 portrait tablet, 1366×1024 landscape, and 390×844 phone. No horizontal document overflow at those inspected states. Phone header no longer crowds six labels; reuse canvas is visible before detailed controls. Temporary viewport overrides are reset after verification.

Final production frames:

- [Artifact-first desktop](assets/kale-phase-10-workbench-desktop.jpeg)
- [Tablet local preview, explicitly not saved](assets/kale-phase-10-preview-tablet.jpeg)
- [Phone saved-tool reuse](assets/kale-phase-10-reuse-phone.jpeg)
- [Parent story for manual approval](assets/kale-phase-10-parent-tablet.jpeg)

The frames show actual stored/runtime states. No video, human answers or deployment is claimed.

## Accessibility evidence and limits

An app-owned development-only control runs axe-core 4.13.0 locally against `#kale-product`. No DOM/artwork/records are uploaded. It is absent from the production UI (verified). See [axe's API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md).

Tags checked: `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, `best-practice`. The initial scan found serious prohibited ARIA labels on SVG groups; adding explicit group roles fixed those violations. Subsequent creation and reuse scans returned **0 violations / 29 passing checks**, but **color-contrast remained incomplete** on gradient-backed content. This is not a complete contrast audit or accessibility certification. Later wording-only fixes were production-smoked, not rescanned under axe.

Keyboard controls were exercised for mark confirmation, straight path, review/edit/save/reuse and modal Escape/focus. Freehand artwork is still pointer-based. No independent screen-reader/touch tour, Lighthouse report, actual 200% zoom, forced-colors or OS reduced-motion session was completed. Reduced-motion/focus styles exist; CSS presence alone does not prove those experiences.

## Bounded dependency correction

Installing the local axe development checker surfaced an existing critical Windows Next.js advisory. Next and eslint-config-next were upgraded together to **16.3.8**; installed Next documentation was reread and all build/test gates rerun. See the primary [Windows RCE advisory](https://github.com/advisories/GHSA-p293-qw3h-jr36) and [next/og advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j). This security patch is recorded as an additional change, not a new product feature.

Final `npm audit` snapshot: **0 critical, 2 high, 2 moderate**. Remaining advisory packages: `brace-expansion`, `js-yaml`, `vitest`, `@vitest/mocker`. This is not an advisory-free release. Resolve/triage them in release hardening. No forced audit fix was used, no real key was read/staged, and the preview binds only to 127.0.0.1.

## Open acceptance work

- No three fresh-viewer sessions were available or invented. Comprehension is pending, not accepted by proxy from an agent completing the flow.
- API/offline/storage/corrupt/deleted-source/stale-response/multi-tab browser matrices are not all rerun here. Existing tests are not misrepresented as browser evidence.
- Reset versus in-flight/cross-tab writes, asynchronous source persistence and complete stale-action/cache behavior need Phase 11 hardening. No concurrency-complete claim.
- Full keyboard art authoring, contrast/incomplete axe follow-up, zoom/high-contrast/reduced-motion and independent touch checks remain.
- Permanent source/tool/profile/practice browser deletion still requires explicit action-time consent. Algorithm tests cover disposable DB mutation/rollback, not a confirmed UI deletion tour.
- Phase 11 robustness/security/accessibility and Phase 12 founder deployment/handoff remain. No merge or readiness claim is made.

Next-generated `AGENTS.md` and `CLAUDE.md` are excluded from this change. Environment keys and temporary logs are excluded.
