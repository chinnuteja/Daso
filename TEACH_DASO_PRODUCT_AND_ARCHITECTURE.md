# Teach Daso

## Product and Architecture Definition

**Status:** Build direction  
**Audience:** Project team first; Daso founders and engineers after the working prototype is complete  
**Artifact type:** A real, architecture-backed vertical product slice—not a concept video and not a production-scale platform  
**Independence:** This is a speculative project created to explore a product primitive that could belong inside Daso. It is not affiliated with or endorsed by Daso.

---

## 1. Executive Summary

Teach Daso is a proposed capability for Daso in which a child can teach the computer a new, reusable tool through decisions, examples, observations, testing, and correction.

The central thesis is:

> **The computer that grows with your child should grow because of your child.**

This is not an AI app builder for children. The child does not describe an app and wait while AI secretly builds it. Instead, the child must define the problem, decide what matters, supply evidence, encounter failure, correct the system, and approve every material behavior that becomes part of the resulting tool.

AI acts as a guide, translator, and compiler. The child remains the author.

The first working experience will be **Flight Lab**:

> A child wants to determine which paper-airplane design flies best. Daso helps the child define “best,” record trials, notice an invalid experiment, create a reusable rule, and save the completed capability as “Maya’s Flight Lab.” The next day, another child can use Maya’s tool, including the rule Maya taught it.

The project demonstrates both product thinking and engineering depth:

- Child agency and authorship
- Guided problem formulation
- Structured tool definitions
- An authorship/provenance ledger
- Versioned capability compilation
- A deterministic runtime
- Local-first child data
- Explicit sensor permissions
- Evidence-based parent summaries
- Safe capability boundaries

The intended founder reaction is not merely, “This is a polished demo.” It is:

> “This person understood our thesis deeply enough to extend it, then engineered the idea seriously enough for us to debate it.”

---

## 2. Why This Project Exists

Daso is building a first computer for children aged 6–12 around creation, learning, exploration, family trust, and freedom from engagement-driven defaults. Its public product rejects feeds, ads, autoplay, open app stores, and addictive incentives. Children draw, write, film, photograph, make music, ask questions, and communicate only within approved circles.

Teach Daso asks a question that follows naturally from that philosophy:

> **How can Daso become more capable over time without taking more agency away from the child?**

Conventional answers are unsatisfying:

- Download more apps.
- Let an algorithm recommend content.
- Ask an AI to generate an app instantly.
- Add more company-authored lessons and activities.
- Turn the AI into an always-present companion.

Teach Daso proposes a different answer:

> Let the child create capability through learning.

This creates personalized growth without an open app ecosystem. More importantly, the personalization is authored rather than inferred. The computer becomes personal because the child taught it—not because a recommendation system silently profiled the child.

---

## 3. The Product Primitive

A child-authored capability follows five stages.

### 3.1 Imagine

The child starts with a personally meaningful desire:

> “I want to know which paper airplane flies best.”

Daso does not convert this directly into an application. It first helps the child turn the desire into a tractable problem.

### 3.2 Define

The child decides what the important words mean.

For example, “best” might mean:

- Longest distance
- Most time in the air
- Highest accuracy
- Most consistent performance

Daso may offer understandable alternatives, but the child must choose. Suggestions do not become behavior until the child accepts them.

### 3.3 Teach

The child provides the material from which the capability is formed:

- Plane names
- Measurements
- Examples
- Predictions
- Rules
- Demonstrations
- Observations

The system records the source of every material decision.

### 3.4 Test and Correct

The capability must encounter uncertainty or failure before it can be kept.

Example:

> A throw travels 8.9 metres, but it bounced off a chair.

Daso initially records the trial. Maya notices the problem:

> “That one shouldn’t count. It hit the chair.”

Daso asks:

> “Why shouldn’t it count?”

Maya answers:

> “Because then we’re measuring the chair too.”

Daso translates that reasoning into a candidate rule:

> **Do not count a flight that touches another object before landing.**

