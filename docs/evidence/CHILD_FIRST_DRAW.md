# Child-first Draw review and rebuild

Date: 2026-10-12. Base: `9456f3ad614e81b0844843d82b95fc556a31f289`.
Branch: `ux/child-first-draw`.

This is an adult design review using a young-child lens, followed by real browser interaction. It is not a claim that children aged 6–10 participated, understood it, or loved it. Independent child/parent testing remains needed. No deployment or merge is included.

## What the browser exposed

The previous opening view spent space on navigation, a large statement and five authorship labels. At narrow width, colours and the next action were below the paper. Mark selection repeated similar instructions across several cards. Creating a lasting tool required typing and reading model/manual distinctions before seeing an understandable keep action. Saved reuse buried its apply button below a tall canvas.

## Changes

- Compact Draw & play header. Draw / My stamps are the two child workspace choices. Parent/Flight/earlier links live in a grown-up disclosure; practice reset is below the desk, not a prominent child action.
- Colours, pen thickness and undo/redo sit above the drawing paper. Paper shows a small vector drawing cue, not a paragraph. Buttons retain visible words and accessible names, not icons alone.
- Four short steps: Draw → Pick → Trail → Keep. One contextual next action. Tap selects the original piece; its exact thumbnail confirms what will repeat. The child still directs the path; AI does not discover anatomy or regenerate the source.
- Spacing and size use picture choices. The preview is immediate. Make my stamp opens a review; Keep my stamp is a separate explicit approval. No, change it records a rejection and moves focus to Try another look. New drawing works after keeping.
- Typing is optional, not removed: Tell Kale your idea can request a grounded bounded suggestion; the child can check and change it before keeping. There is no invented speech input.
- Picture-led intent is a chosen template prefixed **Chosen with picture buttons:**, with manual origin. It does not reuse unrelated typed words. Parent evidence calls it **Their picture choices** rather than pretending it is a transcript or AI suggestion. No schema field, object store, capability kind, provider route, runtime algorithm or authentication was added.
- Reopening an exact unchanged drawing restores a kept stamp only through a validated graph, active version and actual child approval. Owner, source id/revision/digest must match. Edited or corrupt sources never receive a made-up kept status. Saved tools still work from their immutable mark copies.
- Saved reuse has a compact thumbnail tray on small screens, a visible Stamp here! action above the paper, and an optional history disclosure. Source/proposal/approval receipts stay available without competing with the child's drawing.
- Keyboard drawing, dropdown mark selection, endpoint path controls, focus rings, reduced-motion/forced-colors CSS, conflict guards and recovery downloads remain. Single-point marks now render as circles on the source canvas, matching saved runtime.

## Automated verification

| Gate | Result |
|---|---|
| Typecheck | Exit 0; no diagnostics |
| Lint | Exit 0; no errors or warnings |
| Full tests | Exit 0; 123 files / 407 tests passed |
| Production build | Exit 0; existing routes and exactly two agent routes retained |
| Tests after build | Exit 0; 123 files / 407 tests passed |

The new memory/IndexedDB integration tests exercise all six spacing/size combinations: chosen instruction, no active graph before child approval, immutable source copy, approved numeric runtime settings, truthful parent attribution, deterministic reuse with fetch forbidden, exact-source kept restoration, and rejection of edited/other-owner restoration. The P10 presentation assertion changes only the visible confirmation wording from Repeat this mark to Use this piece; source preservation and history assertions remain.

An initial full run while development compilation was active had 404 passes and one timeout in the unchanged million-point artwork budget test. That is not a passing gate. Final serial gates stop my preview processes before building/testing. Initial new-fixture identifier/type mistakes and accessibility incomplete checks were fixed before the final result.

## Real browser work

Test data used a separate `127.0.0.1:3019` origin. Existing `:3017` work was not reset/deleted. Permanent delete/reset confirmations were not clicked.

