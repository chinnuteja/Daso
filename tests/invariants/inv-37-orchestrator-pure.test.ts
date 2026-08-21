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
 * INV-37 — the orchestrator cannot perform I/O.
 */
const ORCHESTRATOR_ROOT = resolve(CORE_ROOT, 'orchestrator');

describe('INV-37 — the orchestrator cannot perform I/O (§7.2, §8, E.4)', () => {
  const files = listSourceFiles(ORCHESTRATOR_ROOT);

  it('INV-37: src/core/orchestrator/** is non-empty, so the scan is meaningful', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('INV-37: orchestrator source contains no async, await, Promise, or fetch', () => {
    const offenders = files
      .filter((file) => /\basync\b|\bawait\b|\bPromise\b|\bfetch\s*\(/u.test(file.text))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('INV-37: orchestrator imports stay inside src/core and never reach a repository implementation', () => {
    const offenders: string[] = [];

    for (const file of files) {
      for (const specifier of importSpecifiers(file.text)) {
        if (!specifier.startsWith('.')) {
          offenders.push(`${file.path} imports a non-relative module: ${specifier}`);
          continue;
        }
        const resolved = toPosix(resolveRelative(file.absolutePath, specifier));
        if (!resolved.startsWith(toPosix(CORE_ROOT))) {
          offenders.push(`${file.path} reaches outside the kernel: ${specifier}`);
        }
        if (resolved.includes('/src/adapters/') || resolved.includes('/repositories')) {
          offenders.push(`${file.path} imports a repository implementation: ${specifier}`);
        }
      }
    }

    expect(offenders).toEqual([]);
    expect(toPosix(SRC_ROOT).length).toBeGreaterThan(0);
  });
});
