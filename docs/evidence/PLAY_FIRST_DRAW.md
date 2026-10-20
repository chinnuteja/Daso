# Play-first Draw refinement

Date: 2026-10-12. Branch: `ux/child-first-draw`. Base: `ab3f678b963649ffb29f457f3ba1bcbdbc07e013`.

This supersedes the previous child-first packet's numbered steps and stamp terminology. It is an adult design pass and real browser QA, not evidence from participating children.

## Research and design decisions

- [Tux Paint](https://tuxpaint.org/features/): visible drawing tools, thumbnail-based reopening, no required filenames. Borrowed discoverable tool shelf, thumbnail source choices, optional naming; not code or assets.
- [Sago Mini Doodlecast](https://sagomini.com/article/doodlecast-letter-to-parents/): draw with familiar tools/colours, prompts optional, creation process matters. Borrowed optional practice and a canvas-first experience. Did not add microphone recording.
- [PBS Scribbles and Ink](https://www.pbs.org/parents/shows/scribbles-and-ink): the child's drawing participates in open-ended stories. Inspected the official landing page and game entry in the browser. The old /draw URL returned a 404; no claim to have tested that old drawing page or its entire game. Borrowed the principle of visible consequences from children's own work, not characters or artwork.
- [Crayola apps](https://www.crayola.com/en-au/feature/apps): creative exploration; Adventures explicitly targets ages 6–10. Context for playful presentation, not a usability study or copied interaction specification.

Our design inference: replace the instructional funnel with a drawing desk. This is a hypothesis requiring independent child/parent observation, not proof of instant comprehension.

## Implementation

- Removed numbered Draw/Pick/Trail/Keep rail and mandatory Use this piece confirmation. Persistent Draw/Repeat tools describe actions, paired with pictures. Workspace navigation is My drawing/My tools; child-facing stamp/piece jargon is removed.
- A child still explicitly selects a canonical original line by touching it or its exact thumbnail. Selection immediately enables drawing a directed path. A tray permits changing source without restarting or losing the existing path; the full keyboard chooser remains.
- `liveDrawPreview` renders transient gesture geometry through the existing deterministic kernel while dragging. It writes no document, event, approval or version. On release, the actual path is persisted through the existing guarded queue. Copy count/output budgets stay unchanged; source vectors are never regenerated.
- Picture buttons modify the temporary look. Save for later opens review; Yes, save my tool is still explicit child approval. The default name permits saving without typing. Not yet appends a real rejection and returns immediately to play; focus returns to Save for later. Review focus is applied after React commits the naming panel, not an unreliable pre-render animation callback.
- Saved tools automatically apply on a completed child gesture or keyboard-directed path. Every application rereads and validates the current graph before the existing local runtime. Pointer path is passed directly, avoiding stale React state. No model/network path added. Draw again clears only the transient reuse preview, not persisted drawings/tools.
- Final browser review found a cross-owner selection bug: concatenating real tools before practice tools selected the last practice tool, not the newly saved original. Explicit saved-tool handoff now carries its id; ordinary library opening chooses newest verified creation regardless of owner grouping. Subsequent explicit selection is preserved on refresh, and removed ids fall back safely. Regression tests cover both owner orders, handoff, deliberate selection and removal.
- Thin guide appears while drawing; after completion it no longer crosses the repeated artwork. Colours remain directly selectable. Shelf is grouped with ink tools to reduce header height. Reduced motion, forced colours and visible keyboard focus remain.

## Verification

Final serial gates after the handoff regression fix: typecheck exit 0; lint exit 0; full tests 125 files / 413 passed; production build exit 0 with existing routes and exactly two agent routes; post-build tests 125 files / 413 passed. No todo/skipped tests reported. The development preview used port 3020, isolated from the owner's port 3017. No permanent browser delete/reset was confirmed.

Failed initial gates were repaired, not counted as passes: a malformed generated `.next/dev/types/routes.d.ts` had a duplicated stale tail. With preview processes stopped, preserved that one generated file in a temporary backup and ran supported `next typegen`. Also corrected readonly point copying and missing transient guide timestamps in the new preview helper. No application TypeScript checks were disabled.

Real browser development checks:

- Selected a practice diamond by touching it; selection immediately enabled a drag. A path produced 10 copies. Same size/Close changed the preview to 15. Chose another original line through its thumbnail and switched Draw/Repeat without losing the path.
- Save moved focus to the naming fieldset after render. Not yet recorded rejection and immediately returned focus to Save for later; no extra retry step. A later separate approval saved the actual tool; reload restored its saved state. Reuse drew 14 copies on release without an Apply button.
- A fresh `localhost:3020` origin at 624×590 showed paper, direct colours and both mode buttons. Drew an original violet line, touched it to select it, and dragged a path to make nine copies. At 390×844, client/scroll widths both 375px. Clicking teal returned directly to Draw without moving the paper.
- Development-only axe 4.13.0: repeat preview 0 violations / 28 passes / 0 incomplete; phone reuse 0 / 27 / 0. These are inspected states, not full accessibility certification. Later palette persistence and guide-visibility changes received production interaction checks, not a claimed repeated full axe audit.

New unit tests require explicit selection, usable paths, immediate deterministic gesture changes, unchanged source document, zero fetch and retained geometry budget. Existing memory/IndexedDB approval/provenance/runtime tests remain.

Production browser checks before the handoff fix: an original five-point square was keyboard-authored (Enter, Shift+arrows, Enter), selected through the full chooser, and given a child-chosen endpoint path. Close spacing showed 14 repeats. The naming fieldset received focus; approval saved the square. Existing saved reuse generated nine copies from keyboard endpoints, with no separate Apply action. Draw again cleared only the temporary output. Some dev tabs had cached connection-error pages after preview shutdown; fresh tabs in the same browser connected to the production server normally. No browser policy or security setting was bypassed.

Frames: [opening desk](assets/child-play-start.png), [original-square repeat](assets/child-play-repeats.png), [phone reuse](assets/child-play-phone.png). Actual production captures, not generated mockups.

Final production confirmation after the handoff fix: reopening the saved square and choosing Draw with my tool selected the **Made from your drawing** card (`aria-pressed=true`), with the older practice diamond unselected. At 390×844, client/scroll widths remained 375px; a native drag applied the square tool and produced 14 copies automatically. Temporary viewport override was reset. The owner's original port-3017 tab was reloaded and left ready with its existing practice drawing, selected source and eight-repeat preview preserved. Test tabs used isolated port-3020 data; no real drawing was reset. Rechecked typecheck after the final My tools navigation adjustment: exit 0.

## Boundaries

No new capability/schema/store/provider/framework, no autonomous anatomy detection, source beautification, voice input, rewards or fake AI learning. This remains one selected line and one directed repeat path, not a complete multilayer drawing editor. Reuse previews are transient; only approved tools persist. Real child comprehension, touch/stylus hardware, screen-reader testing and public deployment/rate-cost checks remain outside this verification.
