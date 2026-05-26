# Operations

Last updated: May 26, 2026

## Backup and Restore (PostgreSQL)

- Backup
  - Use `pg_dump` against the production database.
  - Example:
    - `pg_dump --format=custom --file=backup.dump $DATABASE_URL`
- Restore
  - Use `pg_restore` to a target database.
  - Example:
    - `pg_restore --clean --if-exists --dbname=$DATABASE_URL backup.dump`

Notes:
- Store backups in an encrypted, access-controlled location.
- Test restores on a staging database on a regular cadence.

## Migration Strategy

- Use Prisma migrations for schema changes.
- In dev:
  - `npx prisma migrate dev`
- In staging/production:
  - `npx prisma migrate deploy`
- Keep backward-compatible migrations when possible.
- Verify application and database versions before deploy.

## CI/CD (Placeholder)

- Build: `npm run build`
- Test: `npm run test`
- Lint: `npm run lint` (add if needed)
- Deploy:
  - Build server image
  - Run migrations
  - Deploy app

## Staging Environment (Placeholder)

- Maintain a staging environment with production-like settings.
- Use a separate database and PayMongo test keys.
- Run migrations and smoke tests before production deploys.

## Rollback Strategy (Placeholder)

- Keep the previous server build available for rollback.
- Restore the last known good database backup if needed.
- Prefer forward-fix migrations where possible.
