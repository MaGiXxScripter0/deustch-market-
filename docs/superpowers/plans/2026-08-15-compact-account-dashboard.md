# Compact Account Dashboard Implementation Plan

> **For agentic workers:** Execute the tasks in order. This plan intentionally does **not** use test-driven development; implement each contained change, then run its stated verification.

**Goal:** Turn `/konto` into a compact operational dashboard and make the login page and global header accurately reflect an existing authenticated session.

**Architecture:** Keep all Supabase authentication and profile lookup on the server. Split the interactive site header into a small server wrapper and a client-only presentation component so the globally rendered header receives only a minimal authenticated display state. Keep the account and login pages as server components that select their UI from `getCurrentProfile()`; visual density comes solely from component markup and the account/responsive style sheets.

**Tech Stack:** Next.js 16.3 App Router, React 19.2, TypeScript, `@supabase/ssr`, Supabase Auth, Lucide React, CSS, pnpm, ESLint, Vitest.

## Global Constraints

- Do not use TDD or add a failing-test-first step.
- Do not change Supabase schema, RLS policies, Auth configuration, tokens, or environment variables.
- Do not expose a Supabase service-role/secret key or send the user's email, role, or full profile object to the client header.
- Retain German interface copy and the existing visual language (`--ink`, `--accent`, `--paper`, `--line`).
- Preserve the existing admin rule: render administration only when `profile.role === "admin"`.
- Do not stage or commit the pre-existing unrelated working-tree changes. If committing is requested later, stage only the files owned by this plan.

---

## File Structure

