# LabOps

Management platform for technology labs and makerspaces: equipment, inventory, maintenance and faults, and tasks.
Multi-tenant from day one (Organization → Lab → data). Hebrew RTL UI; code and docs in English.

## Status

| Area | State |
| --- | --- |
| Data model (all MVP modules, multi-tenant) | Done, migrated |
| Email + password login, server-side role checks | Done |
| Dashboard (real data, empty state, mobile) | Done |
| Equipment, Inventory, Maintenance, Tasks screens | Not started |

## Stack

Next.js 16 (App Router, TypeScript strict, Tailwind 4) · PostgreSQL 16 · Prisma 7 · Better Auth · Zod · Vitest.

## Getting started

```bash
cp .env.example .env              # then fill in values
docker compose up -d db           # or use any PostgreSQL 16
npm install                       # also generates the Prisma client
npx prisma migrate deploy
npm run admin:create -- --email you@example.com --name "Your Name" --org "Organization" --slug org --lab "Lab name" --lab-type MOBILE
npm run dev                       # http://localhost:3000
```

There is no self sign-up: users are created by an administrator.

### Demo data (development only)

`npm run seed:demo` creates a separate organization whose every record is labelled `[Demo]`.
Sign in as `admin@demo.local`, `instructor@demo.local` or `viewer@demo.local` with password `demo-password-123`.
The script refuses to run when `NODE_ENV=production`.

## Checks

```bash
npm run typecheck
npm run lint
npm test          # unit + integration; needs a database whose name ends in _test (labops_test)
npm run build
```

## Design rules enforced in code

- Every operational table has `organizationId`; queries are scoped by the signed-in user's organization.
- Permissions live in `src/lib/permissions.ts` and are checked on the server.
- Inventory quantity cannot go negative (database CHECK constraint).
- `InventoryTransaction` and `AuditLog` are append-only (database triggers block UPDATE and DELETE).
- Maintenance plans must record their source (manufacturer or admin); intervals are never invented.
- Deactivated users cannot sign in.
