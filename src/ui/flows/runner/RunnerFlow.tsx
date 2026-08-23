'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  loadIdCounters,
  openIndexedDbRepositories,
  saveIdCounters,
} from '../../../adapters/persistence';
import { createBrowserClock } from '../browserClock';
import { createSequentialIdFactory } from '../../../core/ports/ids';
import type { ExperimentTrial } from '../../../core/schema/experimentTrial';
import { captureTrialUnderActiveVersion } from './captureTrial';
import { RUNNER_INTEGRITY_COPY, loadRunner, type RunnerLoadResult } from './loadRunner';
import { createOrReuseFork, ensureSecondChildProfile } from './reuseTool';
import { LEO_CHILD_ID, MAYA_CHILD_ID } from './secondChild';
import { RunnerScreen } from '../../screens/RunnerScreen';
import { TabletShell } from '../../shell/TabletShell';

export function RunnerFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toolId = searchParams.get('tool') ?? 'mayas-flight-lab';
  const viewerId = searchParams.get('viewer') ?? MAYA_CHILD_ID;
  const clock = useMemo(() => createBrowserClock(), []);
  const [load, setLoad] = useState<RunnerLoadResult | { status: 'loading' }>({
    status: 'loading',
  });
  const [lastTrial, setLastTrial] = useState<ExperimentTrial | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const { repositories } = await openIndexedDbRepositories();
    const next = await loadRunner(repositories, toolId, viewerId);
    setLoad(next);
    if (next.status === 'ready') {
      const newest = next.view.trials[next.view.trials.length - 1];
      if (newest !== undefined) {
        const projection = next.view.runtime.projections.find(
          (candidate) => candidate.trialId === newest.trialId,
        );
        setLastTrial({
          ...newest,
          validUnderCurrentVersion:
            projection?.validUnderCurrentVersion ?? newest.validUnderCurrentVersion,
        });
      } else {
        setLastTrial(null);
      }
    } else {
      setLastTrial(null);
    }
  }, [toolId, viewerId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refresh();
      if (cancelled) {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const ready = load.status === 'ready' ? load.view : null;
  const creditName = ready?.sourceAuthor?.displayName ?? ready?.owner.displayName ?? 'Maya';

  return (
    <TabletShell title="Runner Mode">
      <RunnerScreen
        status={load.status}
        integrityMessage={load.status === 'integrity_error' ? load.message : RUNNER_INTEGRITY_COPY}
        title={ready?.tool.displayName ?? 'Runner Mode'}
        ownerName={ready?.owner.displayName ?? ''}
        sourceAuthorName={ready?.sourceAuthor?.displayName ?? null}
        version={ready?.version ?? null}
        runtime={ready?.runtime ?? null}
        lastTrial={lastTrial}
        explanation={ready?.explanation ?? []}
        readingBand={ready?.viewer.readingBand ?? 'developing'}
        creditName={creditName}
        canCapture={ready?.canCapture ?? false}
        needsCopy={ready?.needsCopy ?? false}
        onMakeCopy={() => {
          void (async () => {
            const { repositories, database } = await openIndexedDbRepositories();
            const owner = await ensureSecondChildProfile(repositories);
            const ids = createSequentialIdFactory(await loadIdCounters(database));
            const result = await createOrReuseFork({
              repositories,
              ids,
              clock,
              sourceToolId: toolId,
              targetOwner: owner,
            });
            await saveIdCounters(database, ids.snapshot());
            router.replace(`/run?tool=${result.snapshot.definition.toolId}&viewer=${LEO_CHILD_ID}`);
          })();
        }}
        onCapture={(fields) => {
          void (async () => {
            const { repositories, database } = await openIndexedDbRepositories();
            const ids = createSequentialIdFactory(await loadIdCounters(database));
            await captureTrialUnderActiveVersion({
              repositories,
              ids,
              clock,
              trial: {
                toolId,
                designName: fields.designName,
                distanceM: fields.distanceM,
                obstruction: fields.obstruction,
                validAtCapture: true,
              },
            });
            await saveIdCounters(database, ids.snapshot());
            await refresh();
          })();
        }}
      />
    </TabletShell>
  );
}
