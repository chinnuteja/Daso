# Kale Phase 11 — hardening and understandable actions

Date: 2026-10-04. Base: `31a2d5668d561c15e50260c46729862aadf07903`.
Branch: `orchestration/kale-11-hardening`.

Status: implementation with automated and real-browser verification; not independently architecturally/UX accepted, merged, deployed or declared founder-ready. Phase 12 has not started. Remaining acceptance work is explicit below.

## What changed

- Ordered source writes compute digests and save in one UI queue. Memory and IndexedDB enforce expected source revision and owner reset generation inside their write snapshot/transaction. Same-revision replacement, owner replacement, stale writes and resurrection after deletion fail closed. A stale tab retains its own unsaved vectors and offers a JSON download rather than overwriting the winning tab. The UI says those changes are not saved and prevents opening another drawing over that unsaved buffer.
- Profile/practice deletion increments a non-content reset counter in the existing `meta` store, atomically with deletion. Injected failure leaves both graph and counter unchanged. No database/schema migration, new repository family or capability kind was added. The metadata fence is described in the threat model; it is not a cloud identity or authentication check. Old raw-save compatibility remains, while the workbench always uses guarded writes.
- A Draw intent append rereads the source and checks owner, source revision, selected-mark currency, guide path and ledger context. Candidates/edits/rejections require existing references. Deleted unfinished reviews cannot be recreated by a late async append. Concurrent approvals still use the existing shared atomic commit: exactly one activates; its identical retry is idempotent.
- Saved reuse reads a consistent graph and validates its history/active version immediately before applying it. A missing/corrupt/removed graph cannot be turned into a new invented mark. Focus/data-rights refresh updates changed records but leaves unchanged previews alone. Source thumbnails crop the viewport around the original vectors rather than modifying or beautifying them. No model import/call was added to saved runtime.
- Geometry now rejects malformed/non-finite/oversized typed-runtime inputs before placement allocation. Valid v1 geometry transforms and rounding are unchanged. Existing output limits remain 80 stamps and 32,768 points. The desk separately budgets 65,536 source points; oversized saved documents stay canonical and downloadable, not silently simplified or rendered as a million-point SVG.
- The teaching client has a 25-second request timeout and recoverable handling for offline transport, invalid JSON and unsupported model responses. `KALE_DISABLE_TEACHING=1` is a server-only deliberate 503 seam, not a scripted AI success. Teaching body bytes are limited to 16 KiB before JSON/schema parsing, including false/missing Content-Length; body-read waiting is bounded. The existing two model routes remain the only model paths.
- Review/edit/reject/save actions use synchronous in-flight guards. Source editing is disabled during persistence/review. Review focus and rejection recovery are explicit. A render boundary does not reset stored data or claim unsaved changes survived a render failure.
- Keyboard artwork authoring is available under an optional disclosure: arrows place the child's own points, Enter starts/finishes, Shift moves farther, Escape cancels. Mark selection and direct path endpoint controls remain native keyboard controls. These points use the same canonical source/approval/runtime path, not generated artwork.

## UX research and decisions

The aim is an understandable action, not more explanatory screens. These are design inferences, not evidence that our users already understand the app. No reference implementation was copied.

