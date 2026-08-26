'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createRemoteTeachingSource } from '../../adapters/agents/teaching';
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
  FLIGHT_LAB_TOOL_ID,
  NOTE_INPUT,
  OBSTRUCTION_SUGGESTION,
  createScriptedTeachingSource,
} from '../../adapters/teaching/scripted';
import {
  loadIdCounters,
  openIndexedDbRepositories,
  saveIdCounters,
} from '../../adapters/persistence';
import { authorshipExplanation, type AuthorshipExplanationEntry } from '../../core/inspection';
import {
  transition,
  type OrchestratorEvent,
  type OrchestratorState,
} from '../../core/orchestrator';
import { createSequentialIdFactory, type IdFactory } from '../../core/ports/ids';
import type { Repositories } from '../../core/ports/repositories';
import type { TeachingMove, TeachingSource } from '../../core/ports/teaching';
import { ChildProfile } from '../../core/schema/childProfile';
import type { EventId } from '../../core/schema/primitives';
import type { ToolVersion } from '../../core/schema/toolVersion';
import type { ExperimentTrial } from '../../core/schema/experimentTrial';
import type { ReadingBand } from '../../core/schema/vocabulary';
import type { RuntimeResult } from '../../core/runtime';
import { ProgressRail } from '../components/ProgressRail';
import { policyRejectionCopy, validationRejectionCopy } from '../copy/rejections';
import { progressRailView, whyThisMatters } from '../copy/progressRail';
import { stateCopy } from '../copy/states';
import styles from '../screens/screens.module.css';
import { CaptureTrialScreen } from '../screens/CaptureTrialScreen';
import { CompilePreviewScreen } from '../screens/CompilePreviewScreen';
import { DefineInputsScreen } from '../screens/DefineInputsScreen';
import { DefineMetricsScreen } from '../screens/DefineMetricsScreen';
import { ImagineScreen } from '../screens/ImagineScreen';
import { InspectAnomalyScreen } from '../screens/InspectAnomalyScreen';
import { PredictScreen } from '../screens/PredictScreen';
import { ProposeCorrectionScreen } from '../screens/ProposeCorrectionScreen';
import { ReviewMutationScreen } from '../screens/ReviewMutationScreen';
import { createBrowserClock } from './browserClock';
import { executeIntents, type CandidateDraft, type TrialDraft } from './executeIntents';

const DESIGNS = ['Falcon', 'Dart', 'Glider'] as const;

const MAYA = ChildProfile.parse({
  childId: 'child_local_01',
  displayName: 'Maya',
  readingBand: 'developing',
  inputPreferences: ['voice', 'touch'],
  createdAt: '2026-08-18T10:00:00Z',
});

interface SessionHandle {
  repositories: Repositories;
  ids: IdFactory;
  saveCounters: () => Promise<void>;
}

/**
 * Composition of the frozen TeachingSource port. The remote client exists; the default
 * session stays scripted so the gate commands need no network.
 */
export function composeTeachingSource(mode: 'scripted' | 'remote' = 'scripted'): TeachingSource {
  return mode === 'remote' ? createRemoteTeachingSource() : createScriptedTeachingSource();
}

