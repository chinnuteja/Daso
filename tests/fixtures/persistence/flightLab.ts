import { foldApprovedEvents } from '../../../src/core/ledger/fold';
import { ChildProfile } from '../../../src/core/schema/childProfile';
import { ParentSummary } from '../../../src/core/schema/parentSummary';
import { PermissionGrant } from '../../../src/core/schema/permissionGrant';
import { ToolDefinition } from '../../../src/core/schema/toolDefinition';
import { ToolVersion } from '../../../src/core/schema/toolVersion';
import type { PersistableGraph } from '../../../src/adapters/persistence';
import { flightLabLedger, flightLabTrials } from '../ledger/flightLab';
import childProfileJson from '../spec/childProfile.json';
import parentSummaryJson from '../spec/parentSummary.json';
import permissionGrantJson from '../spec/permissionGrant.json';
import toolDefinitionJson from '../spec/toolDefinition.json';
import toolVersionJson from '../spec/toolVersion.json';

export const FLIGHT_LAB_TOOL_ID = 'mayas-flight-lab';

export function flightLabGraph(): PersistableGraph {
  const v1Body = foldApprovedEvents(flightLabLedger.filter((entry) => entry.sequence <= 10));
  const versionOne = ToolVersion.parse({
    ...v1Body,
    versionId: 'tool_version_001',
    compiledAt: '2026-08-18T10:21:00Z',
  });
  const versionTwo = ToolVersion.parse(toolVersionJson);

  return {
    profile: ChildProfile.parse(childProfileJson),
    tools: [ToolDefinition.parse(toolDefinitionJson)],
    versions: [versionOne, versionTwo],
    entries: flightLabLedger,
    trials: flightLabTrials,
    grants: [PermissionGrant.parse(permissionGrantJson)],
    summaries: [ParentSummary.parse(parentSummaryJson)],
  };
}

export function otherToolGraph(): PersistableGraph {
  return {
    profile: ChildProfile.parse(childProfileJson),
    tools: [
      ToolDefinition.parse({
        toolId: 'other-paper-lab',
        ownerChildId: 'child_local_01',
        displayName: 'Other Paper Lab',
        kind: 'experiment_comparator',
        currentVersionId: 'tool_version_101',
        createdAt: '2026-08-18T12:00:00Z',
      }),
    ],
    versions: [
      ToolVersion.parse({
        versionId: 'tool_version_101',
        toolId: 'other-paper-lab',
        version: 1,
        inputs: ['design_name'],
        metrics: ['median_distance'],
        rules: [],
        compiledAt: '2026-08-18T12:01:00Z',
      }),
    ],
    entries: [
      {
        entryKind: 'candidate',
        eventId: 'event_101',
        sequence: 1,
        toolId: 'other-paper-lab',
        actor: 'child',
        type: 'definition_decision',
        originalInput: 'A second experiment',
        candidateMutation: { operation: 'add_metric', metric: 'median_distance' },
        createdAt: '2026-08-18T12:00:00Z',
      },
      {
        entryKind: 'approval',
        eventId: 'event_102',
        sequence: 2,
        toolId: 'other-paper-lab',
        actor: 'child',
        approves: 'event_101',
        createdAt: '2026-08-18T12:00:10Z',
      },
    ],
    trials: [
      {
        trialId: 'trial_101',
        toolId: 'other-paper-lab',
        toolVersionIdAtCapture: 'tool_version_101',
        designName: 'Dart',
        distanceM: 4.2,
        obstruction: false,
        validAtCapture: true,
        validUnderCurrentVersion: true,
        createdAt: '2026-08-18T12:05:00Z',
      },
    ],
    grants: [],
    summaries: [],
  };
}
