import { describe, expect, it } from 'vitest';

import { ToolDefinition } from '../../../src/core/schema/toolDefinition';
import { canonicalJson } from '../../../src/core/serialization/canonicalJson';
import { loadSpecFixture } from '../../support/specJson';

const FIXTURE = loadSpecFixture('toolDefinition.json') as Record<string, unknown>;

describe('ToolDefinition optional forkedFrom lineage', () => {
  it('parses the §9.2 fixture without a lineage field', () => {
    const parsed = ToolDefinition.parse(FIXTURE);
    expect(parsed.forkedFrom).toBeUndefined();
    expect(canonicalJson(parsed)).toBe(canonicalJson(FIXTURE));
  });

  it('rejects an unknown key on a non-fork definition', () => {
    expect(ToolDefinition.safeParse({ ...FIXTURE, extraUnknown: 'no' }).success).toBe(false);
  });

  it('accepts a complete lineage object and rejects an incomplete one', () => {
    const withLineage = ToolDefinition.parse({
      ...FIXTURE,
      ownerChildId: 'child_local_02',
      toolId: 'mayas-flight-lab-copy',
      forkedFrom: {
        toolId: 'mayas-flight-lab',
        versionId: 'tool_version_002',
        ownerChildId: 'child_local_01',
      },
    });
    expect(withLineage.forkedFrom?.ownerChildId).toBe('child_local_01');
    expect(
      ToolDefinition.safeParse({
        ...FIXTURE,
        forkedFrom: { toolId: 'mayas-flight-lab' },
      }).success,
    ).toBe(false);
    expect(
      ToolDefinition.safeParse({
        ...FIXTURE,
        forkedFrom: {
          toolId: 'mayas-flight-lab',
          versionId: 'tool_version_002',
          ownerChildId: 'child_local_01',
          extraUnknown: true,
        },
      }).success,
    ).toBe(false);
  });
});
