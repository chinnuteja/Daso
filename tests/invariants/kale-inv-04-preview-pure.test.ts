import { describe, expect, it } from 'vitest';

import { listSourceFiles, SRC_ROOT } from '../support/sourceTree';

/** The first Draw preview is geometry only: no model, browser API, persistence, or clock. */
const FORBIDDEN_PREVIEW_SEAM = /\b(fetch\(|indexedDB|localStorage|window\.|document\.|Date\.now|Math\.random|openai|anthropic|api[_-]?key|adapters\/|ports\/)/iu;

describe('Kale INV-04 — Draw preview is a pure local derivation', () => {
  it('uses no model, persistence, browser, or nondeterministic seam', () => {
    const preview = listSourceFiles(SRC_ROOT).find((file) => file.path === 'src/core/draw/preview.ts');
    expect(preview).toBeDefined();
    expect(preview?.text).not.toMatch(FORBIDDEN_PREVIEW_SEAM);
  });
});
