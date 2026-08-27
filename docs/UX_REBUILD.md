# Result-first experience rebuild

The previous Phase 8 visual/architecture acceptance did not establish usability. The owner's first-use test failed: the Question button could silently ignore a click before IndexedDB initialization, and the long setup hid the product's central proof. This rebuild supersedes the old founder-demo flow, not the domain architecture.

## Research translated into decisions

- [NN/g: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/): show the useful result and relevant decision together. Put ledger/version details in a labelled expandable section; keep the complete builder secondary.
- [NN/g: Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/): every asynchronous action has a loading state, disabled controls, success feedback, and visible failure/retry. No apparently live button may silently discard an early click.
- [GOV.UK: Check answers](https://design-system.service.gov.uk/patterns/check-answers/): the proposed rule is reviewed in plain language before the significant save action. The button names its consequence: “Approve & save this rule.”
- [GOV.UK: Confirmation pages](https://design-system.service.gov.uk/patterns/confirmation-pages/): show what changed and what can be done next. Confirmation is followed by a real new-throw test, not a dead-end success message.

These patterns inform the design; they do not prove this particular interface is usable. Actual first-use testing is still required.

Additional recovery guidance reviewed on 2026-08-28:

- [W3C WAI: Multi-page forms](https://www.w3.org/WAI/tutorials/forms/multi-page/): make progress explicit, including in the page title. The experience now updates its title for notice, review, and saved stages and restores pending review after reload.
- [W3C WAI: User notifications](https://www.w3.org/WAI/tutorials/forms/notifications/): explain both success and failure near the action. Busy primary buttons now name the operation. An approval recorded before a failed compile is distinguished from an active saved rule, and uncertain saves do not promise that nothing was written.

## Primary flow

1. Home immediately shows four labelled sample observations, the calculated ranking, and the disputed chair-hit throw. No form filling or tutorial is required.
2. “That throw shouldn't count” creates a proposed rule. It does not approve it or change the ranking.
3. “Approve & save this rule” records a separate child approval and compiles through the existing backend. The same four observations replay under the saved version.
4. “Try a new throw” focuses the measurement input. Both obstructed and clear flights are evaluated by the actual runtime.
5. Secondary actions open the saved runner, make an independent copy for Leo, or open grounded parent evidence and data rights.

Home is `/`. Existing saved tools are at `/library`. The full guided builder remains `/journey`.

## Honesty and scope

Maya and the initial observations are a labelled sample. Baseline sample approval history is not presented as work performed by this visitor. Assistance is scripted; no live model interpretation is implied. The visitor's correction proposal, explicit approval, saved rule, runtime evaluation, fork, and export/deletion are real.

The server-rendered preview is computed with the real compiler/runtime in isolated memory. Merely opening Home does not write sample profiles or tools. The first explicit action creates a uniquely identified local sample. A metadata pointer uses the existing meta store; there is no new repository family, object store, schema, or model route. Deleted identities are never reused by a new sample, so surviving forks remain anonymous.

## Verification added

- Initial preview is a real runtime result, not a hard-coded winner.
- Proposal alone cannot change the active ranking.
- Approval changes the ranking without rewriting observations.
- Repeated proposal/save calls are idempotent.
- A failed compile can be retried without duplicating the already-recorded approval.
- New throws use runtime validity, not the original capture flag.
- Saved state survives an IndexedDB close/reopen.
- The new entry point still supports forks and grounded parent evidence.
- The full builder renders disabled controls before storage is ready.
- Landing-page reads create no sample data.
- New samples cannot resurrect deleted source identities.

## Acceptance standard

A fresh viewer should be able to identify the disputed result, propose and approve the rule, and explain what changed without a spoken walkthrough. A green unit suite alone does not satisfy that standard. The old 90-second video and Phase 8 screenshots are historical, not evidence for this rebuild.

## Verification run — 2026-08-27

| Gate | Result |
|---|---|
| New integration tests | 2 files, 11 passed |
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npm test` | 99 files, 283 passed |
| `npm run build` | Exit 0; includes the new `/library` route and both existing agent routes |
| `npm test` after build | 99 files, 283 passed |
| Production HTTP check | `/`, `/library`, `/journey`, `/run`, `/parent` and referenced static assets return 200 |

The initial server-rendered page contains the result-first action, sample disclosure, and disabled-until-ready controls. Production is served locally on port 3000.

**Still unverified:** live browser clicks, keyboard navigation, and rendered mobile/tablet layout. The browser-control runtime failed before connecting (missing local kernel assets), including after a reset. No new screenshots, accessibility report, or independent comprehension result are claimed. This branch is ready for first-use review, not UX-accepted or merged.

## Recovery verification — 2026-08-28

The requested browser connection was attempted and reset once. Both attempts failed before any page could be inspected: `failed to write kernel assets: The system cannot find the path specified. (os error 3)`. This is an automation-environment blocker, not evidence of a page failure. No alternative browser-control mechanism was used to bypass the prescribed browser connection.

Code review and executable checks added:

- A restored pending proposal renders the review stage.
- An already-recorded approval awaiting compilation is described as not active; the next save does not request another approval.
- The test-throw entry point rejects writes until the reviewed rule is saved.
- Waiting for another tab's lock times out after eight seconds and can be retried. The timeout stops when the lock is granted, so it never aborts a write already in progress.
- Local database connections close even if loading ID counters fails; the library's second-child action now closes its connection and catches errors.
- Editing test inputs clears the previous result so a prior verdict is not attached to different inputs.

Targeted recovery/storage tests: **3 files, 16 passed**. Full suite before and after production build: **100 files, 288 passed** each. Type-check, lint, and production build: exit 0. The rebuilt production server is running on port 3000; `/`, `/library`, `/journey`, `/run`, and `/parent` return HTTP 200. These include server-rendered markup and fake-IndexedDB integration checks, not browser click tests.

### Live acceptance checklist — NOT RUN

1. Fresh local sample: notice → propose → back to observations without approving → review → approve. Ranking must remain Dart before approval, then become Falcon.
2. Reload during review and after save. Pending review and saved rule must respectively survive.
3. Enter obstructed Dart 10 m, then clear Dart 10 m. Confirm the first is excluded, the second counted, and displayed input/result correspondence stays clear.
4. Open Runner, make Leo a copy, inspect Parent evidence. Test export and delete only an explicitly identified disposable sample, never unrelated user work.
5. Follow all actions with keyboard only, including focus after stage changes, error recovery, details, and deletion confirmation.
6. Inspect at 320 px phone, tablet, and desktop widths, with zoom and reduced motion. Verify readable text, no horizontal clipping, visible primary action, and touch target sizes.

No API key is needed for this acceptance pass. Assistance remains explicitly scripted. UX acceptance is still open; historical screenshots and videos do not close it.
