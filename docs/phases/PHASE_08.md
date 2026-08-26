# Phase 8 — Founder-Quality Product Experience

**Implements:** Milestone 7 — refined interaction and motion, tablet-quality usability, a
complete founder package, threat model, and a truthful 90-second demo.

**Base:** Phase 7 accepted on `main` at `92680888abafb97c0784f65c0ee21b057fd9968e`.
**Status:** Implemented. Acceptance evidence is recorded in `docs/evidence/PHASE_08.md`.

## 1. Product standard

P8 is not a coat of paint. It makes the product legible in one sitting:

> **A child notices something, teaches a lasting rule, sees the result change, and another
> child can use it later.**

The visual system serves that causal chain. A first-time child needs to know what to do next;
a parent needs to understand what was learned; a founder needs to see both the restraint and
the engineering underneath it without being asked to read the code.

The experience must feel like a calm field notebook, not an enterprise dashboard, chatbot, app
marketplace, streak mechanic, or toy with meaningless animation. Flight Lab remains the only
implemented tool kind.

## 2. Non-negotiable boundaries

- Do not change schemas, event vocabulary, compiler/runtime semantics, repository contracts,
  model routes, local-first storage, or the P6/P7 deletion and fork guarantees.
- Do not add a dependency, a second tool kind, sign-in, analytics, public sharing, cloud sync,
  sensor inference, or a third model path.
- Do not hide simulation disclosure, say a camera measured distance, say a summary was sent to
  a parent, or claim a prediction that P3 never stored (accepted D-02 remains visible in docs).
- Runner remains visibly offline and reaches neither teaching nor evidence code.
- Motion is optional enhancement only: no animation may conceal content, delay a destructive
  action, rely on a timer to complete a task, or violate `prefers-reduced-motion`.
- Preserve every prior invariant. P8 may add tests and amend only presentation/assertion tests
  with a recorded reason; it may not weaken architectural tests to accommodate design.

## 3. The experience to build

### A. First minute: orient without a tutorial

Home should answer three questions at a glance:

1. What is this? — “Teach a tool from a real question.”
2. What happens here? — “Your observations become saved rules.”
3. What can I do now? — one primary action: **Start with a question**.

Saved tools remain below the primary action and read as child-created artifacts, not product
templates. A tool tile shows the purpose, creator, observation/correction count, and exactly
one obvious first action. Secondary actions are visually quieter. The known `A copied tool`
privacy state remains anonymous.

### B. Teaching: a visible learning arc, never a form maze

Across `/journey`, add a compact persistent progress rail that uses the existing state machine
only: **Question → Decide → Predict → Test → Notice → Teach → See the change**. It identifies
the current step and one next action; it must not mark a step complete until the existing state
machine has reached it. Back actions retain their existing semantics.

Each screen has one large action in the reading band, a short “why this matters” sentence, and
human language. Selection cards must communicate state by text and shape in addition to colour.
The child should never need to infer whether a choice was saved, awaiting approval, or merely
suggested.

### C. The magic moment: correction becomes consequence

The anomaly/correction/approval sequence is P8's centre. It must make four facts unmistakable:

- Dart's 8.9m throw hit a chair;
- Maya said why that measurement was unfair;
- the proposed rule is a suggestion until Maya approves it; and
- after approval, the same stored trials replay under v2 and Dart is no longer counted.

Use a restrained before/after comparison with explicit labels (**Before: Dart leads**, **Now:
Falcon leads**) and a compact version delta. Never animate a ranking change without showing the
reason. “Your words became a rule” should appear only after the real approved event and v2
runtime result are available.

### D. Day 2 and trust

Runner must read as a deliberately different mode: calm, task-first, and visibly not a chat.
Show a persistent, plain-language **Saved rules — works without AI** badge, the active rule in
the context where it affects a throw, and factual ownership/provenance copy. A copied tool is
an independently owned copy, not a shared mutable original. The deleted-source state must keep
P7's anonymous title and wording exactly.

### E. Parent confidence

The parent screen should look calm and accountable, not technical. Keep the grounded narrative
first, supporting records available in a clear “Why this is supported” section, and data rights
separate below. Destructive actions retain their confirmation treatment and plain explanation
of what remains. Do not turn export or identifiers into the primary story.

