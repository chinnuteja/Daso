import { describe, expect, it } from 'vitest';

import { CORE_ROOT, listSourceFiles } from '../support/sourceTree';

/**
 * INV-03 — determinism has no hidden inputs (specification section 17).
 *
 * Time and identifiers reach the domain only through injected ports, so replaying the same
 * events produces the same bytes. A single `new Date()` inside the kernel would make that
 * false without any test failing, which is why this is a text scan of the whole layer.
 */

const FORBIDDEN: readonly { readonly label: string; readonly pattern: RegExp }[] = [
  { label: 'Date.now', pattern: /\bDate\.now\s*\(/u },
  { label: 'new Date(', pattern: /\bnew\s+Date\s*\(/u },
  { label: 'Math.random', pattern: /\bMath\.random\s*\(/u },
  { label: 'crypto.randomUUID', pattern: /\bcrypto\.randomUUID\s*\(/u },
  { label: 'toLocaleString', pattern: /\btoLocale[A-Za-z]*\s*\(/u },
  { label: 'performance.now', pattern: /\bperformance\.now\s*\(/u },
  { label: 'process.hrtime', pattern: /\bprocess\.hrtime\b/u },
];

describe('INV-03 — the domain reads no clock and no randomness (§17 Determinism)', () => {
  const coreFiles = listSourceFiles(CORE_ROOT);

  it('INV-03: src/core/** is non-empty, so the scan is meaningful', () => {
    expect(coreFiles.length).toBeGreaterThan(0);
  });

  it('INV-03: src/core/** contains no wall-clock, randomness or locale-sensitive call', () => {
    const offenders = coreFiles.flatMap((file) =>
      FORBIDDEN.filter((forbidden) => forbidden.pattern.test(file.text)).map(
        (forbidden) => `${file.path} uses ${forbidden.label}`,
      ),
    );

    expect(offenders).toEqual([]);
  });
});
