# Child desk polish — 20 October 2026

Scope: make the existing Draw → approve → keep → reuse experience easier to discover and more personally meaningful. No new capability types, model providers, persistence schema, automatic approval, or generated replacement artwork.

## Research and design decisions

Primary sources checked on 20 October:

- [Kale's current product](https://kale.computer/): drawing is part of Play; creations return to a personal Desk; the parent experience connects interests with activities.
- [Kale's philosophy](https://kale.computer/believe): child agency, retained work, checkable behavior, and making rather than consuming. The current homepage and philosophy have some different language about recommendations; neither is proof of unpublished implementation.
- [Tim Pietrusky's public profile/activity](https://de.linkedin.com/in/timpietrusky): the indexed official LinkedIn profile includes his update about focusing on Draw and checking creation, returning tomorrow, and the grown-up connection. Relative dates are from the retrieved profile, not an independently verified publication timestamp.
- [Max Forsey's funding/product post](https://www.linkedin.com/posts/max-forsey_daso-has-raised-a-750k-pre-seed-round-from-activity-7491291633779437568-jKGL): guidance should help children make things themselves. This is an older post, not claimed to be his latest.
- [Tux Paint features](https://tuxpaint.org/features/): thumbnails, simple save/load, fixed paper, and direct drawing tools.
- [Sago Mini Doodlecast design](https://sagomini.com/article/doodlecast-letter-to-parents/): optional drawing prompts, readily available colours, and opportunities to talk about what children make. This is a younger-audience reference, not evidence that our ages 6–10 interface is validated.

Our inference: the useful polish is clearer cause and effect using the child's own drawing, shorter navigation, and a tangible picture to show another person. No streaks, autoplay, artificial achievements, copied brand assets, or new agent framework.

## Changes

- The original line appears as a repeatable thumbnail immediately after drawing. Tapping it is explicit source selection and goes directly to drawing a repeat path.
- Optional leaf, raindrop, and curl illustrations offer ideas on blank paper. They are labelled inspiration, never inserted into or attributed to the child's artwork.
- Spacing/size buttons show miniature copies of the selected source geometry and colour, replacing generic diamonds when a source exists.
- Save for later appears at the top of the contextual controls. Explicit review, child edits, rejection, and approval remain.
- Show my original / Show my pattern is a display-only comparison. Editing the pattern or starting a new path restores the pattern view.
- Get picture downloads a static SVG of the drawing and visible derived strokes, or the original-only view when selected. It includes no profile IDs, graph, instructions, guide line, selection halo, script, external assets, or metadata. This is a picture export, distinct from a reusable capability or canonical records export.
- Reuse also offers the static picture download; source colour/opacity now matches the exported picture.
- Saved tools render copies during a pointer gesture. This transient preview uses the graph validated on load; pointer-up still rereads and validates the durable graph before enabling the completed result/export.
- The reuse download button appears below the paper, so its arrival does not shift the drawing surface.
- Empty My tools returns to the mounted drawing via the existing tab, without an unnecessary page reload.
- Drawing status messages use plain words; nested keyboard-path disclosures were reduced.
- Parent view sorts the separately loaded owner lists together, so its default selection is the newest saved tool.

## Verification record

- Typecheck and lint passed after freeing generated cache space.
- Initial full test run: 412 passed, three 5-second timeouts in existing source scans / drawing-budget tests under machine resource pressure. No assertion was weakened.
- Final implementation check: typecheck and lint exit 0; `npx vitest run --maxWorkers=2`: 126 files, **416 tests passed**. Three picture-export tests cover exact geometry, no private metadata, malformed input/markup injection, oversized output, and preserving a valid maximum combined source + preview without truncation.
- Production build: exit 0, product pages and both named agent routes built successfully. After-build INV-38/INV-52: two files, seven tests passed. The first targeted invocation passed literal wildcard filters to Vitest and found no files; rerunning with filename substrings executed the intended checks.
- Browser: production preview on `127.0.0.1:3019`; separate fresh origin `127.0.0.1:3021` for first-use/empty-library checks, without clearing existing browser data.
- Own drawing: violet ink → original line → direct thumbnail selection → repeat path → spacing/size changes → original/pattern comparison → reject review → reopen and explicitly approve **My purple rain** → reload → exact saved tool selected → drag to reuse. The exported `my-picture.svg` was downloaded and its vector content inspected.
- Phone viewport 390 × 844: saved tool selection and reuse work, no horizontal document overflow (375-pixel client/scroll width); the paper stays at the same position after the download button appears. Screenshot: [phone reuse](assets/child-desk-polish-phone.png).
- Fresh origin: empty My tools → **Let’s draw** returns directly to the mounted paper. The labelled dragon practice source can be selected, repeated, adjusted, compared, and rejected without losing the drawing. Screenshot: [desktop workbench](assets/child-desk-polish-desktop.png).
- Focus: review opens at the naming fieldset; rejection returns focus to Save for later. This is a targeted browser check, not a full accessibility audit.
- Final rebuilt bundle: keyboard path sliders and Enter on **Use this path** produce a saved-tool result. **Get picture** downloads `my-picture (2).svg` and reports that the download started, without assuming the operating system completed it.
- Flight Lab: an obstructed Dart throw at 8.9 m is excluded while a clear Falcon throw at the same distance remains counted. Explicit approval survives reload; a new obstructed throw is excluded by the saved rule. Parent view reports the recorded manual words/choice, and its default selection opens this newest tool rather than an older practice tool.
- No live AI-provider request, real-child comprehension study, or new axe/Lighthouse report was performed in this polish pass. Existing model/authority/runtime invariants passed in the full suite.

## Practical limits

This remains the bounded single-selected-mark, single-repeat-path proof. Drawing a new repeat path replaces the previous temporary path. The downloadable SVG is artwork, not a re-importable project and not a saved capability. Runtime reuse stays local and uses no model. Browser checks do not establish comprehension by real children or guarantee a founder's reaction.

The C: drive reached zero free space during the first check/download attempt. Only this project's regenerable `.next/dev` and `.next/cache` were removed after stopping the preview. No source files or browser drawings were deleted.
