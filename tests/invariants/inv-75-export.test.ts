import { describe, expect, it } from 'vitest';

import { ToolExportError, exportToolGraph } from '../../src/core/dataRights';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabGraph, otherToolGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-75 — canonical local export is complete, tool-scoped, and rejects dangling graphs.
 */

describe('INV-75 — canonical tool export', () => {
  it('INV-75: the export is canonical, complete, and contains no profile, meta, credential, or media', () => {
    const graph = flightLabGraph();
    const exported = exportToolGraph({
      tool: graph.tools[0]!,
      versions: graph.versions,
      ledger: graph.entries,
      trials: graph.trials,
      grants: graph.grants,
      summaries: graph.summaries,
    });
    expect(exported.format).toBe('teach-daso/tool-export-v1');
    expect(exported.tool.toolId).toBe('mayas-flight-lab');
    expect(exported.versions.map((version) => version.versionId)).toEqual([
      'tool_version_001',
      'tool_version_002',
    ]);
    expect(exported.ledger).toHaveLength(graph.entries.length);
    expect(exported.trials.map((trial) => trial.trialId)).toEqual([
      'trial_001',
      'trial_002',
      'trial_003',
      'trial_004',
    ]);
    expect(exported.grants).toHaveLength(1);
    expect(exported.summaries).toHaveLength(1);
    expect(canonicalJson(exportToolGraph({
      tool: graph.tools[0]!,
      versions: [...graph.versions].reverse(),
      ledger: [...graph.entries].reverse(),
      trials: [...graph.trials].reverse(),
      grants: graph.grants,
      summaries: graph.summaries,
    }))).toBe(canonicalJson(exported));

    const encoded = canonicalJson(exported);
    expect(encoded).not.toMatch(/readingBand|inputPreferences/u);
    expect(encoded).not.toMatch(/TEACHING_AGENT_CREDENTIAL|EVIDENCE_AGENT_CREDENTIAL|MODEL_PROVIDER/u);
    expect(encoded).not.toMatch(/idCounters/u);
    expect(Object.keys(exported).sort()).toEqual([
      'format',
      'grants',
      'ledger',
      'summaries',
      'tool',
      'trials',
      'versions',
    ]);
  });

  it('INV-75: dangling, foreign, and broken-fold graphs are rejected', () => {
    const graph = flightLabGraph();
    const other = otherToolGraph();
    const tool = graph.tools[0]!;
    expect(() =>
      exportToolGraph({
        tool: { ...tool, currentVersionId: 'tool_version_999' },
        versions: graph.versions,
        ledger: graph.entries,
        trials: graph.trials,
        grants: graph.grants,
        summaries: graph.summaries,
      }),
    ).toThrow(ToolExportError);
    expect(() =>
      exportToolGraph({
        tool,
        versions: [...graph.versions, other.versions[0]!],
        ledger: graph.entries,
        trials: graph.trials,
        grants: graph.grants,
        summaries: graph.summaries,
      }),
    ).toThrow(ToolExportError);
    expect(() =>
      exportToolGraph({
        tool,
        versions: graph.versions,
        ledger: graph.entries.slice(0, 2),
        trials: graph.trials,
        grants: graph.grants,
        summaries: graph.summaries,
      }),
    ).toThrow(ToolExportError);
  });
});
