# RealityDB + Docker Compose

Spin up a Postgres database and seed it with realistic data in one step.

## Usage

1. Add your `schema.sql` to this directory
2. Start Postgres:
   ```bash
   docker compose up -d
   ```
3. Seed with realistic data:
   ```bash
   npx realitydb seed --template saas --records 1000 --seed 42
   ```

## Configuration

Create a `realitydb.config.json`:

```json
{
  "database": {
    "client": "postgres",
    "connectionString": "postgres://postgres:postgres@localhost:5432/app_db"
  },
  "seed": {
    "defaultRecords": 1000,
    "batchSize": 1000,
    "randomSeed": 42
  },
  "template": "saas"
}
```

## Teardown

```bash
docker compose down -v
```