Maya reviews and approves it. A new immutable tool version is produced.

### 3.5 Keep and Reuse

Only after the capability has been tested and corrected does it become a persistent tool:

> **Maya’s Flight Lab**  
> Created by Maya · 9 observations · 2 corrections

The next day, Maya’s brother opens it. His plane hits a wall. The tool says:

> “Maya taught me not to count flights that touch another object. Did this one?”

Maya’s reasoning has become reusable computational behavior.

This is the defining magical moment:

> **A child teaches the computer something another person can use.**

---

## 4. Product Principles

### 4.1 Every Material Behavior Must Have Provenance

Every meaningful behavior in a finished tool must be traceable to one of the following:

- A child decision
- A child example
- A child observation
- A child correction
- A child-authored rule
- An AI suggestion explicitly reviewed and accepted by the child
- A fixed safety or system rule clearly marked as such

The AI may translate, simplify, or propose. It may not silently author the tool.

### 4.2 The Capability Is the Reward

There are no points, streaks, gems, leaderboards, or artificial badges. The reward is that the child made something useful that continues to exist.

### 4.3 AI Helps During Teaching; Approved Tools Run Predictably

An LLM may help translate natural language into a structured candidate. Once approved, the saved tool should use deterministic logic wherever possible.

The runtime should not call an LLM for basic behavior such as:

```text
IF obstruction = true
THEN trial.valid = false
```

This improves safety, explainability, offline behavior, latency, cost, and trust.

### 4.4 Physical Experience Comes Before Screen Retention

Flight Lab sends the child away from the screen to fold, throw, observe, measure, compare, and revise.

The tablet supports the activity. It is not the activity.

### 4.5 Parent Evidence Must Describe Thinking, Not Surveillance

The parent should not merely see:

> “Maya used Daso for 32 minutes.”

The parent should see:

> “Maya noticed that one trial was affected by a chair, explained why it was unfair, and taught Flight Lab to exclude obstructed flights.”

### 4.6 Child Data Must Be Minimal, Inspectable, and Deletable

The system should collect data only when a visible feature requires it. The child and parent should be able to understand what was stored and why.

---

## 5. What Teach Daso Is Not

Teach Daso is not:

- A public app marketplace
- A prompt-to-app generator
- A coding course disguised as a game
- A general chatbot
- An AI companion or pretend friend
- A social feed of children’s creations
- A system that runs arbitrary generated code
- A passive child-surveillance engine
- An attempt to reproduce Daso’s internal operating system
- A proposal to replace Daso’s current product roadmap

The project demonstrates one possible product primitive. Daso may disagree with it. A thoughtful disagreement would still mean the artifact succeeded in creating a serious product conversation.

---

## 6. The Complete Flight Lab Experience

### Scene 1: The Question

Maya opens Teach Daso and says:

> “I want to find out which paper airplane is best.”

Daso responds:

> “Let’s build a way to test that. What should ‘best’ mean?”

Maya chooses distance and consistency.

### Scene 2: The Prediction

Maya names three designs:

- Falcon
- Dart
- Glider

Before any trial, she predicts that Dart will win.

### Scene 3: The Experiment

For each throw, the system records:

- Plane design
- Distance
- Whether the path was obstructed
- Optional note
- Trial timestamp
- Whether the child considers the trial valid

Camera recognition is not the main product claim. The prototype may use manual distance entry or a visually honest simulated measurement flow. The important behavior is how observations become a reusable rule.

### Scene 4: The Failure

The fourth Dart trial records 8.9 metres, but it hit a chair.

The outlier changes the ranking. Maya rejects it and explains why.

The Teaching Agent turns her explanation into a candidate structured mutation. Maya approves it.

### Scene 5: Compilation

The tool advances from version 1 to version 2.

```text
Version 1
- Compare distance
- Compare consistency

Version 2
- Compare distance
- Compare consistency
- Exclude obstructed flights
```

The system replays the saved observations under version 2. The invalid trial is excluded, and the result changes.

### Scene 6: The Tool Appears

