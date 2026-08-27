import { createMemoryRepositories } from '../../../adapters/persistence/memory';
import { EXCLUDE_OBSTRUCTED_MUTATION, FLIGHT_LAB_CORRECTION, FLIGHT_LAB_GOAL } from '../../../adapters/teaching/scripted';
import type { CandidateEntry, LedgerEntry } from '../../../core/ledger/types';
import { transition } from '../../../core/orchestrator';
import type { Clock } from '../../../core/ports/clock';
import { createSequentialIdFactory, type IdFactory } from '../../../core/ports/ids';
import type { Repositories } from '../../../core/ports/repositories';
import { replay, type RuntimeResult } from '../../../core/runtime';
import { ChildProfile } from '../../../core/schema/childProfile';
import type { ExperimentTrial } from '../../../core/schema/experimentTrial';
import type { ToolVersion } from '../../../core/schema/toolVersion';
import { executeIntents, type CandidateDraft, type IntentExecutionInput } from '../executeIntents';
import { captureTrialUnderActiveVersion } from '../runner/captureTrial';

export interface ExperienceContext {
  readonly repositories: Repositories;
  readonly ids: IdFactory;
  readonly clock: Clock;
  readonly toolId: string;
  readonly ownerChildId: string;
}

export interface ExperienceSnapshot {
  readonly toolId: string;
  readonly ownerChildId: string;
  readonly version: ToolVersion;
  readonly baseline: ToolVersion;
  readonly trials: readonly ExperimentTrial[];
  readonly sampleTrials: readonly ExperimentTrial[];
  readonly ledger: readonly LedgerEntry[];
  readonly before: RuntimeResult;
  readonly after: RuntimeResult;
  readonly pendingId: string | null;
  readonly approved: boolean;
  readonly saved: boolean;
}

export const SAMPLE_THROWS = [
  { designName: 'Falcon', distanceM: 7.4, obstruction: false },
  { designName: 'Glider', distanceM: 5.8, obstruction: false },
  { designName: 'Dart', distanceM: 6.1, obstruction: false },
  { designName: 'Dart', distanceM: 8.9, obstruction: true },
] as const;

const BASELINE_CHOICES: readonly CandidateDraft[] = [
  { actor: 'child', type: 'definition_decision', originalInput: FLIGHT_LAB_GOAL, mutation: { operation: 'add_metric', metric: 'median_distance' } },
  { actor: 'ai', type: 'ai_suggestion', originalInput: 'Sample setup: also compare consistency.', mutation: { operation: 'add_metric', metric: 'consistency' } },
  { actor: 'child', type: 'definition_decision', originalInput: 'Sample setup: record the plane name.', mutation: { operation: 'add_input', input: 'design_name' } },
  { actor: 'child', type: 'definition_decision', originalInput: 'Sample setup: record distance in metres.', mutation: { operation: 'add_input', input: 'distance_m' } },
  { actor: 'ai', type: 'ai_suggestion', originalInput: 'Sample setup: record whether a flight touched something.', mutation: { operation: 'add_input', input: 'obstruction' } },
];

async function execute(context: ExperienceContext, input: Pick<IntentExecutionInput, 'intents' | 'candidate' | 'trial'> & { pendingCandidateId?: string | null }) {
  const result = await executeIntents({
    ...context, ...input, pendingCandidateId: input.pendingCandidateId ?? null,
    toolDraft: { ownerChildId: context.ownerChildId, displayName: "Maya's Flight Lab · sample" },
  });
  if (result.rejection !== null) throw new Error('The proposed change did not pass the tool’s safety checks.');
  return result;
}

/** Explicit, labelled sample setup. It never runs merely because Home was opened. */
export async function prepareExperience(context: ExperienceContext): Promise<ExperienceSnapshot> {
  if (await context.repositories.profiles.get(context.ownerChildId) === null) {
    await context.repositories.profiles.save(ChildProfile.parse({
      childId: context.ownerChildId, displayName: 'Maya (sample)', readingBand: 'developing',
      inputPreferences: ['touch'], createdAt: context.clock.now(),
    }));
  }
  for (const choice of BASELINE_CHOICES) {
    const ledger = await context.repositories.ledger.listByTool(context.toolId);
    let candidate = ledger.find((entry): entry is CandidateEntry =>
      entry.entryKind === 'candidate' && entry.originalInput === choice.originalInput);
    if (candidate === undefined) {
      const result = await execute(context, { intents: ['append_candidate'], candidate: choice });
      candidate = (await context.repositories.ledger.listByTool(context.toolId)).find(
        (entry): entry is CandidateEntry => entry.entryKind === 'candidate' && entry.eventId === result.pendingCandidateId,
      );
    }
    if (candidate === undefined) throw new Error('The example could not be prepared.');
    const current = await context.repositories.ledger.listByTool(context.toolId);
    if (!current.some((entry) => entry.entryKind === 'approval' && entry.actor === 'child' && entry.approves === candidate.eventId)) {
      await execute(context, { intents: ['append_approval'], pendingCandidateId: candidate.eventId });
    }
  }
  if (await context.repositories.tools.get(context.toolId) === null) {
    await execute(context, { intents: ['request_compile'] });
  }
  const existing = await context.repositories.trials.listByTool(context.toolId);
  for (const trial of SAMPLE_THROWS.slice(existing.length)) {
    await execute(context, { intents: ['record_trial'], trial: { ...trial, toolId: context.toolId, validAtCapture: true } });
  }
  return readRequiredExperience(context);
}

