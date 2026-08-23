'use client';

import { Suspense } from 'react';

import { RunnerFlow } from '../../ui/flows/runner/RunnerFlow';
import { TabletShell } from '../../ui/shell/TabletShell';

export default function RunPage() {
  return (
    <Suspense
      fallback={
        <TabletShell title="Runner Mode">
          <p>Opening the saved tool…</p>
        </TabletShell>
      }
    >
      <RunnerFlow />
    </Suspense>
  );
}
