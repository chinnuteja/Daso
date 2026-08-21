import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createMemoryRepositories } from '../../src/adapters/persistence';
import { ExperimentTrial } from '../../src/core/schema/experimentTrial';
import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-32 — no raw media is persisted (specification section 11.3).
 */

const PERSISTENCE_ROOT = resolve(SRC_ROOT, 'adapters/persistence');

const FORBIDDEN: readonly { readonly label: string; readonly pattern: RegExp }[] = [
  { label: 'Blob', pattern: /\bBlob\b/u },
  { label: 'File', pattern: /\bFile\b/u },
  { label: 'ArrayBuffer', pattern: /\bArrayBuffer\b/u },
  { label: 'createObjectURL', pattern: /\bcreateObjectURL\b/u },
  { label: 'data: URL', pattern: /data:/u },
];

describe('INV-32 — no raw media is persisted (§11.3)', () => {
  it('INV-32: src/adapters/persistence/** contains no Blob, File, ArrayBuffer, createObjectURL, or data: literal', () => {
    const files = listSourceFiles(PERSISTENCE_ROOT);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.flatMap((file) =>
      FORBIDDEN.filter((forbidden) => forbidden.pattern.test(file.text)).map(
        (forbidden) => `${file.path} uses ${forbidden.label}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('INV-32: an object carrying a media field is rejected by the schema before it can reach a store', async () => {
    const trial = flightLabGraph().trials[0];
    expect(trial).toBeDefined();
    if (trial === undefined) {
      return;
    }
    const withMedia = { ...trial, video: 'data:video/mp4;base64,AAAA' };
    expect(ExperimentTrial.safeParse(withMedia).success).toBe(false);
    const repositories = createMemoryRepositories();
    await expect(repositories.trials.save(withMedia as never)).rejects.toThrow();
    expect(await repositories.trials.get(trial.trialId)).toBeNull();
  });
});
