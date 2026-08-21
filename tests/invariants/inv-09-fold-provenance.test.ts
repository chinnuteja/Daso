import { describe, expect, it } from 'vitest';

import { foldApprovedEvents } from '../../src/core/ledger/fold';
import { ToolVersion, ToolVersionBody } from '../../src/core/schema/toolVersion';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabLedger } from '../fixtures/ledger/flightLab';
import { loadSpecFixture } from '../support/specJson';

/**
 * INV-09 — provenance is structural, not decorative (specification sections 4.1, 7.6 and 12).
 *
 * Ruling R1: a tool version body IS the fold of its approved authorship events. Equality with
 * the §9.3 example (minus versionId/compiledAt, which come from injected ports) is the proof
 * that every material compiled behaviour has an approved event behind it.
 */

describe('INV-09 — foldApprovedEvents over the Flight Lab ledger equals the §9.3 body', () => {
  it('INV-09: the fold is deep-equal to tool_version_002 except versionId and compiledAt', () => {
    const documented = ToolVersion.parse(loadSpecFixture('toolVersion.json'));
    const expectedBody = ToolVersionBody.parse({
      toolId: documented.toolId,
      version: documented.version,
      inputs: documented.inputs,
      metrics: documented.metrics,
      rules: documented.rules,
    });

    const folded = foldApprovedEvents(flightLabLedger);

    expect(canonicalJson(folded)).toBe(canonicalJson(expectedBody));
  });
});
