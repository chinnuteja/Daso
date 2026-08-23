import { ORCHESTRATOR_STATES, type OrchestratorState } from '../../core/orchestrator/states';

export const PROGRESS_STEP_LABELS = [
  'Question',
  'Decide',
  'Predict',
  'Test',
  'Notice',
  'Teach',
  'See the change',
] as const;

export type ProgressStepLabel = (typeof PROGRESS_STEP_LABELS)[number];

export type ProgressStepStatus = 'complete' | 'current' | 'upcoming';

export interface ProgressStepView {
  readonly label: ProgressStepLabel;
  readonly status: ProgressStepStatus;
}

export interface ProgressRailView {
  readonly currentLabel: ProgressStepLabel;
  readonly nextAction: string;
  readonly steps: readonly ProgressStepView[];
}

const STEP_INDEX: Record<OrchestratorState, number> = {
  IMAGINE: 0,
  DEFINE_METRICS: 1,
  DEFINE_INPUTS: 1,
  PREDICT: 2,
  COLLECT_TRIALS: 3,
  INSPECT_ANOMALY: 4,
  PROPOSE_CORRECTION: 5,
  REVIEW_MUTATION: 5,
  COMPILE: 6,
  RUN: 6,
};

const NEXT_ACTION: Record<OrchestratorState, string> = {
  IMAGINE: 'State the question you want to answer.',
  DEFINE_METRICS: 'Choose what “best” means.',
  DEFINE_INPUTS: 'Choose what each throw should record.',
  PREDICT: 'Say which plane you think will do best. That guess is not stored as a result.',
  COLLECT_TRIALS: 'Go throw, then write down what happened.',
  INSPECT_ANOMALY: 'Point at the throw that looks unfair.',
  PROPOSE_CORRECTION: 'Say why that throw should not count.',
  REVIEW_MUTATION: 'Approve or reject this change. Daso cannot approve it.',
  COMPILE: 'See the saved rule change the result.',
  RUN: 'Use the saved tool without AI.',
};

const WHY_THIS_MATTERS: Record<OrchestratorState, string> = {
  IMAGINE: 'A tool starts from a real question, not a template.',
  DEFINE_METRICS: 'You decide what “best” means before any throw is judged.',
  DEFINE_INPUTS: 'Only what you choose to write down can become part of the tool.',
  PREDICT: 'A guess helps you notice a surprise later. It is not saved as evidence.',
  COLLECT_TRIALS: 'The tool learns from throws you record by hand, not from a camera.',
  INSPECT_ANOMALY: 'Noticing an unfair throw is how a lasting rule begins.',
  PROPOSE_CORRECTION: 'Your words become the candidate. Daso cannot invent the rule.',
  REVIEW_MUTATION: 'Nothing becomes a rule until you approve it.',
  COMPILE: 'The same stored throws replay under the rule you just taught.',
  RUN: 'Later use works from the saved rules, with no AI call.',
};

export function progressStepIndex(state: OrchestratorState): number {
  return STEP_INDEX[state];
}

export function progressRailView(state: OrchestratorState): ProgressRailView {
  const currentIndex = STEP_INDEX[state];
  return {
    currentLabel: PROGRESS_STEP_LABELS[currentIndex] ?? 'Question',
    nextAction: NEXT_ACTION[state],
    steps: PROGRESS_STEP_LABELS.map((label, index) => ({
      label,
      status: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming',
    })),
  };
}

export function whyThisMatters(state: OrchestratorState): string {
  return WHY_THIS_MATTERS[state];
}

export function everyPersistedStateHasRail(): readonly OrchestratorState[] {
  return ORCHESTRATOR_STATES;
}
