import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createScriptedEvidenceSource } from '../../src/adapters/evidence/scripted';
import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import { ANONYMOUS_CONVERSATION } from '../../src/core/evidence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import {
  DELETED_PROFILE_TEACHER,
  ORPHANED_FORK_DISPLAY_NAME,
} from '../../src/core/reuse';
import { DELETED_SOURCE_COPY, ORPHANED_EXPORT_COPY } from '../../src/ui/copy/parent';
import { loadParentEvidence } from '../../src/ui/flows/parentEvidence';
import {
  LEO_CHILD_ID,
  MAYA_CHILD_ID,
  captureTrialUnderActiveVersion,
  createOrReuseFork,
  ensureSecondChildProfile,
  loadRunner,
  loadSavedTiles,
} from '../../src/ui/flows/runner';
import { HomeScreen } from '../../src/ui/screens/HomeScreen';
import { ParentEvidenceScreen } from '../../src/ui/screens/ParentEvidenceScreen';
import { RunnerScreen } from '../../src/ui/screens/RunnerScreen';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * After Maya's profile is deleted, Leo's independently owned fork stays usable, but
 * product UI must not show Maya or attribute inherited decisions to Leo.
 */

async function forkLeo() {
  const repositories = createMemoryRepositories();
  await persistGraph(repositories, flightLabGraph());
  const leo = await ensureSecondChildProfile(repositories);
  const fork = await createOrReuseFork({
    repositories,
    ids: createSequentialIdFactory({ event: 15, tool_version: 2 }),
    clock: createFixedClock('2026-08-21T09:05:00Z'),
    sourceToolId: 'mayas-flight-lab',
    targetOwner: leo,
  });
  await captureTrialUnderActiveVersion({
    repositories,
    ids: createSequentialIdFactory({ trial: 10 }),
    clock: createFixedClock('2026-08-21T09:06:00Z'),
    trial: {
      toolId: fork.snapshot.definition.toolId,
      designName: 'Dart',
      distanceM: 8.1,
      obstruction: true,
      validAtCapture: true,
    },
  });
  return { repositories, fork };
}

function parentHandlers() {
  return {
    onToggleStored: () => undefined,
    onExport: () => undefined,
    onAskDeleteTool: () => undefined,
    onAskDeleteProfile: () => undefined,
    onConfirmDelete: () => undefined,
    onCancelDelete: () => undefined,
  };
}

function assertNoMaya(text: string): void {
  expect(text).not.toMatch(/Maya/u);
}

function assertNoFalseLeoAttribution(text: string): void {
  expect(text).not.toMatch(/Leo chose/u);
  expect(text).not.toMatch(/Leo taught/u);
  expect(text).not.toMatch(/What Leo taught/u);
  expect(text).not.toMatch(/Ask Leo/u);
}

