# DataBox

**Developer Reality Platform** — Generate realistic, schema-aware data ecosystems so you never start with an empty database.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
pnpm build
```

## Package Map

| Package | Path | Description |
|---------|------|-------------|
| `@databox/cli` | `apps/cli/` | CLI interface (thin) |
| `@databox/core` | `packages/core/` | Orchestration + Generation Plan types |
| `@databox/schema` | `packages/schema/` | DB introspection + normalized schema model |
| `@databox/generators` | `packages/generators/` | Data generation engine |
| `@databox/templates` | `packages/templates/` | Domain templates (SaaS, ecommerce, education) |
| `@databox/db` | `packages/db/` | Database connection + batch writer |
| `@databox/config` | `packages/config/` | Config loader |
| `@databox/shared` | `packages/shared/` | Logger, PRNG, common types |

## License

MIT
