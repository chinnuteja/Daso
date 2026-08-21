import { describe, expect, it } from 'vitest';

import {
  CORE_ROOT,
  importSpecifiers,
  listSourceFiles,
  resolveRelative,
  toPosix,
} from '../support/sourceTree';

/**
 * INV-02 — domain purity and portability (specification sections 13 and 14).
 *
 * `src/core` is the portable domain kernel. It may import `zod` and other `src/core` modules,
 * and nothing else — no React, no Next, no Node builtins, no persistence library, no fetch.
 * This is what makes "portable to a native Android implementation" a checkable claim.
 */

const ALLOWED_EXTERNAL_SPECIFIERS: readonly string[] = ['zod'];

const NAMED_OFFENDERS: readonly RegExp[] = [
  /^react/u,
  /^next(\/|$)/u,
  /^node:/u,
  /^(fs|path|crypto|url|os|util|events|stream|buffer)$/u,
  /^idb/u,
  /^dexie/u,
];

describe('INV-02 — src/core imports nothing but zod and itself (§13, §14)', () => {
  const coreFiles = listSourceFiles(CORE_ROOT);

  it('INV-02: src/core/** is non-empty, so the scan is meaningful', () => {
    expect(coreFiles.length).toBeGreaterThan(0);
  });

  it('INV-02: every import in src/core/** is zod or another src/core module', () => {
    const offenders: string[] = [];

    for (const file of coreFiles) {
      for (const specifier of importSpecifiers(file.text)) {
        if (specifier.startsWith('.')) {
          const resolved = toPosix(resolveRelative(file.absolutePath, specifier));
          if (!resolved.startsWith(toPosix(CORE_ROOT))) {
            offenders.push(`${file.path} reaches outside the kernel: ${specifier}`);
          }
          continue;
        }
        if (!ALLOWED_EXTERNAL_SPECIFIERS.includes(specifier)) {
          offenders.push(`${file.path} imports a forbidden package: ${specifier}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('INV-02: src/core/** imports no react, next, node builtin or persistence library', () => {
    const offenders = coreFiles.flatMap((file) =>
      importSpecifiers(file.text)
        .filter((specifier) => NAMED_OFFENDERS.some((pattern) => pattern.test(specifier)))
        .map((specifier) => `${file.path} imports ${specifier}`),
    );

    expect(offenders).toEqual([]);
  });

  it('INV-02: src/core/** never calls fetch or touches a browser global', () => {
    const offenders = coreFiles
      .filter((file) => /\b(fetch\(|window\.|document\.|localStorage|indexedDB)/u.test(file.text))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });
});
