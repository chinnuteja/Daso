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
 * INV-06 — the spec data model is honoured (specification section 9).
 *
 * Each of the seven §9 example JSON documents must parse unmodified. If a schema cannot
 * accept the specification's own example, the schema is wrong — the fixture is not edited.
 */

const CASES = [
  { file: 'childProfile.json', schema: ChildProfile, label: 'ChildProfile (§9.1)' },
  { file: 'toolDefinition.json', schema: ToolDefinition, label: 'ToolDefinition (§9.2)' },
  { file: 'toolVersion.json', schema: ToolVersion, label: 'ToolVersion (§9.3)' },
  { file: 'authorshipEvent.json', schema: AuthorshipEvent, label: 'AuthorshipEvent (§9.4)' },
  { file: 'experimentTrial.json', schema: ExperimentTrial, label: 'ExperimentTrial (§9.5)' },
  { file: 'permissionGrant.json', schema: PermissionGrant, label: 'PermissionGrant (§9.6)' },
  { file: 'parentSummary.json', schema: ParentSummary, label: 'ParentSummary (§9.7)' },
] as const;

describe('INV-06 — each §9 example JSON fixture parses unmodified (§9)', () => {
  for (const { file, schema, label } of CASES) {
    it(`INV-06: ${label} fixture ${file} parses successfully`, () => {
      const parsed = schema.safeParse(loadSpecFixture(file));
      expect(parsed.success, parsed.success ? undefined : JSON.stringify(parsed.error.issues)).toBe(
        true,
      );
    });
  }
});
