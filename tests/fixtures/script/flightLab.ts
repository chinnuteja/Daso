import type { TrialDraft } from '../../../src/ui/flows/executeIntents';

export {
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
  FLIGHT_LAB_VERSION_PLACEHOLDER,
  NOTE_INPUT,
  OBSTRUCTION_SUGGESTION,
} from '../../../src/adapters/teaching/scripted';

export const FLIGHT_LAB_TRIAL_DRAFTS: readonly TrialDraft[] = [
  {
    toolId: 'mayas-flight-lab',
    toolVersionIdAtCapture: 'tool_version_001',
    designName: 'Falcon',
    distanceM: 7.4,
    obstruction: false,
    validAtCapture: true,
  },
  {
    toolId: 'mayas-flight-lab',
    toolVersionIdAtCapture: 'tool_version_001',
    designName: 'Glider',
    distanceM: 5.8,
    obstruction: false,
    validAtCapture: true,
  },
  {
    toolId: 'mayas-flight-lab',
    toolVersionIdAtCapture: 'tool_version_001',
    designName: 'Dart',
    distanceM: 6.1,
    obstruction: false,
    validAtCapture: true,
  },
  {
    toolId: 'mayas-flight-lab',
    toolVersionIdAtCapture: 'tool_version_001',
    designName: 'Dart',
    distanceM: 8.9,
    obstruction: true,
    validAtCapture: true,
  },
];
