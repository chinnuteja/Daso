import { createScriptedTeachingSource } from '../../src/adapters/teaching/scripted';
import { createMemoryPersistence } from '../../src/adapters/persistence';
import { transition, type OrchestratorEvent, type OrchestratorState } from '../../src/core/orchestrator';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import type { Repositories } from '../../src/core/ports/repositories';
import { ChildProfile } from '../../src/core/schema/childProfile';
import type { EventId } from '../../src/core/schema/primitives';
import type { ToolVersionBody } from '../../src/core/schema/toolVersion';
import { executeIntents, type CandidateDraft, type TrialDraft } from '../../src/ui/flows/executeIntents';
import childProfileJson from '../fixtures/spec/childProfile.json';
import {
  BAD_DISTANCE_RULE_SUGGESTION,
  BAD_METRIC_REMOVAL_SUGGESTION,
  CONSISTENCY_SUGGESTION,
  DESIGN_NAME_INPUT,
  DISTANCE_INPUT,
  DISTANCE_METRIC_INPUT,
  EXCLUDE_OBSTRUCTED_MUTATION,
  FLIGHT_LAB_CORRECTION,
  FLIGHT_LAB_GOAL,
  FLIGHT_LAB_TEACHING_SCRIPT,
  FLIGHT_LAB_TOOL_ID,
  FLIGHT_LAB_TRIAL_DRAFTS,
  NOTE_INPUT,
  OBSTRUCTION_SUGGESTION,
} from '../fixtures/script/flightLab';

export interface ScriptedJourneyResult {
  readonly state: OrchestratorState;
  readonly repositories: Repositories;
  readonly compiledBody: ToolVersionBody | null;
  readonly teachingInvoked: number;
}

interface DispatchContext {
  readonly candidate?: CandidateDraft;
  readonly trial?: TrialDraft;
}

const TOOL_DRAFT = {
  ownerChildId: 'child_local_01' as const,
  displayName: "Maya's Flight Lab",
};

async function dispatch(
  state: OrchestratorState,
  event: OrchestratorEvent,
  pendingCandidateId: EventId | null,
  repositories: Repositories,
  ids: ReturnType<typeof createSequentialIdFactory>,
  clock: ReturnType<typeof createFixedClock>,
  context: DispatchContext = {},
): Promise<{
  readonly state: OrchestratorState;
  readonly pendingCandidateId: EventId | null;
  readonly compiledBody: ToolVersionBody | null;
  readonly interpretationRequested: boolean;
}> {
  const result = transition(state, event);
  if (result.kind === 'ignored') {
    return {
      state,
      pendingCandidateId,
      compiledBody: null,
      interpretationRequested: false,
    };
  }

  const executed = await executeIntents({
    intents: result.intents,
    repositories,
    ids,
    clock,
    toolId: FLIGHT_LAB_TOOL_ID,
    pendingCandidateId,
    candidate: context.candidate,
    trial: context.trial,
    toolDraft: TOOL_DRAFT,
  });

  return {
    state: result.next,
    pendingCandidateId: executed.pendingCandidateId,
    compiledBody: executed.compiledBody,
    interpretationRequested: result.intents.includes('request_interpretation'),
  };
}

