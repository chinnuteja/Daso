import { CandidateMutation, MUTATION_OPERATIONS } from '../schema/mutation';
import type { PermissionGrant } from '../schema/permissionGrant';
import { EventId, type IsoTimestamp, type ToolId } from '../schema/primitives';
import { Capability, InputField, MetricId } from '../schema/vocabulary';
import { canonicalJson } from '../serialization/canonicalJson';
import { RESOURCE_LIMITS, type ResourceLimitName } from './limits';
import { carriesPreStampedProvenance, namedSourceEventIds } from './provenance';

export const VALIDATION_CHECKS = [
  'schema',
  'capabilities',
  'types',
  'limits',
  'provenance',
  'determinism',
] as const;

export type ValidationCheck = (typeof VALIDATION_CHECKS)[number];

export interface ValidationReason {
  readonly check: ValidationCheck;
  readonly detail: string;
  readonly limit?: ResourceLimitName;
}

export type ValidationVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reasons: readonly ValidationReason[] };

export interface ValidationContext {
  readonly toolId: ToolId;
  readonly now: IsoTimestamp;
  readonly existingInputs: readonly string[];
  readonly existingMetrics: readonly string[];
  readonly existingRules: readonly string[];
  readonly pendingCandidates: number;
  readonly knownEventIds: ReadonlySet<string>;
  readonly grants: readonly PermissionGrant[];
}

const OPERATION_SET = new Set<string>(MUTATION_OPERATIONS);

export function validateCandidate(input: unknown, context: ValidationContext): ValidationVerdict {
  const reasons: ValidationReason[] = [];
  const schema = checkSchema(input);
  if (schema !== null) {
    reasons.push(schema);
  }
  const capabilities = checkCapabilities(input, context);
  if (capabilities !== null) {
    reasons.push(capabilities);
  }
  const types = checkTypes(input);
  if (types !== null) {
    reasons.push(types);
  }
  const limits = checkLimits(input, context);
  if (limits !== null) {
    reasons.push(limits);
  }
  const provenance = checkProvenance(input, context);
  if (provenance !== null) {
    reasons.push(provenance);
  }
  const determinism = checkDeterminism(input);
  if (determinism !== null) {
    reasons.push(determinism);
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }
  return { ok: true };
}

function checkSchema(input: unknown): ValidationReason | null {
  const parsed = CandidateMutation.safeParse(input);
  if (parsed.success) {
    return null;
  }
  const operation =
    input !== null && typeof input === 'object' && 'operation' in input
      ? (input as { operation?: unknown }).operation
      : undefined;
  if (typeof operation === 'string' && !OPERATION_SET.has(operation)) {
    return { check: 'schema', detail: `operation ${operation} is outside the closed set` };
  }
  return { check: 'schema', detail: 'candidate does not match the supported tool schema' };
}

function checkCapabilities(input: unknown, context: ValidationContext): ValidationReason | null {
  const named = namedCapabilities(input);
  for (const capability of named) {
    const grant = context.grants.find(
      (candidate) =>
        candidate.capability === capability &&
        candidate.toolId === context.toolId &&
        candidate.expiresAt > context.now,
    );
    if (grant === undefined) {
      return {
        check: 'capabilities',
        detail: `capability ${capability} has no in-scope permission grant`,
      };
    }
  }
  return null;
}

function checkTypes(input: unknown): ValidationReason | null {
  if (input === null || typeof input !== 'object') {
    return { check: 'types', detail: 'candidate is not an object' };
  }
  const record = input as Readonly<Record<string, unknown>>;
  if (record.operation === 'add_rule') {
    const rule = record.rule;
    if (rule === null || typeof rule !== 'object') {
      return { check: 'types', detail: 'add_rule is missing a rule object' };
    }
    const when = (rule as Readonly<Record<string, unknown>>).when;
    const effect = (rule as Readonly<Record<string, unknown>>).effect;
    if (when !== null && typeof when === 'object' && 'field' in when) {
      const field = (when as Readonly<Record<string, unknown>>).field;
      if (typeof field !== 'string' || !InputField.options.includes(field as InputField)) {
        return { check: 'types', detail: 'rule condition field is outside InputField' };
      }
    }
    if (effect !== null && typeof effect === 'object' && 'set' in effect) {
      const target = (effect as Readonly<Record<string, unknown>>).set;
      if (target !== 'trial.valid') {
        return { check: 'types', detail: 'rule effect target is not trial.valid' };
      }
    }
  }
  if (record.operation === 'add_input' && typeof record.input === 'string') {
    if (!InputField.options.includes(record.input as InputField)) {
      return { check: 'types', detail: 'input is outside InputField' };
    }
  }
  if (
    (record.operation === 'add_metric' || record.operation === 'remove_metric') &&
    typeof record.metric === 'string'
  ) {
    if (!MetricId.options.includes(record.metric as MetricId)) {
      return { check: 'types', detail: 'metric is outside MetricId' };
    }
  }
  return null;
}

