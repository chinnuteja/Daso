import { appendEntries } from '../../../src/core/ledger/append';
import type { LedgerEntry } from '../../../src/core/ledger/types';
import { ExperimentTrial } from '../../../src/core/schema/experimentTrial';

/**
 * Maya's Flight Lab, hand-built from the specification's section 6 narrative through Scene 5.
 *
 * The ledger is assembled with `appendEntries`, so the fixture itself has to satisfy every
 * append-only rule: unique event ids, strictly increasing sequence, one tool stream, and no
 * approval that references anything but an earlier candidate.
 *
 * Three candidates are deliberately left unapproved, and each one would visibly corrupt the
 * folded body if the approval check were broken:
 *   event_011  would add a fourth input (`note`), which section 9.3's version does not have
 *   event_012  would add a second rule that excludes one specific distance
 *   event_013  would remove `median_distance`, the metric the whole experiment is about
 * So INV-09 is not only an equality check; it fails loudly in three different ways if
 * unapproved behaviour can reach a version.
 *
 * Event ids and sequence numbers run 1..15 contiguously, and the correction is event_014
 * exactly as sections 9.3 and 9.4 state.
 */

const TOOL_ID = 'mayas-flight-lab';

const NARRATIVE: readonly LedgerEntry[] = [
  // Scene 1 — "What should 'best' mean?" Maya chooses distance.
  {
    entryKind: 'candidate',
    eventId: 'event_001',
    sequence: 1,
    toolId: TOOL_ID,
    actor: 'child',
    type: 'definition_decision',
    originalInput: 'I want to know which paper airplane flies the farthest',
    candidateMutation: { operation: 'add_metric', metric: 'median_distance' },
    createdAt: '2026-08-18T10:13:00Z',
  },
  {
    entryKind: 'approval',
    eventId: 'event_002',
    sequence: 2,
    toolId: TOOL_ID,
    actor: 'child',
    approves: 'event_001',
    createdAt: '2026-08-18T10:13:20Z',
  },

  // Scene 1 — Daso suggests consistency; section 10 records it as "Suggested by Daso,
  // accepted by Maya", so it is an AI candidate with a child approval entry.
  {
    entryKind: 'candidate',
    eventId: 'event_003',
    sequence: 3,
    toolId: TOOL_ID,
    actor: 'ai',
    type: 'ai_suggestion',
    originalInput:
      'Some planes fly far once and badly the next time. Should Flight Lab also compare which plane flies the same distance every time?',
    candidateMutation: { operation: 'add_metric', metric: 'consistency' },
    createdAt: '2026-08-18T10:14:00Z',
  },
  {
    entryKind: 'approval',
    eventId: 'event_004',
    sequence: 4,
    toolId: TOOL_ID,
    actor: 'child',
    approves: 'event_003',
    createdAt: '2026-08-18T10:14:30Z',
  },

  // Scenes 2 and 3 — Maya names the designs and decides what each throw records.
  {
    entryKind: 'candidate',
    eventId: 'event_005',
    sequence: 5,
    toolId: TOOL_ID,
    actor: 'child',
    type: 'definition_decision',
    originalInput: 'My planes are called Falcon, Dart and Glider',
    candidateMutation: { operation: 'add_input', input: 'design_name' },
    createdAt: '2026-08-18T10:16:00Z',
  },
  {
    entryKind: 'approval',
    eventId: 'event_006',
    sequence: 6,
    toolId: TOOL_ID,
    actor: 'child',
    approves: 'event_005',
    createdAt: '2026-08-18T10:16:20Z',
  },
  {
    entryKind: 'candidate',
    eventId: 'event_007',
    sequence: 7,
    toolId: TOOL_ID,
    actor: 'child',
    type: 'definition_decision',
    originalInput: 'I want to write down how many metres it went',
    candidateMutation: { operation: 'add_input', input: 'distance_m' },
    createdAt: '2026-08-18T10:17:00Z',
  },
  {
    entryKind: 'approval',
    eventId: 'event_008',
    sequence: 8,
    toolId: TOOL_ID,
    actor: 'child',
    approves: 'event_007',
    createdAt: '2026-08-18T10:17:20Z',
  },
  {
    entryKind: 'candidate',
    eventId: 'event_009',
    sequence: 9,
    toolId: TOOL_ID,
    actor: 'ai',
    type: 'ai_suggestion',
    originalInput:
      'Should Flight Lab also write down whether the plane touched something on the way?',
    candidateMutation: { operation: 'add_input', input: 'obstruction' },
    createdAt: '2026-08-18T10:18:00Z',
  },
  {
    entryKind: 'approval',
    eventId: 'event_010',
    sequence: 10,
    toolId: TOOL_ID,
    actor: 'child',
    approves: 'event_009',
    createdAt: '2026-08-18T10:18:30Z',
  },

  // Scene 3 — Maya wonders aloud about writing a note for each throw and does not approve it,
  // so the compiled version has three inputs, not four.
  {
    entryKind: 'candidate',
    eventId: 'event_011',
    sequence: 11,
    toolId: TOOL_ID,
    actor: 'child',
    type: 'definition_decision',
    originalInput: 'Maybe I should also write what happened each time',
    candidateMutation: { operation: 'add_input', input: 'note' },
    createdAt: '2026-08-18T10:19:00Z',
  },

  // Scene 4 — trial_004 measures 8.9 metres after hitting a chair. Daso offers two literal
  // readings of "that one shouldn't count"; Maya approves neither, and Daso asks her why.
  {
    entryKind: 'candidate',
    eventId: 'event_012',
    sequence: 12,
    toolId: TOOL_ID,
    actor: 'ai',
    type: 'ai_suggestion',
    originalInput: 'Should Flight Lab stop counting throws that measure 8.9 metres?',
    candidateMutation: {
      operation: 'add_rule',
      rule: {
        ruleId: 'exclude_distance_8_9',
        when: { field: 'distance_m', equals: 8.9 },
        effect: { set: 'trial.valid', value: false },
      },
    },
    createdAt: '2026-08-18T10:28:00Z',
  },
  {
    entryKind: 'candidate',
    eventId: 'event_013',
    sequence: 13,
    toolId: TOOL_ID,
    actor: 'ai',
    type: 'ai_suggestion',
    originalInput: 'Or should Flight Lab stop comparing distance altogether?',
    candidateMutation: { operation: 'remove_metric', metric: 'median_distance' },
    createdAt: '2026-08-18T10:28:30Z',
  },

  // Scene 4 — "Because then we're measuring the chair too." Maya's reasoning becomes the
  // candidate rule, and she approves it. This is the event section 9.3 cites as the source of
  // the rule and section 9.4 prints in full.
  {
    entryKind: 'candidate',
    eventId: 'event_014',
    sequence: 14,
    toolId: TOOL_ID,
    actor: 'child',
    type: 'rule_correction',
    originalInput: "That one shouldn't count because it hit the chair",
    candidateMutation: {
      operation: 'add_rule',
      rule: {
        ruleId: 'exclude_obstructed_flight',
        when: { field: 'obstruction', equals: true },
        effect: { set: 'trial.valid', value: false },
      },
    },
    createdAt: '2026-08-18T10:30:00Z',
  },
  {
    entryKind: 'approval',
    eventId: 'event_015',
    sequence: 15,
    toolId: TOOL_ID,
    actor: 'child',
    approves: 'event_014',
    createdAt: '2026-08-18T10:30:20Z',
  },
];