export function JourneyFlow() {
  const teachingRef = useRef<TeachingSource>(composeTeachingSource('scripted'));
  const sessionRef = useRef<SessionHandle | null>(null);
  const clock = useMemo(() => createBrowserClock(), []);
  const router = useRouter();

  const [state, setState] = useState<OrchestratorState>('IMAGINE');
  const [message, setMessage] = useState('Opening local store…');
  const [pendingCandidateId, setPendingCandidateId] = useState<EventId | null>(null);
  const [pendingSummary, setPendingSummary] = useState('');
  const [pendingSuggested, setPendingSuggested] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [trials, setTrials] = useState<readonly ExperimentTrial[]>([]);
  const [compiledVersion, setCompiledVersion] = useState<ToolVersion | null>(null);
  const [runtimeResult, setRuntimeResult] = useState<RuntimeResult | null>(null);
  const [previousRuntimeResult, setPreviousRuntimeResult] = useState<RuntimeResult | null>(null);
  const [explanation, setExplanation] = useState<readonly AuthorshipExplanationEntry[]>([]);
  const [readingBand, setReadingBand] = useState<ReadingBand>(MAYA.readingBand);
  const [childName, setChildName] = useState(MAYA.displayName);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [approvalRecorded, setApprovalRecorded] = useState(false);
  const [correctionExplained, setCorrectionExplained] = useState(false);

  const refresh = useCallback(async (repositories: Repositories) => {
    const stored = await repositories.trials.listByTool(FLIGHT_LAB_TOOL_ID);
    const entries = await repositories.ledger.listByTool(FLIGHT_LAB_TOOL_ID);
    setTrials(stored);
    if (entries.length > 0) {
      setExplanation(authorshipExplanation(entries));
    }
    const profile = await repositories.profiles.get(MAYA.childId);
    if (profile !== null) {
      setReadingBand(profile.readingBand);
      setChildName(profile.displayName);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { repositories, database } = await openIndexedDbRepositories();
      if (cancelled) {
        database.close();
        return;
      }
      const ids = createSequentialIdFactory(await loadIdCounters(database));
      sessionRef.current = {
        repositories,
        ids,
        saveCounters: () => saveIdCounters(database, ids.snapshot()),
      };
      const existing = await repositories.profiles.get(MAYA.childId);
      if (existing === null) {
        await repositories.profiles.save(MAYA);
      }
      await refresh(repositories);
      setMessage('Local store is ready.');
    })();
    return () => {
      cancelled = true;
    };
  }, [clock, refresh]);

  async function interpretIfNeeded(nextState: OrchestratorState, originalInput: string): Promise<void> {
    const move: TeachingMove = await teachingRef.current.interpret({
      state: nextState,
      originalInput,
    });
    if (move.kind === 'clarifying_question') {
      setQuestion(move.question);
    }
  }

  async function dispatch(
    event: OrchestratorEvent,
    context: { candidate?: CandidateDraft; trial?: TrialDraft; originalInput?: string } = {},
  ): Promise<void> {
    const session = sessionRef.current;
    if (session === undefined || session === null) {
      return;
    }
    const result = transition(state, event);
    if (result.kind === 'ignored') {
      return;
    }
    const executed = await executeIntents({
      intents: result.intents,
      repositories: session.repositories,
      ids: session.ids,
      clock,
      toolId: FLIGHT_LAB_TOOL_ID,
      pendingCandidateId,
      candidate: context.candidate,
      trial: context.trial,
      toolDraft: {
        ownerChildId: MAYA.childId,
        displayName: "Maya's Flight Lab",
      },
    });
    if (executed.rejection !== null) {
      const copy =
        executed.rejection.kind === 'validation'
          ? validationRejectionCopy(executed.rejection.verdict.reasons[0]?.check ?? 'schema', readingBand)
          : policyRejectionCopy(executed.rejection.verdict.boundary, readingBand);
      setRefusal(copy);
      await session.saveCounters();
      return;
    }
    setRefusal(null);
    await session.saveCounters();
    setApprovalRecorded(event.kind === 'candidate_approved');
    setState(result.next);
    setPendingCandidateId(executed.pendingCandidateId);
    if (executed.compiledVersion !== null) {
      setCompiledVersion(executed.compiledVersion);
      setRuntimeResult(executed.runtimeResult);
      setPreviousRuntimeResult(executed.previousRuntimeResult);
    }
    if (result.intents.includes('request_interpretation')) {
      await interpretIfNeeded(result.next, context.originalInput ?? FLIGHT_LAB_GOAL);
    }
    if (result.intents.includes('open_runner')) {
      router.push(`/run?tool=${FLIGHT_LAB_TOOL_ID}`);
    }
    await refresh(session.repositories);
  }

  const prompt = stateCopy(state, readingBand);
  const reviewingDefinition = pendingCandidateId !== null && pendingSummary.length > 0 &&
    (state === 'DEFINE_METRICS' || state === 'DEFINE_INPUTS');

  const rail = progressRailView(state);
  const hasDistanceMetric = explanation.some(
    (entry) => entry.subject.kind === 'metric' && entry.subject.metric === 'median_distance',
  );
  const hasDesignInput = explanation.some(
    (entry) => entry.subject.kind === 'input' && entry.subject.input === 'design_name',
  );
  const hasDistanceInput = explanation.some(
    (entry) => entry.subject.kind === 'input' && entry.subject.input === 'distance_m',
  );

  return (
    <div>
      <ProgressRail view={rail} />
      <p className={styles.why}>{whyThisMatters(state)}</p>
      <div className={styles.journeyStatus} role="status">
        <span>{message}</span>
        {approvalRecorded ? <strong>Saved by Maya — Daso did not approve it.</strong> : null}
      </div>
      {refusal !== null ? <p className={styles.refusal}>{refusal}</p> : null}
      {reviewingDefinition || state === 'REVIEW_MUTATION' ? (
        <ReviewMutationScreen
          prompt={prompt}
          summary={pendingSummary}
          suggested={pendingSuggested}
          refusal={refusal ?? undefined}
          onApprove={() => {
            void dispatch({ kind: 'candidate_approved' }).then(() => {
              setPendingSummary('');
              setPendingSuggested(false);
            });
          }}
          onReject={() => {
            void dispatch({ kind: 'candidate_rejected' }).then(() => {
              setPendingSummary('');
              setPendingSuggested(false);
            });
          }}
        />
      ) : null}
      {state === 'IMAGINE' ? (
        <ImagineScreen
          prompt={prompt}
          goal={FLIGHT_LAB_GOAL}
          onGoalStated={() => {
            void dispatch({ kind: 'goal_stated' }, { originalInput: FLIGHT_LAB_GOAL });
          }}
        />
      ) : null}
      {state === 'DEFINE_METRICS' && !reviewingDefinition ? (
        <DefineMetricsScreen
          prompt={prompt}
          question={question}
          canConfirm={hasDistanceMetric}
          onChooseDistance={() => {
            setPendingSuggested(false);
            setPendingSummary('Compare how far each plane flies.');
            void dispatch(
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
          }}
          onAcceptConsistency={() => {
            setPendingSuggested(true);
            setPendingSummary('Also compare how steadily each plane flies.');
            void dispatch(
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
          }}
          onConfirm={() => {
            void dispatch({ kind: 'metrics_confirmed' });
          }}
        />
      ) : null}
      {state === 'DEFINE_INPUTS' && !reviewingDefinition ? (
        <DefineInputsScreen
          prompt={prompt}
          canConfirm={hasDesignInput && hasDistanceInput}
          onChooseDesign={() => {
            setPendingSuggested(false);
            setPendingSummary('Write down the plane’s name.');
            void dispatch(
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
          }}
          onChooseDistance={() => {
            setPendingSuggested(false);
            setPendingSummary('Write down how many metres it went.');
            void dispatch(
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
          }}
          onAcceptObstruction={() => {
            setPendingSuggested(true);
            setPendingSummary('Write down whether the plane touched something.');
            void dispatch(
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
          }}
          onDeclineNote={() => {
            setPendingSuggested(false);
            setPendingSummary('Also write a free note for each throw.');
            void dispatch(
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
          }}
          onConfirm={() => {
            void dispatch({ kind: 'inputs_confirmed' });
          }}
        />
      ) : null}
      {state === 'PREDICT' ? (
        <PredictScreen
          prompt={prompt}
          designs={DESIGNS}
          onPredict={() => {
            void dispatch({ kind: 'prediction_recorded' });
          }}
        />
      ) : null}
      {state === 'COLLECT_TRIALS' ? (
        <CaptureTrialScreen
          prompt={prompt}
          designs={DESIGNS}
          onRecord={(fields) => {
            void dispatch(
              { kind: 'trial_recorded' },
              {
                trial: {
                  toolId: FLIGHT_LAB_TOOL_ID,
                  designName: fields.designName,
                  distanceM: fields.distanceM,
                  obstruction: fields.obstruction,
                  validAtCapture: true,
                  ...(fields.note === undefined ? {} : { note: fields.note }),
                },
              },
            );
          }}
          onFinish={() => {
            void dispatch({ kind: 'collection_finished' });
          }}
        />
      ) : null}
      {state === 'INSPECT_ANOMALY' ? (
        <InspectAnomalyScreen
          prompt={prompt}
          trials={trials}
          onSelect={() => {
            setCorrectionExplained(false);
            void dispatch({ kind: 'anomaly_selected' });
          }}
        />
      ) : null}
      {state === 'PROPOSE_CORRECTION' ? (
        <ProposeCorrectionScreen
          prompt={prompt}
          question={question}
          explained={correctionExplained}
          explanation={FLIGHT_LAB_CORRECTION}
          onOfferDistanceRule={() => {
            setPendingSuggested(true);
            setPendingSummary('Stop counting throws that measure 8.9 metres.');
            void dispatch(
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
          }}
          onOfferMetricRemoval={() => {
            setPendingSuggested(true);
            setPendingSummary('Stop comparing distance.');
            void dispatch(
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
          }}
          onExplain={() => {
            void dispatch(
              { kind: 'correction_explained' },
              { originalInput: FLIGHT_LAB_CORRECTION },
            ).then(() => {
              setCorrectionExplained(true);
            });
          }}
          onOfferCorrection={() => {
            setPendingSuggested(false);
            setPendingSummary('Exclude throws that touched something.');
            void dispatch(
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
          }}
        />
      ) : null}
      {state === 'COMPILE' ? (
        <CompilePreviewScreen
          prompt={prompt}
          version={compiledVersion}
          runtime={runtimeResult}
          previousRuntime={previousRuntimeResult}
          explanation={explanation}
          readingBand={readingBand}
          childName={childName}
          onAcknowledge={() => {
            void dispatch({ kind: 'compile_acknowledged' });
          }}
          onOpenRunner={() => {
            void dispatch({ kind: 'runner_opened' });
          }}
        />
      ) : null}
    </div>
  );
}