| File                                                                    | Responsibility                                                                                                       |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/components/site-header.tsx`                                        | Server wrapper that obtains the minimal display state from `getCurrentProfile()` and renders the client header.      |
| `src/components/site-header-client.tsx`                                 | Client-side header interaction, cart state, navigation state, and authenticated/guest account shortcut presentation. |
| `src/app/konto/page.tsx`                                                | Server-rendered guest and signed-in dashboard variants.                                                              |
| `src/app/konto/anmelden/page.tsx`                                       | Server-rendered login route that substitutes the already-signed-in screen for an authenticated visitor.              |
| `src/app/styles/account.css`                                            | Compact account header, quick-action cards, profile panel, and already-signed-in state styling.                      |
| `src/app/styles/responsive.css`                                         | Tablet and mobile rules for the compact account layout.                                                              |
| `docs/superpowers/specs/2026-08-15-compact-account-dashboard-design.md` | Approved design reference.                                                                                           |

## Task 1: Provide authenticated display state to the global header

**Files:**

- Modify: `src/components/site-header.tsx`
- Create: `src/components/site-header-client.tsx`
- Reuse: `src/lib/supabase/server.ts`

**Interfaces:**

- Consumes: `getCurrentProfile(): Promise<{ user: User; profile: Pick<Profile, "full_name" | "phone" | "role"> | null } | null>` from `@/lib/supabase/server`.
- Produces: `HeaderAccountState`, containing only `isAuthenticated: boolean` and optional `displayName?: string`, passed from the server wrapper to `SiteHeaderClient`.

- [ ] **Step 1: Extract the current interactive header unchanged into a client component.**

  Create `src/components/site-header-client.tsx`; move the current contents of `src/components/site-header.tsx` there, retain the `"use client"` directive, and rename the exported component to accept the server-supplied state:

  ```tsx
  "use client";

  export type HeaderAccountState = {
    isAuthenticated: boolean;
    displayName?: string;
  };

  export function SiteHeaderClient({ account }: { account: HeaderAccountState }) {
    const pathname = usePathname();
    const { count, ready } = useCart();
    const [open, setOpen] = useState(false);
  }
  ```

  Move the complete existing import set (`Link`, navigation hooks, `MapPin`, `Menu`, `ShoppingCart`, `UserRound`, `X`, `Suspense`, `useState`, `siteConfig`, `useCart`, `SearchAutocomplete`, and `ThemeToggle`) and both complete helper functions `CategoryNavigation` and `CategoryNavigationFallback` unchanged. Keep them in this client file because they depend on `usePathname()` and `useSearchParams()`.

- [ ] **Step 2: Replace `site-header.tsx` with a server-only wrapper.**

  Import `getCurrentProfile` and `SiteHeaderClient`, load the profile for the request, trim the optional name, and pass no other user/profile fields:

  ```tsx
  import { getCurrentProfile } from "@/lib/supabase/server";
  import { SiteHeaderClient } from "./site-header-client";

  export async function SiteHeader() {
    const auth = await getCurrentProfile();
    const displayName = auth?.profile?.full_name?.trim() || undefined;

    return <SiteHeaderClient account={{ isAuthenticated: Boolean(auth), displayName }} />;
  }
  ```

  Do not mark this wrapper `"use client"`; this makes the session decision on the server while preserving client-side header controls in the child.

- [ ] **Step 3: Render the account shortcut from `account`.**

  In `SiteHeaderClient`, replace the fixed second line `Anmelden` with conditional copy. Retain the link target `/konto` and the existing accessible `UserRound` icon:

  ```tsx
  <Link href="/konto">
    <UserRound size={19} aria-hidden="true" />
    <span>
      <small>{account.displayName || "Mein Konto"}</small>
      {account.isAuthenticated ? "Angemeldet" : "Anmelden"}
    </span>
  </Link>
  ```

  The mobile navigation stays labelled `Mein Konto`, which remains a correct destination in both states.

- [ ] **Step 4: Verify the component boundary.**

  Run `pnpm lint`. Expected result: no client/server-component import error, no hook error, and no TypeScript error from the new prop.

## Task 2: Build the signed-in dashboard and already-signed-in login view

**Files:**

- Modify: `src/app/konto/page.tsx`
- Modify: `src/app/konto/anmelden/page.tsx`
- Reuse: `src/components/profile-form.tsx`, `src/components/auth-form.tsx`, `src/lib/supabase/server.ts`

**Interfaces:**

- Consumes: `getCurrentProfile()` in both server pages.
- Produces: signed-in dashboard markup with `account-status`, `account-actions`, and `account-action-card` CSS hooks; login route produces an authenticated `auth-already-signed-in` state.

- [ ] **Step 1: Restructure the signed-in branch of `/konto`.**

  Preserve the existing guest branch, `dynamic = "force-dynamic"`, metadata, destinations, and sign-out Server Action. In the authenticated branch, add an explicit status and replace the generic grid markup with consistent action-card markup:

  ```tsx
  <section className="account-head" aria-labelledby="account-heading">
    <div>
      <p className="kicker">MEIN KONTO</p>
      <div className="account-title-row">
        <h1 id="account-heading">Guten Tag{fullName ? `, ${fullName}` : ""}.</h1>
        <span className="account-status">Angemeldet</span>
      </div>
      <p>{auth.user.email}</p>
    </div>
    <form action={signOutAction}>
      <button type="submit">
        <LogOut size={16} aria-hidden="true" /> Abmelden
      </button>
    </form>
  </section>
  ```

  Derive `fullName` once as `auth.profile?.full_name?.trim()` and re-use it both for the greeting and `ProfileForm` value. Keep the email as the account identity in the dashboard only; do not move it into the global client header.

- [ ] **Step 2: Define the quick actions as whole-card links.**

  Import `ArrowUpRight` and use this complete navigation. Each card remains a whole-link target, has an accessible text label, and treats the arrow as decorative:

  ```tsx
  <nav className="account-actions" aria-label="Schnellzugriff">
    <Link className="account-action-card" href="/konto/anfragen">
      <FileText aria-hidden="true" />
      <span>
        <b>Meine Bestellungen</b>
        <small>Abholstatus und Positionen</small>
      </span>
      <ArrowUpRight aria-hidden="true" />
    </Link>
    <Link className="account-action-card" href="/sortiment">
      <PackageSearch aria-hidden="true" />
      <span>
        <b>Sortiment</b>
        <small>Neue Materialien entdecken</small>
      </span>
      <ArrowUpRight aria-hidden="true" />
    </Link>
    {auth.profile?.role === "admin" ? (
      <Link className="account-action-card" href="/admin">
        <UserRound aria-hidden="true" />
        <span>
          <b>Administration</b>
          <small>Katalog und Bestellungen verwalten</small>
        </span>
        <ArrowUpRight aria-hidden="true" />
      </Link>
    ) : null}
  </nav>
  ```

  Keep the listed destinations and German strings exactly as shown.

- [ ] **Step 3: Make `/konto/anmelden` choose the correct server-rendered state.**

  Convert `LoginPage` to `async`, import `getCurrentProfile`, and branch only within the left `auth-panel`. Do not call `redirect`; the requested result is a clear page with a `Zum Konto` action:

  ```tsx
  const auth = await getCurrentProfile();
  const isAuthenticated = Boolean(auth);

  {
    isAuthenticated ? (
      <div className="auth-already-signed-in">
        <p className="kicker">MEIN KONTO</p>
        <h1>Sie sind bereits angemeldet.</h1>
        <p>Ihr Konto, Ihre Bestellungen und Ihre Kontaktdaten stehen für Sie bereit.</p>
        <Link className="button primary" href="/konto">
          Zum Konto
        </Link>
      </div>
    ) : (
      <>
        <p className="kicker">MEIN KONTO</p>
        <h1>Willkommen zurück.</h1>
        <p>Anmelden, um Ihre Bestellungen und Kontaktdaten einzusehen.</p>
        <AuthForm action={signInAction} mode="login" />
      </>
    );
  }
  ```

  The login form, password-reset link, and registration link must be absent from the authenticated branch. Keep the existing `auth-aside` unchanged for both branches.

- [ ] **Step 4: Verify route behaviour manually.**

  Start `pnpm dev`, then use a private browser session to open `http://localhost:3000/konto` and `http://localhost:3000/konto/anmelden`: confirm that a guest sees only account-entry actions and the login form. Sign in with the existing local test account: confirm `/konto` shows the status and quick actions, while `/konto/anmelden` shows `Sie sind bereits angemeldet.` and exactly one primary `Zum Konto` link instead of a form.

