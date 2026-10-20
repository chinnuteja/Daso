import { SavedDrawTools } from '../../../ui/draw/SavedDrawTools';
import { TabletShell } from '../../../ui/shell/TabletShell';

export default function DrawLibraryPage() {
  return (
    <TabletShell title="My Draw tools">
      <SavedDrawTools />
    </TabletShell>
  );
}