Maya sees a new tile:

> **Maya’s Flight Lab**

Opening the tile enters Runner Mode. Runner Mode contains no teaching chat and no hidden generation. It executes the approved structured definition.

### Scene 7: Day 2

Another child uses Maya’s Flight Lab. The saved obstruction rule works. The interface identifies the rule as something Maya taught it.

### Scene 8: Parent Evidence

The parent view shows:

- Question Maya chose
- Prediction
- Number of observations
- Rule Maya introduced
- How the rule changed the result
- A suggested real-world conversation

It does not expose unnecessary raw recordings.

---

## 7. System Architecture

```text
Child Interface
    ↓
Teaching Orchestrator
    ↓
Candidate Structured Mutation
    ↓
Schema Validator + Safety Policy
    ↓
Child Review and Approval
    ↓
Authorship Event Ledger
    ↓
Versioned Tool Definition
    ↓
Deterministic Runtime
    ↓
Experiment Events and Results
    ↓
Evidence Summarizer
    ↓
Parent View
```

### 7.1 Child Interface

Responsibilities:

- Capture the child’s goal
- Present constrained choices at the appropriate reading level
- Record observations and corrections
- Make suggestions visibly distinguishable from child decisions
- Require approval before material mutations
- Show why the tool behaves as it does

The child interface should not be an unrestricted chat window. It is a guided creation flow with voice or text available as input.

### 7.2 Teaching Orchestrator

Responsibilities:

- Maintain the current teaching stage
- Decide the next relevant question
- Assemble only the context needed for the current step
- Call the Teaching Agent when natural-language interpretation is necessary
- Route candidate mutations to validation
- Never write an approved tool version directly

The orchestrator is a state machine, not another free-form agent.

Possible states:

```text
IMAGINE
DEFINE_METRICS
DEFINE_INPUTS
PREDICT
COLLECT_TRIALS
INSPECT_ANOMALY
PROPOSE_CORRECTION
REVIEW_MUTATION
COMPILE
RUN
```

### 7.3 Teaching Agent

The Teaching Agent has limited authority.

It can:

- Ask a concise follow-up question
- Translate child language into a candidate schema mutation
- Offer two or three understandable alternatives
- Explain a concept in age-appropriate language

It cannot:

- Approve its own suggestion
- Change a tool directly
- Grant permissions
- Generate arbitrary executable code
- Send messages or share data
- Create an untraceable rule

### 7.4 Schema Validator

The validator checks whether a candidate mutation:

- Matches the supported tool schema
- References approved capabilities
- Uses valid input and output types
- Stays within resource limits
- Contains complete provenance
- Can be represented deterministically

Validation is implemented in code, not delegated to an LLM.

### 7.5 Safety Policy Engine

The policy engine enforces hard boundaries:

- No arbitrary network calls
- No unapproved contacts
- No background microphone or camera capture
- No continuous location tracking
- No generated native code
- No filesystem access outside the tool’s sandbox
- No tool-to-tool access without an explicit capability
- No public publishing
- No undeclared model invocation during Runner Mode

### 7.6 Capability Compiler

The compiler consumes:

- Previous valid tool version
- Approved structured mutation
- Authorship event reference
- Current permission grants

It produces:

- A new immutable `ToolVersion`
- A deterministic execution plan
- A human-readable explanation of the change
- A reversible migration from the previous version

### 7.7 Deterministic Runtime

The runtime executes approved tool definitions inside one trusted host application.

The child-created tools should **not** be separately generated Android applications or APKs. A tile such as “Maya’s Flight Lab” is a structured definition rendered and executed by the shared runtime.

Benefits:

- No arbitrary code installation
- Shared UI and accessibility primitives
- Lower memory overhead
- Centralized permissions
- Consistent safety behavior
- Easy rollback and deletion
- Offline execution for deterministic tools

### 7.8 Evidence Summarizer

The Evidence Agent reads a deliberately limited projection of the event history. It produces a parent-facing summary about the child’s reasoning.

