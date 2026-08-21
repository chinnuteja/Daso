import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CORE_ROOT,
  SRC_ROOT,
  importSpecifiers,
  listSourceFiles,
  resolveRelative,
  toPosix,
} from '../support/sourceTree';

/**
 * INV-34 — layering is one-way (specification sections 13 and 14).
 */

const PERSISTENCE_ROOT = resolve(SRC_ROOT, 'adapters/persistence');

describe('INV-34 — layering is one-way (§13, §14)', () => {
  it('INV-34: no module under src/core/** imports from src/adapters or src/app', () => {
    const coreFiles = listSourceFiles(CORE_ROOT);
    const offenders: string[] = [];

    for (const file of coreFiles) {
      for (const specifier of importSpecifiers(file.text)) {
        if (!specifier.startsWith('.')) {
          continue;
        }
        const resolved = toPosix(resolveRelative(file.absolutePath, specifier));
        if (resolved.includes('/src/adapters/') || resolved.includes('/src/app/')) {
          offenders.push(`${file.path} imports ${specifier}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('INV-34: idb and indexedDB appear only under src/adapters/persistence/**', () => {
    const sources = listSourceFiles(SRC_ROOT);
    const persistencePrefix = toPosix(PERSISTENCE_ROOT);
    const offenders = sources
      .filter((file) => /\bidb\b|\bindexedDB\b/u.test(file.text))
      .filter((file) => !toPosix(file.absolutePath).startsWith(persistencePrefix))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });
});
