# Account Center Implementation Plan

> **For agentic workers:** Execute the tasks in order and track them with the checkbox steps below. This plan intentionally does **not** use test-driven development; regression tests are added after each corresponding implementation.

**Goal:** Build a useful customer account center with contact details, email confirmation and change, password change, active pickup information, recent order history, and customer-controlled rescheduling or cancellation before picking begins.

**Architecture:** Keep identity and security operations in Supabase Auth, aggregate dashboard data in a server-only module, and expose order mutations only through authenticated ownership-checking Postgres RPCs. Keep new Server Actions in a focused account module instead of enlarging the existing `src/lib/actions.ts`, and render interactive forms as small Client Components receiving bounded server data.

**Tech Stack:** Next.js 16.3 App Router, React 19.2, TypeScript, Supabase Auth, Postgres/RLS, `@supabase/ssr` 0.12.4, `@supabase/supabase-js` 2.112.3, Zod 4.4.3, Lucide React, CSS, Vitest, pnpm.

## Global Constraints

- Do not use TDD or introduce failing-test-first steps.
- Do not store passwords, access tokens, confirmation tokens, or service-role keys in application tables or client props.
- Continue validating the session with `supabase.auth.getUser()` through `getCurrentProfile()`.
- Customer order mutations must derive identity from `auth.uid()` and must not accept a user ID from the browser.
- Reschedule and cancel are permitted only for an owned pickup order with status exactly `new`.
- Reschedule appointments must be at least two hours and at most 31 days in the future.
- Cancellation must restore inventory exactly once at location slug `baumarkt-nassauer-land`.
- Telephone remains editable contact data; SMS verification is out of scope.
- Preserve the German copy style and the existing CSS variables and focus treatment.
- Do not stage, commit, revert, or reformat unrelated existing working-tree changes.
- At implementation time, create the migration with `supabase migration new account_order_self_service`; do not hand-invent its timestamped filename.

---

## File Structure

