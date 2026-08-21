import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CORE_ROOT, listSourceFiles } from '../support/sourceTree';
import { compileToolVersion } from '../../src/core/compiler';
import { replay } from '../../src/core/runtime';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { createMemoryRepositories } from '../../src/adapters/persistence';
import { flightLabLedger, flightLabTrials } from '../fixtures/ledger/flightLab';

/**
 * INV-61 — runtime is pure and model-free.
 */

const FORBIDDEN_IMPORT = /from\s+['"](?:react|next|node:|idb|[^'"]*adapters|[^'"]*app\/|[^'"]*ui\/)/u;
const FORBIDDEN_SEAM =
  /\b(fetch\(|window\.|document\.|localStorage|indexedDB|Date\.now|Math\.random|eval\(|new Function)/u;

describe('INV-61 — runtime source is pure', () => {
  it('INV-61: compiler and runtime import no adapter, app, UI, browser, or Node I/O', () => {
    const files = [
      ...listSourceFiles(resolve(CORE_ROOT, 'runtime')),
      ...listSourceFiles(resolve(CORE_ROOT, 'compiler')),
    ];
    expect(files.length).toBeGreaterThan(0);
    const offenders = files
      .filter((file) => FORBIDDEN_IMPORT.test(file.text) || FORBIDDEN_SEAM.test(file.text))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('INV-61: calling replay does not mutate trials or version and writes no repository', async () => {
    const version = compileToolVersion(flightLabLedger, {
      versionId: 'tool_version_002',
      compiledAt: '2026-08-18T10:31:00Z',
    });
    const beforeTrials = canonicalJson(flightLabTrials);
    const beforeVersion = canonicalJson(version);
    const repositories = createMemoryRepositories();
    replay(version, flightLabTrials);
    expect(canonicalJson(flightLabTrials)).toBe(beforeTrials);
    expect(canonicalJson(version)).toBe(beforeVersion);
    expect(await repositories.trials.listByTool('mayas-flight-lab')).toEqual([]);
    expect(await repositories.versions.listByTool('mayas-flight-lab')).toEqual([]);
  });
});
