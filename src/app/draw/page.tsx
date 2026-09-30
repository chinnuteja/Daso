import Link from 'next/link';

import { DrawWorkbench } from '../../ui/draw/DrawWorkbench';
import { TabletShell } from '../../ui/shell/TabletShell';

export default function DrawPage() {
  return (
    <TabletShell title="Kale Draw" headerActions={<Link href="/draw/library">My Draw tools</Link>}>
      <DrawWorkbench />
    </TabletShell>
  );
}
