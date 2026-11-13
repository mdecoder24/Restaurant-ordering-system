# Krudex

QR ordering for restaurants and canteens. Guests scan a table QR, order and pay from their phone with no app. The kitchen works from a live screen; the floor runs from a live board; owners manage menu, tables, staff, payments and reports.

| Who | Where | What they do |
| --- | --- | --- |
| Guest | `/t/<qr>` (from the QR) | Browse, filter, customise, order, track live, pay, download receipt, call a waiter |
| Owner / manager | `/app` | Live orders, tables and bills, menu, payments and refunds, analytics, staff, settings |
| Floor / counter staff | `/pin/<outlet>` → `/app/orders` | Accept, serve, settle bills (cash/card/UPI), canteen handover |
| Kitchen | `/kds/<outlet>` | Ticket queue, start, ready, per-item ticks, alerts |
| Canteen TV | `/display/<outlet>` | Public token board: Preparing / Ready |
| Platform operator | `/admin` | Tenants, plans, suspend / reactivate |

## Run it locally

Needs Node 24, pnpm, and Docker (for the local Supabase stack).

```bash
pnpm install
pnpm db:start          # Supabase in Docker: Postgres, Auth, Realtime, Storage
pnpm db:reset          # applies migrations and loads the demo seed
cp apps/web/.env.example apps/web/.env.local   # then fill from `npx supabase status`
pnpm dev               # http://localhost:3000
```

`.env.local` for local work (all values come from `npx supabase status`):

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
SUPABASE_JWT_SECRET=<JWT_SECRET>
GUEST_SESSION_SECRET=<openssl rand -hex 32>
```

### Demo data (from `supabase/seed.sql`)

| Login | Credentials |
| --- | --- |
| Owner (Spice Route Kitchens: Indiranagar dine-in + Campus Canteen) | `owner@demo.krudex.test` / `krudex-demo-2026` |
| Platform admin | `admin@demo.krudex.test` / `krudex-demo-2026` |
| Kitchen PIN (Indiranagar) | `1234` |
| Floor PIN (Indiranagar) | `5678` |
| Counter PIN (Campus Canteen) | `2468` |

The dine-in outlet has a 30-item menu and tables T1–T10. Open **Tables**, pick a table, and use **Open guest view** to order as a guest. Staff → **Device sign-in links** gives the PIN and kitchen-screen URLs.

Without Razorpay keys, online payment uses a **local test gateway** ("Simulate successful payment"). It only runs on `localhost`; on a real domain online payment stays off until Razorpay is configured.

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test   # unit tests; packages/core at 100% branch coverage
pnpm test:db                               # pgTAP: RLS isolation, orders, analytics
pnpm e2e                                   # Playwright on a production build (phone + desktop)
```

## Going live

Everything below needs accounts and secrets that belong to the restaurant, so it is done by the owner (or with them), not committed to the repo.

1. **Supabase project** (Mumbai region recommended). Run `npx supabase link --project-ref <ref>` then `npx supabase db push` to apply `supabase/migrations`. Do **not** run `seed.sql` in production. Enable the `pg_cron` extension (the migration schedules analytics rollups). Configure Auth → SMTP so staff invites are delivered, and set Site URL to your domain.
2. **Razorpay** (live or test mode): create API keys and a webhook pointing to `https://<domain>/api/webhooks/razorpay` with events `payment.captured`, `payment.failed`, `refund.processed`.
3. **Hosting** (Vercel recommended): import the repo with root `apps/web`, and set:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_APP_URL` | `https://<your domain>` (QR codes encode this, so set it before printing) |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` | Supabase → Settings → API (server only) |
   | `GUEST_SESSION_SECRET` | 64 random hex characters |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay dashboard |

4. **First owner**: sign up at `/signup`, or make yourself a platform admin (SQL in `supabase/migrations/20261113000800_platform_admin.sql`) and create the tenant from `/admin`.
5. **On site**: build the menu, add tables, print the table tents (Tables → **All QR codes**), add staff with PINs, open the kitchen screen on the kitchen tablet, place one test order from a phone, settle and close the table.

Scaling note: rate limiting is in-process memory. On one server that is fine; before running several instances, move it to Redis/Upstash (`apps/web/lib/rate-limit`). Load test: `apps/web/tests/load/order-placement.js` (k6), against staging only.

## Project map

- `apps/web` — Next.js 16 app (route groups: `(guest)`, `(dashboard)`, `(kds)`, `(auth)`, `(admin)`; APIs in `app/api`)
- `packages/core` — pricing (`computeBill`), order state machine, Zod schemas, formatting
- `supabase/migrations` — schema, RLS, SQL functions, realtime triggers; `supabase/tests` — pgTAP
- `docs/` — PRD, architecture, design system, flows, testing guide; `docs/decisions.md` logs every choice made where the specs were silent
