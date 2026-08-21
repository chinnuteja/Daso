/**
 * Closed event vocabulary for the teaching orchestrator. An event outside this list
 * has no representation and cannot be dispatched.
 */
export const ORCHESTRATOR_EVENT_KINDS = [
  'goal_stated',
  'metric_selected',
  'metrics_confirmed',
  'input_selected',
  'inputs_confirmed',
  'prediction_recorded',
  'trial_recorded',
  'collection_finished',
  'anomaly_selected',
  'correction_explained',
  'candidate_offered',
  'candidate_approved',
  'candidate_rejected',
  'compile_acknowledged',
  'runner_opened',
  'back_requested',
] as const;

export type OrchestratorEventKind = (typeof ORCHESTRATOR_EVENT_KINDS)[number];

export type OrchestratorEvent = { readonly kind: OrchestratorEventKind };

export const ORCHESTRATOR_INTENTS = [
  'request_interpretation',
  'record_trial',
  'append_candidate',
  'append_approval',
  'request_compile',
  'open_runner',
] as const;

export type OrchestratorIntent = (typeof ORCHESTRATOR_INTENTS)[number];