## Task 3: Apply the compact dashboard visual system

**Files:**

- Modify: `src/app/styles/account.css`
- Modify: `src/app/styles/responsive.css`

**Interfaces:**

- Consumes: class names introduced in Task 2 (`account-title-row`, `account-status`, `account-actions`, `account-action-card`, `auth-already-signed-in`).
- Produces: dense, accessible desktop/tablet/mobile account layouts without changes to global tokens or unrelated page styles.

- [ ] **Step 1: Compact the account header without reducing hierarchy.**

  In `account.css`, reduce the desktop vertical padding of `.account-head`, use `gap` between content and sign-out, and style the new title row as a wrapping flex row. Make `.account-status` a non-interactive pill with an icon-independent text label, accent-tinted background, legible foreground, compact padding, and `white-space: nowrap`. Keep the existing base focus ring for the sign-out button.

- [ ] **Step 2: Replace the legacy card grid rules with dense quick-action-card rules.**

  Replace `.account-grid` styling with `.account-actions` using `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`, a 12–16px gap, and smaller vertical margins. Style `.account-action-card` as a `position: relative` full-height link with a minimum height near 120px, 20–24px padding, border, and a three-area visual hierarchy: accent icon, text stack, arrow aligned at the top right. On hover and `:focus-visible`, apply the existing border/focus language plus a small upward transform; add a `@media (prefers-reduced-motion: reduce)` override that removes that transform and transition.

