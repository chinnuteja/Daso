'use client';

import { Suspense } from 'react';

import { ParentEvidenceFlow } from '../../ui/flows/parentEvidence/ParentEvidenceFlow';
import { TabletShell } from '../../ui/shell/TabletShell';

export default function ParentPage() {
  return (
    <Suspense
      fallback={
        <TabletShell title="Parent evidence">
          <p>Opening the parent view…</p>
        </TabletShell>
      }
    >
      <ParentEvidenceFlow />
    </Suspense>
  );
}
