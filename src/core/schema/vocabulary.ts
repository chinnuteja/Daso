import { z } from 'zod';

import { EventId, RuleId } from './primitives';

/**
 * The closed vocabularies. Everything a child can teach Flight Lab is expressed by choosing
 * members of these enumerations; nothing is expressed by writing a string that some later
 * stage has to parse or evaluate. Widening any of these is a specification change, not an
 * implementation detail (engineering plan rulings R4 and R6).
 */

/** Ruling R6: exactly one member. A second member would make this an app generator. */
export const ToolKind = z.enum(['experiment_comparator']);
export type ToolKind = z.infer<typeof ToolKind>;

/** The comparisons Flight Lab supports, per the section 9.3 example. */
export const MetricId = z.enum(['median_distance', 'consistency']);
export type MetricId = z.infer<typeof MetricId>;

/** The fields a Flight Lab trial can carry, per section 6 scene 3. */
export const InputField = z.enum(['design_name', 'distance_m', 'obstruction', 'note']);
export type InputField = z.infer<typeof InputField>;

/** Who authored a ledger entry. There is no third actor that can author behaviour. */
export const Actor = z.enum(['child', 'ai']);
export type Actor = z.infer<typeof Actor>;

/**
 * Why an authorship entry exists. Section 10's internal authorship summary counts exactly
 * these kinds: child-defined decisions, AI suggestions, and child corrections.
 */
export const AuthorshipEventType = z.enum([
  'definition_decision',
  'ai_suggestion',
  'rule_correction',
]);
export type AuthorshipEventType = z.infer<typeof AuthorshipEventType>;

export const ReadingBand = z.enum(['emerging', 'developing', 'fluent']);
export type ReadingBand = z.infer<typeof ReadingBand>;

export const InputPreference = z.enum(['voice', 'touch', 'text']);
export type InputPreference = z.infer<typeof InputPreference>;

/** Sensor capabilities are foreground-only by name, so a background variant is unnameable. */
export const Capability = z.enum(['camera_foreground_capture', 'microphone_foreground_capture']);
export type Capability = z.infer<typeof Capability>;

export const PermissionScope = z.enum(['current_experiment', 'current_session']);
export type PermissionScope = z.infer<typeof PermissionScope>;

export const PermissionApprover = z.enum(['parent_or_device_policy', 'device_policy']);
export type PermissionApprover = z.infer<typeof PermissionApprover>;

/**
 * A rule condition compares one declared input field to one literal value. There is no
 * operator field and no expression string: equality is the entire supported comparison.
 */
export const RuleConditionValue = z.union([z.boolean(), z.string(), z.number()]);
export type RuleConditionValue = z.infer<typeof RuleConditionValue>;

export const RuleCondition = z.strictObject({
  field: InputField,
  equals: RuleConditionValue,
});
export type RuleCondition = z.infer<typeof RuleCondition>;

/** The only effect a taught rule may have is to mark a trial invalid (section 4.3). */
export const RuleEffect = z.strictObject({
  set: z.literal('trial.valid'),
  value: z.boolean(),
});
export type RuleEffect = z.infer<typeof RuleEffect>;

/**
 * A rule as it appears inside a compiled tool version. `sourceEventId` is not authored by
 * anyone: the fold stamps it from the approved candidate entry that introduced the rule.
 */
export const ToolRule = z.strictObject({
  ruleId: RuleId,
  when: RuleCondition,
  effect: RuleEffect,
  sourceEventId: EventId,
});
export type ToolRule = z.infer<typeof ToolRule>;
