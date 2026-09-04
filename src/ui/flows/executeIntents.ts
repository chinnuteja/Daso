import type { Clock } from '../../core/ports/clock';
import type { IdFactory } from '../../core/ports/ids';
import type { Repositories } from '../../core/ports/repositories';
import type { OrchestratorIntent } from '../../core/orchestrator/events';
import { bodyFromVersion, compileToolVersion, shouldReuseActiveVersion } from '../../core/compiler';
import { foldApprovedEvents } from '../../core/ledger/fold';
import type { LedgerEntry } from '../../core/ledger/types';
import { evaluatePolicy, inspectPolicySubject, type PolicyVerdict } from '../../core/policy';
import { replay, type RuntimeResult } from '../../core/runtime';
import { ExperimentTrial } from '../../core/schema/experimentTrial';
import {
  ActiveVersionCaptureError,
  captureTrialUnderActiveVersion,
} from './runner/captureTrial';
import type { CandidateMutation } from '../../core/schema/mutation';
import {
  EventId,
  type ChildId,
  type IsoTimestamp,
  type ToolId,
  ToolVersionId,
} from '../../core/schema/primitives';
import { ToolDefinition } from '../../core/schema/toolDefinition';
import type { ToolVersion, ToolVersionBody } from '../../core/schema/toolVersion';
import type { Actor, AuthorshipEventType } from '../../core/schema/vocabulary';
import {
  validateCandidate,
  type ValidationContext,
  type ValidationVerdict,
} from '../../core/validator';

/**
 * Composition-layer execution of orchestrator intents. The orchestrator itself never
 * calls this; it only names the intents.
 *
 * `request_compile` compiles, atomically saves, and activates a version when the folded
 * body is new. Unchanged ledgers reuse the active version with no write.
 */

export class IntentExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntentExecutionError';
  }
}

export interface CandidateDraft {
  readonly mutation: CandidateMutation;
  readonly originalInput: string;
  readonly actor: Actor;
  readonly type: AuthorshipEventType;
}

export interface TrialDraft {
  readonly toolId: ToolId;
  readonly designName: string;
  readonly distanceM?: number;
  readonly loadCount?: number;
  readonly obstruction: boolean;
  readonly setupChanged?: boolean;
  readonly validAtCapture: boolean;
  readonly note?: string;
}

export interface ToolDraft {
  readonly ownerChildId: ChildId;
  readonly displayName: string;
}

export interface IntentExecutionInput {
  readonly intents: readonly OrchestratorIntent[];
  readonly repositories: Repositories;
  readonly ids: IdFactory;
  readonly clock: Clock;
  readonly toolId: ToolId;
  readonly pendingCandidateId: EventId | null;
  readonly candidate?: CandidateDraft;
  readonly trial?: TrialDraft;
  readonly toolDraft?: ToolDraft;
}

export interface IntentExecutionOutput {
  readonly pendingCandidateId: EventId | null;
  readonly compiledBody: ToolVersionBody | null;
  readonly compiledVersion: ToolVersion | null;
  readonly runtimeResult: RuntimeResult | null;
  readonly previousRuntimeResult: RuntimeResult | null;
  readonly recordedTrial: ExperimentTrial | null;
  readonly rejection: GateRejection | null;
}

export type GateRejection =
  | { readonly kind: 'validation'; readonly verdict: Extract<ValidationVerdict, { ok: false }> }
  | { readonly kind: 'policy'; readonly verdict: Extract<PolicyVerdict, { ok: false }> };

