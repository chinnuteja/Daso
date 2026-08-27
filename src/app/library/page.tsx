'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { openIndexedDbRepositories } from '../../adapters/persistence';
import { withExperience } from '../../ui/flows/experience/browserSession';
import {
  LEO_CHILD_ID,
  MAYA_CHILD_ID,
  ensureSecondChildProfile,
  loadSavedTiles,
  type SavedToolTileView,
} from '../../ui/flows/runner';
import { HomeScreen } from '../../ui/screens/HomeScreen';
import { TabletShell } from '../../ui/shell/TabletShell';

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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const deletedToolId = searchParams.get('deleted');
  const deletedProfileId = searchParams.get('profileDeleted');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sampleOwner = await withExperience(false, async (context) => context?.ownerChildId ?? null);
      const { repositories, database } = await openIndexedDbRepositories();
      let listed: readonly SavedToolTileView[];
      try { listed = await loadSavedTiles(repositories, [MAYA_CHILD_ID, LEO_CHILD_ID, ...(sampleOwner === null ? [] : [sampleOwner])]); }
      finally { database.close(); }
      if (!cancelled) {
        setTiles(listed);
        setLoading(false);
      }
    })().catch(() => { if (!cancelled) { setLoading(false); setError('Saved tools could not be opened. Reload this page to retry.'); } });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TabletShell title="Teach Daso">
      {error !== null ? <p role="alert">{error}</p> : null}
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
            const { repositories, database } = await openIndexedDbRepositories();
            try { await ensureSecondChildProfile(repositories); }
            finally { database.close(); }
            router.push(`/run?tool=${toolId}&viewer=${LEO_CHILD_ID}`);
          })().catch(() => setError('Leo’s profile could not be opened. Your saved tool is unchanged. Please try again.'));
        }}
      />
    </TabletShell>
  );
}
