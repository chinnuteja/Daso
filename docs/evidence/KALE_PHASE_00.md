# Kale Phase 00 — protected baseline

**Branch:** `orchestration/kale-00-baseline`
**Base commit:** `a3d36b9 Trim repository to founder-facing documentation`
**Status:** baseline captured; no product behavior changed; not architecturally accepted.

## Purpose

Freeze a known-good starting point before the Draw/Flight capability work begins. This phase deliberately does not introduce the new product model, database schema, or visual redesign.

## Repository state at start

- Working tree: clean.
- Existing reset boundary: `resetWritingCoach()` deletes only the writing-demo owner graph and its pointer. The existing integration test proves Bridge Bench remains intact.
- Existing diagnostic seed: `/inspect` can seed the legacy Flight Lab fixture.
- Existing routes: `/`, `/lab`, `/library`, `/journey`, `/run`, `/parent`, `/inspect`, plus the two current agent routes.

## Gates

| Gate | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 205 files passed; 296 tests passed; 0 failed |
| `npm run build` | exit 0; all listed routes generated |

The full Vitest machine-readable result is `assets/kale-phase-00-vitest.json`.

## Visual baseline

Rendered locally from the untouched app at `http://127.0.0.1:3010` in Edge headless at 1440×1000:

- `assets/kale-phase-00-home-1440.png`
- `assets/kale-phase-00-lab-1440.png`
- `assets/kale-phase-00-journey-1440.png`
- `assets/kale-phase-00-run-1440.png`
- `assets/kale-phase-00-parent-1440.png`
- `assets/kale-phase-00-inspect-1440.png`

## Baseline findings

1. The home writing-preference and Bridge Bench routes render meaningful first screens.
2. Advanced routes visibly begin from local-store loading states. A fresh headless browser did not provide an interactive IndexedDB journey before capture; this is preserved as a baseline observation, not passed off as a successful flow.
3. Native browser-control tooling failed during initialization with `failed to write kernel assets: The system cannot find the path specified.` The screenshots above are real Edge renders, but they are **not** evidence of controlled click/keyboard interaction. Before Draw pointer work begins in Phase 2, browser-control capability must be restored or replaced with a working local E2E driver; Phase 2 cannot be accepted on screenshots alone.

## What remains unchanged

- Database schema and data.
- Existing ledger, version, compiler and runtime behavior.
- Existing UI copy and routing.
- No new model route, asset store, external dependency or seed data.

## Exit decision

Phase 0 is committed on its isolated branch. Phase 1 may start from this branch because typecheck, lint, test and production build are green. Remote publication is pending verification: the attempted push did not establish branch tracking or return a remote confirmation. The browser-control environment risk remains explicitly open and blocks acceptance of any gesture-dependent UI phase until resolved.
