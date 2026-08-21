import { describe, expect, it } from 'vitest';

import { bodyFromVersion, compileToolVersion, shouldReuseActiveVersion } from '../../../src/core/compiler';
import { foldApprovedEvents } from '../../../src/core/ledger/fold';
import { canonicalJson } from '../../../src/core/serialization/canonicalJson';
import { flightLabLedger } from '../../fixtures/ledger/flightLab';
import toolVersionJson from '../../fixtures/spec/toolVersion.json';

describe('pure compiler', () => {
  it('produces a body equal to the fold, with provenance on every rule', () => {
    const compiled = compileToolVersion(flightLabLedger, {
      versionId: 'tool_version_002',
      compiledAt: '2026-08-18T10:31:00Z',
    });
    const folded = foldApprovedEvents(flightLabLedger);
    expect(canonicalJson(bodyFromVersion(compiled))).toBe(canonicalJson(folded));
    expect(compiled.rules[0]?.sourceEventId).toBe('event_014');
    expect(canonicalJson(bodyFromVersion(compiled))).toBe(
      canonicalJson({
        toolId: toolVersionJson.toolId,
        version: toolVersionJson.version,
        inputs: toolVersionJson.inputs,
        metrics: toolVersionJson.metrics,
        rules: toolVersionJson.rules,
      }),
    );
  });

  it('returns a deeply frozen version', () => {
    const compiled = compileToolVersion(flightLabLedger, {
      versionId: 'tool_version_002',
      compiledAt: '2026-08-18T10:31:00Z',
    });
    expect(Object.isFrozen(compiled)).toBe(true);
    expect(() => {
      (compiled as { version: number }).version = 99;
    }).toThrow();
  });

  it('reuses the active version when the folded body is unchanged', () => {
    const v2 = compileToolVersion(flightLabLedger, {
      versionId: 'tool_version_002',
      compiledAt: '2026-08-18T10:31:00Z',
    });
    expect(shouldReuseActiveVersion(foldApprovedEvents(flightLabLedger), v2)).toBe(true);
    expect(shouldReuseActiveVersion(foldApprovedEvents(flightLabLedger), null)).toBe(false);
  });
});
