import { InquiryFlow } from '../ui/inquiry/InquiryFlow';
import { TabletShell } from '../ui/shell/TabletShell';

export default async function HomePage() {
  return <TabletShell title="Teach Daso"><InquiryFlow /></TabletShell>;
}
