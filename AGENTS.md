# Repository Guidelines

## Project Structure & Module Organization

This is a German-only Next.js 16 storefront using TypeScript, Supabase, and Tailwind CSS. App Router pages and API routes live in `src/app/`; reusable UI is in `src/components/`; domain logic, validation, Supabase clients, and generated database types are in `src/lib/`. Global and feature styles are in `src/app/styles/` and `src/app/globals.css`. Static assets belong in `public/`. Database migrations and demo data are in `supabase/migrations/` and `supabase/seed.sql`; supporting design and implementation notes are in `docs/`.

## Build, Test, and Development Commands

Use pnpm 11 (`pnpm install`) and copy `.env.example` to `.env.local` before running the app.

- `pnpm dev` starts the local Next.js server.
- `pnpm lint` runs ESLint with Next.js Core Web Vitals and TypeScript rules.
- `pnpm test` runs the Vitest suite once; use `pnpm exec vitest` for watch mode.
- `pnpm format:check` verifies Prettier formatting; `pnpm format` applies it.
- `pnpm check:size` enforces repository file-size limits.
- `pnpm build` validates the production build; `pnpm start` serves it.

For database changes, use the Supabase CLI and `pnpm dlx supabase db push --include-seed` only against the intended linked project.

## Coding Style & Naming Conventions

Use two spaces, semicolons, double quotes, trailing commas, and a 100-column print width, as configured in `.prettierrc.json`. Use PascalCase for React components, camelCase for functions and variables, and kebab-case only where an existing route or asset convention requires it. Keep tests beside the implementation they cover. Follow existing German route names and domain vocabulary.

Next.js APIs can differ from prior versions. Before changing framework behavior, consult the relevant guide under `node_modules/next/dist/docs/`.

## Testing Guidelines

Tests use Vitest and are named `*.test.ts`, colocated under `src/lib/`. Add focused tests for domain logic, validation, authorization, and Supabase-related behavior. Run `pnpm test`, plus `pnpm lint` and `pnpm build`, before submitting changes. No explicit coverage threshold is configured.

## Commit & Pull Request Guidelines

Use short Conventional Commit-style subjects such as `feat:`, `fix:`, and `docs:`. Keep commits focused. Pull requests should explain the user-visible or database impact, list verification commands, call out migration or environment-variable changes, and include screenshots for UI changes. Never commit secrets from `.env.local`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
