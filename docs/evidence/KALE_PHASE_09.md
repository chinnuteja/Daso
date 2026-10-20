# Kale Phase 09 — A parent can see the authorship, and control the data

Base: `96b6fb47e618cf732cd201207eaa4811145c16c2` (Kale Phase 8).
Branch: `orchestration/kale-09-evidence-rights`.

Status: implemented with automated gates and real Chrome verification. **Not independently architecturally accepted, merged or deployed.** Permanent browser deletion and fresh-viewer comprehension remain pending; see below. The local data-rights algorithms themselves are tested against disposable databases, including failure injection.

## Product outcome

`/parent/tools` puts the exact work and its human story ahead of IDs or JSON. Draw shows the selected vector mark, typed intent, manual choice or AI suggestion, separate edits, child approval, and deterministic output. Flight shows the recorded obstacle fact, the same-distance clear comparison, and the real before/after replay over identical stored observations. No model-written assessment, mastery, emotion, prediction or learning-gain claim is generated.

Draw and Flight expose direct story links after saving; saved Draw tools link to their own story. The calm Parent view entry is in the shell. Preview/unfinished review is not presented as a saved tool. Unknown local profiles are “Child on this device”, not an invented Maya. Legacy `/parent` remains separate and unchanged.

## Storage, source preservation and privacy

- `capabilities.getGraph` reads the definition, owner profile, versions, ledger, mark copies, referenced current documents, observations, grants and summaries in one memory snapshot or one IDB readonly transaction. Export/renderer validate scope, owner, unique identities, event ordering, actor/origin attribution, active version, child approval, approved controls and trusted context before producing evidence.
- New child-intent entries retain explicit owner, trusted reviewed context, and the exact reviewed Draw path locally. Approval checks ownership and compares that stored context/path with reread source state. These are optional decoder additions: historical immutable records are not rewritten.
- Older Draw history uses a clearly labelled current source path; if that drawing is absent, a labelled inspection-example path is used. It is never claimed as a historically recorded child path. Older Flight history labels comparisons as examples, not an invented original selection.
- Deleting a source drawing removes only the editable document. The tool explicitly discloses its separate immutable mark copy and reviewed path. Delete the tool to remove its copy/history; delete the local child to remove owned tools, drawings and unfinished reviews together.
- A discovered pre-P9 gap is fixed: owner-tagged unfinished reviews are included in profile deletion even when no capability definition was saved. Compatibility for old ownerless unfinished Kale reviews and pre-review Flight practice observations uses the historical fixed `child_local_01`, never overriding an existing definition’s owner. Other explicitly owned drafts survive.
- Tool/profile deletion remains failure-atomic in both adapters, with IDB abort handling. Existing P7 fork redaction and orphan attribution tests remain unchanged/green. No new store, database upgrade, repository family, dependency or model route was added.

## Canonical receipts and no model dependency

Export format: `kale/capability-export-v1`. It contains the complete scoped v2 graph plus a reproducible execution for each saved version. `runs[].provenance` is **`recomputed_for_evidence`**. These are executions computed for inspection now; there is no fabricated usage history, run timestamp or claim that a child applied it earlier.

Receipts include algorithm version, approval/source-event/version IDs and canonical-JSON SHA-256 version/input/output/source hashes. Draw also hashes the exact selected strokes separately; the historical source digest covers the complete original source geometry, not only the selected strokes. Hashes are not signatures or authentication.

V2 evidence projection contains only local IDs, categories and actors; strict selection validates membership, uniqueness and required work/suggestion/approval/version/latest-edit references. The optional selector seam is stub-tested only. **No new external evidence payload is enabled.** The live parent view and export never call a model or send artwork/words/IDs externally. The teaching and legacy evidence model boundaries are unchanged.

Export rereads an atomic graph at the action, so it does not download a deleted tool from an old view cache. The parent view refreshes on focus and listens for local data-change/broadcast notices. Comprehensive cross-workbench concurrency/cache hardening remains Phase 11; no claim that every existing tab is synchronously purged is made.

## Real Chrome verification

