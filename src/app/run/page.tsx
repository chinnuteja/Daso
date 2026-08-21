'use client';

import { useEffect, useState } from 'react';

import { openIndexedDbRepositories } from '../../adapters/persistence';
import { authorshipExplanation, type AuthorshipExplanationEntry } from '../../core/inspection';
import type { ChildProfile } from '../../core/schema/childProfile';
import type { ExperimentTrial } from '../../core/schema/experimentTrial';
import { RunnerScreen } from '../../ui/screens/RunnerScreen';
import { TabletShell } from '../../ui/shell/TabletShell';

interface RunnerState {
  readonly title: string;
  readonly trials: readonly ExperimentTrial[];
  readonly explanation: readonly AuthorshipExplanationEntry[];
  readonly childName: string;
  readonly readingBand: ChildProfile['readingBand'];
}

const EMPTY: RunnerState = {
  title: 'Runner Mode',
  trials: [],
  explanation: [],
  childName: 'Maya',
  readingBand: 'developing',
};

export default function RunPage() {
  const [state, setState] = useState<RunnerState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const toolId = params.get('tool') ?? 'mayas-flight-lab';
      const { repositories } = await openIndexedDbRepositories();
      const tool = await repositories.tools.get(toolId);
      const trials = await repositories.trials.listByTool(toolId);
      const entries = await repositories.ledger.listByTool(toolId);
      const profile = await repositories.profiles.get('child_local_01');
      if (cancelled) {
        return;
      }
      setState({
        title: tool?.displayName ?? 'Runner Mode',
        trials,
        explanation: entries.length > 0 ? authorshipExplanation(entries) : [],
        childName: profile?.displayName ?? 'Maya',
        readingBand: profile?.readingBand ?? 'developing',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TabletShell title="Runner Mode">
      <RunnerScreen
        title={state.title}
        trials={state.trials}
        explanation={state.explanation}
        readingBand={state.readingBand}
        childName={state.childName}
      />
    </TabletShell>
  );
}