The summary must be grounded in event identifiers. Unsupported claims are rejected.

Example internal output:

```json
{
  "summary": "Maya excluded an obstructed flight after explaining that the chair changed what was being measured.",
  "evidenceEventIds": ["trial_004", "event_014", "tool_version_002"]
}
```

---

## 8. Why This Is Not an Agent Swarm

The architecture should contain only two model-driven roles:

1. **Teaching Agent** — interpretation and scaffolding
2. **Evidence Agent** — grounded summarization

The orchestrator, validator, policy engine, compiler, runtime, storage layer, and permission system are deterministic services.

Adding agents for “product management,” “coding,” “review,” “memory,” and “safety” would make the diagram look sophisticated while weakening authority boundaries. The important engineering decision is not how many agents exist. It is which decisions are allowed to be probabilistic.

---

## 9. Core Data Model

### 9.1 ChildProfile

Stores the minimum settings needed to adapt the experience.

```json
{
  "childId": "child_local_01",
  "displayName": "Maya",
  "readingBand": "developing",
  "inputPreferences": ["voice", "touch"],
  "createdAt": "2026-08-18T10:00:00Z"
}
```

Avoid storing birth dates when an age band is sufficient.

### 9.2 ToolDefinition

Represents the stable identity of a child-created tool.

```json
{
  "toolId": "mayas-flight-lab",
  "ownerChildId": "child_local_01",
  "displayName": "Maya's Flight Lab",
  "kind": "experiment_comparator",
  "currentVersionId": "tool_version_002",
  "createdAt": "2026-08-18T10:12:00Z"
}
```

### 9.3 ToolVersion

An immutable compiled version.

```json
{
  "versionId": "tool_version_002",
  "toolId": "mayas-flight-lab",
  "version": 2,
  "inputs": ["design_name", "distance_m", "obstruction"],
  "metrics": ["median_distance", "consistency"],
  "rules": [
    {
      "ruleId": "exclude_obstructed_flight",
      "when": { "field": "obstruction", "equals": true },
      "effect": { "set": "trial.valid", "value": false },
      "sourceEventId": "event_014"
    }
  ],
  "compiledAt": "2026-08-18T10:31:00Z"
}
```

### 9.4 AuthorshipEvent

The append-only source of provenance.

```json
{
  "eventId": "event_014",
  "toolId": "mayas-flight-lab",
  "actor": "child",
  "type": "rule_correction",
  "originalInput": "That one shouldn't count because it hit the chair",
  "candidateMutation": {
    "operation": "add_rule",
    "rule": "exclude_obstructed_flight"
  },
  "childApproved": true,
  "createdAt": "2026-08-18T10:30:00Z"
}
```

### 9.5 ExperimentTrial

```json
{
  "trialId": "trial_004",
  "toolId": "mayas-flight-lab",
  "toolVersionIdAtCapture": "tool_version_001",
  "designName": "Dart",
  "distanceM": 8.9,
  "obstruction": true,
  "validAtCapture": true,
  "validUnderCurrentVersion": false,
  "createdAt": "2026-08-18T10:26:00Z"
}
```

### 9.6 PermissionGrant

```json
{
  "grantId": "grant_camera_flight_lab",
  "toolId": "mayas-flight-lab",
  "capability": "camera_foreground_capture",
  "scope": "current_experiment",
  "approvedBy": "parent_or_device_policy",
  "expiresAt": "2026-08-18T11:00:00Z"
}
```

### 9.7 ParentSummary

```json
{
  "summaryId": "summary_001",
  "childId": "child_local_01",
  "toolId": "mayas-flight-lab",
  "text": "Maya noticed that an obstructed throw was not a fair measurement and taught her tool to exclude similar trials.",
  "evidenceEventIds": ["trial_004", "event_014", "tool_version_002"],
  "createdAt": "2026-08-18T10:36:00Z"
}
```

---

## 10. Authorship Ledger

The authorship ledger is an append-only event history. It is not blockchain and should never be described that way.

Its purposes are:

