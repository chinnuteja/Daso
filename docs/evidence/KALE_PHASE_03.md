# Kale Phase 03 — exact mark and directed path

**Base:** `51b0ca3605223bf803e4944bcd377f232865b6e3` (Phase 2 vector Draw)

**Status:** implemented and gated; not architecturally accepted.

## What landed

- Draw now has three explicit child-facing modes: **Draw**, **Pick a mark**, and **Show its path**.
- Tapping is resolved against the child’s own stable vector strokes with a screen-space-tolerant hit test;
  empty space has an understandable recovery message. The product stores stroke ids, never a semantic label
  such as “dragon tail.”
- Selecting a mark leaves that original stroke visibly in the drawing and adds only a temporary highlight.
  No `MarkSnapshot` is created before a later child approval flow.
- A guide path is a separate ordered vector polyline. Its visible dot and arrow say “starts here” and “ends
  here,” so the child directly owns direction. There is no inferred region or anatomy.
- Selection carries the current source digest. If the source drawing changes, the workbench calls out that
  the prior choice is stale and offers **Pick a mark**; it cannot silently apply an old selection.
- Selection/path live in the local Draw document and survive normal reload in a browser that supports
  IndexedDB. The Phase 2 honest ephemeral fallback remains for environments that do not expose local storage.

## Proofs

| Check | Result |
| --- | --- |
| Source document, selection, hit-test and path unit suite | 4 passed |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 105 files, 307 tests passed |
| `npm run build` | exit 0; `/draw` and all prior routes generated |

The tests prove a distant tap cannot select a mark, an owned stroke can; a source edit invalidates an earlier
selection; and path start/end ordering remains exactly as the child drew it.

## Final quality correction

- A selection is now invalidated at the instant a source stroke is appended, removed, or cleared; it does not
  wait for an asynchronous digest refresh. The unit proof checks both the immediate and re-digested states.
- Document listing has a stable `updatedAt`, then `documentId` ordering, so choosing a fresh drawing cannot
  become nondeterministic when two writes have the same timestamp.

## Browser limitation

The controlled local-browser environment still renders the opening Draw screen but does not execute client
effects, so it cannot complete a real touch/pointer gesture. Phase 3 is not accepted on the basis of a
screenshot. The next human browser pass must verify: select the orange practice scale, redraw the path in
the opposite direction, refresh at selection-only/path-only states, then edit a source stroke and see the
plain stale-selection recovery.

## Deliberate deferrals

There is no repeated-mark preview, no model call, no tool snapshot and no save/approval action. The directed
path is source context for the future deterministic preview—not an implicit tool.
