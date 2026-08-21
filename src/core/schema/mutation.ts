import { z } from 'zod';

import { RuleId } from './primitives';
import { InputField, MetricId, RuleCondition, RuleEffect } from './vocabulary';

/**
 * The candidate mutation vocabulary: the complete set of changes anyone — child or AI — may
 * propose to a tool definition. Parsing is the only gate; an operation outside this list has
 * no representation at all, so it cannot be smuggled through as data.
 */

export const MUTATION_OPERATIONS = [
  'add_input',
  'add_metric',
  'remove_metric',
  'add_rule',
  'remove_rule',
] as const;

/**
 * A rule as it is *proposed*. Deliberately missing `sourceEventId`: provenance is a
 * consequence of the fold over approved events, never a value the proposer supplies.
 */
export const RuleDraft = z.strictObject({
  ruleId: RuleId,
  when: RuleCondition,
  effect: RuleEffect,
});
export type RuleDraft = z.infer<typeof RuleDraft>;

/**
 * The structured form written to the ledger. `add_rule` carries the whole rule structure,
 * because a compiled version has to be reconstructible from approved events alone.
 */
export const CandidateMutation = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('add_input'), input: InputField }),
  z.strictObject({ operation: z.literal('add_metric'), metric: MetricId }),
  z.strictObject({ operation: z.literal('remove_metric'), metric: MetricId }),
  z.strictObject({ operation: z.literal('add_rule'), rule: RuleDraft }),
  z.strictObject({ operation: z.literal('remove_rule'), ruleId: RuleId }),
]);
export type CandidateMutation = z.infer<typeof CandidateMutation>;

/**
 * The documented form, as printed in specification section 9.4, where a rule appears as a
 * reference rather than a structure. This is the read/export projection of the structured
 * form above; `toDocumentedMutation` is the only way to obtain one.
 */
export const DocumentedMutation = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('add_input'), input: InputField }),
  z.strictObject({ operation: z.literal('add_metric'), metric: MetricId }),
  z.strictObject({ operation: z.literal('remove_metric'), metric: MetricId }),
  z.strictObject({ operation: z.literal('add_rule'), rule: RuleId }),
  z.strictObject({ operation: z.literal('remove_rule'), rule: RuleId }),
]);
export type DocumentedMutation = z.infer<typeof DocumentedMutation>;

export function toDocumentedMutation(mutation: CandidateMutation): DocumentedMutation {
  switch (mutation.operation) {
    case 'add_input':
      return { operation: 'add_input', input: mutation.input };
    case 'add_metric':
      return { operation: 'add_metric', metric: mutation.metric };
    case 'remove_metric':
      return { operation: 'remove_metric', metric: mutation.metric };
    case 'add_rule':
      return { operation: 'add_rule', rule: mutation.rule.ruleId };
    case 'remove_rule':
      return { operation: 'remove_rule', rule: mutation.ruleId };
    default:
      return assertExhaustive(mutation);
  }
}

/**
 * Compile-time proof that every member of the closed operation set is handled. Adding an
 * operation without handling it here is a type error, not a runtime surprise.
 */
function assertExhaustive(value: never): never {
  throw new Error(`unhandled candidate mutation operation: ${JSON.stringify(value)}`);
}