- Trace every capability behavior to its origin
- Reconstruct how a tool evolved
- Produce grounded parent evidence
- Revert a child-created rule safely
- Distinguish child authorship from AI suggestion
- Audit whether AI silently made decisions

The prototype should display a child-friendly explanation rather than a technical event table:

```text
WHY FLIGHT LAB DOES THIS

✓ Compare distance
  Chosen by Maya

✓ Compare consistency
  Suggested by Daso, accepted by Maya

✓ Ignore flights that touch something
  Taught by Maya after Flight 4
```

An internal authorship summary may show:

```text
Child-defined decisions:    11
Observed examples:           9
Child corrections:           2
AI suggestions accepted:     3
Unapproved AI decisions:      0
```

---

## 11. Storage and Privacy Architecture

### 11.1 Local-First Principle

The prototype should treat the child’s device as the primary store.

Stored locally:

- Tool definitions and versions
- Authorship events
- Experiment trials
- Child preferences
- Parent-summary evidence references

For a web prototype, this can use IndexedDB. A native Android implementation would likely use encrypted SQLite or Room backed by device security.

### 11.2 Cloud Responsibilities

Cloud services should be limited to:

- Model inference when required
- Optional encrypted synchronization
- Parent-summary delivery
- Model and policy updates

The cloud should not receive the complete child history by default. The Teaching Orchestrator assembles the smallest context required for the current interpretation.

### 11.3 Media Handling

Preferred order:

1. Process on device.
2. Store derived observation rather than raw media.
3. Delete temporary capture after confirmation.
4. Upload only if the feature clearly requires it and permission allows it.

Flight Lab does not require permanent video storage. A derived measurement and obstruction flag are sufficient.

### 11.4 Data Rights

The prototype should demonstrate:

- View stored data
- Export tool and provenance history
- Delete a tool and its events
- Delete the child profile
- Explain what remains after deletion

Even if the prototype uses only local data, deletion should be real rather than decorative.

---

## 12. Safety and Threat Model

### Threat: AI Secretly Authors the Tool

**Mitigation:** Every compiled behavior requires an approved provenance event. The compiler rejects mutations with no allowed source.

### Threat: Prompt Injection Produces Dangerous Behavior

**Mitigation:** The model never emits executable code. Structured outputs are schema-validated and restricted to an allowlisted capability vocabulary.

### Threat: Generated Tool Accesses Sensors in the Background

**Mitigation:** Sensor capabilities are foreground-only, visibly indicated, scoped, and enforced by the host runtime.

### Threat: A Child Tool Shares Data Publicly

**Mitigation:** No public network or social capability exists. Sharing, if demonstrated later, is restricted to a parent-approved circle.

### Threat: The Parent Summary Invents Learning Claims

**Mitigation:** Every summary sentence must reference source events. Unsupported summaries fail validation.

### Threat: Another Child Alters Maya’s Original Tool

**Mitigation:** Reuse creates a fork or new version owned by the second child. Maya’s immutable version remains intact.

### Threat: The Tool Becomes a Disguised Engagement Loop

**Mitigation:** No rewards or feeds. The activity ends when the experiment concludes or the child returns to the physical task.

---

## 13. Daso Device Integration Assumptions

Daso publicly describes a Samsung tablet loaded with its software and without an accessible browser or app store. Its exact internal device-management approach is not public.

Reasonable possibilities include:

- Android with a custom launcher
- Android Enterprise dedicated-device mode
- Samsung Knox configuration
- Device-owner policies
- A set of allowlisted first-party applications
- Deeper OEM customization

We must not claim to know which approach Daso uses.

Teach Daso does not require a custom Android fork. In a production integration, the child-created tiles could appear within a Daso launcher while being executed by a single trusted capability runtime.

The prototype will be a tablet-oriented web application or installable PWA. Its domain model and runtime boundaries should remain portable to a future native Android implementation.

---

## 14. Prototype Technical Direction

### Recommended Prototype Stack

