import type { OrchestratorState } from '../../core/orchestrator/states';
import type { ReadingBand } from '../../core/schema/vocabulary';

const STATE_COPY: Record<OrchestratorState, Record<ReadingBand, string>> = {
  IMAGINE: {
    emerging: 'What do you want to find out?',
    developing: 'What question do you want to answer?',
    fluent: 'What question should this tool answer?',
  },
  DEFINE_METRICS: {
    emerging: 'What does best mean?',
    developing: 'What should “best” mean?',
    fluent: 'Which comparisons should the tool make?',
  },
  DEFINE_INPUTS: {
    emerging: 'What should we write down?',
    developing: 'What should each throw record?',
    fluent: 'Which observations should each trial capture?',
  },
  PREDICT: {
    emerging: 'Which plane do you think will win?',
    developing: 'Before you throw, which design do you think will do best?',
    fluent: 'Record a prediction before any trial.',
  },
  COLLECT_TRIALS: {
    emerging: 'Write down this throw.',
    developing: 'Record this throw.',
    fluent: 'Capture this observation.',
  },
  INSPECT_ANOMALY: {
    emerging: 'This throw looks different.',
    developing: 'One throw looks different from the others.',
    fluent: 'Inspect the unusual observation.',
  },
  PROPOSE_CORRECTION: {
    emerging: 'Tell Daso why.',
    developing: 'Why should that throw not count?',
    fluent: 'Explain the correction you want to teach.',
  },
  REVIEW_MUTATION: {
    emerging: 'Do you want this change?',
    developing: 'Review this change before it becomes part of the tool.',
    fluent: 'Approve or reject this candidate mutation.',
  },
  COMPILE: {
    emerging: 'This is what your tool does.',
    developing: 'Here is the tool you taught.',
    fluent: 'This is the folded definition, shown read-only.',
  },
  RUN: {
    emerging: 'Use your tool.',
    developing: 'Runner Mode — the tool you taught.',
    fluent: 'Runner Mode executes the approved definition.',
  },
};

export function stateCopy(state: OrchestratorState, readingBand: ReadingBand): string {
  return STATE_COPY[state][readingBand];
}
