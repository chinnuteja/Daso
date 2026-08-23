import { describe, expect, it } from 'vitest';

import { exportToolGraph } from '../../../src/core/dataRights';
import { canonicalJson } from '../../../src/core/serialization/canonicalJson';
import { flightLabGraph } from '../../fixtures/persistence/flightLab';

describe('core/dataRights/exportTool', () => {
  it('sorts streams canonically and keeps membership on one tool', () => {
    const graph = flightLabGraph();
    const exported = exportToolGraph({
      tool: graph.tools[0]!,
      versions: graph.versions,
      ledger: graph.entries,
      trials: graph.trials,
      grants: graph.grants,
      summaries: graph.summaries,
    });
    expect(exported.ledger.map((entry) => entry.sequence)).toEqual(
      [...exported.ledger].map((entry) => entry.sequence).sort((left, right) => left - right),
    );
    expect(exported.trials.every((trial) => trial.toolId === 'mayas-flight-lab')).toBe(true);
    expect(canonicalJson(exported).startsWith('{"format":"teach-daso/tool-export-v1"')).toBe(true);
  });
});
