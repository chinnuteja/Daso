import type { ToolExport } from '../../../core/dataRights';
import { canonicalJson } from '../../../core/serialization/canonicalJson';

export function downloadToolExport(payload: ToolExport): void {
  const blob = new Blob([canonicalJson(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${payload.tool.toolId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