- [Scratch's getting-started sequence](https://scratch.mit.edu/help/studio/tips/howto/get-started-intro/) starts with achievable actions. We keep a labelled practice path and explain only the current next action.
- [tldraw's AI integration examples](https://tldraw.dev/docs/ai) keep transformations beside source work. Our canvas/source thumbnail remains visible while a bounded repeat is previewed. Unlike a canvas-understanding agent, this app does not send artwork to the model.
- [Kleki's help](https://help.kleki.com/) separates drawing tools, input devices, keyboard/touch, saving and recovery. We keep keyboard authoring and advanced preview controls optional, and give failed local saving a concrete recovery action.

Action labels now say the result: **Repeat this mark**, **Draw its path**, **Suggest a repeat from my words**, **Choose the repeat myself**, **Closer together / Farther apart**, **Repeat on this path**. A selected-source thumbnail shows what will actually repeat. Loading saved tools no longer flashes an empty-library claim. Backgrounds behind interface text are solid where needed for auditable contrast. Redundant canvas text no longer covers the artwork; dot/arrow direction and adjacent instructions remain.

## Automated verification

Final gate results are recorded after the last source edits, not inferred from previous phases.

| Gate | Result |
|---|---|
| Typecheck | Exit 0; no diagnostics |
| Lint | Exit 0; no errors or warnings |
| Full test suite | Exit 0; 122 files, 405 tests passed |
| Production build | Exit 0; existing routes and exactly two agent routes retained |
| Full tests after build | Exit 0; 122 files, 405 tests passed |

New tests cover both memory and IndexedDB: conflicting tabs, ordered writes/flush failure, reset fencing, rollback, owner/same-revision replacement, orphaned late appends, concurrent activation/idempotency and Draw/Flight reuse with all fetch calls forbidden. Geometry checks include 200 seeded valid inputs with deterministic/finite/bounded output and unchanged source, invalid-number attacks, point/stamp limits and the largest schema-valid document. Transport tests reject oversized bytes before provider access and make timeout/offline/invalid-model failures recoverable.

The P9 other-child unfinished-review fixture previously copied the first child's trusted source context. It now supplies a genuinely other-child source/context; delete-isolation assertions are unchanged. The P10 label assertion now expects **Repeat this mark**. No authority or replay assertion was removed to obtain green gates.

## Real Chrome checks

Tests used isolated `127.0.0.1:3017` and `:3018` origins. Existing port-3013/3015 records were not reset or deleted. Permanent browser Delete/Reset confirmation was not clicked.

1. From a fresh drawing desk, keyboard-authored a closed square with five explicit points. Chose Line 1; the exact thumbnail and canonical source remained visible. Directed a new path using the endpoint controls. The live draft made nine repeats.
2. Deliberately disabled teaching returned a real 503. The UI offered manual choice, not fabricated AI output. Reviewed even spacing, changed it separately to wide, and saved **My little square trail**, version 1. The review path made six repeats. The stored story distinguishes manual starting choice, later child adjustment and approval.
3. Reused that version on another path; six repeats computed locally. Reload and production restart kept the tool. Later source changes did not rewrite its saved mark copy. Automated tests additionally forbid every network call for both Draw and Flight runtimes. No full-site offline/cold-load promise is made. An attempted loaded-app/server-stopped check was interrupted by development navigation to a connection-error page and is not counted as a passing offline test.
4. Opened two tabs on the same source. First saved a horizontal extra line. Second tried a vertical line from the stale revision and received an explicit conflict. First's revision was not overwritten. Clicked the JSON recovery download; Chrome's download-event helper timed out, but the actual 1,525-byte file was verified in Downloads: revision 5, two lines, with the unsaved vertical line's points `(320,220) → (320,228)`. This backup is not an approval or activated tool. Automatic import is not implemented.
5. Reset confirmation initially focuses Cancel. Escape closes it and returns focus to Reset practice. No permanent UI deletion occurred; disposable automated databases test deletion/rollback/reset races.
6. Practice flow selected the orange diamond, directed a path and showed nine draft repeats. Rejected a manual review using Enter; no tool activated, and recovery returned focus to the words field. A new blank drawing did not delete the earlier stored practice source.
7. Production parent story verified the exact saved source, original words, manual even choice, child wide adjustment, approval and six-repeat deterministic replay. It does not invent a learning gain or credit the manual choice to AI.
8. Inspected 390×844 phone and 1024×1366 portrait tablet. At those inspected states document scroll width equalled client width (375 and 1009 respectively; scrollbar accounts for the difference from viewport width). Canvas remains before the phone controls. These are responsive-browser checks, not independent touch-device certification.

Frames: [tablet reuse](assets/kale-phase-11-reuse-tablet.png), [phone applied result](assets/kale-phase-11-reuse-phone.png). They show actual locally stored versions and computed geometry, not generated UI mockups.

Both frames were recaptured against the final production build after the 405-test serial gates. That build restored the saved version, accepted a new keyboard-directed path and produced six repeats on tablet and phone. Normal teaching was enabled for the final preview; deliberate provider failure was a separate earlier test. The final phone check again measured 375px client/scroll width. The normal viewport was restored and the drawing desk left available at `http://127.0.0.1:3017/draw`.

## Accessibility evidence

The existing app-owned development-only axe 4.13.0 control was exercised through the browser. The final fresh blank state returned **0 violations, 30 passing checks, 0 incomplete**. The final practice repeat-preview state returned **0 violations, 31 passing checks, 0 incomplete**. Saved reuse returned **0 violations, 30 passing checks, 0 incomplete** after the solid-background correction. These scans cover those visible states, not every possible state or WCAG certification.

Earlier scans had incomplete contrast checks on gradient-backed controls, SVG direction text and the blank-canvas overlay. Those were corrected and the blank/preview states rescanned; the earlier incomplete report is not presented as a complete passing report. Keyboard authoring, selection, endpoints, editing/approval, rejection, reuse, Escape and recovery focus were exercised. A CSS focus contract alone is not this evidence.

## Dependency audit and engineering failures

The lockfile updates include Vitest 4.1.11 and patched available transitive brace-expansion/js-yaml packages, within existing declared ranges. The global npm 11.3.0 updater twice failed in Arborist's peer graph; an official, temporary npm 12.2.0 invocation completed the update. No forced audit fix or global CLI replacement was used.

Final audit snapshot: **production dependencies: zero advisories**; full dependency tree: **five high entries**, all in the development ESLint → fast-glob → micromatch → braces chain. [The reviewed braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version as of this verification. npm's proposed fix is a major downgrade of eslint-config-next to 14.2.35, not a safe upgrade matching installed Next 16.3.8. We did not hide the advisory or downgrade the framework lint stack blindly. Do not feed untrusted glob patterns into this development toolchain; hosting review must revisit the audit. This is not an advisory-free or security-certified release.

An intermediate test caught a wrong metadata value shape in the new IndexedDB reset fence; the implementation was corrected to the existing `{key,value}` store. An intermediate build failed because my preview log files were open inside `.next`; preview logs were moved to a temporary directory and the build rerun. Intermediate type/fixture failures were repaired before final gates. No failed attempt is called a passing gate.

## Remaining acceptance/release work

- Independent fresh-viewer comprehension, actual screen-reader/touch sessions, OS reduced-motion/forced-colors and 200% zoom remain unverified. No human answers or accessibility certification were invented.
- Artificial slow-network/stale-model-response and corrupted-storage/large-document browser matrices are not exhaustive. Existing/new automated tests do not replace those browser cases. No browser throttle or direct storage injection was used to manufacture evidence.
- Permanent source/tool/profile/practice deletion tours require action-time consent. Disposable database tests cover coordinated deletion and fences; UI focus/cancel is verified, but confirmation itself is not claimed tested here.
- No automatic backup import, service worker, login, cloud sync, open-ended capability execution, new model route or artwork upload was added. Runtime algorithm version remains 1.
- Public hosting, provider rate/cost safeguards and founder handoff remain Phase 12 and require a deployment decision. Do not merge or call ready solely because this packet exists. Development-only dependency risk above remains tracked.

Environment keys, Next-generated `AGENTS.md`/`CLAUDE.md`, temporary logs and the downloaded recovery JSON are excluded from Git.
