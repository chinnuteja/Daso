import { describe, expect, it } from 'vitest';

import { Capability } from '../../src/core/schema/vocabulary';
import type { PermissionGrant } from '../../src/core/schema/permissionGrant';
import { validateCandidate } from '../../src/core/validator';
import { emptyValidationContext } from '../support/validationContext';

/**
 * INV-55 — Capability references are allowlisted (§7.4, §7.5).
 */

const CAMERA_GRANT: PermissionGrant = {
  grantId: 'grant_camera_flight_lab',
  toolId: 'mayas-flight-lab',
  capability: 'camera_foreground_capture',
  scope: 'current_experiment',
  approvedBy: 'parent_or_device_policy',
  expiresAt: '2026-12-31T00:00:00Z',
};

const EXPIRED_GRANT: PermissionGrant = {
  ...CAMERA_GRANT,
  expiresAt: '2026-01-01T00:00:00Z',
};

const SUBJECT = {
  operation: 'add_input',
  input: 'design_name',
  capability: 'camera_foreground_capture',
} as const;

describe('INV-55 — capability references are allowlisted (§7.4, §7.5)', () => {
  it('INV-55: a mutation naming a capability with no in-scope grant is rejected', () => {
    const verdict = validateCandidate(SUBJECT, emptyValidationContext());
    expect(verdict.ok).toBe(false);
    if (verdict.ok === false) {
      expect(verdict.reasons.some((reason) => reason.check === 'capabilities')).toBe(true);
    }
  });

  it('INV-55: a grant that has expired does not admit the capability', () => {
    const verdict = validateCandidate(
      SUBJECT,
      emptyValidationContext({ now: '2026-08-18T10:00:00Z', grants: [EXPIRED_GRANT] }),
    );
    expect(verdict.ok).toBe(false);
    if (verdict.ok === false) {
      expect(verdict.reasons.some((reason) => reason.check === 'capabilities')).toBe(true);
    }
  });

  it('INV-55: Capability membership is unchanged from Phase 1', () => {
    expect(Capability.options).toEqual([
      'camera_foreground_capture',
      'microphone_foreground_capture',
    ]);
  });

  it('INV-55: a live in-scope grant admits the named capability', () => {
    const verdict = validateCandidate(
      SUBJECT,
      emptyValidationContext({ grants: [CAMERA_GRANT] }),
    );
    if (verdict.ok === false) {
      expect(verdict.reasons.some((reason) => reason.check === 'capabilities')).toBe(false);
    }
  });
});
