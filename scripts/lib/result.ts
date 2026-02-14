import type { ScriptResult } from './types.js';

export function success<T>(data: T, warnings?: string[]): ScriptResult<T> {
  const result: ScriptResult<T> = { success: true, data };
  if (warnings && warnings.length > 0) {
    result.warnings = warnings;
  }
  return result;
}

export function failure(error: string): ScriptResult<never> {
  return { success: false, error };
}

export function outputResult(result: ScriptResult): void {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.success ? 0 : 1);
}