- [ ] **Step 3: Tighten the profile panel and already-signed-in panel.**

  Preserve `.profile-form` as the only profile form selector, but reduce its excess outer spacing and use a compact `grid-template-columns: minmax(180px, 1.1fr) minmax(180px, 1fr) minmax(180px, 1fr) auto`. Keep error and success messages at `grid-column: 1 / -1`. Add `.auth-already-signed-in` rules that share the panel's readable maximum width, use the same heading/copy scale as `.auth-panel`, and give the action an appropriate top margin. Do not alter password-reset styles.

- [ ] **Step 4: Add responsive rules only for the new hooks.**

  At the existing tablet breakpoint, ensure `.account-actions` uses two columns and `.profile-form` uses two columns. At the existing 700px breakpoint, make `.account-title-row`, `.account-actions`, and `.profile-form` single-column friendly; the status must wrap below the title rather than overflow and action cards must retain a minimum tappable height of 44px. Do not change unrelated responsive selectors.

- [ ] **Step 5: Check visual and keyboard accessibility.**

  At 1440px, 768px, and 390px viewport widths, inspect `/konto` as a signed-in standard user and as an admin. Confirm there is no horizontal scroll, no clipped status/card text, and the admin grid handles both two and three cards. Tab through header account link, sign-out, cards, profile inputs, and save button; every interactive element must show the existing visible focus indicator. Enable reduced-motion in browser preferences and confirm cards no longer move on hover/focus.

## Task 4: Run regression checks and capture acceptance evidence

**Files:**

- No production-file changes expected.
- Review: all files listed in **File Structure**.

**Interfaces:**

- Consumes: complete changes from Tasks 1–3.
- Produces: a verified dashboard with no test-driven-development artifacts and no unintentional changes to existing authentication behaviour.

- [ ] **Step 1: Run repository checks.**

  Run, in this order:

  ```powershell
  pnpm lint
  pnpm test
  pnpm check:size
  pnpm format:check
  pnpm build
  ```

  Resolve only failures caused by the account-dashboard files. Do not reformat, revert, or modify pre-existing unrelated worktree changes.

- [ ] **Step 2: Perform final session-state acceptance checks.**

  Verify these exact outcomes against the running application:

  | State and URL                         | Expected result                                                                              |
  | ------------------------------------- | -------------------------------------------------------------------------------------------- |
  | Guest at `/konto`                     | `Anmelden` and `Konto erstellen`; no profile, sign-out, or admin action.                     |
  | Guest at `/konto/anmelden`            | Login form, password-reset link, and registration link visible.                              |
  | Signed-in user at `/konto`            | Greeting, email, `Angemeldet`, sign-out, Orders and Catalogue quick actions, profile editor. |
  | Signed-in user at `/konto/anmelden`   | `Sie sind bereits angemeldet.` and `Zum Konto`; no authentication or registration form.      |
  | Signed-in non-admin                   | No Administration card.                                                                      |
  | Signed-in admin                       | Administration card links to `/admin`.                                                       |
  | Any signed-in page with global header | Account shortcut reads `Angemeldet`, not `Anmelden`.                                         |

- [ ] **Step 3: Review the final diff.**

  Run `git diff --check` and `git diff -- src/components/site-header.tsx src/components/site-header-client.tsx src/app/konto/page.tsx src/app/konto/anmelden/page.tsx src/app/styles/account.css src/app/styles/responsive.css docs/superpowers`. Confirm there are no whitespace errors, accidental Supabase credential changes, schema/migration changes, or modifications outside the planned account/header scope.

## Plan Self-Review

- **Spec coverage:** Tasks 1–3 cover the global header state, guest and signed-in account states, the already-signed-in login route, admin-only visibility, compact layout, responsive behaviour, and accessibility. Task 4 covers the specified post-implementation verification.
- **No-TDD compliance:** The plan has no failing-test-first step; tests are run only after implementation as regression checks.
- **Boundaries:** Session lookup remains server-side; client header receives only an authenticated flag and optional display name. No database or authorization changes are planned.
