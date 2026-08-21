import { describe, expect, it } from 'vitest';

import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';

/**
 * INV-04 — no arbitrary generated code executes (specification sections 5, 7.5 and 12).
 *
 * Ruling R4. Rules are data in a closed vocabulary interpreted by hand-written code, so the
 * system needs no evaluator, no expression parser and no dynamic module loading. A prompt
 * injection therefore has nothing to inject into.
 */

const FORBIDDEN: readonly { readonly label: string; readonly pattern: RegExp }[] = [
  { label: 'eval(', pattern: /\beval\s*\(/u },
  { label: 'new Function(', pattern: /\bnew\s+Function\s*\(/u },
  { label: 'Function constructor call', pattern: /\bFunction\s*\(\s*['"`]/u },
  { label: 'setTimeout with a string body', pattern: /\bsetTimeout\s*\(\s*['"`]/u },
  { label: 'indirect eval alias', pattern: /\bglobalThis\s*\[\s*['"]eval['"]\s*\]/u },
];

/** A dynamic import whose first argument is not a literal string. */
const NON_LITERAL_IMPORT = /\bimport\s*\(\s*(?!['"])/u;

describe('INV-04 — nothing anywhere evaluates generated code (§5, §7.5, §12)', () => {
  const sources = listSourceFiles(SRC_ROOT);

  it('INV-04: src/** is non-empty, so the scan is meaningful', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it('INV-04: src/** contains no eval, no Function constructor and no string-bodied timer', () => {
    const offenders = sources.flatMap((file) =>
      FORBIDDEN.filter((forbidden) => forbidden.pattern.test(file.text)).map(
        (forbidden) => `${file.path} uses ${forbidden.label}`,
      ),
    );

    expect(offenders).toEqual([]);
  });

  it('INV-04: src/** contains no dynamic import with a non-literal specifier', () => {
    const offenders = sources
      .filter((file) => NON_LITERAL_IMPORT.test(file.text))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });
});
