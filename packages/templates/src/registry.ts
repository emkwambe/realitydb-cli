import type { DomainTemplate, TableTemplateConfig } from './types.js';
import { saasTemplate } from './domains/saas.js';
import { ecommerceTemplate } from './domains/ecommerce.js';

export class TemplateRegistry {
  private templates: Map<string, DomainTemplate> = new Map();

  register(template: DomainTemplate): void {
    this.templates.set(template.name, template);
  }

  get(name: string): DomainTemplate | undefined {
    return this.templates.get(name);
  }

  list(): DomainTemplate[] {
    return [...this.templates.values()];
  }

  matchTable(templateName: string, tableName: string): TableTemplateConfig | null {
    const template = this.templates.get(templateName);
    if (!template) {
      return null;
    }

    // Exact match first
    for (const [, config] of template.tableConfigs) {
      if (matchesPattern(config.matchPattern, tableName, 'exact')) {
        return config;
      }
    }

    // Pattern match second
    for (const [, config] of template.tableConfigs) {
      if (matchesPattern(config.matchPattern, tableName, 'pattern')) {
        return config;
      }
    }

    return null;
  }
}

function matchesPattern(
  pattern: string | string[],
  tableName: string,
  mode: 'exact' | 'pattern',
): boolean {
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  const lowerTableName = tableName.toLowerCase();

  for (const p of patterns) {
    const lowerPattern = p.toLowerCase();

    if (mode === 'exact') {
      if (lowerTableName === lowerPattern) {
        return true;
      }
    } else {
      // Wildcard matching: *user* matches "users", "app_users", etc.
      if (lowerPattern.includes('*')) {
        const regex = new RegExp(
          '^' + lowerPattern.replace(/\*/g, '.*') + '$',
        );
        if (regex.test(lowerTableName)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Factory function that returns a new empty registry.
 */
export function createTemplateRegistry(): TemplateRegistry {
  return new TemplateRegistry();
}

/**
 * Returns a registry pre-loaded with all built-in templates.
 */
export function getDefaultRegistry(): TemplateRegistry {
  const registry = new TemplateRegistry();
  registry.register(saasTemplate);
  registry.register(ecommerceTemplate);
  return registry;
}
