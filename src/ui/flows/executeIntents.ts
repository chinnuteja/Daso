import type { Clock } from '../../core/ports/clock';
import type { IdFactory } from '../../core/ports/ids';
import type { Repositories } from '../../core/ports/repositories';
import type { OrchestratorIntent } from '../../core/orchestrator/events';
import { foldApprovedEvents } from '../../core/ledger/fold';
import type { LedgerEntry } from '../../core/ledger/types';
import { evaluatePolicy, inspectPolicySubject, type PolicyVerdict } from '../../core/policy';
import { ExperimentTrial } from '../../core/schema/experimentTrial';
import type { CandidateMutation } from '../../core/schema/mutation';
import { EventId, type IsoTimestamp, type ToolId, type ToolVersionId } from '../../core/schema/primitives';
import type { ToolVersionBody } from '../../core/schema/toolVersion';
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
 * `request_compile` folds the ledger and returns the body. It does not write a version.
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
  readonly toolVersionIdAtCapture: ToolVersionId;
  readonly designName: string;
  readonly distanceM: number;
  readonly obstruction: boolean;
  readonly validAtCapture: boolean;
  readonly note?: string;
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
}

export interface IntentExecutionOutput {
  readonly pendingCandidateId: EventId | null;
  readonly compiledBody: ToolVersionBody | null;
  readonly recordedTrial: ExperimentTrial | null;
  readonly rejection: GateRejection | null;
}

export type GateRejection =
  | { readonly kind: 'validation'; readonly verdict: Extract<ValidationVerdict, { ok: false }> }
  | { readonly kind: 'policy'; readonly verdict: Extract<PolicyVerdict, { ok: false }> };

export async function executeIntents(input: IntentExecutionInput): Promise<IntentExecutionOutput> {
  let pendingCandidateId = input.pendingCandidateId;
  let compiledBody: ToolVersionBody | null = null;
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
        if (input.trial === undefined) {
          throw new IntentExecutionError('record_trial requires a trial draft');
        }
        const trial = ExperimentTrial.parse({
          trialId: input.ids.next('trial'),
          toolId: input.trial.toolId,
          toolVersionIdAtCapture: input.trial.toolVersionIdAtCapture,
          designName: input.trial.designName,
          distanceM: input.trial.distanceM,
          obstruction: input.trial.obstruction,
          validAtCapture: input.trial.validAtCapture,
          validUnderCurrentVersion: input.trial.validAtCapture,
          createdAt: input.clock.now(),
          ...(input.trial.note === undefined ? {} : { note: input.trial.note }),
        });
        await input.repositories.trials.save(trial);
        recordedTrial = trial;
        break;
      }
      case 'request_compile': {
        const entries = await input.repositories.ledger.listByTool(input.toolId);
        compiledBody = foldApprovedEvents(entries);
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

  return { pendingCandidateId, compiledBody, recordedTrial, rejection };
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
