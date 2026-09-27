import { DrawWorkbench } from '../../ui/draw/DrawWorkbench';
import { TabletShell } from '../../ui/shell/TabletShell';

export default function DrawPage() {
  return (
    <TabletShell title="Kale Draw">
      <DrawWorkbench />
    </TabletShell>
  );
}
