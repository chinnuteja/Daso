import { ExperimentTrial } from '../schema/experimentTrial';

export const FLIGHT_PRACTICE_TOOL_ID = 'flight-practice-v2';
export const FLIGHT_OWNER_ID = 'child_local_01';
/** Visible practice data, never presented as the child's own real throws. */
export function flightPracticeTrials(): readonly ExperimentTrial[] {
  const rows = [
    ['trial_810', 'Dart', 6, false],
    ['trial_811', 'Dart', 8.9, true],
    ['trial_812', 'Dart', 9, true],
    ['trial_813', 'Falcon', 7.4, false],
    ['trial_814', 'Falcon', 7.6, false],
    ['trial_815', 'Falcon', 8.9, false],
  ] as const;
  return rows.map(([trialId, designName, distanceM, obstruction]) => ExperimentTrial.parse({ trialId, toolId: FLIGHT_PRACTICE_TOOL_ID, toolVersionIdAtCapture: 'tool_version_800', designName, distanceM, obstruction, setupChanged: false, validAtCapture: true, validUnderCurrentVersion: true, note: 'Labelled practice data', createdAt: '2026-10-01T00:00:00Z' }));
}
