import { describe, expect, it } from 'vitest';

import { evidenceRequestBody } from '../../src/adapters/agents/evidence';
import { EvidenceRequest } from '../../src/core/ports/evidence';
import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';
import { flightLabProjection } from '../support/evidenceGraph';

/**
 * INV-73 — R3 permits exactly the teaching and evidence routes. The evidence
 * request carries only the strict local projection.
 */

const TEACHING_ROUTE = 'src/app/api/agents/teaching/route.ts';
const EVIDENCE_ROUTE = 'src/app/api/agents/evidence/route.ts';

const FORBIDDEN: readonly { readonly label: string; readonly pattern: RegExp }[] = [
  { label: 'OpenAI SDK or host', pattern: /\bopenai\b/iu },
  { label: 'Anthropic SDK or host', pattern: /\banthropic\b/iu },
  { label: 'Vercel AI SDK', pattern: /@ai-sdk\/|\bfrom\s+['"]ai['"]/u },
  { label: 'API key reference', pattern: /[A-Z0-9_]*API_KEY\b/u },
  { label: 'credential read from the environment', pattern: /process\.env\.[A-Za-z0-9_]*(KEY|TOKEN|SECRET|CREDENTIAL)/u },
  { label: 'model host variable', pattern: /MODEL_PROVIDER_BASE_ADDRESS/u },
];

describe('INV-73 — evidence request is a closed local projection', () => {
  it('INV-73: only the two permitted routes may name a model host, credential, or SDK', () => {
    const offenders = listSourceFiles(SRC_ROOT)
      .filter((file) => file.path !== TEACHING_ROUTE && file.path !== EVIDENCE_ROUTE)
      .flatMap((file) =>
        FORBIDDEN.filter((forbidden) => forbidden.pattern.test(file.text)).map(
          (forbidden) => `${file.path} references ${forbidden.label}`,
        ),
      );
    expect(offenders).toEqual([]);
  });

  it('INV-73: the request schema and outbound body contain only the projection', () => {
    const { projection } = flightLabProjection();
    const parsed = EvidenceRequest.parse({ projection });
    expect(Object.keys(parsed)).toEqual(['projection']);
    expect(EvidenceRequest.safeParse({ projection, ledger: [] }).success).toBe(false);
    expect(EvidenceRequest.safeParse({ projection, trials: [] }).success).toBe(false);
    expect(EvidenceRequest.safeParse({ projection, profile: { childId: 'child_local_01' } }).success).toBe(
      false,
    );
    expect(EvidenceRequest.safeParse({ projection, transcript: ['hello'] }).success).toBe(false);
    expect(EvidenceRequest.safeParse({ projection, grant: 'grant_camera_flight_lab' }).success).toBe(
      false,
    );
    expect(EvidenceRequest.safeParse({ projection, otherToolId: 'other-paper-lab' }).success).toBe(
      false,
    );

    const body = evidenceRequestBody({ projection });
    const encoded = JSON.stringify(body);
    expect(encoded).not.toMatch(/child_local_01/u);
    expect(encoded).not.toMatch(/grant_camera/u);
    expect(body).toEqual({ projection });
    expect(projection.items.some((item) => 'media' in item)).toBe(false);
  });
});