- TypeScript
- React or Next.js
- Tablet-first responsive interface
- IndexedDB for real local persistence
- Runtime schema validation, such as Zod or an equivalent
- Explicit state machine for the teaching lifecycle
- Server-side model calls behind one narrow interface
- Deterministic rule evaluator written in application code
- Automated tests for compilation, provenance, replay, and deletion

The specific framework matters less than preserving the boundaries in this document.

### Important Runtime Rule

Runner Mode must work without an LLM after a tool has been compiled.

An offline toggle in the prototype would make this property immediately legible:

> Turn off model access, reopen Maya’s Flight Lab, and demonstrate that the approved rules still execute.

---

## 15. Minimum Working Scope

### Must Be Real

- Guided creation flow
- Flight Lab data capture
- Authorship event persistence
- Candidate rule review and approval
- Schema and safety validation
- Immutable tool version creation
- Deterministic replay under the new version
- Saved Flight Lab tile
- Day-2 Runner Mode
- Parent evidence summary grounded in events
- Data inspection and deletion

### May Be Constrained or Simulated Honestly

- Automatic distance detection
- Obstruction computer vision
- Production authentication
- Real SMS parent delivery
- Real Daso launcher installation
- Cross-device synchronization

Any simulation must be disclosed in the README and must not obscure the core product claim.

### Explicitly Out of Scope

- Universal app generation
- Arbitrary tool types
- Open marketplace
- Public profiles
- Native APK generation
- Full COPPA compliance certification
- Custom Android firmware
- General-purpose multi-agent platform
- Production-scale cloud infrastructure

---

## 16. Build Sequence

### Milestone 1: Product Skeleton

- Implement tablet shell
- Create the Flight Lab story path
- Define state-machine transitions
- Establish design language

**Verification:** A user can complete the full scripted journey with temporary in-memory data.

### Milestone 2: Structured Domain Model

- Implement schemas
- Add local event store
- Persist trials and authorship events
- Add inspection screen

**Verification:** Refreshing the application preserves the complete experiment and authorship history.

### Milestone 3: Teaching and Approval

- Add constrained Teaching Agent interface
- Produce candidate structured mutations
- Require child approval
- Reject invalid or unsupported mutations

**Verification:** No tool rule can be created without an approved provenance event.

### Milestone 4: Compiler and Runtime

- Compile version 1
- Apply correction to produce version 2
- Implement deterministic evaluator
- Replay existing trials

**Verification:** The obstructed trial changes from valid to invalid under version 2, and the ranking updates deterministically.

### Milestone 5: Keep and Reuse

- Add the saved tile
- Implement Runner Mode
- Add second-child scenario
- Show Maya’s rule during reuse

**Verification:** Runner Mode works after model access is disabled.

### Milestone 6: Parent Evidence and Data Rights

- Generate evidence-grounded parent summary
- Show supporting events
- Implement export and delete

**Verification:** Deleting the tool removes its definitions, trials, and provenance from local storage.

### Milestone 7: Founder-Facing Polish

- Refine motion and interaction design
- Complete architecture README
- Add threat model
- Record 90-second demo
- Test on tablet-sized screens

**Verification:** A person unfamiliar with the project can explain the central thesis after watching the demo once.

---

## 17. Product Success Criteria

### Comprehension

After the experience, a child or observer should understand:

- Maya decided what “best” meant.
- Maya noticed a bad trial.
- Maya taught the computer a lasting rule.
- Another child could use that rule later.

### Authorship

- 100% of material compiled rules have provenance.
- 0 unapproved AI decisions enter the runtime.
- AI suggestions are visibly distinguishable from child-authored decisions.

### Determinism

- The same tool version and trial data always produce the same result.
- Runner Mode works without model access.

### Privacy

- No permanent raw video is required.
- Stored data is inspectable.
- Tool deletion is functional.

### Founder Signal

The project should communicate:

- Product taste
- Understanding of Daso’s philosophy
- Technical restraint
- AI orchestration knowledge
- Data-modeling ability
- Safety thinking
- End-to-end execution

---

