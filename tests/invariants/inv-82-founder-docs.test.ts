import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SIMULATION_DISCLOSURES } from '../../src/core/disclosure/simulations';
import { REPO_ROOT } from '../support/sourceTree';

/**
 * INV-82 — founder docs name real routes, R7 disclosures, D-01/D-02, and no unbuilt capability.
 */

function readDoc(relative: string): string {
  return readFileSync(resolve(REPO_ROOT, relative), 'utf8');
}

describe('INV-82 — founder documentation', () => {
  it('INV-82: README, architecture, and threat model stay inside the built product', () => {
    const readme = readDoc('README.md');
    const architecture = readDoc('docs/ARCHITECTURE.md');
    const threat = readDoc('docs/THREAT_MODEL.md');
    const docs = `${readme}\n${architecture}\n${threat}`;

    expect(readme).toContain('The current shared engine supports Draw patterns and Flight rules');
    expect(readme).toContain('older coaching preferences and experiment comparators remain in their legacy routes');
    expect(readme).toContain('bounded capabilities, not an open-ended agent platform');
    expect(readme).toContain('Interpretation is deterministic in this prototype');
    expect(readme).toContain('D-01');
    expect(readme).toContain('D-02');
    expect(architecture).toContain('D-01');
    expect(architecture).toContain('D-02');

    for (const route of [
      '`/`',
      '`/draw`',
      '`/draw/library`',
      '`/flight`',
      '`/parent/tools`',
      '`/writing`',
      '`/lab`',
      '`/journey`',
      '`/run`',
      '`/parent`',
      '`/inspect`',
      '`/api/agents/teaching`',
      '`/api/agents/evidence`',
    ]) {
      expect(readme).toContain(route);
    }

    for (const entry of SIMULATION_DISCLOSURES) {
      expect(readme).toContain(entry.whatIsSimulated);
      expect(readme).toContain(entry.whatIsReal);
      expect(entry.disclosedAt).toContain('readme');
    }

    expect(docs).not.toMatch(/the camera measured the distance/iu);
    expect(docs).not.toMatch(/SMS was sent/iu);
    expect(docs).not.toMatch(/cloud sync is enabled/iu);
    expect(docs).not.toMatch(/public sharing is live/iu);
    expect(threat).toContain('INV-24');
    expect(threat).toContain('INV-77');
    expect(architecture).toContain('INV-80');
  });
});