export async function readExperience(context: Pick<ExperienceContext, 'repositories' | 'toolId' | 'ownerChildId'>): Promise<ExperienceSnapshot | null> {
  const tool = await context.repositories.tools.get(context.toolId);
  if (tool === null) return null;
  const owner = await context.repositories.profiles.get(tool.ownerChildId);
  if (owner === null || tool.ownerChildId !== context.ownerChildId) throw new Error('This example’s owner is no longer available.');
  const version = await context.repositories.versions.get(tool.currentVersionId);
  const versions = await context.repositories.versions.listByTool(context.toolId);
  const baseline = [...versions].sort((a, b) => a.version - b.version)[0];
  if (version === null || baseline === undefined) throw new Error('The saved example is incomplete.');
  const trials = await context.repositories.trials.listByTool(context.toolId);
  const ledger = await context.repositories.ledger.listByTool(context.toolId);
  const correction = ledger.find((entry): entry is CandidateEntry => entry.entryKind === 'candidate' && entry.type === 'rule_correction');
  const approved = correction !== undefined && ledger.some((entry) => entry.entryKind === 'approval' && entry.actor === 'child' && entry.approves === correction.eventId);
  // Sample setup always records the first four observations before a rule can be proposed.
  // Numeric identifiers preserve that order even at the 999 → 1000 boundary.
  const sampleTrials = [...trials].sort((left, right) => Number(left.trialId.slice(6)) - Number(right.trialId.slice(6))).slice(0, 4);
  return {
    toolId: tool.toolId, ownerChildId: tool.ownerChildId, version, baseline, trials, sampleTrials, ledger,
    before: replay(baseline, sampleTrials), after: replay(version, sampleTrials),
    pendingId: correction?.eventId ?? null, approved,
    saved: approved && version.rules.some((rule) => rule.ruleId === 'exclude_obstructed_flight'),
  };
}

async function readRequiredExperience(context: ExperienceContext): Promise<ExperienceSnapshot> {
  const result = await readExperience(context);
  if (result === null) throw new Error('The saved example is missing.');
  return result;
}

export async function proposeExperienceRule(context: ExperienceContext): Promise<ExperienceSnapshot> {
  const snapshot = await prepareExperience(context);
  if (snapshot.pendingId === null) {
    const next = transition('PROPOSE_CORRECTION', { kind: 'candidate_offered' });
    if (next.kind !== 'advanced') throw new Error('The rule cannot be proposed in this state.');
    await execute(context, {
      intents: next.intents,
      candidate: { actor: 'child', type: 'rule_correction', originalInput: FLIGHT_LAB_CORRECTION, mutation: EXCLUDE_OBSTRUCTED_MUTATION },
    });
  }
  return readRequiredExperience(context);
}

/** Approval follows only the explicit Save button. A retry never duplicates approval. */
export async function approveExperienceRule(context: ExperienceContext): Promise<ExperienceSnapshot> {
  const snapshot = await readRequiredExperience(context);
  if (snapshot.pendingId === null) throw new Error('Review the rule before saving it.');
  if (snapshot.saved) return snapshot;
  const next = transition('REVIEW_MUTATION', { kind: 'candidate_approved' });
  if (next.kind !== 'advanced') throw new Error('The rule cannot be approved in this state.');
  await execute(context, { intents: snapshot.approved ? next.intents.filter((intent) => intent !== 'append_approval') : next.intents, pendingCandidateId: snapshot.pendingId });
  return readRequiredExperience(context);
}

export async function recordExperienceTrial(context: ExperienceContext, fields: { designName: string; distanceM: number; obstruction: boolean }) {
  const trial = await captureTrialUnderActiveVersion({ ...context, trial: { ...fields, toolId: context.toolId, validAtCapture: true } });
  const snapshot = await readRequiredExperience(context);
  const runtime = replay(snapshot.version, snapshot.trials);
  const projection = runtime.projections.find((item) => item.trialId === trial.trialId);
  if (projection === undefined) throw new Error('The recorded throw could not be evaluated.');
  return { snapshot, trial, runtime, counted: projection.validUnderCurrentVersion };
}

/** SSR preview uses the real compiler/runtime in isolated memory; no browser data is written. */
export async function createExperiencePreview(): Promise<ExperienceSnapshot> {
  return prepareExperience({
    repositories: createMemoryRepositories(), ids: createSequentialIdFactory(),
    clock: { now: () => '2026-08-27T09:00:00Z' },
    toolId: 'flight-lab-preview', ownerChildId: 'child_sample_preview',
  });
}
