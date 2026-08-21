import {
  ORCHESTRATOR_EVENT_KINDS,
  type OrchestratorEvent,
  type OrchestratorEventKind,
  type OrchestratorIntent,
} from './events';
import { type OrchestratorState } from './states';

export type TransitionResult =
  | { readonly kind: 'ignored' }
  | {
      readonly kind: 'advanced';
      readonly next: OrchestratorState;
      readonly intents: readonly OrchestratorIntent[];
    };

const IGNORED: TransitionResult = { kind: 'ignored' };

function advance(
  next: OrchestratorState,
  intents: readonly OrchestratorIntent[] = [],
): TransitionResult {
  return { kind: 'advanced', next, intents };
}

function row(
  overrides: Partial<Record<OrchestratorEventKind, TransitionResult>>,
): Record<OrchestratorEventKind, TransitionResult> {
  const result = {} as Record<OrchestratorEventKind, TransitionResult>;
  for (const kind of ORCHESTRATOR_EVENT_KINDS) {
    result[kind] = overrides[kind] ?? IGNORED;
  }
  return result;
}

/**
 * Total transition table: every state × event pair has a cell. A pair that is not a
 * legal advance is `{ kind: 'ignored' }`, never a thrown error and never a fall-through.
 *
 * The machine emits intents and performs none of them. Composition executes intents
 * against repositories; this module cannot.
 */
const TABLE: Record<OrchestratorState, Record<OrchestratorEventKind, TransitionResult>> = {
  IMAGINE: row({
    goal_stated: advance('DEFINE_METRICS', ['request_interpretation']),
  }),
  DEFINE_METRICS: row({
    metric_selected: advance('DEFINE_METRICS', ['append_candidate']),
    candidate_offered: advance('DEFINE_METRICS', ['append_candidate']),
    candidate_approved: advance('DEFINE_METRICS', ['append_approval']),
    candidate_rejected: advance('DEFINE_METRICS'),
    metrics_confirmed: advance('DEFINE_INPUTS', ['request_interpretation']),
    back_requested: advance('IMAGINE'),
  }),
  DEFINE_INPUTS: row({
    input_selected: advance('DEFINE_INPUTS', ['append_candidate']),
    candidate_offered: advance('DEFINE_INPUTS', ['append_candidate']),
    candidate_approved: advance('DEFINE_INPUTS', ['append_approval']),
    candidate_rejected: advance('DEFINE_INPUTS'),
    inputs_confirmed: advance('PREDICT', ['request_compile']),
    back_requested: advance('DEFINE_METRICS'),
  }),
  PREDICT: row({
    prediction_recorded: advance('COLLECT_TRIALS'),
    back_requested: advance('DEFINE_INPUTS'),
  }),
  COLLECT_TRIALS: row({
    trial_recorded: advance('COLLECT_TRIALS', ['record_trial']),
    collection_finished: advance('INSPECT_ANOMALY'),
    back_requested: advance('PREDICT'),
  }),
  INSPECT_ANOMALY: row({
    anomaly_selected: advance('PROPOSE_CORRECTION', ['request_interpretation']),
    back_requested: advance('COLLECT_TRIALS'),
  }),
  PROPOSE_CORRECTION: row({
    correction_explained: advance('PROPOSE_CORRECTION', ['request_interpretation']),
    candidate_offered: advance('REVIEW_MUTATION', ['append_candidate']),
    candidate_rejected: advance('PROPOSE_CORRECTION'),
    back_requested: advance('INSPECT_ANOMALY'),
  }),
  REVIEW_MUTATION: row({
    candidate_approved: advance('COMPILE', ['append_approval', 'request_compile']),
    candidate_rejected: advance('PROPOSE_CORRECTION'),
    back_requested: advance('PROPOSE_CORRECTION'),
  }),
  COMPILE: row({
    compile_acknowledged: advance('COMPILE'),
    runner_opened: advance('RUN', ['open_runner']),
  }),
  RUN: row({
    back_requested: advance('COMPILE'),
  }),
};

export function transition(state: OrchestratorState, event: OrchestratorEvent): TransitionResult {
  return TABLE[state][event.kind] ?? IGNORED;
}