1. Inspected the user's opening view without relying on a walkthrough. Confirmed colours/action required scrolling at narrow width.
2. Dragged an original line on the new paper; tapped the actual line; confirmed its exact thumbnail; dragged a trail. Chose Same size / Far apart with picture buttons, reviewed and kept **My zigzag stamp**, without typing or AI. Reused it on a new path; six repeats computed locally.
3. Opened Try a dragon after keeping, tapped an orange diamond and dragged a trail. Rejected the first review: no tool activated. A later keyboard-authored square rejection moved focus to Try another look; retry returned to the look panel.
4. Optional typed instruction **Repeat my mark along this path, smaller toward the end.** returned a real provider suggestion (even spacing / smaller). Checked it, changed to close spacing, approved **My dragon scales**. Ten repeats appeared. Reload restored the actual kept stamp and its approved controls, not a preview pretending to be saved.
5. Small-screen reuse picked the saved diamond, chose endpoints and applied locally. On 390×844 the document client/scroll widths both measured 375px. The new horizontal tray avoids stacking all stamps above the paper.
6. Keyboard-only authoring created a five-point square with Enter and Shift+arrows; the dropdown selected Line 1; endpoint controls directed the path; review/rejection used native buttons. The original mark and existing saved stamps remained.
7. Development-only axe 4.13.0 scans after repairs: blank **0 violations / 30 passes / 0 incomplete**; kept stamp **0 / 28 / 0**; phone reuse **0 / 30 / 0**; look preview **0 / 27 / 0**. These are inspected states, not WCAG certification. Generic labelled groups and SVG decorative icons corrected the initial aria/emoji contrast incompletes; the blank cue received a solid backing for a complete contrast check.

## Production verification and frames

The production build was checked on a first-visit `localhost:3019` origin as well as the separate `127.0.0.1:3019` test origin. Blank paper/colours opened without a mandatory introduction. A practice diamond was selected through the keyboard alternative, a path directed, close spacing chosen, and **My stamp** explicitly kept without typing or a model request. Reload restored the actual approved stamp and 14 repeats. Parent view showed **Their picture choices**, the chosen-template prefix, manual attribution and child approval. Saved reuse applied that stamp on another path and computed 14 repeats locally.

The added **Choose another piece** action was tested after making a path: switched from practice diamond 1 to diamond 2, confirmed it, and verified that the existing path's nine-repeat preview was visible. Close spacing produced 14 repeats; explicit Keep and reload restored that revised piece. This retires the back-navigation preview-hidden bug, without silently changing a saved version.

Reset confirmation focused Cancel; Escape closed it and returned focus to Reset practice. The checked local data stayed present. Final phone reuse again measured 375px client and scroll widths at 390×844. Paper height is constrained on short narrow panels to leave room for the contextual next action; canonical SVG points are unchanged.

The final 624×590 short-panel check showed colours, paper and the full **Repeat a piece** button together. Its DOM bottom was 573.9px inside the 590px viewport. The opening frame was recaptured from that build. Temporary viewport overrides were reset, and the updated original `127.0.0.1:3017/draw` tab was left open for the owner.

Frames: [opening desk](assets/child-draw-start.png), [picture-led choices](assets/child-draw-pictures.png), [phone saved reuse](assets/child-draw-phone.png). These are actual browser captures, not generated interface mockups.

The earlier automatic approval usage-limit interruption blocked terminal and patch actions before execution. After the user asked to continue and approvals became available, the pending navigation edit received serial verification and production interaction checks. Nothing was deleted to work around the limit.

## Limits

- Actual child comprehension, touch/stylus hardware and screen-reader sessions are not established by this review. The most important remaining check is whether a new child can complete the first stamp without adult narration.
- AI is optional and remains bounded to existing types. The child chooses what to repeat and where; no full-image understanding, image generation, open chatbot or new capability framework was added.
- Data remains browser-local, not cross-device synced/authenticated. Existing Phase 11 security/dependency and Phase 12 public hosting/rate-cost gates remain.
- No permanent browser deletion, exports to external people, deployment, founder outreach or merge was performed.
- Next-generated AGENTS.md / CLAUDE.md, environment keys, temporary logs and test backups are not included in this change.