| File                                                       | Responsibility                                                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/lib/account.ts`                                       | Shared status labels, order-management capability rules, pickup-time validation, and account view-model types. |
| `src/lib/account.test.ts`                                  | Post-implementation regression tests for status and pickup-time rules.                                         |
| `src/lib/account-dashboard.ts`                             | Server-only aggregation of authenticated profile, email state, active pickup, and recent orders.               |
| `src/lib/account-actions.ts`                               | Authenticated Server Actions for email, password, reschedule, and cancel operations.                           |
| `src/lib/account-actions.test.ts`                          | Post-implementation validation/message tests that do not call live Auth or RPC services.                       |
| CLI-generated migration named `account_order_self_service` | Authenticated RPCs for rescheduling and cancelling an owned pickup order.                                      |
| `src/lib/supabase/database.types.ts`                       | Generated/maintained TypeScript RPC signatures.                                                                |
| `src/components/account-overview.tsx`                      | Signed-in account identity, verification, active pickup, recent orders, and quick links.                       |
| `src/components/account-security-forms.tsx`                | Client forms for email confirmation/change and password change.                                                |
| `src/components/confirmation-resend-form.tsx`              | Public, enumeration-safe signup-confirmation resend form.                                                      |
| `src/components/order-self-service.tsx`                    | Client controls for pickup reschedule and confirmed cancellation.                                              |
| `src/components/order-status-timeline.tsx`                 | Accessible textual order progress timeline.                                                                    |
| `src/app/konto/page.tsx`                                   | Guest state and server-rendered account overview.                                                              |
| `src/app/konto/profil/page.tsx`                            | Authenticated contact-data route using the existing profile form.                                              |
| `src/app/konto/sicherheit/page.tsx`                        | Authenticated security settings route.                                                                         |
| `src/app/konto/registrieren/page.tsx`                      | Adds confirmation-email recovery below registration.                                                           |
| `src/app/konto/anfragen/page.tsx`                          | Uses shared status labels and clearer order-history states.                                                    |
| `src/app/konto/anfragen/[id]/page.tsx`                     | Adds timeline and self-service controls to the existing order detail.                                          |
| `src/app/auth/confirm/route.ts`                            | Preserves safe `next` handling and returns email changes to security settings.                                 |
| `src/app/styles/account.css`                               | Overview, security, active-pickup, timeline, and action styling.                                               |
| `src/app/styles/responsive.css`                            | Tablet and mobile layouts for the new account modules.                                                         |

## Task 1: Define account-domain interfaces and rules

**Files:**

- Create: `src/lib/account.ts`
- Create: `src/lib/account.test.ts`

**Interfaces:**

- Produces: `PickupOrderStatus`, `AccountOrderSummary`, `AccountDashboardData`, `ORDER_STATUS_LABELS`, `canCustomerManagePickup(status)`, and `validatePickupSlot(value, now?)`.
- Consumed by: Tasks 3–7.

- [ ] **Step 1: Implement the bounded account domain types and status rules.**

  Define the exact public surface:

  ```ts
  export type PickupOrderStatus =
    "new" | "processing" | "ready_for_pickup" | "completed" | "cancelled";

  export type AccountOrderSummary = {
    id: string;
    requestNumber: string;
    status: PickupOrderStatus;
    subtotal: number;
    createdAt: string;
    pickupSlotStart: string | null;
    pickupCode: string;
    itemCount: number;
  };

  export type AccountDashboardData = {
    user: {
      email: string;
      emailConfirmedAt: string | null;
      pendingEmail: string | null;
    };
    profile: {
      fullName: string;
      phone: string;
      role: "customer" | "admin";
    };
    activeOrder: AccountOrderSummary | null;
    recentOrders: AccountOrderSummary[];
  };

  export const ORDER_STATUS_LABELS: Record<PickupOrderStatus, string> = {
    new: "Bestellung eingegangen",
    processing: "Wird zusammengestellt",
    ready_for_pickup: "Abholbereit",
    completed: "Abgeholt",
    cancelled: "Storniert",
  };

  export function canCustomerManagePickup(status: PickupOrderStatus) {
    return status === "new";
  }

  export function validatePickupSlot(value: string, now = Date.now()) {
    const timestamp = new Date(value).getTime();
    return (
      Number.isFinite(timestamp) &&
      timestamp >= now + 2 * 60 * 60 * 1000 &&
      timestamp <= now + 31 * 24 * 60 * 60 * 1000
    );
  }
  ```

- [ ] **Step 2: Add regression tests after the implementation.**

  Test all five status labels, assert that only `new` is manageable, and validate the exact time boundaries with a fixed `now` value:

  ```ts
  const now = Date.parse("2026-08-15T12:00:00.000Z");
  expect(validatePickupSlot("2026-08-15T14:00:00.000Z", now)).toBe(true);
  expect(validatePickupSlot("2026-08-15T13:59:59.999Z", now)).toBe(false);
  expect(validatePickupSlot("2026-09-15T12:00:00.000Z", now)).toBe(true);
  expect(validatePickupSlot("2026-09-15T12:00:00.001Z", now)).toBe(false);
  ```

- [ ] **Step 3: Run the focused regression check.**

  Run `pnpm test src/lib/account.test.ts`. Expected: the new test file passes without modifying existing tests.

## Task 2: Add ownership-safe pickup mutation RPCs

**Files:**

- Create through CLI: migration named `account_order_self_service`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**

- Produces: `cancel_own_pickup_order(p_request_id uuid) -> void`.
- Produces: `reschedule_own_pickup_order(p_request_id uuid, p_pickup_slot_start timestamptz) -> void`.
- Consumed by: `cancelPickupOrderAction` and `reschedulePickupOrderAction` in Task 3.

- [ ] **Step 1: Discover the installed Supabase CLI commands and generate the migration path.**

  Run:

  ```powershell
  supabase --help
  supabase migration --help
  supabase migration new account_order_self_service
  ```

  Edit only the generated migration returned by the final command.

- [ ] **Step 2: Add an internal cancellation helper.**

  The migration must create `private.cancel_pickup_order_locked(uuid)` as `SECURITY INVOKER`, with `search_path = ''`. It restores inventory using the existing order lines and Nassau location, then changes the request status:

  ```sql
  create or replace function private.cancel_pickup_order_locked(p_request_id uuid)
  returns void
  language plpgsql
  security invoker
  set search_path = ''
  as $$
  begin
    update public.inventory inventory
    set available_qty = inventory.available_qty + item.quantity,
        updated_at = now()
    from public.request_items item
    join public.locations location on location.slug = 'baumarkt-nassauer-land'
    where item.request_id = p_request_id
      and inventory.product_id = item.product_id
      and inventory.location_id = location.id;

    update public.requests
    set status = 'cancelled', updated_at = now()
    where id = p_request_id;
  end;
  $$;

  revoke all on function private.cancel_pickup_order_locked(uuid) from public, anon, authenticated;
  ```

- [ ] **Step 3: Add the customer cancellation RPC.**

  Implement `public.cancel_own_pickup_order(uuid)` as `SECURITY DEFINER`, set an empty search path, reject a missing session, lock the order, and deliberately use one generic error for missing/not-owned/non-pickup rows:

  ```sql
  create or replace function public.cancel_own_pickup_order(p_request_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_status public.request_status;
  begin
    if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

    select request.status
    into v_status
    from public.requests request
    where request.id = p_request_id
      and request.user_id = (select auth.uid())
      and request.fulfillment = 'pickup'
    for update;

    if not found then raise exception 'Order unavailable'; end if;
    if v_status <> 'new' then raise exception 'Order can no longer be cancelled'; end if;

    perform private.cancel_pickup_order_locked(p_request_id);
  end;
  $$;

  revoke execute on function public.cancel_own_pickup_order(uuid) from public, anon;
  grant execute on function public.cancel_own_pickup_order(uuid) to authenticated;
  ```

- [ ] **Step 4: Add the customer reschedule RPC.**

  Implement the same ownership and row-lock checks, then enforce the exact appointment window before updating:

  ```sql
  create or replace function public.reschedule_own_pickup_order(
    p_request_id uuid,
    p_pickup_slot_start timestamptz
  )
  returns void
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_status public.request_status;
  begin
    if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

    select request.status
    into v_status
    from public.requests request
    where request.id = p_request_id
      and request.user_id = (select auth.uid())
      and request.fulfillment = 'pickup'
    for update;

    if not found then raise exception 'Order unavailable'; end if;
    if v_status <> 'new' then raise exception 'Order can no longer be rescheduled'; end if;
    if p_pickup_slot_start is null
      or p_pickup_slot_start < now() + interval '2 hours'
      or p_pickup_slot_start > now() + interval '31 days'
    then raise exception 'Invalid pickup slot'; end if;

    update public.requests
    set pickup_slot_start = p_pickup_slot_start, updated_at = now()
    where id = p_request_id;
  end;
  $$;

  revoke execute on function public.reschedule_own_pickup_order(uuid, timestamptz)
    from public, anon;
  grant execute on function public.reschedule_own_pickup_order(uuid, timestamptz)
    to authenticated;
  ```

- [ ] **Step 5: Reuse the cancellation helper in the existing admin transition function.**

  Replace the inventory-restoration block inside `public.set_pickup_order_status` with:

  ```sql
  if p_status = 'cancelled' then
    perform private.cancel_pickup_order_locked(p_request_id);
    return;
  end if;
  ```

  Keep all current admin authorization, allowed-transition, and picked-item checks unchanged.

- [ ] **Step 6: Update the database TypeScript RPC signatures.**

  Under `Database["public"]["Functions"]`, add:

  ```ts
  cancel_own_pickup_order: {
    Args: {
      p_request_id: string;
    }
    Returns: undefined;
  }
  reschedule_own_pickup_order: {
    Args: {
      p_pickup_slot_start: string;
      p_request_id: string;
    }
    Returns: undefined;
  }
  ```

- [ ] **Step 7: Verify database security and transactional behaviour.**

  In a local Supabase instance or connected test project, verify:

  1. The owner can reschedule a `new` order.
  2. Another authenticated user receives `Order unavailable`.
  3. Neither owner nor another user can edit `processing` or later orders.
  4. Cancelling a `new` order restores each inventory line once.
  5. A second cancellation fails and leaves inventory unchanged.
  6. `anon` has no execute privilege on either RPC.

  Run database advisors after applying the migration and resolve any function/RLS warning caused by this migration.

## Task 3: Add focused account Server Actions

**Files:**

- Create: `src/lib/account-actions.ts`
- Create: `src/lib/account-actions.test.ts`
- Reuse: `src/lib/supabase/server.ts`, `src/lib/turnstile.ts`, `src/lib/account.ts`

**Interfaces:**

- Produces: `AccountActionState = { error?: string; success?: string; turnstileResetId?: string }`.
- Produces: `resendCurrentConfirmationAction`, `resendSignupConfirmationAction`, `changeEmailAction`, `changePasswordAction`, `reschedulePickupOrderAction`, and `cancelPickupOrderAction`.

- [ ] **Step 1: Define validation schemas and generic action state.**

  Use Zod schemas with exact constraints:

  ```ts
  export type AccountActionState = {
    error?: string;
    success?: string;
    turnstileResetId?: string;
  };

  const emailSchema = z.email("Bitte geben Sie eine gültige E-Mail-Adresse ein.").max(254);
  const passwordSchema = z
    .object({
      currentPassword: z.string().min(8),
      newPassword: z.string().min(8, "Das neue Passwort muss mindestens 8 Zeichen lang sein."),
      confirmation: z.string(),
    })
    .refine((value) => value.newPassword === value.confirmation, {
      path: ["confirmation"],
      message: "Die neuen Passwörter stimmen nicht überein.",
    });
  const orderIdSchema = z.guid("Ungültige Bestellung.");
  ```

- [ ] **Step 2: Implement email confirmation and change actions.**

  Required behaviour:

  - `resendCurrentConfirmationAction` obtains the current user server-side and calls `auth.resend({ type: "signup", email: user.email, options: { emailRedirectTo } })` only when `email_confirmed_at` is absent.
  - When `user.new_email` is present, resend using `type: "email_change"` and that pending address.
  - `resendSignupConfirmationAction` accepts an email plus Turnstile token, verifies action `resend-signup`, calls `auth.resend({ type: "signup" })`, and always returns the same success copy whether the account exists or not: `Wenn ein unbestätigtes Konto existiert, wurde eine neue E-Mail versendet.`
  - `changeEmailAction` rejects the unchanged address, derives `const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`, calls `auth.updateUser({ email: newEmail }, { emailRedirectTo: `${siteUrl}/auth/confirm?next=/konto/sicherheit` })`, and returns `Bitte bestätigen Sie die neue E-Mail-Adresse.`

  Map rate-limit and provider errors to German copy without returning `error.message`.

- [ ] **Step 3: Implement password change with current-password verification.**

  Obtain `auth.user.email` from the server session, call `signInWithPassword({ email, password: currentPassword })`, and only after success call `updateUser({ password: newPassword })`. Return `Das aktuelle Passwort ist nicht korrekt.` for the reauthentication failure and `Ihr Passwort wurde geändert.` after success. Do not log or retain any password value.

- [ ] **Step 4: Implement pickup-order Server Actions.**

  `reschedulePickupOrderAction` parses `requestId` and a browser `datetime-local` value, converts it to ISO, rechecks `validatePickupSlot`, and calls:

  ```ts
  await supabase.rpc("reschedule_own_pickup_order", {
    p_request_id: requestId,
    p_pickup_slot_start: pickupSlotStart,
  });
  ```

  `cancelPickupOrderAction` parses only `requestId` and calls:

  ```ts
  await supabase.rpc("cancel_own_pickup_order", { p_request_id: requestId });
  ```

  After success, revalidate `/konto`, `/konto/anfragen`, and `/konto/anfragen/${requestId}`. Translate known RPC failures to `Diese Bestellung kann nicht mehr geändert werden.` without exposing ownership information.

- [ ] **Step 5: Add post-implementation action-validation tests.**

  Export only pure schema/parser helpers needed for tests. Cover invalid email, mismatched password confirmation, short password, invalid UUID, and pickup time outside the two-hour/31-day range. Do not mock or call live Supabase Auth in these unit tests.

- [ ] **Step 6: Run focused regression checks.**

  Run `pnpm test src/lib/account.test.ts src/lib/account-actions.test.ts` and `pnpm lint`. Expected: both account test files and lint pass.

## Task 4: Build the server-side dashboard view model

**Files:**

- Create: `src/lib/account-dashboard.ts`
- Modify: `src/lib/supabase/server.ts`

**Interfaces:**

- Produces: `getAccountDashboard(): Promise<AccountDashboardData | null>`.
- Extends: `getCurrentProfile()` continues returning the full server `user`, now explicitly consumed for `email_confirmed_at` and `new_email`.

- [ ] **Step 1: Query only the account overview fields.**

  After `getCurrentProfile()`, query the signed-in user's newest requests:

  ```ts
  .from("requests")
  .select(
    "id, request_number, status, subtotal, created_at, pickup_slot_start, pickup_code, request_items(id)",
  )
  .eq("user_id", auth.user.id)
  .eq("fulfillment", "pickup")
  .order("created_at", { ascending: false })
  .limit(10)
  ```

  Map numbers and nullable fields explicitly into `AccountOrderSummary`; do not pass raw Supabase rows to Client Components.

- [ ] **Step 2: Select active and recent orders deterministically.**

  Set `activeOrder` to the first row whose status is `new`, `processing`, or `ready_for_pickup`. Set `recentOrders` to the first three rows regardless of status. Fall back to empty strings for nullable profile fields and to `customer` for a missing profile role.

- [ ] **Step 3: Return bounded email state.**

  Return only `user.email`, `user.email_confirmed_at`, and `user.new_email`; do not return auth metadata, tokens, identities, or session objects.

- [ ] **Step 4: Verify the loader with existing user and RLS states.**

  Confirm `null` for guests, an empty-order dashboard for a new customer, correct active-order selection for a customer with multiple statuses, and admin role propagation without exposing other users' orders.

## Task 5: Add profile, security, and confirmation-recovery screens

**Files:**

- Create: `src/app/konto/profil/page.tsx`
- Create: `src/app/konto/sicherheit/page.tsx`
- Create: `src/components/account-security-forms.tsx`
- Create: `src/components/confirmation-resend-form.tsx`
- Modify: `src/app/konto/registrieren/page.tsx`
- Modify: `src/app/auth/confirm/route.ts`
- Reuse: `src/components/profile-form.tsx`

**Interfaces:**

- `AccountSecurityForms` consumes `{ currentEmail: string; emailConfirmedAt: string | null; pendingEmail: string | null }`.
- Both new routes redirect guests to `/konto/anmelden`.

- [ ] **Step 1: Create the profile route.**

  Load `getCurrentProfile()`, redirect guests, render breadcrumbs back to `/konto`, display the current email read-only, and render `ProfileForm` with `fullName` and `phone`. Keep profile writes through the existing ownership-checked `updateProfileAction`.

- [ ] **Step 2: Create the security route.**

  Load the current user server-side and render three separate panels: email status/resend, email change, and password change. Pass only the three documented string/null props to the client forms.

- [ ] **Step 3: Implement the security forms as independent action states.**

  Use one `useActionState` per action so pending/error/success messages cannot overwrite each other. The email status panel renders:

  - `Bestätigt am <date>` when confirmed and no pending change.
  - `Nicht bestätigt` plus resend when unconfirmed.
  - `Änderung ausstehend: <pendingEmail>` plus resend when a new address awaits confirmation.

  Password inputs use autocomplete values `current-password` and `new-password`. Disable only the form currently submitting.

- [ ] **Step 4: Add public confirmation recovery to registration.**

  Render `ConfirmationResendForm` beneath `AuthForm`. It contains an email field, Turnstile action `resend-signup`, generic success/error output, and button copy `Bestätigungs-E-Mail erneut senden`. It must not reveal whether the email belongs to an account.

- [ ] **Step 5: Preserve safe confirmation redirects.**

  Keep the current `code` exchange in `/auth/confirm`. Continue allowing only paths beginning `/konto/`, so the new email-change redirect `/konto/sicherheit` is accepted without creating an open redirect.

- [ ] **Step 6: Verify auth screen states manually.**

  Check confirmed, unconfirmed, and `new_email` states. Confirm the registration resend response is identical for an existing and unknown email, and verify that successful email confirmation returns to `/konto/sicherheit`.

## Task 6: Build the useful account overview

**Files:**

- Create: `src/components/account-overview.tsx`
- Modify: `src/app/konto/page.tsx`
- Modify: `src/components/profile-form.tsx`

**Interfaces:**

- `AccountOverview` consumes one `AccountDashboardData` value and renders no data fetching.
- `/konto` consumes `getAccountDashboard()` and preserves the existing guest state.

- [ ] **Step 1: Replace the signed-in page branch with the dashboard loader.**

  Keep the existing guest welcome actions. For signed-in users, render `AccountOverview` and preserve the sign-out Server Action. Remove the editable profile form from the overview and link to `/konto/profil` instead.

- [ ] **Step 2: Render the account identity and verification panel.**

  Show full name, current email, phone or `Keine Telefonnummer hinterlegt`, and textual status badges. When a confirmation is outstanding, include the matching signed-in resend form and a link to `/konto/sicherheit`.

- [ ] **Step 3: Render the active pickup panel.**

  Show order number, translated status, formatted pickup time, formatted subtotal, pickup code, and item count. For `new`, render an edit link/action area. For other active states, show explanatory text and a link to the detail route. When no active order exists, show a compact catalogue call-to-action.

- [ ] **Step 4: Render recent orders and quick actions.**

  Render up to three orders with date, number, status, total, and detail link. Quick links are `Bestellungen`, `Profil`, `Sicherheit`, and `Sortiment`; retain `Administration` only for role `admin`.

- [ ] **Step 5: Keep the profile form reusable.**

  Add optional heading/copy props only if needed by the dedicated profile route; preserve current action, validation, labels, autocomplete values, and status semantics.

- [ ] **Step 6: Verify overview role and empty states.**

  Check a customer with no phone/orders, a customer with an active order, a customer with only completed orders, and an administrator. Ensure no admin link appears for customers.

## Task 7: Add order timeline, reschedule, and cancellation UI

**Files:**

- Create: `src/components/order-self-service.tsx`
- Create: `src/components/order-status-timeline.tsx`
- Modify: `src/app/konto/anfragen/page.tsx`
- Modify: `src/app/konto/anfragen/[id]/page.tsx`

**Interfaces:**

- `OrderStatusTimeline` consumes `{ status: PickupOrderStatus }`.
- `OrderSelfService` consumes `{ orderId: string; orderNumber: string; status: PickupOrderStatus; pickupSlotStart: string | null }`.

- [ ] **Step 1: Replace duplicated status maps with `ORDER_STATUS_LABELS`.**

  Import the shared labels in both order routes. Parse database status into `PickupOrderStatus` through a bounded helper; unknown values fall back to visible `Unbekannter Status` rather than becoming a management-capable state.

- [ ] **Step 2: Implement the accessible timeline.**

  Use the steps `Eingegangen`, `Wird zusammengestellt`, `Abholbereit`, and `Abgeholt`. Mark the current/completed steps with text and `aria-current="step"`; render a separate terminal `Storniert` state instead of showing cancelled orders as progress.

- [ ] **Step 3: Implement reschedule controls.**

  For `new`, show a `datetime-local` input prefilled from `pickupSlotStart`, a two-hour notice, and `Abholtermin speichern`. Submit `requestId` and the local datetime to `reschedulePickupOrderAction`; show pending, error, and success messages.

- [ ] **Step 4: Implement confirmed cancellation.**

  The first click opens an inline confirmation containing the exact order number. The second button submits `cancelPickupOrderAction`. Provide `Abbrechen` to close confirmation without a mutation. Use destructive styling only on the final confirmation button.

- [ ] **Step 5: Explain locked states.**

  For `processing`, `ready_for_pickup`, `completed`, and `cancelled`, do not render mutable controls. Show the appropriate explanation; specifically, `processing` says `Die Bestellung wird bereits zusammengestellt und kann online nicht mehr geändert werden.`

- [ ] **Step 6: Verify stale-page safety.**

  Open a `new` order in one browser tab, move it to `processing` as admin in another, then submit the stale customer form. Expected: the RPC rejects it, inventory and appointment remain unchanged, and the customer sees the generic no-longer-editable message.

## Task 8: Add responsive account styling and complete verification

**Files:**

- Modify: `src/app/styles/account.css`
- Modify: `src/app/styles/responsive.css`
- Review: all files listed above

**Interfaces:**

- Consumes: `account-overview`, `account-identity`, `account-active-order`, `account-recent-orders`, `account-security-grid`, `order-status-timeline`, and `order-self-service` class hooks.

- [ ] **Step 1: Style the desktop hierarchy.**

  Make active pickup the primary panel, identity/security status the secondary panel, and recent orders/quick links a dense supporting grid. Reuse `--accent`, `--ink`, `--muted`, `--line`, `--paper`, and `--white`; do not introduce isolated hard-coded theme colours.

- [ ] **Step 2: Style status and destructive states accessibly.**

  Pair every colour with visible text, preserve the global focus outline, give buttons a minimum 44px touch height, and distinguish cancellation with border/text/background rather than colour alone.

- [ ] **Step 3: Add tablet and mobile layouts.**

  At the existing 1050px breakpoint use two-column overview/security grids. At 700px collapse all new grids and self-service actions to one column, allow long email/order strings to wrap, and prevent horizontal scrolling.

- [ ] **Step 4: Run targeted formatting and static checks.**

  Run Prettier only on files owned by this plan, then:

  ```powershell
  pnpm lint
  pnpm test
  pnpm check:size
  pnpm build
  git diff --check
  ```

  Report existing unrelated `check:size` or repository-wide formatting failures separately; do not modify unrelated files to make them pass.

- [ ] **Step 5: Run the complete acceptance matrix.**

  | Scenario                 | Expected result                                          |
  | ------------------------ | -------------------------------------------------------- |
  | Guest `/konto`           | Sign-in and registration actions only.                   |
  | Unconfirmed signup       | Generic resend form works without account enumeration.   |
  | Confirmed customer       | Confirmed badge, email, and phone visible.               |
  | Pending email change     | Current and pending addresses are clearly distinguished. |
  | Wrong current password   | Password remains unchanged; German error displayed.      |
  | Correct current password | Password changes and success is displayed.               |
  | No orders                | Empty active/recent states and catalogue action.         |
  | `new` pickup             | Reschedule and cancel available.                         |
  | `processing` pickup      | Controls absent; locked explanation visible.             |
  | Cancelled pickup         | Inventory restored once and status visible everywhere.   |
  | Admin account            | Customer dashboard plus Administration shortcut.         |

- [ ] **Step 6: Perform browser accessibility and responsive checks.**

  Verify `/konto`, `/konto/profil`, `/konto/sicherheit`, `/konto/anfragen`, and one order detail at 1440px, 768px, and 390px. Check keyboard focus order, status text, alert/status announcements, cancel confirmation, long email wrapping, and absence of horizontal overflow or framework error overlays.

## Plan Self-Review

- **Spec coverage:** Tasks 2–3 cover secure pickup mutations and Auth actions; Tasks 4–7 cover dashboard, profile, security, confirmation recovery, history, detail, timeline, reschedule, and cancellation; Task 8 covers responsive, accessibility, and complete verification.
- **No-TDD compliance:** Every test is explicitly added after its corresponding implementation and used as a regression check.
- **Security consistency:** Browser input never supplies a user ID; RPCs use `auth.uid()`, row locking, strict `new` status, authenticated-only grants, and atomic inventory restoration.
- **Type consistency:** RPC names and arguments match in SQL, generated database types, and Server Action calls. Component props use the shared `PickupOrderStatus` and `AccountDashboardData` definitions.
- **Scope:** No payment, refund, SMS verification, address book, calendar-capacity schema, or post-`new` editing is included.
