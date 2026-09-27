# Kale Phase 02 — child-owned vector drawing

**Base:** `330b468175a4a290bc58ed8e42a89b8812582e10` (Phase 1 capability foundation)

**Status:** implemented and gated; not architecturally accepted.

## What landed

- `/draw` opens **Kale Draw** with two equally honest entry points: an editable practice dragon and a
  blank drawing.
- The source of truth is a `DrawDocument`: stable document/stroke identifiers, vector point arrays, color,
  width, revision and a deterministic SHA-256 source digest. There is no PNG, vision request, image
  generation call, or AI output in this path.
- The practice dragon is a normal group of editable vectors. Its small scale marks are ordinary strokes;
  no anatomical inference is represented or stored.
- The workbench renders separate source, guide and derived-preview SVG groups from day one. Only the source
  group has content in this phase.
- Pointer input normalizes coordinates into an 800×560 logical drawing surface; `touch-action: none` keeps
  a finger stroke from scrolling the canvas. Point sampling, stroke and document caps are deterministic.
- The drawing uses local IndexedDB through the Phase 1 `drawAssets` repository. Source documents autosave
  after an input operation, and re-opening the normal browser document reloads its vector data. Undo, redo
  and clear change document revision; no source stroke is ever silently overwritten.
- A browser sandbox with no IndexedDB gets an explicitly labelled, non-durable in-memory preview instead of
  an inert primary action. This is a capability fallback, not a claim that the work was saved.

## Proofs

| Check | Result |
| --- | --- |
| Draw source hash / point sampling / undo unit tests | 2 passed |
| Phase 1 bounded-context and v1→v2 migration regression | 5 passed |
| Full suite | 105 files, 305 tests passed |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0; `/draw` generated alongside every legacy route |

## Controlled browser observation

The local route rendered in both the in-app browser and isolated Chrome at `http://127.0.0.1:3012/draw`.
The opening screen visibly presents the two drawing choices and the Draw navigation item.

The available controlled-browser integration did **not** execute client effects: its automation evaluation
context reports standard browser APIs such as `indexedDB` and `performance` as unavailable, and existing
pre-Phase-2 client flows show the same opening-state behaviour. Therefore no pointer-drag, save, reload or
touch gesture is claimed as completed evidence. This is an environment limitation, not substituted with
screenshots. The implementation includes an explicit non-durable fallback for a genuine no-IndexedDB
browser, but final acceptance still requires a real browser session that runs page JavaScript.

## Deliberate deferrals

There is no source-mark selection, lasso, directed path, preview, model request, candidate, approval,
tool/version or saved-tool behaviour yet. Those actions would make Phase 2 look magical while bypassing the
child-authority protocol being built in later phases.

## Exit decision

Phase 3 may add exact source-mark selection and a child-drawn directed guide path. It must retain the
original source stroke in place, refer to it by stable id/revision, and invalidate stale selection cleanly
after a source edit.
