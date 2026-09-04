import { createMemoryRepositories } from '../../../adapters/persistence/memory';
import type { CandidateEntry, LedgerEntry } from '../../../core/ledger/types';
import type { Clock } from '../../../core/ports/clock';
import { createSequentialIdFactory, type IdFactory } from '../../../core/ports/ids';
import type { Repositories } from '../../../core/ports/repositories';
import { replay, type RuntimeResult } from '../../../core/runtime';
import { ChildProfile } from '../../../core/schema/childProfile';
import type { ExperimentTrial } from '../../../core/schema/experimentTrial';
import type { ToolVersion } from '../../../core/schema/toolVersion';
import { transition } from '../../../core/orchestrator';
import { executeIntents, type CandidateDraft, type IntentExecutionInput } from '../executeIntents';
import { captureTrialUnderActiveVersion } from '../runner/captureTrial';

export interface InquiryContext {
  readonly repositories: Repositories;
  readonly ids: IdFactory;
  readonly clock: Clock;
  readonly toolId: string;
  readonly ownerChildId: string;
}

export interface InquirySnapshot {
  readonly toolId: string;
  readonly ownerChildId: string;
  readonly question: string;
  readonly version: ToolVersion;
  readonly baseline: ToolVersion;
  readonly trials: readonly ExperimentTrial[];
  readonly before: RuntimeResult;
  readonly after: RuntimeResult;
  readonly pendingId: string | null;
  readonly approved: boolean;
  readonly saved: boolean;
}

export const FAIR_TEST_RULE = {
  operation: 'add_rule' as const,
  rule: {
    ruleId: 'exclude_changed_bridge_setup',
    when: { field: 'setup_changed' as const, equals: true },
    effect: { set: 'trial.valid' as const, value: false },
  },
};

const BASELINE: readonly Omit<CandidateDraft, 'originalInput'>[] = [
  { actor: 'child', type: 'definition_decision', mutation: { operation: 'add_metric', metric: 'median_load' } },
  { actor: 'child', type: 'definition_decision', mutation: { operation: 'add_input', input: 'design_name' } },
  { actor: 'child', type: 'definition_decision', mutation: { operation: 'add_input', input: 'load_count' } },
  { actor: 'child', type: 'definition_decision', mutation: { operation: 'add_input', input: 'setup_changed' } },
  { actor: 'child', type: 'definition_decision', mutation: { operation: 'add_input', input: 'note' } },
];

async function execute(
  context: InquiryContext,
  input: Pick<IntentExecutionInput, 'intents' | 'candidate' | 'trial'> & { pendingCandidateId?: string | null },
) {
  const result = await executeIntents({
    ...context,
    ...input,
    pendingCandidateId: input.pendingCandidateId ?? null,
    toolDraft: { ownerChildId: context.ownerChildId, displayName: 'My Paper Bridge' },
  });
  if (result.rejection !== null) throw new Error('That change cannot be used by this investigation.');
  return result;
}

/** The question is recorded as the child's intent, never promoted to a fact. */
export async function prepareInquiry(context: InquiryContext, question: string): Promise<InquirySnapshot> {
  if (await context.repositories.profiles.get(context.ownerChildId) === null) {
    await context.repositories.profiles.save(ChildProfile.parse({
      childId: context.ownerChildId,
      displayName: 'Bridge builder',
      readingBand: 'developing',
      inputPreferences: ['touch', 'text'],
      createdAt: context.clock.now(),
    }));
  }
  for (const [index, baseline] of BASELINE.entries()) {
    const originalInput = index === 0
      ? `I want to investigate: ${question}`
      : ['I will name each design.', 'I will count how many coins it holds.', 'I will say if I changed the setup.', 'I can keep a note about what happened.'][index - 1] ?? 'I will make a fair test.';
    const current = await context.repositories.ledger.listByTool(context.toolId);
    let candidate = current.find((entry): entry is CandidateEntry =>
      entry.entryKind === 'candidate' && entry.originalInput === originalInput,
    );
    if (candidate === undefined) {
      const result = await execute(context, { intents: ['append_candidate'], candidate: { ...baseline, originalInput } });
      candidate = (await context.repositories.ledger.listByTool(context.toolId)).find(
        (entry): entry is CandidateEntry => entry.entryKind === 'candidate' && entry.eventId === result.pendingCandidateId,
      );
    }
    if (candidate === undefined) throw new Error('The investigation could not be prepared.');
    const ledger = await context.repositories.ledger.listByTool(context.toolId);
    if (!ledger.some((entry) => entry.entryKind === 'approval' && entry.actor === 'child' && entry.approves === candidate.eventId)) {
      await execute(context, { intents: ['append_approval'], pendingCandidateId: candidate.eventId });
    }
  }
  if (await context.repositories.tools.get(context.toolId) === null) {
    await execute(context, { intents: ['request_compile'] });
  }
  return requireInquiry(context);
}

