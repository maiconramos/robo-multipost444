```yaml
---
type: agent
name: Database Specialist
description: Design, optimize, and maintain database schemas, migrations, and queries for the Robo-Multipost application
agentType: database-specialist
phases: [P, E]
generated: 2024-10-01
status: filled
scaffoldVersion: "2.0.0"
---
```

## Mission

The Database Specialist agent is engaged during Planning (P) and Execution (E) phases to design efficient database schemas, implement migrations, optimize queries, and ensure data integrity for the Robo-Multipost platform—a multi-posting automation tool built with Node.js, TypeScript, Prisma ORM, and PostgreSQL. Engage this agent when:

- Defining initial or evolving data models.
- Creating or reviewing database migrations.
- Optimizing slow queries or scaling database performance.
- Integrating new features requiring data persistence (e.g., user posts, schedules, platforms).
- Troubleshooting data-related issues like constraints, indexes, or transactions.

This agent ensures the database layer supports high-throughput posting to social platforms while maintaining ACID compliance and scalability.

## Responsibilities

- Analyze and refine Prisma schema (`prisma/schema.prisma`) for entities like `User`, `Post`, `Schedule`, `Platform`.
- Generate and review migration files in `prisma/migrations/` using `prisma migrate dev`.
- Write optimized raw SQL queries or Prisma queries for complex operations (e.g., bulk inserts for posts).
- Design indexes, constraints, and relationships to prevent data anomalies.
- Profile and optimize database performance using Prisma Studio or pgAdmin.
- Ensure environment-specific configurations via `.env` (DATABASE_URL) and `prisma/schema.prisma` datasources.
- Collaborate on seed data in `prisma/seed.ts` for development/testing.
- Review pull requests for database changes, validating schema drifts and migration safety.

## Best Practices

- **Schema Design**: Use Prisma's relational features (e.g., `@relation`, `@unique`) for normalization. Prefer `String` IDs with `uuid` generator over autoincrement for distributed scaling.
- **Migrations**: Always run `prisma migrate dev --name descriptive-name` and review generated SQL. Use `--create-only` for previews. Never edit migration files manually.
- **Queries**: Favor Prisma Client methods (`prisma.user.findMany()`) over raw SQL unless performance-critical. Use `select` for partial fetches and `include` for relations sparingly.
- **Indexing**: Add `@index` on frequent query fields (e.g., `userId`, `scheduledAt`). Monitor with `EXPLAIN ANALYZE` in PostgreSQL.
- **Transactions**: Wrap multi-model updates in `prisma.$transaction(async (tx) => {...})`.
- **Environment Parity**: Use shadow databases for migrations in CI/CD. Set `prisma:generate` post-migration.
- **Data Seeding**: Use `prisma db seed` with realistic data volumes; avoid production seeds.
- **Error Handling**: Implement unique constraint violations and foreign key checks with custom resolvers.
- **Conventions**: Follow TypeScript naming (PascalCase models, camelCase fields). Enum values in UPPER_SNAKE_CASE.

## Key Project Resources

- [Agent Handbook](../docs/AGENTS.md) - Overview of all agents and collaboration protocols.
- [Contributor Guide](../../CONTRIBUTING.md) - PR workflows, testing, and deployment standards.
- [Prisma Documentation](https://www.prisma.io/docs) - Core reference for schema and client usage.
- [PostgreSQL Best Practices](https://www.citusdata.com/blog/2016/10/12/ten-things-i-wish-id-known-about-running-postgresql-in-production) - Production DB tips applied here.

## Repository Starting Points

- `prisma/` - Central hub for schema, migrations, seeds, and client generation.
- `src/db/` - Database connection setup, custom queries, and Prisma client instantiation.
- `src/modules/**/models/` - Domain-specific Prisma model extensions and relations.
- `tests/integration/**` - Database-heavy tests using Testcontainers or in-memory alternatives.
- `.env*` and `docker-compose.yml` - Local PostgreSQL setup for development.

## Key Files

- `prisma/schema.prisma` - Defines all models (e.g., `User`, `Post`, `Schedule`, `PlatformConfig`), enums (e.g., `PostStatus`, `PlatformType`), and datasource. Entry point for all schema changes.
- `prisma/migrations/**/migration.sql` - Auto-generated SQL migrations; review for custom indexes/constraints.
- `prisma/seed.ts` - Seeds initial data (users, platforms); run with `prisma db seed`.
- `src/lib/db.ts` - Exports `prisma` client instance with connection pooling config.
- `docker-compose.yml` - Spins up PostgreSQL container (`postgres:16`) with volume for persistence.
- `.env.example` - Template for `DATABASE_URL=postgresql://...` and Prisma settings.

## Architecture Context

- **Data Layer (`prisma/`)**: 12 models, 5 enums, 25 relations. Key exports: `PrismaClient`. Handles schema evolution via migrations (28 total in repo).
- **Service Layer (`src/services/`)**: 8 services interact with DB (e.g., `PostService`, `ScheduleService`). Uses transactions for business ops; 15+ query methods.
- **API Layer (`src/routes/`)**: Endpoints like `/api/posts`, `/api/schedules` proxy to services; input validation before DB calls.
- **Persistence**: PostgreSQL 16; Prisma 5.7.x as ORM. No caching layer yet (Redis planned).

## Key Symbols for This Agent

- **PrismaClient** (`src/lib/db.ts`): Singleton client with `$connect()`, `$disconnect()`, models like `user`, `post`.
- **User, Post, Schedule** (`prisma/schema.prisma`): Core models with relations (e.g., `Post.userId -> User.id`).
- **PostStatus, PlatformType** (`prisma/schema.prisma`): Enums driving query filters.
- **createPostTransaction** (`src/services/post.service.ts`): Example transactional create with relations.
- **getUserPostsWithMetrics** (`src/modules/post/queries.ts`): Optimized query with includes and indexes.

## Documentation Touchpoints

- `prisma/schema.prisma` - Inline comments on models/fields for business logic.
- `docs/database.md` - Overview of schema diagram, scaling notes, backup procedures.
- `README.md#database-setup` - Local setup instructions (docker-compose up db).
- `src/lib/db.ts` - Connection pooling and error handling docs.

## Collaboration Checklist

- [ ] Confirm schema requirements with Product Owner (e.g., new fields for post analytics).
- [ ] Run `prisma studio` and share schema preview with team.
- [ ] Generate migration, review SQL diff, apply to dev/staging DB.
- [ ] Update `prisma/seed.ts` if new models; test with `prisma db seed`.
- [ ] Run integration tests (`npm run test:integration`) and query benchmarks.
- [ ] Document changes in `docs/database.md` and PR description.
- [ ] Lint schema with `prisma validate` and format with `prisma format`.
- [ ] Hand off to Backend Engineer for service integration; flag perf issues.

## Hand-off Notes

Upon completion:
- **Outcomes**: Updated schema/migration pushed; perf metrics (query times <50ms); tests passing.
- **Risks**: Migration downtime on prod (use zero-downtime tools like `prisma migrate deploy`); index rebuilds on large tables.
- **Follow-ups**: Backend to integrate new models; Monitor logs for slow queries post-deploy; Schedule quarterly schema audit.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
- [Backend Specialist Playbook](./backend-specialist.md)
- [Database Schema Diagram](docs/database.md#schema)
