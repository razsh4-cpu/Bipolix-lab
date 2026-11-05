# LabOps

Management platform for technology labs and makerspaces: equipment, inventory, maintenance and faults, and tasks.
Multi-tenant from day one (Organization → Lab → data). Hebrew RTL UI; code and docs in English.

## Status

| Area | State |
| --- | --- |
| Data model (all MVP modules, multi-tenant) | Done, migrated |
| Email + password login, server-side role checks | Done |
| Dashboard: alerts, truck location and schedule, machine board, material readiness | Done |
| Truck schedule (activities, location, workshops) | Done |
| Procedures per machine / general, versioned | Done |
| Equipment: list, search, create/edit, detail, status | Done |
| Inventory: items, receive/issue/adjust (atomic), history, linked to machines, quick entry | Done |
| Faults & maintenance: report, status, records, plans | Done |
| Tasks: create, assign, my tasks, status, overdue | Done |
| File uploads (equipment images/documents) | Not started |
| User management screen | Not started (use `npm run admin:create`) |
| Spools loaded in Bambu printers (read-only bridge) | Waiting for a test on a real X2D |

## Stack

Next.js 16 (App Router, TypeScript strict, Tailwind 4) · PostgreSQL 16 · Prisma 7 · Better Auth · Zod · Vitest.

## Getting started

```bash
cp .env.example .env              # then fill in values
docker compose up -d db           # or use any PostgreSQL 16
npm install                       # also generates the Prisma client
npx prisma migrate deploy
npm run admin:create -- --email you@example.com --name "Your Name" --org "Organization" --slug org --lab "Lab name" --lab-type MOBILE
npm run lab:machines -- --slug org   # adds the truck's machines: CNC, laser cutter, Cricut, 2× Bambu X2D
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

## Deploying (Vercel + Neon, free tiers)

1. Create a Neon project (region Frankfurt) and copy the **direct** connection string (connection pooling off), because migrations need a direct connection.
2. Import the repository in Vercel (Hobby). `vercel.json` pins functions to `fra1`, close to Neon Frankfurt.
3. Set these environment variables in Vercel → Settings → Environment Variables:
   - `DATABASE_URL`: the Neon connection string
   - `BETTER_AUTH_SECRET`: a random string of 32+ characters
   - `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_PASSWORD` (10+ characters): first deploy only
   - optional: `BOOTSTRAP_ORG_NAME`, `BOOTSTRAP_ORG_SLUG`, and `BETTER_AUTH_URL` if a custom domain is used (otherwise the Vercel production URL is used)
4. Deploy. The `vercel-build` script runs `prisma migrate deploy`, then `scripts/bootstrap.ts` (creates the admin, organization and truck machines once; later builds skip it), then `next build`.
5. After the first login, delete the three `BOOTSTRAP_ADMIN_*` variables.

Note: Vercel's Hobby plan is for non-commercial personal use. Move to a paid plan or institutional hosting if the lab adopts the system officially.
