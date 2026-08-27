import { ExperienceFlow } from '../ui/experience/ExperienceFlow';
import { createExperiencePreview } from '../ui/flows/experience/session';
import { TabletShell } from '../ui/shell/TabletShell';

export default async function HomePage() {
  const preview = await createExperiencePreview();
  return <TabletShell title="Teach Daso"><ExperienceFlow preview={preview} /></TabletShell>;
}
