# Kale Memory Lab

**The computer that grows with your child should grow because of your child.**

A child tells Kale how they want help, reviews what Kale understood, and activates a lasting preference. The same authorship architecture also lets a child build a fair-test tool from observations and rules.

The current landing experience starts with the result, not a setup wizard. See [the UX rebuild and research](docs/UX_REBUILD.md).

This is a local tablet prototype. It is not affiliated with or endorsed by Daso.

## The idea

Kale Memory Lab explores one adjacent question: can a child teach their computer a durable capability without quietly handing authorship to the AI?

The primary proof is deliberately personal and easy to understand. In a writing draft, Kale initially notices a spelling issue. The child teaches it, in their own words, to ask about the story first and defer spelling until the draft is finished. Kale reflects a narrow structured interpretation, but nothing changes until the child approves it. Approval compiles an immutable local version; the same draft then gets a story question instead of a correction.

The deeper Bridge Bench and Flight Lab proofs use the same mechanism for data tools. A child defines what “best” means, records real observations, notices an unfair test, explains why, and approves the change. Their words compile into an immutable version, the same observations replay deterministically, and the saved tool runs later with no model call.

| What a founder sees | What the architecture proves |
|---|---|
| **Ask about my story first** | A child-authored sentence is reflected into a closed preference, stays inactive until approval, and changes executable behavior only after compilation. |
| **Before: Dart leads → Now: Falcon leads** | One approved rule changed one stored trial’s validity; the runtime replay is deterministic. |
| **Maya taught this rule** | Material behavior is equal to the fold of approved authorship events. |
| **Saved rules — works without AI** | Runner cannot reach either model role and uses the active immutable version. |
| **Parent evidence** | Every narrative clause is projected from local records and cites evidence that exists. |

The original Phase 8 screenshots and video are archived evidence of the earlier interface, not the current landing page.

## Run locally

```text
npm install
npm run dev
```

Open `http://localhost:3000`. Teaching stays scripted so the path works with the network off.

```text
npm run typecheck
npm run lint
npm test
npm run build
```

## Try the idea — the primary experience

Open `/`.

1. Ask Kale for help with the Moon Dragon draft. With no preference saved, it notices the spelling issue.
2. Tell Kale: **“Ask about my story first and fix spelling after I finish the draft.”**
3. Choose whether the preference applies only here or to every writing project.
4. Review Kale’s narrow interpretation. The original words and proposed executable behavior are shown separately.
5. Approve it. Kale now asks about the story and explicitly waits on spelling. Reload: the approved version remains active.

Interpretation is deterministic in this prototype, not a live-model performance. The child’s proposal, approval, immutable version, local persistence, and behavior change are real. Existing saved tools are at `/library`; Bridge Bench is at `/lab`.

## Full guided builder — optional

1. Home: **Start with a question**.
2. Teach: question → what “best” means → what to write down → a guess (not stored as a result) → real throws.
3. Notice the 8.9 m Dart throw that touched something. Maya says why. Approve the rule. Kale cannot approve it.
4. See the same stored throws replay under v2: Dart is no longer counted; Falcon leads.
5. Home → **Let Leo try this** → **Make my copy**. Runner works from saved rules, without AI.
6. **Parent evidence** shows the grounded story. Delete is real.

Demo script and frames: `docs/demo/README.md`. Closing line: **Maya didn't download this tool. She taught it.**

## Limitations and simulations

Two executable tool kinds exist: coaching preferences and experiment comparators. The writing interpreter intentionally recognizes one narrow preference family; it asks for clarification outside that contract. There is no sign-in, analytics, public sharing, cloud sync, or camera that measures distance.

| Simulated | What is real | Where you are told |
|---|---|---|
| Automatic detection of how far a paper airplane flew. | The child enters or confirms the measured distance, and that recorded observation is what the metrics and the replay actually use. | Capture screen; this README |
| Computer vision deciding that a flight touched something. | The child's own judgement, recorded as an observation, and the taught rule that acts on it. | Capture screen; this README |
| Delivery of the summary to a parent by SMS or push notification. | On-device generation of the summary and the check that every claim it makes cites an event that exists. | Parent view; this README |
| Separate accounts and authentication for the second child on day two. | Fork semantics and rule inheritance: the second child's session runs Maya's approved rules and cannot alter her version. | Runner; this README |

Honest product-spec deviations:

- **D-01:** Approval is a separate child-actor ledger entry, not a boolean the event author flips.
- **D-02:** Which design Maya predicted is not stored, so no product screen invents that prediction.

## Routes

`/` Writing preference · `/lab` Bridge Bench · `/library` Saved tools · `/journey` Full builder · `/run` Runner · `/parent` Parent evidence · `/inspect` inspection projection · `/api/agents/teaching` and `/api/agents/evidence` (the only two model paths)

## Docs

- Architecture: `docs/ARCHITECTURE.md`
- Threat model: `docs/THREAT_MODEL.md`
- Evidence: `docs/evidence/`
- Demo: `docs/demo/README.md`