export async function executeIntents(input: IntentExecutionInput): Promise<IntentExecutionOutput> {
  let pendingCandidateId = input.pendingCandidateId;
  let compiledBody: ToolVersionBody | null = null;
  let compiledVersion: ToolVersion | null = null;
  let runtimeResult: RuntimeResult | null = null;
  let previousRuntimeResult: RuntimeResult | null = null;
  let recordedTrial: ExperimentTrial | null = null;
  let rejection: GateRejection | null = null;

  for (const intent of input.intents) {
    switch (intent) {
      case 'append_candidate': {
        if (input.candidate === undefined) {
          throw new IntentExecutionError('append_candidate requires a structured candidate draft');
        }
        const existing = await input.repositories.ledger.listByTool(input.toolId);
        const grants = await input.repositories.grants.listByTool(input.toolId);
        const context = validationContextFor(
          input.toolId,
          input.clock.now(),
          existing,
          grants,
          input.pendingCandidateId === null ? 0 : 1,
        );
        const validation = validateCandidate(input.candidate.mutation, context);
        if (validation.ok === false) {
          rejection = { kind: 'validation', verdict: validation };
          break;
        }
        const policy = evaluatePolicy(inspectPolicySubject(input.candidate.mutation));
        if (policy.ok === false) {
          rejection = { kind: 'policy', verdict: policy };
          break;
        }
        const eventId = EventId.parse(input.ids.next('event'));
        const entry: LedgerEntry = {
          entryKind: 'candidate',
          eventId,
          sequence: existing.length + 1,
          toolId: input.toolId,
          actor: input.candidate.actor,
          type: input.candidate.type,
          originalInput: input.candidate.originalInput,
          candidateMutation: input.candidate.mutation,
          createdAt: input.clock.now(),
        };
        await input.repositories.ledger.append(entry);
        pendingCandidateId = eventId;
        break;
      }
      case 'append_approval': {
        if (pendingCandidateId === null) {
          throw new IntentExecutionError('append_approval requires a pending candidate id');
        }
        const existing = await input.repositories.ledger.listByTool(input.toolId);
        const entry: LedgerEntry = {
          entryKind: 'approval',
          eventId: EventId.parse(input.ids.next('event')),
          sequence: existing.length + 1,
          toolId: input.toolId,
          actor: 'child',
          approves: pendingCandidateId,
          createdAt: input.clock.now(),
        };
        await input.repositories.ledger.append(entry);
        break;
      }
      case 'record_trial': {
        recordedTrial = await recordResolvedTrial(input);
        break;
      }
      case 'request_compile': {
        const compiled = await compileAndActivate(input);
        compiledVersion = compiled.version;
        compiledBody = bodyFromVersion(compiled.version);
        runtimeResult = compiled.runtime;
        previousRuntimeResult = compiled.previous;
        break;
      }
      case 'request_interpretation':
      case 'open_runner':
        break;
      default: {
        const exhaustive: never = intent;
        throw new IntentExecutionError(`unhandled intent: ${String(exhaustive)}`);
      }
    }
  }

  return {
    pendingCandidateId,
    compiledBody,
    compiledVersion,
    runtimeResult,
    previousRuntimeResult,
    recordedTrial,
    rejection,
  };
}

async function recordResolvedTrial(input: IntentExecutionInput): Promise<ExperimentTrial> {
  if (input.trial === undefined) {
    throw new IntentExecutionError('record_trial requires a structured trial draft');
  }
  try {
    return await captureTrialUnderActiveVersion({
      repositories: input.repositories,
      ids: input.ids,
      clock: input.clock,
      trial: input.trial,
    });
  } catch (error) {
    if (error instanceof ActiveVersionCaptureError) {
      throw new IntentExecutionError(error.message);
    }
    throw error;
  }
}

async function compileAndActivate(input: IntentExecutionInput): Promise<{
  readonly version: ToolVersion;
  readonly runtime: RuntimeResult;
  readonly previous: RuntimeResult | null;
}> {
  const entries = await input.repositories.ledger.listByTool(input.toolId);
  const folded = foldApprovedEvents(entries);
  const definition = await input.repositories.tools.get(input.toolId);
  const active =
    definition === null ? null : await input.repositories.versions.get(definition.currentVersionId);

  if (active !== null && active.toolId !== input.toolId) {
    throw new IntentExecutionError('active version belongs to a different tool');
  }

  const trials = await input.repositories.trials.listByTool(input.toolId);
  if (shouldReuseActiveVersion(folded, active) && active !== null) {
    return { version: active, runtime: replay(active, trials), previous: null };
  }

  const versionId = ToolVersionId.parse(input.ids.next('tool_version'));
  const compiledAt = input.clock.now();
  const compiled = compileToolVersion(entries, { versionId, compiledAt });
  const nextDefinition = nextToolDefinition(input, definition, compiled.versionId, compiledAt);
  const previous = active === null ? null : replay(active, trials);
  await input.repositories.versions.saveAndActivate(compiled, nextDefinition);
  return { version: compiled, runtime: replay(compiled, trials), previous };
}

function nextToolDefinition(
  input: IntentExecutionInput,
  existing: ToolDefinition | null,
  versionId: ToolVersion['versionId'],
  compiledAt: IsoTimestamp,
): ToolDefinition {
  if (existing !== null) {
    return ToolDefinition.parse({
      ...existing,
      currentVersionId: versionId,
    });
  }
  if (input.toolDraft === undefined) {
    throw new IntentExecutionError('first compilation requires a tool draft');
  }
  return ToolDefinition.parse({
    toolId: input.toolId,
    ownerChildId: input.toolDraft.ownerChildId,
    displayName: input.toolDraft.displayName,
    kind: 'experiment_comparator',
    currentVersionId: versionId,
    createdAt: compiledAt,
  });
}

function validationContextFor(
  toolId: ToolId,
  now: IsoTimestamp,
  existing: readonly LedgerEntry[],
  grants: ValidationContext['grants'],
  pendingCandidates: number,
): ValidationContext {
  const knownEventIds = new Set(existing.map((entry) => entry.eventId));
  if (existing.length === 0) {
    return {
      toolId,
      now,
      existingInputs: [],
      existingMetrics: [],
      existingRules: [],
      pendingCandidates,
      knownEventIds,
      grants,
    };
  }
  const body = foldApprovedEvents(existing);
  return {
    toolId,
    now,
    existingInputs: body.inputs,
    existingMetrics: body.metrics,
    existingRules: body.rules.map((rule) => rule.ruleId),
    pendingCandidates,
    knownEventIds,
    grants,
  };
}
