import { describe, expect, it } from 'vitest';

import { millimetresToMetres, replay, validityChanges } from '../../src/core/runtime';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { FLIGHT_LAB_TOOL_ID } from '../fixtures/script/flightLab';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

/**
 * Integration: v1 vs v2 compile, replay, and compile-preview comparison are application results.
 */
describe('phase 5 compile and replay', () => {
  it('compiles two immutable versions and changes ranking without rewriting trials', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: true });
    const versions = await result.repositories.versions.listByTool(FLIGHT_LAB_TOOL_ID);
    const trials = await result.repositories.trials.listByTool(FLIGHT_LAB_TOOL_ID);
    const v1 = versions.find((version) => version.version === 1);
    const v2 = versions.find((version) => version.version === 2);
    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    if (v1 === undefined || v2 === undefined) {
      return;
    }
    const before = canonicalJson(trials);
    const first = replay(v1, trials);
    const second = replay(v2, trials);
    expect(first.winner).toBe('Dart');
    expect(second.winner).toBe('Falcon');
    expect(validityChanges(first, second)).toEqual(['trial_004']);
    expect(millimetresToMetres(second.ranking[0]?.medianDistanceMm ?? 0)).toBe(7.4);
    expect(canonicalJson(trials)).toBe(before);
    expect(result.compiledBody?.version).toBe(2);
  });
});