/** The Flight Lab ledger through Scene 5, validated by the append-only rules. */
export const flightLabLedger: readonly LedgerEntry[] = appendEntries([], NARRATIVE);

/** The event id of Maya's correction, cited by sections 9.3, 9.4 and 9.7. */
export const CORRECTION_EVENT_ID = 'event_014';

/**
 * Scene 3's observations. Four throws are enough for Scene 4's claim that the outlier changes
 * the ranking: with trial_004 counted, Dart's median distance is 7.5 and it leads Falcon's
 * 7.4; excluded, Dart drops to 6.1 and Falcon leads. trial_004 is section 9.5's example.
 */
export const flightLabTrials = ExperimentTrial.array().parse([
  {
    trialId: 'trial_001',
    toolId: TOOL_ID,
    toolVersionIdAtCapture: 'tool_version_001',
    designName: 'Falcon',
    distanceM: 7.4,
    obstruction: false,
    validAtCapture: true,
    validUnderCurrentVersion: true,
    createdAt: '2026-08-18T10:22:00Z',
  },
  {
    trialId: 'trial_002',
    toolId: TOOL_ID,
    toolVersionIdAtCapture: 'tool_version_001',
    designName: 'Glider',
    distanceM: 5.8,
    obstruction: false,
    validAtCapture: true,
    validUnderCurrentVersion: true,
    createdAt: '2026-08-18T10:23:00Z',
  },
  {
    trialId: 'trial_003',
    toolId: TOOL_ID,
    toolVersionIdAtCapture: 'tool_version_001',
    designName: 'Dart',
    distanceM: 6.1,
    obstruction: false,
    validAtCapture: true,
    validUnderCurrentVersion: true,
    createdAt: '2026-08-18T10:24:00Z',
  },
  {
    trialId: 'trial_004',
    toolId: TOOL_ID,
    toolVersionIdAtCapture: 'tool_version_001',
    designName: 'Dart',
    distanceM: 8.9,
    obstruction: true,
    validAtCapture: true,
    validUnderCurrentVersion: false,
    createdAt: '2026-08-18T10:26:00Z',
  },
]);
