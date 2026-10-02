import { Suspense } from 'react';
import { CapabilityParentView } from '../../../ui/parent/CapabilityParentView';
import { TabletShell } from '../../../ui/shell/TabletShell';

export default function ParentToolsPage() {
  return <TabletShell title="The story behind their tools"><Suspense fallback={<p>Opening the parent view…</p>}><CapabilityParentView /></Suspense></TabletShell>;
}
