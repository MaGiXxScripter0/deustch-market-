# Demo Baustoffmarkt

German-only white-label construction-material catalog built with Next.js 16, TypeScript, Supabase, and Tailwind CSS. The demo includes 24 fictional products, search with typo recovery, category filters, product quantity calculators, a persistent cart, quote requests, customer accounts, and an RLS-protected admin area.

## Local development

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The storefront automatically falls back to the bundled 24-product demo catalog until the Supabase schema and seed are installed.

## Supabase setup

The database definition, RLS policies, search RPC, transactional request RPC, and Storage policies are in [`supabase/migrations/202608140001_initial_store.sql`](supabase/migrations/202608140001_initial_store.sql). Demo data is in [`supabase/seed.sql`](supabase/seed.sql).

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref nafubptfuvsazueogmyd
pnpm dlx supabase db push --include-seed
```

Register the first user through the storefront, then promote that profile manually in the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = '<AUTH-USER-UUID>';
```

There is intentionally no public role-elevation endpoint.

## Quality checks

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

## Vercel deployment

```bash
pnpm dlx vercel login
pnpm dlx vercel
pnpm dlx vercel --prod
```

Add all three public environment variables to Preview and Production. Set `NEXT_PUBLIC_SITE_URL` to the final production origin so canonical, sitemap, authentication redirects, and social metadata use the deployed domain.

Legal pages contain demo templates and must be reviewed by qualified German counsel before commercial use.