describe('phase 7 orphaned-fork privacy and attribution', () => {
  it('credits Maya on Leo’s fork while the source profile is present', async () => {
    const { repositories, fork } = await forkLeo();
    const toolId = fork.snapshot.definition.toolId;

    const tiles = await loadSavedTiles(repositories, [MAYA_CHILD_ID, LEO_CHILD_ID]);
    const leoTile = tiles.find((tile) => tile.toolId === toolId);
    expect(leoTile?.displayName).toBe("Leo's copy of Maya's Flight Lab");
    expect(leoTile?.sourceDeleted).toBe(false);

    const runner = await loadRunner(repositories, toolId, LEO_CHILD_ID);
    expect(runner.status).toBe('ready');
    if (runner.status !== 'ready') {
      return;
    }
    expect(runner.view.sourceAuthor?.displayName).toBe('Maya');
    expect(runner.view.visibleTitle).toBe("Leo's copy of Maya's Flight Lab");
    expect(runner.view.creditName).toBe('Maya');

    const parent = await loadParentEvidence({
      repositories,
      evidence: createScriptedEvidenceSource(),
      ids: createSequentialIdFactory({ event: 40, tool_version: 8, summary: 1 }),
      clock: createFixedClock('2026-08-23T10:00:00Z'),
      rawToolId: toolId,
    });
    expect(parent.status).toBe('ready');
    if (parent.status !== 'ready') {
      return;
    }
    expect(parent.view.clauses.question).toMatch(/^Maya chose/u);
    expect(parent.view.clauses.rule).toMatch(/^Maya taught/u);
    expect(parent.view.clauses.conversation).toBe('Ask Maya what made that throw unfair.');
    expect(parent.view.clauses.question).not.toMatch(/Leo chose/u);
    expect(parent.view.clauses.rule).not.toMatch(/Leo taught/u);
  });

  it('renders Home, Runner, and Parent Evidence without Maya or false Leo credit after Maya is deleted', async () => {
    const { repositories, fork } = await forkLeo();
    const toolId = fork.snapshot.definition.toolId;
    await repositories.profiles.deleteProfileGraph(MAYA_CHILD_ID);

    const stored = await repositories.tools.get(toolId);
    expect(stored?.displayName).toBe(ORPHANED_FORK_DISPLAY_NAME);
    expect(stored?.forkedFrom?.toolId).toBe('mayas-flight-lab');
    expect(stored?.forkedFrom?.ownerChildId).toBe(MAYA_CHILD_ID);

    const tiles = await loadSavedTiles(repositories, [MAYA_CHILD_ID, LEO_CHILD_ID]);
    expect(tiles.some((tile) => tile.ownerChildId === MAYA_CHILD_ID)).toBe(false);
    const leoTile = tiles.find((tile) => tile.toolId === toolId);
    expect(leoTile).toBeDefined();
    expect(leoTile?.displayName).toBe(ORPHANED_FORK_DISPLAY_NAME);
    expect(leoTile?.creatorName).toBe('Leo');
    expect(leoTile?.sourceDeleted).toBe(true);

    const home = renderToStaticMarkup(
      createElement(HomeScreen, {
        tiles,
        loading: false,
        deletedToolId: null,
        deletedProfileId: MAYA_CHILD_ID,
        onStartTeaching: () => undefined,
        onOpenRunner: () => undefined,
        onParentEvidence: () => undefined,
        onDayTwo: () => undefined,
      }),
    );
    assertNoMaya(home);
    assertNoFalseLeoAttribution(home);
    expect(home).toContain(ORPHANED_FORK_DISPLAY_NAME);
    expect(home).toContain('Created by Leo');
    expect(home).toContain(DELETED_SOURCE_COPY);

    const runner = await loadRunner(repositories, toolId, LEO_CHILD_ID);
    expect(runner.status).toBe('ready');
    if (runner.status !== 'ready') {
      return;
    }
    expect(runner.view.visibleTitle).toBe(ORPHANED_FORK_DISPLAY_NAME);
    expect(runner.view.creditName).toBe(DELETED_PROFILE_TEACHER);
    expect(runner.view.sourceDeleted).toBe(true);
    const runnerMarkup = renderToStaticMarkup(
      createElement(RunnerScreen, {
        status: 'ready',
        title: runner.view.visibleTitle,
        ownerName: runner.view.owner.displayName,
        sourceAuthorName: runner.view.sourceAuthor?.displayName ?? null,
        sourceDeleted: runner.view.sourceDeleted,
        version: runner.view.version,
        runtime: runner.view.runtime,
        lastTrial: null,
        explanation: runner.view.explanation,
        readingBand: runner.view.viewer.readingBand,
        creditName: runner.view.creditName,
        canCapture: runner.view.canCapture,
        needsCopy: runner.view.needsCopy,
      }),
    );
    assertNoMaya(runnerMarkup);
    assertNoFalseLeoAttribution(runnerMarkup);
    expect(runnerMarkup).toContain(ORPHANED_FORK_DISPLAY_NAME);
    expect(runnerMarkup).toContain(DELETED_SOURCE_COPY);
    expect(runnerMarkup).toContain('Owner: Leo');
    expect(runnerMarkup).toContain(`${DELETED_PROFILE_TEACHER} taught this rule.`);

    const parent = await loadParentEvidence({
      repositories,
      evidence: createScriptedEvidenceSource(),
      ids: createSequentialIdFactory({ event: 40, tool_version: 8, summary: 1 }),
      clock: createFixedClock('2026-08-23T10:01:00Z'),
      rawToolId: toolId,
    });
    expect(parent.status).toBe('ready');
    if (parent.status !== 'ready') {
      return;
    }
    expect(parent.view.visibleTitle).toBe(ORPHANED_FORK_DISPLAY_NAME);
    expect(parent.view.teacherDisplayName).toBe(DELETED_PROFILE_TEACHER);
    expect(parent.view.clauses.heading).toBe(
      `What ${DELETED_PROFILE_TEACHER} taught ${ORPHANED_FORK_DISPLAY_NAME}`,
    );
    expect(parent.view.clauses.question).toMatch(/^A deleted profile chose/u);
    expect(parent.view.clauses.rule).toMatch(/^A deleted profile taught this/u);
    expect(parent.view.clauses.conversation).toBe(ANONYMOUS_CONVERSATION);
    expect(parent.view.exportGraph.tool.displayName).toBe(ORPHANED_FORK_DISPLAY_NAME);
    expect(parent.view.exportGraph.tool.forkedFrom?.toolId).toBe('mayas-flight-lab');
    expect(parent.view.summary.text).not.toMatch(/Maya/u);
    expect(parent.view.summary.text).not.toMatch(/Leo chose/u);
    expect(parent.view.summary.text).not.toMatch(/Leo taught/u);

    const parentMarkup = renderToStaticMarkup(
      createElement(ParentEvidenceScreen, {
        status: 'ready',
        view: parent.view,
        showingStored: true,
        pendingDelete: null,
        confirmDelete: null,
        deleteError: null,
        ...parentHandlers(),
      }),
    );
    assertNoMaya(parentMarkup);
    assertNoFalseLeoAttribution(parentMarkup);
    expect(parentMarkup).toContain(ORPHANED_FORK_DISPLAY_NAME);
    expect(parentMarkup).toContain(ORPHANED_EXPORT_COPY);
    expect(parentMarkup).toContain(ANONYMOUS_CONVERSATION);
    expect(parentMarkup).not.toContain('mayas-flight-lab');
  });
});
