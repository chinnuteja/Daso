'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { openIndexedDbRepositories } from '../adapters/persistence';
import {
  LEO_CHILD_ID,
  MAYA_CHILD_ID,
  ensureSecondChildProfile,
  loadSavedTiles,
  type SavedToolTileView,
} from '../ui/flows/runner';
import { HomeScreen } from '../ui/screens/HomeScreen';
import { TabletShell } from '../ui/shell/TabletShell';

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <TabletShell title="Teach Daso">
          <p>Loading saved tools…</p>
        </TabletShell>
      }
    >
      <HomeContents />
    </Suspense>
  );
}

function HomeContents() {
  const [tiles, setTiles] = useState<readonly SavedToolTileView[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const deletedToolId = searchParams.get('deleted');
  const deletedProfileId = searchParams.get('profileDeleted');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { repositories } = await openIndexedDbRepositories();
      const listed = await loadSavedTiles(repositories, [MAYA_CHILD_ID, LEO_CHILD_ID]);
      if (!cancelled) {
        setTiles(listed);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TabletShell title="Teach Daso">
      <HomeScreen
        tiles={tiles}
        loading={loading}
        deletedToolId={deletedToolId}
        deletedProfileId={deletedProfileId}
        onStartTeaching={() => {
          router.push('/journey');
        }}
        onOpenRunner={(toolId, viewerChildId) => {
          router.push(`/run?tool=${toolId}&viewer=${viewerChildId}`);
        }}
        onParentEvidence={(toolId) => {
          router.push(`/parent?tool=${toolId}`);
        }}
        onDayTwo={(toolId) => {
          void (async () => {
            const { repositories } = await openIndexedDbRepositories();
            await ensureSecondChildProfile(repositories);
            router.push(`/run?tool=${toolId}&viewer=${LEO_CHILD_ID}`);
          })();
        }}
      />
    </TabletShell>
  );
}