## 4. Implementation checklist

- [x] **1. Establish the visual and interaction foundation**
  Spec ref: `TEACH_DASO_PRODUCT_AND_ARCHITECTURE.md > §§4.4, 13, 18`
  What to build: Refine existing CSS tokens and shell into a responsive notebook/lab system:
  type scale, spacing rhythm, semantic colours, focus ring, status styles, panels, buttons,
  hover/pressed states, and a `prefers-reduced-motion` policy. Do not introduce a UI library.
  Acceptance: All interactive controls have a visible keyboard focus state, 44px minimum target,
  4.5:1 normal-text contrast, and no horizontal overflow at 320px, 768px, or 1024px widths.
  Verify: keyboard-only manual pass; axe/Lighthouse accessibility report; screenshots at all
  three widths.

- [x] **2. Make Home explain the artifact and prioritize the next action**
  Spec ref: `§6 Scene 1, Scene 6; §17 Product Success Criteria`
  What to build: Add a concise product promise and one primary start action; refine saved tiles
  and secondary actions without losing actual counts/provenance/deletion states.
  Acceptance: A new viewer can identify the child-created tool, start a question, open Runner,
  and reach parent evidence without reading a paragraph or using `/inspect`.
  Verify: Home screenshot with empty/new state and saved-tool state; no hard-coded count/copy.

- [x] **3. Add an honest journey progress rail and state feedback**
  Spec ref: `§6 Scenes 1–5; §7.2; D-02`
  What to build: Map existing orchestrator states to the seven labels in §3B. Add current-step,
  completed-step, and next-action feedback in `JourneyFlow` without new states/events or a
  stored prediction claim.
  Acceptance: Progress matches each real state, selection/approval status is textually clear,
  and the rail remains understandable at tablet and phone widths.
  Verify: unit table test for every state; visual checkpoints for IMAGINE, COLLECT_TRIALS,
  REVIEW_MUTATION, and COMPILE_PREVIEW.

- [x] **4. Redesign trial capture around real-world activity**
  Spec ref: `§4.4; §6 Scene 3; §11.3; R7`
  What to build: Make the “go throw, then record” rhythm obvious. Present fields in physical
  order (plane, distance, obstruction), a clear count/not-count cue, and the honest manual
  measurement disclosure at the point it matters.
  Acceptance: The screen never implies automatic sensing; it communicates what is stored and
  returns the child to the next real experiment step after recording.
  Verify: capture screenshot; INV-32/46 and disclosure registry remain passing.

- [x] **5. Make correction and approval emotionally and logically clear**
  Spec ref: `§4.2; §6 Scene 4; §7.3; §12`
  What to build: Refine anomaly, suggestion, and approval screens to distinguish “Maya said”,
  “Daso suggests”, and “Maya approves”. Add small, non-blocking feedback when approval is
  recorded.
  Acceptance: A viewer can correctly say that the AI did not create the rule on its own and
  cannot approve it.
  Verify: real journey screenshot/recording; INV-10, 41, 47, 56 remain unchanged and green.

- [x] **6. Turn compile/replay into the proof moment**
  Spec ref: `§6 Scene 5; §17 Determinism; §18 45–70s`
  What to build: Improve `CompilePreviewScreen` to stage v1 → v2, trial_004’s validity flip,
  and before/now winner change from real runtime output. Respect reduced motion.
  Acceptance: No fixture-only labels; a child and founder can identify the rule, excluded throw,
  version, and changed ranking in under ten seconds.
  Verify: rerun INV-20/21/57–64; new screenshot against a real persisted journey.

- [x] **7. Finish the saved-tool and Day-2 Runner experience**
  Spec ref: `§6 Scenes 6–7; §7.5; §14`
  What to build: Clarify the distinction between teaching and using. Refine saved tile, Runner
  status/badge, rule credit, empty/integrity states, and copy action hierarchy.
  Acceptance: The phrase “works from saved rules, without AI” is visible in Runner; original,
  copied, and deleted-source states remain truthful and readable.
  Verify: real P6 Day-2 screenshot at tablet size; INV-22/23/43/69/70/77/79 green.

