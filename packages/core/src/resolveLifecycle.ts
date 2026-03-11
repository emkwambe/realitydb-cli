import type { LifecycleDefinition } from '@databox/shared';
import { saasLifecycle, fintechLifecycle } from '@databox/templates';

const lifecycleMap = new Map<string, LifecycleDefinition>([
  ['saas', saasLifecycle],
  ['fintech', fintechLifecycle],
]);

/**
 * Resolves a template name to its lifecycle definition.
 * Returns undefined if no lifecycle exists for the template.
 */
export function resolveLifecycle(templateName: string): LifecycleDefinition | undefined {
  return lifecycleMap.get(templateName);
}

/**
 * Returns all available lifecycle names.
 */
export function getAvailableLifecycles(): string[] {
  return Array.from(lifecycleMap.keys());
}
