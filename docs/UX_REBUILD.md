# Result-first experience rebuild

The previous Phase 8 visual/architecture acceptance did not establish usability. The owner's first-use test failed: the Question button could silently ignore a click before IndexedDB initialization, and the long setup hid the product's central proof. This rebuild supersedes the old founder-demo flow, not the domain architecture.

## Research translated into decisions

- [NN/g: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/): show the useful result and relevant decision together. Put ledger/version details in a labelled expandable section; keep the complete builder secondary.
- [NN/g: Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/): every asynchronous action has a loading state, disabled controls, success feedback, and visible failure/retry. No apparently live button may silently discard an early click.
- [GOV.UK: Check answers](https://design-system.service.gov.uk/patterns/check-answers/): the proposed rule is reviewed in plain language before the significant save action. The button names its consequence: “Approve & save this rule.”
- [GOV.UK: Confirmation pages](https://design-system.service.gov.uk/patterns/confirmation-pages/): show what changed and what can be done next. Confirmation is followed by a real new-throw test, not a dead-end success message.

These patterns inform the design; they do not prove this particular interface is usable. Actual first-use testing is still required.

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
