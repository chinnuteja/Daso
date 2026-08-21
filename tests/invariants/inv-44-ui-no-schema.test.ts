import { describe, expect, it } from 'vitest';

import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';

/**
 * INV-44 — the UI defines no persisted shape.
 */
describe('INV-44 — the UI defines no persisted shape (E.1)', () => {
  it('INV-44: src/ui/** and src/app/** declare no z.object or z.strictObject schema', () => {
    const files = listSourceFiles(SRC_ROOT).filter(
      (file) => file.path.startsWith('src/ui/') || file.path.startsWith('src/app/'),
    );
    expect(files.length).toBeGreaterThan(0);

    const offenders = files
      .filter((file) => /\bz\.(object|strictObject)\s*\(/u.test(file.text))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });
});
