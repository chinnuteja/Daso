import { describe, expect, it } from 'vitest';

import { listSourceFiles, SRC_ROOT } from '../support/sourceTree';

describe('Kale INV-13 — saved Draw runtime never reaches an agent', () => {
  it('keeps runtime application local and deliberately dependency-small', () => {
    const runtime = listSourceFiles(SRC_ROOT).find((file) => file.path === 'src/core/capability/drawReuse.ts');
    expect(runtime).toBeDefined();
    expect(runtime?.text).not.toMatch(/agents|fetch\(|api\/|openai|anthropic|router|persistence|repositories|window\.|document\.|Date\.|Math\.random/iu);
    expect(runtime?.text).toMatch(/buildDrawPreviewFromSource/);
  });
});
