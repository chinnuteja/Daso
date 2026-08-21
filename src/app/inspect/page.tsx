'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  DATABASE_NAME,
  openIndexedDbRepositories,
  persistGraph,
} from '../../adapters/persistence';
import { authorshipExplanation, authorshipSummaryCounts } from '../../core/inspection';
import type { AuthorshipExplanationEntry } from '../../core/inspection/authorshipView';
import type { AuthorshipSummaryCounts } from '../../core/inspection/summaryCounts';
import type { Repositories } from '../../core/ports/repositories';
import { ChildProfile } from '../../core/schema/childProfile';
import { ExperimentTrial } from '../../core/schema/experimentTrial';
import { ParentSummary } from '../../core/schema/parentSummary';
import { PermissionGrant } from '../../core/schema/permissionGrant';
import { ToolDefinition } from '../../core/schema/toolDefinition';
import { ToolVersion } from '../../core/schema/toolVersion';
import { flightLabLedger, flightLabTrials } from '../../../tests/fixtures/ledger/flightLab';
import childProfileJson from '../../../tests/fixtures/spec/childProfile.json';
import parentSummaryJson from '../../../tests/fixtures/spec/parentSummary.json';
import permissionGrantJson from '../../../tests/fixtures/spec/permissionGrant.json';
import toolDefinitionJson from '../../../tests/fixtures/spec/toolDefinition.json';
import toolVersionJson from '../../../tests/fixtures/spec/toolVersion.json';

/**
 * Diagnostic inspection surface for Milestone 2. Unstyled on purpose: the tablet shell
 * and design language belong to Phase 3. This page exists so a hard refresh can be seen
 * to preserve the stored history.
 */

interface InspectState {
  readonly profile: ChildProfile | null;
  readonly tools: readonly ToolDefinition[];
  readonly versions: readonly ToolVersion[];
  readonly trials: readonly ExperimentTrial[];
  readonly explanation: readonly AuthorshipExplanationEntry[];
  readonly counts: AuthorshipSummaryCounts | null;
}

const EMPTY: InspectState = {
  profile: null,
  tools: [],
  versions: [],
  trials: [],
  explanation: [],
  counts: null,
};

export default function InspectPage() {
  const [state, setState] = useState<InspectState>(EMPTY);
  const [message, setMessage] = useState('Opening local store…');

  const refresh = useCallback(async (repositories: Repositories) => {
    const tools = await repositories.tools.listByOwner('child_local_01');
    const tool = tools[0];
    if (tool === undefined) {
      setState(EMPTY);
      setMessage('Local store is empty.');
      return;
    }
    const profile = await repositories.profiles.get('child_local_01');
    const versions = await repositories.versions.listByTool(tool.toolId);
    const trials = await repositories.trials.listByTool(tool.toolId);
    const entries = await repositories.ledger.listByTool(tool.toolId);
    setState({
      profile,
      tools,
      versions,
      trials,
      explanation: authorshipExplanation(entries),
      counts: authorshipSummaryCounts(entries, trials),
    });
    setMessage(`Loaded from local store (${DATABASE_NAME}).`);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { repositories, database } = await openIndexedDbRepositories();
      if (cancelled) {
        database.close();
        return;
      }
      await refresh(repositories);
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function seed(): Promise<void> {
    const { repositories } = await openIndexedDbRepositories();
    const existing = await repositories.tools.get('mayas-flight-lab');
    if (existing === null) {
      await persistGraph(repositories, {
        profile: ChildProfile.parse(childProfileJson),
        tools: [ToolDefinition.parse(toolDefinitionJson)],
        versions: [ToolVersion.parse(toolVersionJson)],
        entries: flightLabLedger,
        trials: flightLabTrials,
        grants: [PermissionGrant.parse(permissionGrantJson)],
        summaries: [ParentSummary.parse(parentSummaryJson)],
      });
    }
    await refresh(repositories);
  }

  return (
    <main>
      <h1>Inspection</h1>
      <p>{message}</p>
      <p>
        <button type="button" onClick={() => void seed()}>
          Seed Flight Lab
        </button>
      </p>

      {state.profile !== null && (
        <section>
          <h2>ChildProfile</h2>
          <pre>{JSON.stringify(state.profile, null, 2)}</pre>
        </section>
      )}

      <section>
        <h2>Tools</h2>
        <pre>{JSON.stringify(state.tools, null, 2)}</pre>
      </section>

      <section>
        <h2>Versions</h2>
        <pre>{JSON.stringify(state.versions, null, 2)}</pre>
      </section>

      <section>
        <h2>Trials</h2>
        <pre>{JSON.stringify(state.trials, null, 2)}</pre>
      </section>

      <section>
        <h2>Authorship explanation</h2>
        <ol>
          {state.explanation.map((entry) => (
            <li key={entry.eventId}>
              {JSON.stringify(entry.subject)} — {entry.attribution} ({entry.eventId})
            </li>
          ))}
        </ol>
      </section>

      {state.counts !== null && (
        <section>
          <h2>Authorship summary counts</h2>
          <pre>{JSON.stringify(state.counts, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
