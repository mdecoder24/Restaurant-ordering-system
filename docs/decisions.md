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