export async function readInquiry(
  context: Pick<InquiryContext, 'repositories' | 'toolId' | 'ownerChildId'>,
): Promise<InquirySnapshot | null> {
  const tool = await context.repositories.tools.get(context.toolId);
  if (tool === null || tool.ownerChildId !== context.ownerChildId) return null;
  const versions = await context.repositories.versions.listByTool(context.toolId);
  const baseline = [...versions].sort((a, b) => a.version - b.version)[0];
  const version = await context.repositories.versions.get(tool.currentVersionId);
  if (baseline === undefined || version === null) throw new Error('The saved investigation is incomplete.');
  const ledger = await context.repositories.ledger.listByTool(context.toolId);
  const trials = await context.repositories.trials.listByTool(context.toolId);
  const question = ledger.find((entry): entry is CandidateEntry =>
    entry.entryKind === 'candidate' && entry.originalInput.startsWith('I want to investigate: '),
  )?.originalInput.replace('I want to investigate: ', '') ?? 'Which bridge design holds more?';
  const correction = ledger.find((entry): entry is CandidateEntry =>
    entry.entryKind === 'candidate' && entry.candidateMutation.operation === 'add_rule' &&
    entry.candidateMutation.rule.ruleId === FAIR_TEST_RULE.rule.ruleId,
  );
  const approved = correction !== undefined && ledger.some((entry) =>
    entry.entryKind === 'approval' && entry.actor === 'child' && entry.approves === correction.eventId,
  );
  return {
    toolId: tool.toolId,
    ownerChildId: tool.ownerChildId,
    question,
    version,
    baseline,
    trials,
    before: replay(baseline, trials),
    after: replay(version, trials),
    pendingId: correction?.eventId ?? null,
    approved,
    saved: approved && version.rules.some((rule) => rule.ruleId === FAIR_TEST_RULE.rule.ruleId),
  };
}

async function requireInquiry(context: InquiryContext): Promise<InquirySnapshot> {
  const snapshot = await readInquiry(context);
  if (snapshot === null) throw new Error('The saved investigation is missing.');
  return snapshot;
}

export async function recordBridgeTrial(
  context: InquiryContext,
  fields: { readonly designName: string; readonly loadCount: number; readonly setupChanged: boolean; readonly note?: string },
) {
  await requireInquiry(context);
  const trial = await captureTrialUnderActiveVersion({
    ...context,
    trial: {
      toolId: context.toolId,
      designName: fields.designName,
      loadCount: fields.loadCount,
      setupChanged: fields.setupChanged,
      obstruction: false,
      validAtCapture: true,
      ...(fields.note === undefined ? {} : { note: fields.note }),
    },
  });
  return { snapshot: await requireInquiry(context), trial };
}

export async function proposeFairTestRule(context: InquiryContext): Promise<InquirySnapshot> {
  const snapshot = await requireInquiry(context);
  if (!snapshot.trials.some((trial) => trial.setupChanged === true)) {
    throw new Error('Record what changed in the setup before proposing a fair-test rule.');
  }
  if (snapshot.pendingId === null) {
    await execute(context, {
      intents: ['append_candidate'],
      candidate: {
        actor: 'child',
        type: 'rule_correction',
        originalInput: 'That result should not decide the comparison because I changed the setup.',
        mutation: FAIR_TEST_RULE,
      },
    });
  }
  return requireInquiry(context);
}

export async function approveFairTestRule(context: InquiryContext): Promise<InquirySnapshot> {
  const snapshot = await requireInquiry(context);
  if (snapshot.pendingId === null) throw new Error('Review the fair-test rule before saving it.');
  if (snapshot.saved) return snapshot;
  const next = transition('REVIEW_MUTATION', { kind: 'candidate_approved' });
  if (next.kind !== 'advanced') throw new Error('The rule cannot be approved in this state.');
  await execute(context, {
    intents: snapshot.approved ? next.intents.filter((intent) => intent !== 'append_approval') : next.intents,
    pendingCandidateId: snapshot.pendingId,
  });
  return requireInquiry(context);
}

/** Server preview shows no saved child work and writes no data. */
export async function createInquiryPreview(): Promise<InquirySnapshot> {
  return prepareInquiry({
    repositories: createMemoryRepositories(),
    ids: createSequentialIdFactory(),
    clock: { now: () => '2026-09-05T09:00:00Z' },
    toolId: 'bridge-bench-preview',
    ownerChildId: 'child_bridge_preview',
  }, 'Does the shape of a bridge change how much it can hold?');
}
