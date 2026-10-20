import type { ReadingBand } from '../../core/schema/vocabulary';
import type { ValidationCheck } from '../../core/validator';
import type { PolicyBoundary } from '../../core/policy';

const VALIDATION_COPY: Record<ValidationCheck, Record<ReadingBand, string>> = {
  schema: {
    emerging: 'Kale does not know that kind of change.',
    developing: 'That change is not a kind Flight Lab can learn.',
    fluent: 'The candidate is outside the supported tool schema.',
  },
  capabilities: {
    emerging: 'This tool is not allowed to do that.',
    developing: 'That needs a permission this tool does not have.',
    fluent: 'The candidate names a capability with no in-scope grant.',
  },
  types: {
    emerging: 'That piece does not fit.',
    developing: 'That field or result is not one Flight Lab uses.',
    fluent: 'The candidate uses an input or effect type that is not allowed.',
  },
  limits: {
    emerging: 'The tool is full.',
    developing: 'Flight Lab cannot hold any more of those.',
    fluent: 'The candidate would exceed a declared resource limit.',
  },
  provenance: {
    emerging: 'We do not know where that came from.',
    developing: 'A rule has to come from something you approved.',
    fluent: 'Provenance must be stamped by the fold, never supplied.',
  },
  determinism: {
    emerging: 'That change is too messy to keep.',
    developing: 'Flight Lab can only keep changes it can do the same way every time.',
    fluent: 'The candidate cannot be represented deterministically.',
  },
};

const POLICY_COPY: Record<PolicyBoundary | 'unenumerated', Record<ReadingBand, string>> = {
  arbitrary_network: {
    emerging: 'This tool cannot talk to the internet.',
    developing: 'Flight Lab is not allowed to make network calls.',
    fluent: 'Arbitrary network access is denied.',
  },
  unapproved_contacts: {
    emerging: 'This tool cannot message people.',
    developing: 'Flight Lab cannot contact anyone.',
    fluent: 'Unapproved contacts are denied.',
  },
  background_microphone_or_camera: {
    emerging: 'The camera and mic only work while you are looking.',
    developing: 'The camera and microphone cannot run in the background.',
    fluent: 'Background microphone or camera capture is denied.',
  },
  continuous_location: {
    emerging: 'This tool cannot follow where you go.',
    developing: 'Flight Lab cannot keep tracking location.',
    fluent: 'Continuous location tracking is denied.',
  },
  generated_native_code: {
    emerging: 'This tool cannot install extra programs.',
    developing: 'Flight Lab cannot generate native code.',
    fluent: 'Generated native code is denied.',
  },
  filesystem_outside_sandbox: {
    emerging: 'This tool cannot open other files.',
    developing: 'Flight Lab cannot read or write files outside its sandbox.',
    fluent: 'Filesystem access outside the sandbox is denied.',
  },
  tool_to_tool_without_capability: {
    emerging: 'This tool cannot use another tool by itself.',
    developing: 'Flight Lab cannot reach another tool without an explicit capability.',
    fluent: 'Tool-to-tool access without an explicit capability is denied.',
  },
  public_publishing: {
    emerging: 'This tool cannot post in public.',
    developing: 'Flight Lab cannot publish anything publicly.',
    fluent: 'Public publishing is denied.',
  },
  undeclared_runner_model: {
    emerging: 'The saved tool does not call Kale.',
    developing: 'Runner Mode cannot secretly ask a model.',
    fluent: 'Undeclared model invocation during Runner Mode is denied.',
  },
  unenumerated: {
    emerging: 'Kale is not allowed to do that.',
    developing: 'That request is not on the allowed list, so it is refused.',
    fluent: 'The request matches no explicit allowance and is denied by default.',
  },
};

export function validationRejectionCopy(check: ValidationCheck, readingBand: ReadingBand): string {
  return VALIDATION_COPY[check][readingBand];
}

export function policyRejectionCopy(
  boundary: PolicyBoundary | 'unenumerated',
  readingBand: ReadingBand,
): string {
  return POLICY_COPY[boundary][readingBand];
}
