import { describe, expect, it } from 'vitest';

import { runScriptedFlightLabJourney } from './runScriptedJourney';

describe('scripted Flight Lab journey', () => {
  it('drives Scene 1 through Scene 6 to RUN', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: true });
    expect(result.state).toBe('RUN');
  });
});
