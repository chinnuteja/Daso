import { describe, expect, it } from 'vitest';

import { AuthorshipEvent } from '../../src/core/schema/authorshipEvent';
import { ChildProfile } from '../../src/core/schema/childProfile';
import { ExperimentTrial } from '../../src/core/schema/experimentTrial';
import { ParentSummary } from '../../src/core/schema/parentSummary';
import { PermissionGrant } from '../../src/core/schema/permissionGrant';
import { ToolDefinition } from '../../src/core/schema/toolDefinition';
import { ToolVersion } from '../../src/core/schema/toolVersion';
import { loadSpecFixture } from '../support/specJson';

/**
 * INV-07 — no silent capability creep through data (specification section 4.1).
 *
 * Every object schema rejects unknown keys, so a new field cannot travel through the domain
 * without being declared. Seven negative cases, one per §9 object.
 */

const CASES = [
  { file: 'childProfile.json', schema: ChildProfile, label: 'ChildProfile' },
  { file: 'toolDefinition.json', schema: ToolDefinition, label: 'ToolDefinition' },
  { file: 'toolVersion.json', schema: ToolVersion, label: 'ToolVersion' },
  { file: 'authorshipEvent.json', schema: AuthorshipEvent, label: 'AuthorshipEvent' },
  { file: 'experimentTrial.json', schema: ExperimentTrial, label: 'ExperimentTrial' },
  { file: 'permissionGrant.json', schema: PermissionGrant, label: 'PermissionGrant' },
  { file: 'parentSummary.json', schema: ParentSummary, label: 'ParentSummary' },
] as const;

describe('INV-07 — each §9 schema rejects one extra unknown key (§4.1)', () => {
  for (const { file, schema, label } of CASES) {
    it(`INV-07: ${label} rejects an object carrying an extra unknown key`, () => {
      const fixture = loadSpecFixture(file);
      expect(typeof fixture).toBe('object');
      expect(fixture).not.toBeNull();

      const withExtra = { ...(fixture as Record<string, unknown>), extraUnknown: 'creep' };
      const parsed = schema.safeParse(withExtra);
      expect(parsed.success).toBe(false);
    });
  }
});
