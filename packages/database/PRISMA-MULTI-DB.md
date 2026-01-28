# Prisma Multi-Database Support

## The Problem

Prisma's `provider` field does NOT support environment variables:

```prisma
datasource db {
  provider = env("DB_PROVIDER")  // ❌ Doesn't work!
  url      = env("DATABASE_URL")  // ✅ Works
}
```

This is a Prisma limitation, not a bug in our code.

## The Solution

We use **dynamic schema generation** - a script automatically updates the schema provider before running Prisma commands.

## How It Works

### 1. Set DB_TYPE Environment Variable

```bash
export DB_TYPE=postgresql  # or mysql, sqlite
```

### 2. Run Prisma Commands (Schema Auto-Generated)

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Deploy migrations (production)
pnpm prisma:deploy
```

The `schema:generate` script runs automatically before each Prisma command and updates the provider:

```prisma
datasource db {
  provider = "postgresql"  // Auto-updated based on DB_TYPE
  url      = env("DATABASE_URL")
}
```

## Supported Databases

| DB_TYPE      | Prisma Provider | Connection String                                  |
| ------------ | --------------- | -------------------------------------------------- |
| `mysql`      | `mysql`         | `MYSQL_URL=mysql://user:pass@host:3306/db`         |
| `postgresql` | `postgresql`    | `POSTGRES_URL=postgresql://user:pass@host:5432/db` |
| `sqlite`     | `sqlite`        | `SQLITE_FILE=./data/config.db`                     |

## Examples

### Use with MySQL

```bash
export DB_TYPE=mysql
export MYSQL_URL="mysql://root:password@localhost:3306/config_db"
export DATABASE_URL=$MYSQL_URL

pnpm prisma:generate
pnpm prisma:migrate
```

### Use with PostgreSQL (Supabase)

```bash
export DB_TYPE=postgresql
export POSTGRES_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
export DATABASE_URL=$POSTGRES_URL

pnpm prisma:generate
pnpm prisma:migrate
```

### Use with SQLite

```bash
export DB_TYPE=sqlite
export SQLITE_FILE="./data/config.db"
export DATABASE_URL="file:./data/config.db"

pnpm prisma:generate
pnpm prisma:migrate
```

## Manual Schema Generation

If needed, you can run the schema generator manually:

```bash
DB_TYPE=postgresql pnpm schema:generate
```

This updates `prisma/schema.prisma` with the correct provider.

## For Deployment

### Heroku

```bash
# Heroku automatically sets DATABASE_URL for PostgreSQL
heroku config:set DB_TYPE=postgresql

# Buildpack will run prisma:generate automatically
```

### Cloudflare Workers

```bash
# Use D1 instead (custom adapter, not Prisma)
# No schema generation needed
```

### Docker

```dockerfile
ENV DB_TYPE=postgresql
ENV POSTGRES_URL="postgresql://user:pass@db:5432/db"
ENV DATABASE_URL=$POSTGRES_URL

RUN pnpm --filter @config/database prisma:generate
```

## Why Not Multiple Schema Files?

We could have separate files like:

- `schema.mysql.prisma`
- `schema.postgresql.prisma`
- `schema.sqlite.prisma`

But this would require:

- Duplicating the entire schema (harder to maintain)
- Changing Prisma commands to specify the schema file
- More complexity in deployment scripts

**Dynamic generation is simpler** - one source of truth, auto-updated based on DB_TYPE.

## Troubleshooting

### Error: "Unknown provider"

```bash
# Make sure DB_TYPE is set
export DB_TYPE=postgresql

# Regenerate schema
pnpm schema:generate

# Then run Prisma command
pnpm prisma:generate
```

### Error: "DATABASE_URL not set"

```bash
# Set both DB_TYPE and connection URL
export DB_TYPE=postgresql
export POSTGRES_URL="your-connection-string"
export DATABASE_URL=$POSTGRES_URL
```

### Schema not updating

The schema file is in `packages/database/prisma/schema.prisma`.

Check it was updated:

```bash
cat packages/database/prisma/schema.prisma | grep provider
```

Should show:

```
  provider = "postgresql"  # or your DB_TYPE
```

---

**Status:** ✅ Automatic schema generation configured
**No code changes needed** - just set `DB_TYPE` environment variable!
