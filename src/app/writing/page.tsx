import { ExperienceControls } from '../../ui/coaching/ExperienceControls';
import { WritingPreferenceFlow } from '../../ui/coaching/WritingPreferenceFlow';
import { TabletShell } from '../../ui/shell/TabletShell';

export default function WritingPage() {
  return <TabletShell title="Writing preference · earlier experiment" headerActions={<ExperienceControls />}><WritingPreferenceFlow /></TabletShell>;
}
