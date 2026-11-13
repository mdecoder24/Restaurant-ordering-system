# Decisions

Format: date · decision · reason. Per AGENTS.md §2, unspecified choices are recorded here.

## 2026-11-13 · T01/T02 foundation

- **Product name "Krudex"**, held in `apps/web/lib/brand.ts`. Chosen by the owner; PRD ground rule 1 forbids reusing the reference brand.
- **Next.js 16.4 with `cacheComponents` + `partialPrefetching`**. Current stable at scaffold time; PPR-by-default suits the server-rendered guest menu. Request APIs (`cookies`, `params`) are async-only in 16; `proxy.ts` replaces `middleware.ts`.
- **pnpm workspaces without Turborepo.** Two packages do not need a task runner; revisit if CI time grows.
- **Tailwind v4 CSS-first config** (`@theme inline reference` in `app/globals.css`) instead of `tailwind.config.ts` named in Design System §10. v4 has no JS config by default. `reference` stops Tailwind emitting theme vars that would shadow `tokens.css` with self-referencing values. The default palette is cleared so only tokens exist as utilities.
- **Darkened text-bearing colours for WCAG AA.** Design System §2 asks for 4.5:1 checks. Light `#E4572E` primary (3.5:1 on bg) → `#C2410C`; warning `#C98A04` (2.8:1) → `#8A5A00`; success `#1E8E5A` (3.7:1 on surface-2) → `#18794C`; danger `#C93A3A` (4.5 on surface-2 fails) → `#B42F2F`. Added dark-theme semantic and status values (the doc only defined dark neutrals). Gated by `apps/web/app/tokens.test.ts`, which parses the real `tokens.css`.
- **Added tokens** not in the doc: `--color-primary-hover`, `--color-primary-soft`, `--color-surface-3`, `--color-border-strong`, `--color-overlay`, `--color-on-solid`, `--shadow-lg`, `--radius-pill` mapping, stronger easing curves (`--ease-out`, `--ease-in-out`, `--ease-drawer`) alongside the doc's `--ease-standard`, and per-density type/control tokens (`[data-density="guest|dashboard|kds"]`).
- **Dashboard controls are 40px tall** with an invisible `hit-area` extending taps to 44px, meeting the 44px minimum while staying compact.
- **Primitives built directly on Radix (`radix-ui`)** rather than via the shadcn CLI, so each wrapper has only the fixed variants the Design System lists.
- **`vaul` for Sheet** (new dependency): bottom sheet with velocity-based drag-to-dismiss on phones, right drawer from 768px. Built on Radix Dialog, so focus trap/Escape are standard. `autoFocus` is on; the first focusable is Close, so no keyboard pops up.
- **`sonner` for Toast** (new dependency): pauses on hidden tabs, swipe to dismiss, `visibleToasts={1}` on guest.
- **`/preview` is gated** by `previewEnabled` (always on in dev; `NEXT_PUBLIC_ENABLE_PREVIEW=true` in production builds). Returns 404 otherwise.
- **Env split**: `lib/env.ts` (public, Zod-validated) and `lib/env.server.ts` (`server-only`, secrets optional until their task; consumers call `requireServerEnv`).
- **Raw-colour guard**: `scripts/check-raw-hex.mjs` (part of `pnpm lint`) fails on hex or arbitrary colour utilities outside `tokens.css` and `lib/theme-colors.ts` (viewport meta needs literals).
- **Local e2e uses installed Chrome** (`channel: "chrome"`); CI installs Playwright Chromium.
- **`supabase` CLI as a root devDependency** (installed via npm before T01 started; moved under pnpm). Used from T03.

## 2026-11-13 — UI polish pass (motion and depth)

- **Layered shadows**: `--shadow-sm/md/lg` now stack a tight contact shadow with a soft wide one; dark theme adds a 1px top inset highlight. New tokens `--highlight-inset`, `--highlight-surface`, `--glow-primary`, `--glow-secondary`.
- **Motion utilities** in `app/motion.css`: `rise-in` (staggered entrance via `--i`, landing/rare surfaces only), `swap-in` (blur crossfade for state swaps), `glow-drift`, `ping-ring`, `sheen`, `dot-grid`. All fall back to fades or nothing under reduced motion.
- **Primitives**: primary/danger buttons get a bevel highlight; loading state blur-crossfades label to spinner; `Card interactive` lifts on pointer hover; switch thumb stretches on press; tabs use one sliding indicator (falls back to per-trigger background before measuring / without JS).
- **Landing illustration**: `components/brand/live-ticket-demo.tsx` loops an example ticket through the order lifecycle. It is marketing illustration, visibly labelled "Example", not order data, so rule 11 does not apply. No new dependencies.

## 2026-11-13 · T03–T06, T11 schema and auth

