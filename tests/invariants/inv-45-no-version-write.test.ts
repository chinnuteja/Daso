import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CORE_ROOT, listSourceFiles } from '../support/sourceTree';
import { FLIGHT_LAB_TOOL_ID } from '../fixtures/script/flightLab';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

/**
 * INV-45 — the orchestrator never writes a tool version.
 */
describe('INV-45 — the orchestrator never writes a tool version (§7.2)', () => {
  it('INV-45: src/core/orchestrator/** contains no versions, ToolVersion, or save reference', () => {
    const files = listSourceFiles(resolve(CORE_ROOT, 'orchestrator'));
    const offenders = files
      .filter((file) => /\bversions\b|\bToolVersion\b|\bsave\b/u.test(file.text))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('INV-45: the scripted journey writes versions through composition, never from the orchestrator', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: true });
    const versions = await result.repositories.versions.listByTool(FLIGHT_LAB_TOOL_ID);
    expect(versions.map((version) => version.versionId)).toEqual([
      'tool_version_001',
      'tool_version_002',
    ]);
  });
});
