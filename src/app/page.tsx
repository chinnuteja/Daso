import { DrawStudio } from '../ui/draw/DrawStudio';
import { TabletShell } from '../ui/shell/TabletShell';

export default function HomePage() {
  return (
    <TabletShell title="Draw & play" childDrawing>
      <DrawStudio />
    </TabletShell>
  );
}
