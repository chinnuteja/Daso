import { DrawStudio } from '../ui/draw/DrawStudio';
import { TabletShell } from '../ui/shell/TabletShell';

export default function HomePage() {
  return (
    <TabletShell title="Kale · Make this a tool">
      <DrawStudio />
    </TabletShell>
  );
}
