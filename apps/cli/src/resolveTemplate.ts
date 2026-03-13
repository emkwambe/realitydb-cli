import {
  getDefaultRegistry,
  loadTemplateFromJSON,
  resolveUserTemplate,
  listUserTemplates,
} from '@databox/templates';
import type { DomainTemplate } from '@databox/templates';

/**
 * Resolve a template name to a DomainTemplate.
 *
 * Resolution order:
 * 1. If the name contains '/' or ends with '.json', treat as file path
 * 2. Check built-in templates by name
 * 3. Check user template directory (~/.realitydb/templates/<name>.json)
 * 4. Throw with helpful error
 */
export function resolveTemplate(nameOrPath: string): DomainTemplate {
  // 1. File path (contains / or ends with .json)
  if (nameOrPath.includes('/') || nameOrPath.includes('\\') || nameOrPath.endsWith('.json')) {
    return loadTemplateFromJSON(nameOrPath);
  }

  // 2. Built-in template
  const registry = getDefaultRegistry();
  const builtIn = registry.get(nameOrPath);
  if (builtIn) {
    return builtIn;
  }

  // 3. User template directory
  const userPath = resolveUserTemplate(nameOrPath);
  if (userPath) {
    return loadTemplateFromJSON(userPath);
  }

  // 4. Not found — build helpful error
  const builtInNames = registry.list().map((t) => t.name);
  const userNames = listUserTemplates().map((t) => t.name);
  const allNames = [...builtInNames, ...userNames];

  let msg = `Template "${nameOrPath}" not found.`;
  if (allNames.length > 0) {
    msg += ` Available: ${allNames.join(', ')}`;
  }
  msg += '\n\nTo use a custom template file: realitydb seed --template ./my-template.json';
  msg += '\nTo create a new template: realitydb templates init';

  throw new Error(msg);
}