- **Scope**: owner asked for the whole app (T03–T21). Work lands on `feat/t03-t14-dine-in-loop`, one commit per task. T06 (`packages/core`) and the order-domain schema (T11) were pulled forward because every later task depends on them.
- **Composite tenant foreign keys** (`(outlet_id, tenant_id) → outlets(id, tenant_id)`): a row can never point at a parent in another tenant, even for service-role writes.
- **RLS helpers in a non-exposed `private` schema** (`has_role`, `is_member`, …), `SECURITY DEFINER` to avoid policy recursion. Suspended tenants lose staff access at the policy level.
- **Order-domain writes via `SECURITY DEFINER` functions called with the service role** (`place_order`, `transition_order`, `next_invoice_no`, `rollup_daily_metrics`). Route handlers authorise first (staff: DAL + an RLS-scoped read of the target row; guests: QR token + session cookie), validate with `packages/core`, then call the function. Gives atomic order+items+event writes and conditional status updates (`where status = from`) so two taps cannot both win. Staff reads stay under RLS.
- **Realtime = DB-trigger broadcasts on private topics** (`outlet:<id>:orders|tables`, `session:<id>`) authorised by an RLS policy on `realtime.messages`; the canteen pickup topic is public and carries token numbers only. Guests receive a short-lived JWT carrying `krudex_session`, with a random `sub` that matches no member, so every table policy still denies them.
- **PIN staff get a synthetic Supabase user** (`pin-<key>@staff.krudex.invalid`, reserved TLD). PIN sign-in verifies the bcrypt hash server-side, then redeems a one-time magic-link token server-side, so PIN users go through RLS like everyone else. Waiters and kitchen sign in at `/pin/<outletId>`.
- **New dependencies**: `@supabase/supabase-js`, `@supabase/ssr` (stack per Architecture §1), `bcryptjs` (PIN hashing per Architecture §12; pure JS, no native build), `zod` in `packages/core` (shared schemas).
- **Rate limiting** is an in-memory fixed window (`lib/rate-limit`). Correct for one Node instance; replace the store with Redis/Upstash before running several instances.
- **GST maths** (`computeBill`): per-line tax rounded half up; service charge taxed at the outlet default rate; CGST/SGST split equally with the odd paisa on SGST; total rounded to the nearest rupee with an explicit `rounding` line. Intra-state supply assumed (no IGST).
- **State machine**: Architecture §6 as written; owners and managers may also drive kitchen steps because Flow §13 gives them the kitchen screen.
- **Order numbers** reset daily per outlet (outlet timezone); invoice numbers are `<FY>/<6 digits>` per tenant, FY starting 1 April.

## 2026-11-13 · T07–T16

- **Dashboard mutations are server actions** (`lib/*/actions.ts`) rather than the CRUD route handlers listed in Architecture §7. Same contract: Zod validation, role check via the DAL, RLS-scoped writes, `{ ok, error }` results. Guest endpoints, webhooks, uploads, PDFs and the KDS/board status API stay route handlers.
- **New dependencies**: `qrcode` (QR SVG/PNG) and `pdf-lib` (table tents, GST invoices). Both MIT, pure JS. No Zustand: the cart is a 100-line `useSyncExternalStore` store over localStorage.
- **Guest session proof** is an HMAC-signed httpOnly cookie per outlet (`kx_g_<outlet>`), not a stored secret, so a second guest at the same table can join the open session (Flow §3). `table_sessions.secret_hash` is kept for a future per-guest secret.
- **Sessions open on the first order**, not on scan, so tables never show empty "occupied" bills.
- **KDS undo** delays sending a status change by 5 s instead of adding reverse transitions to the state machine (rules unchanged).
- **Invoices** are the sum of each order's stored `computeBill` result (`sumOrderTotals`), so invoice totals always equal what was charged; PDFs are rendered on demand, not stored. Standard PDF fonts print "Rs." because they cannot encode "₹".
- **Payments**: gateway interface with Razorpay (REST + HMAC verification) and a **local test gateway** used only when Razorpay keys are absent and not in production (`PAYMENTS_FAKE=true` overrides). The test gateway settles through the same `applyGatewayEvent` code as real webhooks. Webhooks are deduplicated by event id in `webhook_events`; state only moves forward. Manual (cash/terminal) payments are recorded as `provider = 'manual'`.
- **Canteen prepaid**: orders stay `placed` (hidden from the KDS) until capture, then move to `accepted` as `system`.
- **SMS/WhatsApp receipts (G-11 optional)** not built: no messaging provider or credentials. Receipts are on screen and downloadable.

## 2026-11-13 · T17–T21 and delivery

- **Canteen handover closes the session** automatically when nothing is due and no order is in progress (Flow §4). Counter staff (waiter role) hand over and take cash; "Mark ready" stays with kitchen/managers as the state machine says.
- **Pickup display uses a public realtime topic** carrying only token numbers and status.
- **Analytics** read `daily_metrics`, refreshed by `pg_cron` (today every 15 min, yesterday nightly) and backfilled on demand when the page opens.
- **Platform admins** are granted by SQL only (`platform_admins`); every admin action is written to the append-only `admin_audit`. Non-admins get a 404 at `/admin`. A-02 (impersonation) is P2 and not built.
- **Security headers**: CSP limited to self, Supabase and Razorpay Checkout; `'unsafe-inline'` scripts are allowed because a nonce would make every route dynamic (no PPR). Plus HSTS, nosniff, frame-ancestors none, Permissions-Policy.
- **Test payment gateway runs on localhost only** (any NODE_ENV with `PAYMENTS_FAKE=true`), never on a public host, because it lets a guest mark their own bill paid.
- **Sentry not wired**: it needs a DSN (a credential we were not given, AGENTS §9). Errors go to route error boundaries and server logs; add `@sentry/nextjs` with the DSN at go-live.
- **E2E runs against a production build** locally and in CI. `next dev` with Turbopack hot-reloads mid-test when anything is written inside the app dir, which made specs flaky.
- **Seed UUIDs** use the RFC version/variant nibbles because Zod 4's `z.uuid()` rejects others.
- **`place_order` race**: a second identical request now re-checks the idempotency key after taking the session lock (and catches the unique violation as a backstop), so a true double tap returns the first order without burning an order number.