function checkLimits(input: unknown, context: ValidationContext): ValidationReason | null {
  const encoded = encodeCandidate(input);
  if (encoded.length > RESOURCE_LIMITS.maxCandidateChars) {
    return {
      check: 'limits',
      detail: 'candidate exceeds maxCandidateChars',
      limit: 'maxCandidateChars',
    };
  }
  if (context.pendingCandidates >= RESOURCE_LIMITS.maxPendingCandidates) {
    return {
      check: 'limits',
      detail: 'pending candidates exceed maxPendingCandidates',
      limit: 'maxPendingCandidates',
    };
  }
  if (input === null || typeof input !== 'object') {
    return null;
  }
  const record = input as Readonly<Record<string, unknown>>;
  if (record.operation === 'add_input' && context.existingInputs.length >= RESOURCE_LIMITS.maxInputs) {
    return { check: 'limits', detail: 'inputs exceed maxInputs', limit: 'maxInputs' };
  }
  if (record.operation === 'add_metric' && context.existingMetrics.length >= RESOURCE_LIMITS.maxMetrics) {
    return { check: 'limits', detail: 'metrics exceed maxMetrics', limit: 'maxMetrics' };
  }
  if (record.operation === 'add_rule' && context.existingRules.length >= RESOURCE_LIMITS.maxRules) {
    return { check: 'limits', detail: 'rules exceed maxRules', limit: 'maxRules' };
  }
  return null;
}

function checkProvenance(input: unknown, context: ValidationContext): ValidationReason | null {
  if (carriesPreStampedProvenance(input)) {
    return {
      check: 'provenance',
      detail: 'sourceEventId is stamped by the fold and must not be supplied',
    };
  }
  for (const eventId of namedSourceEventIds(input)) {
    const parsed = EventId.safeParse(eventId);
    if (!parsed.success || !context.knownEventIds.has(parsed.data)) {
      return {
        check: 'provenance',
        detail: `named source event ${eventId} is absent from the stream`,
      };
    }
  }
  return null;
}

function checkDeterminism(input: unknown): ValidationReason | null {
  if (containsNonDeterministicValue(input)) {
    return {
      check: 'determinism',
      detail: 'candidate carries an expression, function, or non-finite number',
    };
  }
  try {
    canonicalJson(input);
  } catch {
    return {
      check: 'determinism',
      detail: 'candidate has no canonical JSON form',
    };
  }
  return null;
}

function namedCapabilities(input: unknown): readonly Capability[] {
  const found: Capability[] = [];
  collectCapabilities(input, found);
  return found;
}

function collectCapabilities(value: unknown, found: Capability[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectCapabilities(item, found);
    }
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  const record = value as Readonly<Record<string, unknown>>;
  const candidate = record.capability;
  if (typeof candidate === 'string' && Capability.options.includes(candidate as Capability)) {
    found.push(candidate as Capability);
  }
  for (const child of Object.values(record)) {
    collectCapabilities(child, found);
  }
}

function encodeCandidate(input: unknown): string {
  try {
    return canonicalJson(input);
  } catch {
    return JSON.stringify(input) ?? '';
  }
}

function containsNonDeterministicValue(value: unknown): boolean {
  if (typeof value === 'function') {
    return true;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return true;
  }
  if (typeof value === 'string' && /=>|function\s*\(|\beval\s*\(/u.test(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(containsNonDeterministicValue);
  }
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const record = value as Readonly<Record<string, unknown>>;
  if ('expr' in record || 'expression' in record || 'code' in record) {
    return true;
  }
  return Object.values(record).some(containsNonDeterministicValue);
}
