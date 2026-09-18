import { ExperienceControls } from '../ui/coaching/ExperienceControls';
import { WritingPreferenceFlow } from '../ui/coaching/WritingPreferenceFlow';
import { TabletShell } from '../ui/shell/TabletShell';

export default async function HomePage() {
  return (
    <TabletShell title="Kale Memory Lab" headerActions={<ExperienceControls />}>
      <WritingPreferenceFlow />
    </TabletShell>
  );
}
