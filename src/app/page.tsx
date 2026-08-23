'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [tiles, setTiles] = useState<readonly SavedToolTileView[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
        onStartTeaching={() => {
          router.push('/journey');
        }}
        onOpenRunner={(toolId, viewerChildId) => {
          router.push(`/run?tool=${toolId}&viewer=${viewerChildId}`);
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