export async function runScriptedFlightLabJourney(options: {
  readonly approveCorrection: boolean;
  readonly repositories?: Repositories;
  readonly ids?: ReturnType<typeof createSequentialIdFactory>;
  readonly clock?: ReturnType<typeof createFixedClock>;
}): Promise<ScriptedJourneyResult> {
  const repositories = options.repositories ?? createMemoryPersistence().repositories;
  const ids = options.ids ?? createSequentialIdFactory();
  const clock = options.clock ?? createFixedClock('2026-08-18T10:13:00Z');
  const teaching = createScriptedTeachingSource(FLIGHT_LAB_TEACHING_SCRIPT);
  let teachingInvoked = 0;

  await repositories.profiles.save(ChildProfile.parse(childProfileJson));

  let state: OrchestratorState = 'IMAGINE';
  let pendingCandidateId: EventId | null = null;
  let compiledBody: ToolVersionBody | null = null;

  async function go(event: OrchestratorEvent, context: DispatchContext = {}): Promise<void> {
    const next = await dispatch(state, event, pendingCandidateId, repositories, ids, clock, context);
    state = next.state;
    pendingCandidateId = next.pendingCandidateId;
    if (next.compiledBody !== null) {
      compiledBody = next.compiledBody;
    }
    if (next.interpretationRequested) {
      teachingInvoked += 1;
      await teaching.interpret({ state, originalInput: FLIGHT_LAB_GOAL });
    }
  }

  await go({ kind: 'goal_stated' });

  await go(
    { kind: 'metric_selected' },
    {
      candidate: {
        actor: 'child',
        type: 'definition_decision',
        originalInput: DISTANCE_METRIC_INPUT,
        mutation: { operation: 'add_metric', metric: 'median_distance' },
      },
    },
  );
  await go({ kind: 'candidate_approved' });

  await go(
    { kind: 'candidate_offered' },
    {
      candidate: {
        actor: 'ai',
        type: 'ai_suggestion',
        originalInput: CONSISTENCY_SUGGESTION,
        mutation: { operation: 'add_metric', metric: 'consistency' },
      },
    },
  );
  await go({ kind: 'candidate_approved' });
  await go({ kind: 'metrics_confirmed' });

  await go(
    { kind: 'input_selected' },
    {
      candidate: {
        actor: 'child',
        type: 'definition_decision',
        originalInput: DESIGN_NAME_INPUT,
        mutation: { operation: 'add_input', input: 'design_name' },
      },
    },
  );
  await go({ kind: 'candidate_approved' });

  await go(
    { kind: 'input_selected' },
    {
      candidate: {
        actor: 'child',
        type: 'definition_decision',
        originalInput: DISTANCE_INPUT,
        mutation: { operation: 'add_input', input: 'distance_m' },
      },
    },
  );
  await go({ kind: 'candidate_approved' });

  await go(
    { kind: 'candidate_offered' },
    {
      candidate: {
        actor: 'ai',
        type: 'ai_suggestion',
        originalInput: OBSTRUCTION_SUGGESTION,
        mutation: { operation: 'add_input', input: 'obstruction' },
      },
    },
  );
  await go({ kind: 'candidate_approved' });

  await go(
    { kind: 'input_selected' },
    {
      candidate: {
        actor: 'child',
        type: 'definition_decision',
        originalInput: NOTE_INPUT,
        mutation: { operation: 'add_input', input: 'note' },
      },
    },
  );
  await go({ kind: 'candidate_rejected' });
  await go({ kind: 'inputs_confirmed' });

  await go({ kind: 'prediction_recorded' });

  for (const trial of FLIGHT_LAB_TRIAL_DRAFTS) {
    await go({ kind: 'trial_recorded' }, { trial });
  }
  await go({ kind: 'collection_finished' });
  await go({ kind: 'anomaly_selected' });

  await go(
    { kind: 'candidate_offered' },
    {
      candidate: {
        actor: 'ai',
        type: 'ai_suggestion',
        originalInput: BAD_DISTANCE_RULE_SUGGESTION,
        mutation: {
          operation: 'add_rule',
          rule: {
            ruleId: 'exclude_distance_8_9',
            when: { field: 'distance_m', equals: 8.9 },
            effect: { set: 'trial.valid', value: false },
          },
        },
      },
    },
  );
  await go({ kind: 'candidate_rejected' });

  await go(
    { kind: 'candidate_offered' },
    {
      candidate: {
        actor: 'ai',
        type: 'ai_suggestion',
        originalInput: BAD_METRIC_REMOVAL_SUGGESTION,
        mutation: { operation: 'remove_metric', metric: 'median_distance' },
      },
    },
  );
  await go({ kind: 'candidate_rejected' });

  await go({ kind: 'correction_explained' });

  await go(
    { kind: 'candidate_offered' },
    {
      candidate: {
        actor: 'child',
        type: 'rule_correction',
        originalInput: FLIGHT_LAB_CORRECTION,
        mutation: EXCLUDE_OBSTRUCTED_MUTATION,
      },
    },
  );

  if (options.approveCorrection) {
    await go({ kind: 'candidate_approved' });
    await go({ kind: 'compile_acknowledged' });
    await go({ kind: 'runner_opened' });
  } else {
    await go({ kind: 'candidate_rejected' });
  }

  return { state, repositories, compiledBody, teachingInvoked };
}
