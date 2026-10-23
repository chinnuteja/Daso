import { DrawStudio } from '../../../ui/draw/DrawStudio';
import { TabletShell } from '../../../ui/shell/TabletShell';

export default function DrawLibraryPage() {
  return (
    <TabletShell title="Draw & play" childDrawing>
      <DrawStudio initialTab="reuse" />
    </TabletShell>
  );
}
