import { describe, expect, it } from 'vitest';

import { CORE_ROOT, importSpecifiers, listSourceFiles } from '../support/sourceTree';
import { emptyValidationContext } from '../support/validationContext';
import { EXCLUDE_OBSTRUCTED_MUTATION } from '../../src/adapters/teaching/scripted';
import { validateCandidate, VALIDATION_CHECKS } from '../../src/core/validator';
import type { PermissionGrant } from '../../src/core/schema/permissionGrant';

/**
 * INV-18 — Validation is code, not model-delegated; invalid mutations are rejected (§7.4).
 * Promoted from the pending placeholder written in Phase 1.
 */

const VALID_METRIC = { operation: 'add_metric', metric: 'median_distance' } as const;

const CAMERA_GRANT: PermissionGrant = {
  grantId: 'grant_camera_flight_lab',
  toolId: 'mayas-flight-lab',
  capability: 'camera_foreground_capture',
  scope: 'current_experiment',
  approvedBy: 'parent_or_device_policy',
  expiresAt: '2026-12-31T00:00:00Z',
};

describe('INV-18 — validation is code, not model-delegated; invalid mutations are rejected (§7.4)', () => {
  it('INV-18: src/core/validator/** imports no adapter, performs no I/O, and contains no model reference', () => {
    const files = listSourceFiles(CORE_ROOT).filter((file) =>
      file.path.startsWith('src/core/validator/'),
    );
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.flatMap((file) => {
      const hits: string[] = [];
      for (const specifier of importSpecifiers(file.text)) {
        if (specifier.includes('adapters') || specifier.includes('app/api')) {
          hits.push(`${file.path} imports ${specifier}`);
        }
      }
      if (/\b(fetch\(|readFile|writeFile|process\.env)\b/u.test(file.text)) {
        hits.push(`${file.path} performs I/O`);
      }
      if (/\b(openai|anthropic|langchain|TEACHING_AGENT_CREDENTIAL)\b/iu.test(file.text)) {
        hits.push(`${file.path} references a model`);
      }
      return hits;
    });
    expect(offenders).toEqual([]);
  });

  it('INV-18: schema check accepts a closed-set mutation and rejects an unlisted operation', () => {
    const accepted = validateCandidate(VALID_METRIC, emptyValidationContext());
    expect(accepted).toEqual({ ok: true });

    const rejected = validateCandidate(
      { operation: 'grant_admin' },
      emptyValidationContext(),
    );
    expect(rejected.ok).toBe(false);
    if (rejected.ok === false) {
      expect(rejected.reasons.some((reason) => reason.check === 'schema')).toBe(true);
    }
  });

  it('INV-18: capabilities check accepts a mutation with no capability and rejects an ungranted one', () => {
    const accepted = validateCandidate(VALID_METRIC, emptyValidationContext());
    expect(accepted).toEqual({ ok: true });

    const rejected = validateCandidate(
      { operation: 'add_input', input: 'design_name', capability: 'camera_foreground_capture' },
      emptyValidationContext(),
    );
    expect(rejected.ok).toBe(false);
    if (rejected.ok === false) {
      expect(rejected.reasons.some((reason) => reason.check === 'capabilities')).toBe(true);
    }

    const granted = validateCandidate(
      { operation: 'add_input', input: 'design_name', capability: 'camera_foreground_capture' },
      emptyValidationContext({ grants: [CAMERA_GRANT] }),
    );
    if (granted.ok === false) {
      expect(granted.reasons.some((reason) => reason.check === 'capabilities')).toBe(false);
    }
  });

  it('INV-18: types check accepts a valid rule and rejects a field outside InputField', () => {
    const accepted = validateCandidate(EXCLUDE_OBSTRUCTED_MUTATION, emptyValidationContext());
    expect(accepted).toEqual({ ok: true });

    const rejected = validateCandidate(
      {
        operation: 'add_rule',
        rule: {
          ruleId: 'bad_field',
          when: { field: 'velocity', equals: true },
          effect: { set: 'trial.valid', value: false },
        },
      },
      emptyValidationContext(),
    );
    expect(rejected.ok).toBe(false);
    if (rejected.ok === false) {
      expect(rejected.reasons.some((reason) => reason.check === 'types')).toBe(true);
    }
  });

  it('INV-18: limits check accepts a mutation under the caps and rejects each overflow', () => {
    const accepted = validateCandidate(VALID_METRIC, emptyValidationContext());
    expect(accepted).toEqual({ ok: true });

    const rejected = validateCandidate(VALID_METRIC, emptyValidationContext({ existingMetrics: ['median_distance', 'consistency'] }));
    expect(rejected.ok).toBe(false);
    if (rejected.ok === false) {
      expect(rejected.reasons.some((reason) => reason.check === 'limits' && reason.limit === 'maxMetrics')).toBe(
        true,
      );
    }
  });

  it('INV-18: provenance check accepts an unstamped candidate and rejects a pre-stamped sourceEventId', () => {
    const accepted = validateCandidate(EXCLUDE_OBSTRUCTED_MUTATION, emptyValidationContext());
    expect(accepted).toEqual({ ok: true });

    const rejected = validateCandidate(
      {
        operation: 'add_rule',
        rule: {
          ruleId: 'exclude_obstructed_flight',
          when: { field: 'obstruction', equals: true },
          effect: { set: 'trial.valid', value: false },
          sourceEventId: 'event_001',
        },
      },
      emptyValidationContext({ knownEventIds: new Set(['event_001']) }),
    );
    expect(rejected.ok).toBe(false);
    if (rejected.ok === false) {
      expect(rejected.reasons.some((reason) => reason.check === 'provenance')).toBe(true);
    }
  });

  it('INV-18: determinism check accepts canonical JSON and rejects an expression string', () => {
    const accepted = validateCandidate(EXCLUDE_OBSTRUCTED_MUTATION, emptyValidationContext());
    expect(accepted).toEqual({ ok: true });

    const rejected = validateCandidate(
      {
        operation: 'add_rule',
        rule: {
          ruleId: 'expr',
          when: { field: 'distance_m', expr: 'distance_m > 5' },
          effect: { set: 'trial.valid', value: false },
        },
      },
      emptyValidationContext(),
    );
    expect(rejected.ok).toBe(false);
    if (rejected.ok === false) {
      expect(rejected.reasons.some((reason) => reason.check === 'determinism')).toBe(true);
    }
  });

  it('INV-18: every §7.4 check has a named identity', () => {
    expect([...VALIDATION_CHECKS]).toEqual([
      'schema',
      'capabilities',
      'types',
      'limits',
      'provenance',
      'determinism',
    ]);
  });
});
