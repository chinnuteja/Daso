# Inquiry workspace rebuild

The original result-first paper-plane demo proved that a saved rule could change a ranking, but it did not make the product understandable. This rebuild replaces Home with one honest, child-led inquiry. It preserves the existing versioned ledger, compiler, runtime, local persistence, reuse, parent evidence, and data-rights architecture.

## The product claim

Teach Daso is not a chatbot that treats a child's sentence as true. A child starts with a hypothesis, sees that exact hypothesis reflected back, records observations, notices when a comparison was not fair, and explicitly approves a narrow rule that changes only which observations count in the calculation.

The running example is a paper bridge: one sheet across two supports, with coins used as a measurable load. It deliberately uses a physical activity where a learner can make, test, revise, and explain.

## First-use path

1. **Think.** The child writes a hypothesis. It is not saved until the child confirms the reflection.
2. **Reflect.** The interface repeats the child's exact words and labels them a hypothesis—not a fact.
3. **Test.** The child records bridge design, number of coins held, and whether something other than the design changed. Results are calculated locally from those observations.
4. **Review.** If a changed setup is recorded, the child can propose one plain-language fair-test rule. The proposal alone changes nothing.
5. **Save.** The child approves the rule. A new immutable version is compiled; the changed-set-up observation remains visible but is excluded from the current comparison.
6. **Use again.** The saved tool opens in Runner Mode with the same load-count fields and rule semantics. It does not pretend a bridge tool is an airplane tool.

The technical builder at `/journey` remains available as an advanced route. `/library`, `/run`, `/parent`, export, deletion, and local-first persistence remain part of the wider prototype.

## What is real and what is not

- The entered hypothesis, approved decisions, versions, observations, replayed result, and saved local tool are real local data.
- The fair-test rule is deterministic code: `setup_changed = true` means that observation is retained but cannot decide the active ranking.
- No live model claims to understand arbitrary child language. The reflection is deliberately exact, and the supported activity uses constrained, reviewable data.
- No camera, microphone, cloud sync, automatic measurement, or parent notification is implied by this experience.

A future free-form assistant needs a server-side model, explicit data handling, activity-specific guardrails, and evaluation against misunderstandings. An API key alone is not a substitute for those product safeguards.

## UX principles used

- Show one meaningful decision at a time; keep the technical builder secondary.
- Keep the child's own words visible without turning them into evidence.
- Make system state and save status visible beside the action.
- Preserve an imperfect observation instead of deleting it; explain its effect on the result.
- Use plain language for the rule and the outcome, while retaining auditable technical records underneath.

Research inspiration included learning systems that make a learner's representation inspectable (Betty's Brain), preserve a valid approach while isolating a mistake (CherryPot, Korea), develop question formation (Wrai, Japan), and maintain revisable learner memory (Zizaixue, China). These informed the interaction model; they do not validate it. Independent child and parent usability sessions are still required.

## Verification

- Integration tests prove that a hypothesis becomes intent rather than a rule, a changed setup can be proposed and then explicitly approved, and replay changes without rewriting the observation.
- Runtime tests cover the new `median_load` metric and retain the distance and consistency contracts.
- Type-check, lint, full test suite, and production build must pass before this work is accepted.
- Browser-level acceptance remains required: keyboard navigation, 320 px / tablet / desktop layout, local reload, and a comprehension check with independent viewers.