## 18. The 90-Second Demo Story

### 0–10 seconds: Thesis

Show the line:

> **The computer that grows with your child should grow because of your child.**

### 10–25 seconds: Define

Maya asks which paper airplane is best and chooses distance plus consistency.

### 25–45 seconds: Test

Show several rapid trials and the 8.9-metre obstructed outlier.

### 45–60 seconds: Correct

Maya explains that the chair changed the measurement. She approves the new exclusion rule.

### 60–70 seconds: Compile

Show version 2 being created and the result changing.

### 70–82 seconds: Inheritance

The next day, Maya’s brother opens the saved tool. Maya’s obstruction rule activates.

### 82–90 seconds: Evidence

Show the parent summary and close on:

> **Maya didn’t download this tool. She taught it.**

---

## 19. Founder-Facing Package

The final package should contain:

1. Working deployed prototype
2. 90-second demo video
3. Concise README
4. Architecture diagram
5. Data model and example provenance records
6. Safety and privacy notes
7. Clearly stated simulations and limitations
8. Tests for the core invariants

The outreach message should remain short. The artifact should carry the argument.

Possible message:

> I’ve been thinking about Daso’s idea of a computer that grows with a child. I explored what it could mean for the computer to grow *because of* the child: a child teaches it a capability through examples, tests, and corrections, then another person can use what they taught. I built one complete version around paper-airplane experiments, including provenance, deterministic execution, and parent-visible evidence. I’d love to hear where this aligns—or conflicts—with how you’re thinking about Daso.

---

## 20. Key Risks

### Risk: Educational Theatre

The AI may ask charming questions while secretly making every important decision.

**Response:** Enforce provenance as a compiler invariant, not a design aspiration.

### Risk: The Idea Sounds Like an App Marketplace

**Response:** Lead with child agency and capability formation. Treat personalized growth without an app store as a secondary consequence.

### Risk: The Prototype Looks Broader Than It Is

**Response:** Build one narrow experience extremely well. State honestly that Flight Lab is the only implemented tool kind.

### Risk: Too Much Architecture, Too Little Magic

**Response:** The child’s correction and Day-2 reuse remain the centre of the demo. Architecture exists to make that moment trustworthy.

### Risk: Daso Already Has a Similar Internal Direction

**Response:** The project still demonstrates independent product reasoning and creates a concrete implementation to discuss. Never claim novelty as certainty.

### Risk: Daso Rejects the Product Direction

**Response:** A thoughtful rejection is acceptable. The artifact is designed to show how we think and build, not to force a roadmap decision.

---

## 21. Research Signals

The project is original synthesis, not a copy of any single reference. The following signals support parts of the interaction model:

- Daso’s public product philosophy: https://getdaso.com/
- Max Forsey on small build–verify loops and rigorous inspection: https://www.maxforsey.com/blog/how-to-build-with-ai
- Max Forsey’s use of composable AI skills: https://www.maxforsey.com/wiki/tools
- Research on children formulating personally meaningful problems with teachable machines: https://arxiv.org/abs/2402.18688
- Dentsu’s July 2026 experiment preserving children as the primary drivers of creativity and thought: https://www.group.dentsu.com/en/news/release/001718.html
- Qidian Lingzhi’s distinction between generating content and generating capabilities: https://www.aitntnews.com/newDetail.html?newId=25929
- CodeeBot’s emphasis on physical experimentation and focusing children on the “what” and “why”: https://en.prnasia.com/releases/global/codeebot-launches-screen-free-ai-powered-tangible-coding-platform-that-turns-magnetic-blocks-into-real-programs-541430.shtml

These references support the direction; they do not prove product-market fit or guarantee that children will love the final experience. That must be validated through observation.

---

## 22. Final Definition

Teach Daso is successful when the following sentence is literally true in the working system:

> A child noticed something, explained it, changed how the computer behaves, and left behind a capability another person could use.

Everything else—agents, schemas, storage, animations, summaries, and architecture—exists to make that moment real, safe, inspectable, and unforgettable.

