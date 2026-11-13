# Krudex — agent instructions

Read `AGENTS.md` first; it is the standing build guide (rules §3 are absolute, ask before §9).
Specs live in `docs/01…06-*.md`; log every unspecified choice in `docs/decisions.md`.

- Monorepo: `apps/web` (Next.js 16, App Router), `packages/core` (pure logic, 100% branch coverage).
- Next.js 16 differs from older versions: read `apps/web/node_modules/next/dist/docs/` before using an API.
- UI uses tokens (`apps/web/app/tokens.css`) and `apps/web/components/ui` primitives only. Browse them at `/preview`.
- Gates: `pnpm lint && pnpm typecheck && pnpm test`, then `pnpm e2e`.