Production preview: `http://127.0.0.1:3013`; localhost is a distinct browser origin. Separate disposable testing: `http://127.0.0.1:3014`. Existing 3013 data was not deleted.

1. Existing localhost Flight story: typed child words, AI suggestion, child approval, **Dart → Falcon**, **6 → 4 counted**; missing historical selection context explicitly labelled.
2. Existing 127.0.0.1 Draw stories opened without rewriting old history. Manual choice and child edit were correctly separated; older path context labelled.
3. Actual Flight export downloaded through the UI as `kale-tool-flight-practice-v2.json`: 1 version, 3 events, 6 trials, `recomputed_for_evidence`, before Dart/after Falcon. File SHA-256: `89f472b4fe9dd869bc43d465e8dfb87f2267c0b1542dc68225af960c7948ea57`. The automation download-event watcher timed out, but the completed file was independently inspected on disk; no watcher success is claimed.
4. Expanded real receipts. Delete dialog starts focused on **Cancel**; Escape and cancel dismiss without mutation and restore focus to the exact initiating button. Source-copy warning names what remains. No permanent deletion was clicked.
5. Fresh disposable Draw origin: no saved story before approval. Drew an original mark, picked it, drew a path, manually reviewed a typed intent, separately edited to wide spacing and saved **Phase 9 disposable mark**. Parent story showed the exact strokes, original even setting, wide edit, approval and **5 repeats on the retained reviewed path**. Manual work was not falsely credited to AI.
6. Browser testing exposed SVG letterboxing mis-mapping on the tall tablet workbench. A shared inverse-screen-transform helper now maps drawing, selection and reuse accurately; the same previously missed visible stroke was selected after the fix. Tests cover letterboxing, translation/scroll, rotation and clamping. Saved-state copy no longer says a saved tool is unsaved.
7. Tablet 1024×1366 and phone 390×844 checked. Parent story switches to one column with no horizontal overflow. Six navigation labels crowded at phone width; the final shell uses a three-column/two-row layout and is rechecked after build.

Screenshots: [Draw parent story](assets/kale-phase-09-parent-draw.jpeg), [Flight fact comparison](assets/kale-phase-09-parent-flight.jpeg), [safe source-delete confirmation](assets/kale-phase-09-delete-confirmation.jpeg), [final phone layout](assets/kale-phase-09-parent-phone.jpeg). The saved Flight story was also re-opened and verified after restarting the production preview on 2026-10-02.

## Automated gates

- Targeted Phase 9: **3 files, 27 tests passed** (memory, fresh IDB and populated v1-upgrade fixtures; source preservation, canonical order, corrupted receipts, closed selection, profile/tool deletion, rollback, unfinished-history compatibility, UI contracts and SVG mapping).
- Typecheck: exit 0.
- Lint: exit 0.
- Full suite before final build: **116 files, 375 tests passed**, no todo.
- Production build: includes `/parent/tools` plus all previous routes; only the existing teaching/evidence agent routes.
- Full suite after final build (rerun 2026-10-02): **116 files, 375 tests passed**, exit 0.

Source/CSS contracts supplement browser evidence; they are not claimed as a complete accessibility audit. Earlier Phase 8 tests and existing P7 atomic-delete/orphan tests remain asserted in the full suite.

## Honest pending checks / next phase

- **Permanent browser deletion:** awaiting explicit user approval to delete only the named disposable origin’s test data. Source/tool/profile deletion, post-delete browser focus/reload and a live orphaned-fork deletion tour are not claimed complete. Automated equivalents and legacy orphan regression tests passed. The user’s existing work has been preserved.
- **Fresh-viewer test:** not collected. Ask a parent to answer “What did the child make? What did AI do? What was saved?” without coaching; do not invent their response.
- No axe/Lighthouse audit or broad concurrent-tab/production security claim. No additional external evidence-provider authority was assumed.
- Next: Phase 10 unified Draw-first workbench and UX/visual polish, Phase 11 robustness/security, Phase 12 founder packaging. No final-product or independent-acceptance claim is made here.
