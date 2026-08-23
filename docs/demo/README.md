# 90-second founder demo

**Thesis (0–10s):** The computer that grows with your child should grow because of your child.

**Closing line (82–90s):** Maya didn't download this tool. She taught it.

## Capture blocker

This environment cannot encode `docs/demo/teach-daso-90s.mp4` (no committed screen-recorder or ffmpeg pipeline). The truthful substitute is:

- this script
- `docs/demo/manifest.json`
- the timestamped frame sequence under `docs/demo/frames/`
- `docs/evidence/assets/capture-phase-08.mjs`, which walks the real product path

Do not treat the missing mp4 as a completed video.

## Setup / reset

1. `npm run dev` → `http://localhost:3000`
2. Open `/journey` so the scripted local store is created.
3. Use a fresh browser profile or clear IndexedDB `teach-daso` if a previous session is present.

## Exact clicks and narration

| Time | Beat | Click / wait | Narration / caption |
|---|---|---|---|
| 0–10s | Thesis | Home | The computer that grows with your child should grow because of your child. |
| 10–25s | Define | Start with a question → I want to find out which paper airplane is best. → Distance — how far it flies → Yes — add this to the tool → Yes — also compare consistency → Yes — add this to the tool → That’s what “best” means → name, metres, obstruction, skip note → These are the things we write down | Maya asks which plane is best and chooses distance plus consistency. |
| 25–45s | Test | I think Falcon will do best → record Falcon 7.4, Glider 5.8, Dart 6.1, Dart 8.9 obstructed | Real throws. The 8.9 m Dart throw touched something. |
| 45–60s | Correct | I have thrown enough → This one looks different → reject both AI suggestions → That one shouldn't count because it hit the chair → Review the rule I taught → Yes — add this to the tool | Maya said why. The proposed rule is a suggestion until she approves it. Daso cannot approve it. |
| 60–70s | v2 change | Wait for Saved version: tool_version_002 | Same stored throws replay. Dart is no longer counted. Before: Dart leads. Now: Falcon leads. Your words became a rule. |
| 70–82s | Day-2 | Home → Let Leo try this → Make my copy | Leo uses an independently owned copy. Saved rules — works without AI. |
| 82–90s | Parent evidence | Parent evidence | Grounded story. Close: Maya didn't download this tool. She taught it. |

The predict tap is required by the state machine. Which design was guessed is not stored (D-02). Do not narrate a stored prediction result.

## Frames

See `docs/demo/manifest.json`. Frames are captured from the live app, not fixtures.

## Comprehension script

Ask one unfamiliar viewer, after one pass:

1. Who taught the rule?
2. What changed after approval?
3. Why does the next-day tool still work?

Human check: pending. No independent viewer was available in this implementation sitting. Do not invent answers.
