import { POLICY_ALLOWANCES, POLICY_BOUNDARIES, type PolicyBoundary } from './boundaries';

export type PolicyVerdict =
  | { readonly ok: true; readonly allowance: string }
  | { readonly ok: false; readonly boundary: PolicyBoundary | 'unenumerated'; readonly detail: string };

export interface PolicyAttempt {
  readonly intent: string;
}

const ALLOWED = new Set<string>(POLICY_ALLOWANCES);
const DENIED = new Set<string>(POLICY_BOUNDARIES);

/**
 * Deny by default. A request that matches no explicit allowance is denied, so a
 * boundary nobody thought to enumerate fails closed rather than open.
 */
export function evaluatePolicy(attempt: PolicyAttempt): PolicyVerdict {
  if (ALLOWED.has(attempt.intent)) {
    return { ok: true, allowance: attempt.intent };
  }
  if (DENIED.has(attempt.intent)) {
    return {
      ok: false,
      boundary: attempt.intent as PolicyBoundary,
      detail: `denied: ${attempt.intent}`,
    };
  }
  return {
    ok: false,
    boundary: 'unenumerated',
    detail: `denied by default: ${attempt.intent} is not an explicit allowance`,
  };
}

/**
 * Map a raw model payload onto a policy intent. Teaching moves and closed-vocabulary
 * mutations are allowances; anything that looks like a host-boundary violation is named.
 */
export function inspectPolicySubject(input: unknown): PolicyAttempt {
  if (input !== null && typeof input === 'object') {
    const record = input as Readonly<Record<string, unknown>>;
    if ('ledger' in record || 'trials' in record || 'profile' in record || 'transcript' in record) {
      return { intent: 'unenumerated' };
    }
    if (typeof record.intent === 'string') {
      return { intent: record.intent };
    }
    if (record.kind === 'clarifying_question') {
      return { intent: 'ask_clarifying_question' };
    }
    if (record.kind === 'alternatives') {
      return { intent: 'offer_alternatives' };
    }
    if (record.kind === 'explanation') {
      return { intent: 'explain' };
    }
    if (record.kind === 'candidate_mutation' || typeof record.operation === 'string') {
      const encoded = stableInspect(record);
      const boundary = detectBoundary(encoded, record);
      if (boundary !== null) {
        return { intent: boundary };
      }
      return { intent: 'propose_candidate_mutation' };
    }
    const boundary = detectBoundary(stableInspect(record), record);
    if (boundary !== null) {
      return { intent: boundary };
    }
  }
  if (typeof input === 'string') {
    const boundary = detectBoundary(input, {});
    if (boundary !== null) {
      return { intent: boundary };
    }
  }
  return { intent: 'unenumerated' };
}

function detectBoundary(encoded: string, record: Readonly<Record<string, unknown>>): PolicyBoundary | null {
  const text = `${encoded} ${Object.keys(record).join(' ')}`.toLowerCase();
  if (/\b(https?:\/\/|fetch\s*\(|websocket|xmlhttprequest|network)\b/u.test(text)) {
    return 'arbitrary_network';
  }
  if (/\b(contact|email|sms|phone|whatsapp)\b/u.test(text)) {
    return 'unapproved_contacts';
  }
  if (/\bbackground\b/u.test(text) && /\b(microphone|camera)\b/u.test(text)) {
    return 'background_microphone_or_camera';
  }
  if (/\b(location|gps|geolocat|continuous.?track)\b/u.test(text)) {
    return 'continuous_location';
  }
  if (/\b(apk|jni|native.?code|dylib|\.so\b)\b/u.test(text)) {
    return 'generated_native_code';
  }
  if (/\b(filesystem|readfile|writefile|\/etc\/|c:\\\\)\b/u.test(text)) {
    return 'filesystem_outside_sandbox';
  }
  if (/\b(other.?tool|tool-to-tool|cross.?tool)\b/u.test(text)) {
    return 'tool_to_tool_without_capability';
  }
  if (/\b(publish|public.?share|marketplace|social.?post)\b/u.test(text)) {
    return 'public_publishing';
  }
  if (/\b(runner.?mode|undeclared.?model|llm.?in.?runner)\b/u.test(text)) {
    return 'undeclared_runner_model';
  }
  return null;
}

function stableInspect(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
}
