import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { TeachingMove } from '../../src/core/ports/teaching';
import { CandidateMutation } from '../../src/core/schema/mutation';
import { evaluatePolicy, inspectPolicySubject } from '../../src/core/policy';
import { validateCandidate } from '../../src/core/validator';
import { policyRejectionCopy, validationRejectionCopy } from '../../src/ui/copy/rejections';
import { emptyValidationContext } from '../support/validationContext';
import { REPO_ROOT } from '../support/sourceTree';

/**
 * INV-50 — Prompt injection cannot widen behaviour (§12, §7.4).
 */

const ADVERSARIAL_DIR = join(REPO_ROOT, 'tests/fixtures/adversarial');

const EXPECTED_CHECK: Record<string, string> = {
  'unlisted-operation.json': 'schema',
  'expression-string-rule.json': 'determinism',
  'executable-code.json': 'determinism',
  'network-capability.json': 'arbitrary_network',
  'self-approval.json': 'schema',
  'full-ledger-echo.json': 'schema',
};

function mutationSubject(raw: unknown): unknown {
  if (raw !== null && typeof raw === 'object' && 'mutation' in raw) {
    return (raw as { mutation: unknown }).mutation;
  }
  return raw;
}

function rejectionOf(raw: unknown): { readonly check: string } {
  const policy = evaluatePolicy(inspectPolicySubject(raw));
  const validation = validateCandidate(mutationSubject(raw), emptyValidationContext());
  const moveOk = TeachingMove.safeParse(raw).success;
  const mutationOk = CandidateMutation.safeParse(mutationSubject(raw)).success;

  if (policy.ok === false && policy.boundary !== 'unenumerated') {
    return { check: policy.boundary };
  }
  if (validation.ok === false) {
    const determinism = validation.reasons.find((reason) => reason.check === 'determinism');
    const first = determinism ?? validation.reasons[0];
    return { check: first?.check ?? 'schema' };
  }
  if (!moveOk && !mutationOk) {
    return { check: 'schema' };
  }
  if (policy.ok === false) {
    return { check: policy.boundary };
  }
  throw new Error('adversarial fixture was not rejected');
}

describe('INV-50 — prompt injection cannot widen behaviour (§12, §7.4)', () => {
  const files = readdirSync(ADVERSARIAL_DIR).filter((name) => name.endsWith('.json'));

  it('INV-50: the adversarial fixture set is the named injection cases', () => {
    expect(files.sort()).toEqual(Object.keys(EXPECTED_CHECK).sort());
  });

  for (const name of Object.keys(EXPECTED_CHECK)) {
    it(`INV-50: ${name} is rejected by ${EXPECTED_CHECK[name]}`, () => {
      const raw: unknown = JSON.parse(readFileSync(join(ADVERSARIAL_DIR, name), 'utf8'));
      const rejected = rejectionOf(raw);
      expect(rejected.check).toBe(EXPECTED_CHECK[name]);

      if (rejected.check === 'arbitrary_network') {
        expect(policyRejectionCopy('arbitrary_network', 'developing').length).toBeGreaterThan(0);
      } else {
        expect(
          validationRejectionCopy(
            rejected.check as 'schema' | 'determinism',
            'developing',
          ).length,
        ).toBeGreaterThan(0);
      }
    });
  }
});
