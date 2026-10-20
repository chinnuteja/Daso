import type { ExperimentTrial } from '../schema/experimentTrial';
import type { ToolRule } from '../schema/vocabulary';

/**
 * Apply the frozen rule vocabulary in stored order. Each projection starts from the
 * historical `validAtCapture` value. A matching equality condition may change only
 * `trial.valid`. The caller's trial object is never mutated.
 */
export function projectTrial(
  trial: ExperimentTrial,
  rules: readonly ToolRule[],
): { readonly trialId: ExperimentTrial['trialId']; readonly validUnderCurrentVersion: boolean } {
  let valid = trial.validAtCapture;
  for (const rule of rules) {
    if (conditionMatches(trial, rule.when.field, rule.when.equals) && rule.effect.set === 'trial.valid') {
      valid = rule.effect.value;
    }
  }
  return { trialId: trial.trialId, validUnderCurrentVersion: valid };
}

function conditionMatches(
  trial: ExperimentTrial,
  field: ToolRule['when']['field'],
  equals: ToolRule['when']['equals'],
): boolean {
  switch (field) {
    case 'design_name':
      return trial.designName === equals;
    case 'distance_m':
      return trial.distanceM === equals;
    case 'load_count':
      return trial.loadCount === equals;
    case 'obstruction':
      return trial.obstruction === equals;
    case 'setup_changed':
      return trial.setupChanged === equals;
    case 'note':
      return trial.note === equals;
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}