- [x] **8. Refine parent evidence and data-rights comprehension**
  Spec ref: `§4.5–4.6; §6 Scene 8; §11.4`
  What to build: Improve hierarchy, readable grounding labels, and the separation between the
  learning story, evidence, export, and delete. Keep P7 confirmations and orphaned-source
  language exact.
  Acceptance: The first viewport says what the child noticed/taught; supporting records and
  data controls are discoverable but not competing with the narrative.
  Verify: real parent screenshot; INV-24/25/75–78 green; keyboard focus screenshot for delete
  confirmation.

- [x] **9. Produce the founder package, documentation, and threat model**
  Spec ref: `§19; §12; §15; §20`
  What to build: Add root `README.md`, `docs/ARCHITECTURE.md`, and `docs/THREAT_MODEL.md`.
  README has one-sentence thesis, local run/test commands, 90-second product path, limitations,
  and links to evidence. Architecture document includes a readable diagram, closed authority
  boundaries, data flow, storage, and invariant map. Threat model covers secret AI authorship,
  self-approval, ungrounded parent claims, model leakage into Runner/client, raw media,
  destructive deletion, and orphaned-fork privacy, each linked to its real control/test.
  Acceptance: Every R7 simulation disclosure appears in README and at its declared product
  surface; documentation names Flight Lab as the sole implemented tool and D-01/D-02 honestly.
  Verify: static documentation test and manual link check.

- [x] **10. Create a truthful 90-second founder demo and comprehension protocol**
  Spec ref: `§18–19; §20`
  What to build: Record `docs/demo/teach-daso-90s.mp4` or an equivalently playable local video (or, if the environment cannot capture
  video, provide a timestamped capture script plus final frame sequence and record that blocker
  honestly). Use the exact story: thesis → define → real trials/outlier → child correction and
  approval → v2 replay → Day-2 reuse → parent evidence → closing line. Add
  `docs/demo/README.md` with setup/reset, exact clicks, narration/captions, timestamps, and a
  three-question comprehension script for one unfamiliar viewer.
  Acceptance: No screen implies an unbuilt capability. The final line is “Maya didn't download
  this tool. She taught it.” A viewer can answer: who taught the rule, what changed, and why the
  next-day tool works.
  Verify: inspect the final video/frame sequence against the script; collect one independent
  viewer's three answers if a viewer is available, otherwise label the human check pending
  rather than inventing it.

## 5. Required tests and rejection conditions

Add P8 tests (number from INV-80) without weakening prior invariants:

| ID | Assertion |
|---|---|
| INV-80 | Every persisted orchestrator state maps to one truthful progress-rail view; no unsupported prediction/value is rendered. |
| INV-81 | Interactive UI controls meet the target/focus/reduced-motion contract and core pages have no horizontal overflow at phone/tablet widths. |
| INV-82 | The founder docs contain the registered R7 disclosures, D-01/D-02, all real routes, and no claim of unbuilt sensor/notification/cloud capability. |
| INV-83 | The demo script/frame manifest follows the real evidence path and contains the required thesis, correction, v2 change, Day-2 proof, parent evidence, and closing line. |

Reject P8 if it:

- turns static screenshots, timing, or fixture text into a claimed product result;
- adds visual claims that outpace the implementation (camera measurement, notification,
  prediction, generated app, cloud, sharing);
- hides/weakens disclosures, data controls, provenance, or P6/P7 anonymous-fork guarantees;
- introduces a new state/schema/model path/dependency/tool kind;
- makes keyboard operation, focus, contrast, or reduced-motion behaviour worse; or
- delivers only a README or only CSS without an end-to-end founder-visible journey.

## 6. Gates and evidence

Run serially:

```text
npx vitest run tests/invariants/inv-80-founder-experience.test.ts tests/invariants/inv-81-accessibility.test.ts tests/invariants/inv-82-founder-docs.test.ts tests/invariants/inv-83-demo-manifest.test.ts
npm run typecheck
npm run lint
npm test
npm run build
npm test
```

Create `docs/evidence/PHASE_08.md` with changed paths, exact gates, viewport/browser, all
disclosures, and no unverified claims. Include real screenshots for Home, correction/approval,
compile/replay, Runner/Day-2, Parent Evidence, and mobile/touch layout. Include the demo file
or an honest capture blocker and a frame manifest. Do not merge or claim architectural
acceptance.
