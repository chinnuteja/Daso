'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { openIndexedDbRepositories } from '../adapters/persistence';
import type { ToolDefinition } from '../core/schema/toolDefinition';
import { HomeScreen } from '../ui/screens/HomeScreen';
import { TabletShell } from '../ui/shell/TabletShell';

export default function HomePage() {
  const [tools, setTools] = useState<readonly ToolDefinition[]>([]);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { repositories } = await openIndexedDbRepositories();
      const listed = await repositories.tools.listByOwner('child_local_01');
      if (!cancelled) {
        setTools(listed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TabletShell title="Teach Daso">
      <HomeScreen
        tools={tools}
        onStartTeaching={() => {
          router.push('/journey');
        }}
      />
    </TabletShell>
  );
}
