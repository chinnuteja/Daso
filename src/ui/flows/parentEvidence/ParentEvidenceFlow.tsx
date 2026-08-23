'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { createScriptedEvidenceSource } from '../../../adapters/evidence/scripted';
import {
  loadIdCounters,
  openIndexedDbRepositories,
  saveIdCounters,
} from '../../../adapters/persistence';
import { createSequentialIdFactory } from '../../../core/ports/ids';
import { createBrowserClock } from '../browserClock';
import { PARENT_INTEGRITY_COPY } from '../../copy/parent';
import { ParentEvidenceScreen } from '../../screens/ParentEvidenceScreen';
import { TabletShell } from '../../shell/TabletShell';
import { downloadToolExport } from './downloadExport';
import { loadParentEvidence, type ParentEvidenceLoadResult } from './loadParentEvidence';

export function ParentEvidenceFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toolId = searchParams.get('tool') ?? '';
  const clock = useMemo(() => createBrowserClock(), []);
  const evidence = useMemo(() => createScriptedEvidenceSource(), []);
  const [load, setLoad] = useState<ParentEvidenceLoadResult | { status: 'loading' }>({
    status: 'loading',
  });
  const [showingStored, setShowingStored] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<'tool' | 'profile' | null>(null);
  const [pendingDelete, setPendingDelete] = useState<'tool' | 'profile' | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const { repositories, database } = await openIndexedDbRepositories();
    const ids = createSequentialIdFactory(await loadIdCounters(database));
    const next = await loadParentEvidence({
      repositories,
      evidence,
      ids,
      clock,
      rawToolId: toolId,
    });
    await saveIdCounters(database, ids.snapshot());
    setLoad(next);
  }, [clock, evidence, toolId]);

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

  return (
    <TabletShell title="Parent evidence">
      <ParentEvidenceScreen
        status={load.status === 'loading' ? 'loading' : load.status}
        message={
          load.status === 'empty' || load.status === 'integrity_error' ? load.message : undefined
        }
        view={ready}
        showingStored={showingStored}
        pendingDelete={pendingDelete}
        confirmDelete={confirmDelete}
        deleteError={deleteError}
        onToggleStored={() => {
          setShowingStored((current) => !current);
        }}
        onExport={() => {
          if (ready !== null) {
            downloadToolExport(ready.exportGraph);
          }
        }}
        onAskDeleteTool={() => {
          setDeleteError(null);
          setConfirmDelete('tool');
        }}
        onAskDeleteProfile={() => {
          setDeleteError(null);
          setConfirmDelete('profile');
        }}
        onCancelDelete={() => {
          if (pendingDelete === null) {
            setConfirmDelete(null);
          }
        }}
        onConfirmDelete={() => {
          if (ready === null || pendingDelete !== null || confirmDelete === null) {
            return;
          }
          const kind = confirmDelete;
          setPendingDelete(kind);
          void (async () => {
            try {
              const { repositories } = await openIndexedDbRepositories();
              if (kind === 'tool') {
                await repositories.tools.deleteToolGraph(ready.tool.toolId);
                router.replace(`/?deleted=${ready.tool.toolId}`);
                return;
              }
              await repositories.profiles.deleteProfileGraph(ready.owner.childId);
              router.replace(`/?profileDeleted=${ready.owner.childId}`);
            } catch {
              setPendingDelete(null);
              setDeleteError(PARENT_INTEGRITY_COPY);
            }
          })();
        }}
      />
    </TabletShell>
  );
}
