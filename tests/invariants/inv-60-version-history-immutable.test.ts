import { describe, expect, it } from 'vitest';

import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { FLIGHT_LAB_TOOL_ID } from '../fixtures/script/flightLab';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

/**
 * INV-60 — compiling v2 does not mutate v1.
 */

describe('INV-60 — version history is immutable', () => {
  it('INV-60: v1 bytes are unchanged after v2, nested mutation is rejected, and both versions remain readable', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: true });
    const versions = await result.repositories.versions.listByTool(FLIGHT_LAB_TOOL_ID);
    const v1 = versions.find((version) => version.versionId === 'tool_version_001');
    const v2 = versions.find((version) => version.versionId === 'tool_version_002');
    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    if (v1 === undefined || v2 === undefined) {
      return;
    }

    const snapshot = canonicalJson(v1);
    expect(() => {
      (v1 as { version: number }).version = 99;
    }).toThrow();
    expect(() => {
      (v1.rules as { length: number }).length = 0;
    }).toThrow();
    expect(canonicalJson(v1)).toBe(snapshot);
    expect(v1.rules).toEqual([]);
    expect(v2.rules.map((rule) => rule.ruleId)).toEqual(['exclude_obstructed_flight']);

    const tool = await result.repositories.tools.get(FLIGHT_LAB_TOOL_ID);
    expect(tool?.currentVersionId).toBe('tool_version_002');
    expect(await result.repositories.versions.get('tool_version_001')).not.toBeNull();
    expect(await result.repositories.versions.get('tool_version_002')).not.toBeNull();
  });
});
