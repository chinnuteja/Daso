'use client';

import { JourneyFlow } from '../../ui/flows/JourneyFlow';
import { TabletShell } from '../../ui/shell/TabletShell';

export default function JourneyPage() {
  return (
    <TabletShell title="Teach a tool">
      <JourneyFlow />
    </TabletShell>
  );
}
