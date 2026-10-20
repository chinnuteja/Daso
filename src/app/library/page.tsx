'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { openIndexedDbRepositories } from '../../adapters/persistence';
import { withBridgeBench, withExperience, withWritingCoach } from '../../ui/flows/experience/browserSession';
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
        <TabletShell title="Kale Memory Lab">
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
      const [sampleOwner, bridgeOwner, writingOwner] = await Promise.all([
        withExperience(false, async (context) => context?.ownerChildId ?? null),
        withBridgeBench(false, async (context) => context?.ownerChildId ?? null),
        withWritingCoach(false, async (context) => context?.ownerChildId ?? null),
      ]);
      const { repositories, database } = await openIndexedDbRepositories();
      const ownerChildIds = [MAYA_CHILD_ID, LEO_CHILD_ID];
      if (sampleOwner !== null && !ownerChildIds.includes(sampleOwner)) ownerChildIds.push(sampleOwner);
      if (bridgeOwner !== null && !ownerChildIds.includes(bridgeOwner)) ownerChildIds.push(bridgeOwner);
      if (writingOwner !== null && !ownerChildIds.includes(writingOwner)) ownerChildIds.push(writingOwner);
      let listed: readonly SavedToolTileView[];
      try {
        listed = await loadSavedTiles(repositories, ownerChildIds);
      }
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
    <TabletShell title="Kale Memory Lab">
      {error !== null ? <p role="alert">{error}</p> : null}
      <HomeScreen
        tiles={tiles}
        loading={loading}
        deletedToolId={deletedToolId}
        deletedProfileId={deletedProfileId}
        onStartTeaching={() => {
          router.push('/lab');
        }}
        onOpenRunner={(toolId, viewerChildId) => {
          const tool = tiles.find((tile) => tile.toolId === toolId);
          router.push(tool?.kind === 'coaching_preference' ? '/' : `/run?tool=${toolId}&viewer=${viewerChildId}`);
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
