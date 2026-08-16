# Admin Work Center Release A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pickup-only `/admin/anfragen` list with a responsive, server-paginated operational work center for pickup orders and employee-created customer questions, including assignment, priority, deadlines, audit history, and a detail pane.

**Architecture:** Keep `public.requests` as the pickup-order source of truth and add its operational metadata directly to it. Add minimal `support_threads` only for employee-created questions; customer-visible messages, guest links, and email are Release B. A guarded SQL queue RPC returns normalized rows from both sources, while TypeScript owns URL parsing, cursor serialization, labels, and display rules. The route remains server-rendered; client components only navigate and mutate.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres with RLS and guarded RPCs, Zod 4, Vitest 4, lucide-react, and scoped global CSS.

## Global Constraints

- Keep all visible UI copy German and retain the `/admin/anfragen` route.
- Preserve the existing order state machine, inventory reservation, picking, cancellation, and account self-service behavior.
- Keep pickup status and support-thread status separate; no mutation may change both implicitly.
- Release A includes manual internal questions but no customer messages, guest tokens, email outbox, templates, bulk actions, saved views, business-hour SLA, or external channels.
- Filter/search on the server with cursor pagination. Do not keep `limit(100)` or load all rows in JavaScript.
- Every database mutation verifies `private.is_admin()` and every Server Action verifies `profile.role === "admin"`.
- Use German formatting, visible focus, text-plus-icon-plus-color state signals, 44 px touch targets, and no horizontal overflow at 390 px.
- Preserve all unrelated dirty-worktree changes. Stage only task files.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `supabase/migrations/20260815190000_admin_work_center_release_a.sql` | Work metadata, internal-question tables, RLS, indexes, queue and mutation RPCs. |
| `src/lib/supabase/database.types.ts` | Schema and RPC types matching the migration. |
| `src/lib/admin-work-center.ts` | Pure types, labels, filters, cursors, deadline rules. |
| `src/lib/admin-work-center.test.ts` | Unit tests for pure work-center behavior. |
| `src/lib/admin-work-center-repository.ts` | Server queue/detail loading and row mapping. |
| `src/lib/admin-work-center-repository.test.ts` | Repository/RPC mapping tests. |
| `src/lib/admin-work-center-actions.ts` | Server Actions for claim, assign, priority, and manual question creation. |
| `src/lib/admin-work-center-actions.test.ts` | Authorization, validation, stale-data, and revalidation tests. |
| `src/components/admin-work-center.tsx` | Client shell, selected-item navigation, feedback, and header controls. |
| `src/components/admin-work-item-list.tsx` | Accessible queue rows/cards and pagination. |
| `src/components/admin-work-item-detail.tsx` | Pickup and internal-question detail variants. |
| `src/components/admin-work-item-controls.tsx` | Claim, assignment, priority, and create-question controls. |
| `src/app/admin/anfragen/page.tsx` | Authorized server route and demo fallback. |
| `src/app/admin/anfragen/[id]/page.tsx` | Legacy detail-route redirect. |
| `src/components/admin-navigation.tsx` | Navigation label update. |
| `src/lib/admin-demo-data.ts` | Deterministic work metadata for the existing demo order. |
| `src/app/styles/admin.css` | Workspace layout, status/due badges, responsive detail view. |
| `src/lib/supabase-permissions.test.ts` | Static migration/RLS contract tests. |

## Shared Interfaces

```ts
export const ADMIN_WORK_VIEWS = ["all", "pickups", "questions", "mine", "unassigned", "overdue", "completed"] as const;
export const ADMIN_WORK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const SUPPORT_THREAD_STATUSES = ["new", "open", "waiting_customer", "resolved", "closed"] as const;
export const ADMIN_WORK_SORTS = ["urgency", "newest", "oldest", "pickup"] as const;

export type AdminWorkItem = {
  id: string;
  kind: "pickup" | "question";
  customerName: string;
  customerEmail: string;
  title: string;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  priority: AdminWorkPriority;
  dueAt: string | null;
  updatedAt: string;
  createdAt: string;
  statusLabel: string;
  orderStatus: AdminOrderStatus | null;
  threadStatus: SupportThreadStatus | null;
  requestNumber: string | null;
  pickupSlotStart: string | null;
  version: string;
};

export type AdminWorkFilters = {
  view: AdminWorkView;
  q: string;
  priority: AdminWorkPriority | "all";
  assignee: "all" | "me" | "unassigned";
  sort: AdminWorkSort;
  cursor: string | null;
  selected: string | null;
};
```

`version` is the persisted `updated_at` timestamp. Every mutation submits it; the RPC locks the row and rejects a stale version with `Work item changed`.

### Task 1: Define and test the pure work-center domain

**Files:**

- Create: `src/lib/admin-work-center.ts`
- Create: `src/lib/admin-work-center.test.ts`
- Modify: `src/lib/admin-demo-data.ts`

**Interfaces:**

- Produces the shared types above plus `normalizeAdminWorkFilters`, `encodeAdminWorkCursor`, `decodeAdminWorkCursor`, and `getAdminWorkDueState`.
- Consumes `AdminOrderStatus` and `STATUS_LABELS` from `src/lib/admin-order-workflow.ts` unchanged.

- [ ] **Step 1: Write failing tests for filters, cursors, and deadline copy.**

```ts
import { describe, expect, it } from "vitest";
import { decodeAdminWorkCursor, encodeAdminWorkCursor, getAdminWorkDueState, normalizeAdminWorkFilters } from "./admin-work-center";

it("normalizes only bounded shareable filters", () => {
  expect(normalizeAdminWorkFilters({ view: "mine", q: "  ANF_%(2026)  ", priority: "high", assignee: "me", sort: "urgency", cursor: null, selected: "123e4567-e89b-42d3-a456-426614174000" })).toEqual({ view: "mine", q: "ANF2026", priority: "high", assignee: "me", sort: "urgency", cursor: null, selected: "123e4567-e89b-42d3-a456-426614174000" });
});

it("rejects malformed filters and cursors", () => {
  expect(normalizeAdminWorkFilters({ view: "bad", q: "x".repeat(81), priority: "rush", assignee: "other", sort: "random", cursor: "bad", selected: "bad" })).toMatchObject({ view: "all", q: "x".repeat(80), priority: "all", assignee: "all", sort: "urgency", cursor: null, selected: null });
});

it("round-trips a non-sensitive keyset cursor and labels deadlines", () => {
  const cursor = encodeAdminWorkCursor({ sortValue: "2026-08-15T12:00:00.000Z", id: "123e4567-e89b-42d3-a456-426614174000" });
  expect(decodeAdminWorkCursor(cursor)).toEqual({ sortValue: "2026-08-15T12:00:00.000Z", id: "123e4567-e89b-42d3-a456-426614174000" });
  expect(getAdminWorkDueState("2026-08-15T11:25:00.000Z", new Date("2026-08-15T12:00:00.000Z"))).toEqual({ tone: "overdue", label: "35 Min. überfällig" });
});
```

- [ ] **Step 2: Run the test and verify it fails.**

Run: `pnpm exec vitest run src/lib/admin-work-center.test.ts`

Expected: FAIL because `src/lib/admin-work-center.ts` does not exist.

- [ ] **Step 3: Implement the pure module.**

Use literal arrays with `as const`. Trim `q`, remove `[%_(),]`, cap it at 80 characters, accept only UUID selections, and accept a cursor only when it decodes to an ISO datetime plus UUID. Encode cursors as base64url JSON. Use the exact deadline boundaries below:

```ts
if (!dueAt) return { tone: "none", label: "Kein Termin" } as const;
const minutes = Math.round((new Date(dueAt).getTime() - now.getTime()) / 60_000);
if (minutes < 0) return { tone: "overdue", label: `${Math.abs(minutes)} Min. überfällig` } as const;
if (minutes <= 60) return { tone: "soon", label: `noch ${minutes} Min.` } as const;
return { tone: "scheduled", label: new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(dueAt)) } as const;
```

Add only `assigned_admin_id: null` and `priority: "normal"` to the demo order metadata. Do not alter demo fulfillment status, price, or lines.

- [ ] **Step 4: Verify and commit.**

Run: `pnpm exec vitest run src/lib/admin-work-center.test.ts`

Run: `pnpm exec prettier --write src/lib/admin-work-center.ts src/lib/admin-work-center.test.ts src/lib/admin-demo-data.ts`

Expected: test PASS.

```bash
git add src/lib/admin-work-center.ts src/lib/admin-work-center.test.ts src/lib/admin-demo-data.ts
git commit -m "feat: add admin work center domain"
```

### Task 2: Add the operational schema, security boundary, and queue RPC

**Files:**

- Create: `supabase/migrations/20260815190000_admin_work_center_release_a.sql`
- Modify: `src/lib/supabase/database.types.ts`
- Modify: `src/lib/supabase-permissions.test.ts`

**Interfaces:**

- Produces `admin_work_priority`, `support_thread_status`, `support_threads`, `support_events`, request assignment/priority columns, and RPCs `list_admin_work_items`, `assign_admin_work_item`, `set_admin_work_item_priority`, `create_internal_support_thread`.
- Consumes `private.is_admin()`, `public.requests`, `public.profiles`, and leaves `public.set_pickup_order_status` untouched.

- [ ] **Step 1: Write failing migration security tests.**

Append this test to `src/lib/supabase-permissions.test.ts`:

```ts
const migrationPath = "supabase/migrations/20260815190000_admin_work_center_release_a.sql";

it("creates admin-only work data and guarded mutation RPCs", () => {
  const sql = readFileSync(migrationPath, "utf8");
  expect(sql).toContain("alter table public.support_threads enable row level security");
  expect(sql).toContain('create policy "support_threads_admin_all"');
  expect(sql).toContain("if not private.is_admin() then raise exception 'Admin access required'; end if;");
  expect(sql).toContain("revoke execute on function public.assign_admin_work_item");
  expect(sql).not.toContain("grant all on table public.support_threads to anon");
  expect(sql).not.toContain("update public.requests set status");
});
```

- [ ] **Step 2: Run the static test and verify it fails.**

Run: `pnpm exec vitest run src/lib/supabase-permissions.test.ts`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Implement the migration and generated-type equivalent.**

Add these schema statements exactly, then use matching values in `database.types.ts`:

```sql
create type public.admin_work_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.support_thread_status as enum ('new', 'open', 'waiting_customer', 'resolved', 'closed');

alter table public.requests
  add column assigned_admin_id uuid references public.profiles(id) on delete set null,
  add column priority public.admin_work_priority not null default 'normal';

create table public.support_threads (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_email text not null check (char_length(customer_email) <= 254),
  subject text not null check (char_length(subject) between 2 and 160),
  status public.support_thread_status not null default 'new',
  priority public.admin_work_priority not null default 'normal',
  assigned_admin_id uuid references public.profiles(id) on delete set null,
  first_response_due_at timestamptz not null default now() + interval '2 hours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete cascade,
  support_thread_id uuid references public.support_threads(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('created', 'claimed', 'assigned', 'priority_changed')),
  previous_value jsonb,
  next_value jsonb,
  created_at timestamptz not null default now(),
  check (num_nonnulls(request_id, support_thread_id) = 1)
);
```

Create `requests_work_queue_idx (priority, pickup_slot_start, updated_at desc)`, `requests_assignee_idx (assigned_admin_id, updated_at desc)`, `support_threads_queue_idx (status, priority, first_response_due_at, updated_at desc)`, `support_threads_assignee_idx (assigned_admin_id, updated_at desc)`, and partial request/thread event indexes on `created_at desc`.

Enable RLS on both new tables and create admin-only `for all` policies with `private.is_admin()` in `using` and `with check`. Revoke all new RPCs from `public`/`anon`, then grant execute only to `authenticated`.

`list_admin_work_items` must be `security definer set search_path = ''`, reject non-admin callers, and accept:

```sql
p_view text, p_q text, p_priority public.admin_work_priority,
p_assignee text, p_sort text, p_cursor jsonb, p_limit integer
```

It unions pickup rows with internal-question rows, supports all literal views from Task 1, uses only lower-cased customer name/email, request number, and subject in the bounded search, performs keyset pagination on sort tuple plus `id`, and returns no more than `least(greatest(p_limit, 1), 50)` rows. Pickups use `pickup_slot_start` as `due_at`; questions use `first_response_due_at`.

The mutation RPCs accept `p_id`, `p_expected_updated_at`, and a new assignee/priority where applicable; lock rows with `for update`, reject mismatch as `Work item changed`, update only operational metadata, update `updated_at`, and insert one audit event. `assign_admin_work_item` must validate a non-null assignee has admin role. `create_internal_support_thread` must create a `new` thread with a two-hour deadline and a `created` event.

- [ ] **Step 4: Apply only to a local Supabase environment.**

Run: `pnpm dlx supabase db reset`

Expected: local migrations and seed apply without SQL error.

Do not run `db push` against a linked project without explicit user authorization.

- [ ] **Step 5: Run contract/regression tests and commit.**

Run: `pnpm exec vitest run src/lib/supabase-permissions.test.ts src/lib/admin-order-workflow.test.ts`

Expected: PASS, including existing pickup guard tests.

```bash
git add supabase/migrations/20260815190000_admin_work_center_release_a.sql src/lib/supabase/database.types.ts src/lib/supabase-permissions.test.ts
git commit -m "feat: add admin work center schema"
```

### Task 3: Load, map, and paginate the unified queue server-side

**Files:**

- Create: `src/lib/admin-work-center-repository.ts`
- Create: `src/lib/admin-work-center-repository.test.ts`

**Interfaces:**

- Produces `getAdminWorkPage`, `getAdminWorkItemDetail`, `getAdminWorkItemDetailById`, and `getAdminWorkMetrics`.
- Consumes `AdminWorkFilters`, `AdminWorkItem`, and Task 2's queue RPC.

- [ ] **Step 1: Write failing repository tests.**

Stub `supabase.rpc` with 26 records and assert the repository returns 25 plus a cursor derived from record 26:

```ts
expect(supabase.rpc).toHaveBeenCalledWith("list_admin_work_items", {
  p_view: "pickups", p_q: "ANF2026", p_priority: null,
  p_assignee: "all", p_sort: "urgency", p_cursor: null, p_limit: 26,
});
expect(page.items[0]).toMatchObject({
  kind: "pickup", requestNumber: "ANF-2026-000123", priority: "normal",
  orderStatus: "new", threadStatus: null,
});
```

Test that pickup detail selects one request plus `request_items`, question detail selects one `support_threads` row plus its optional request context, and no Release B message/email field is selected. Add a direct-link test: `getAdminWorkItemDetailById` resolves a selected UUID not present in the current filtered page, while returning `null` when neither table contains it.

- [ ] **Step 2: Run the test and verify it fails.**

Run: `pnpm exec vitest run src/lib/admin-work-center-repository.test.ts`

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement the repository.**

```ts
export async function getAdminWorkPage(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  filters: AdminWorkFilters,
): Promise<{ items: AdminWorkItem[]; nextCursor: string | null }>;

export async function getAdminWorkItemDetail(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  item: AdminWorkItem,
): Promise<AdminWorkItemDetail | null>;

export async function getAdminWorkItemDetailById(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  id: string,
): Promise<AdminWorkItemDetail | null>;
```

Pass null for `p_priority` when the UI value is `all`. Map snake-case database fields in one `mapAdminWorkItem` function. Fetch only once from the queue RPC; do not merge two tables in JavaScript. `getAdminWorkItemDetailById` performs two bounded `maybeSingle()` lookups, first in `requests`, then in `support_threads`, so a legacy selected URL can render its detail even when the row is outside the current page. For a live pickup detail retain exactly the fields currently used by the standalone order page. For a question select only its Release A metadata and optional related request number/status.

- [ ] **Step 4: Verify and commit.**

Run: `pnpm exec vitest run src/lib/admin-work-center-repository.test.ts`

Expected: PASS.

```bash
git add src/lib/admin-work-center-repository.ts src/lib/admin-work-center-repository.test.ts
git commit -m "feat: load admin work queue"
```

### Task 4: Add stale-safe Server Actions for operational metadata

**Files:**

- Create: `src/lib/admin-work-center-actions.ts`
- Create: `src/lib/admin-work-center-actions.test.ts`
- Modify: `src/lib/admin-order-action-state.ts`
- Modify: `src/lib/admin-order-actions.ts`

**Interfaces:**

- Produces `assignAdminWorkItemAction`, `setAdminWorkPriorityAction`, and `createInternalSupportThreadAction`.
- Returns the existing `AdminOrderActionState` shape: `{ status: "idle" | "success" | "error"; message: string }`.
- Consumes Task 2 RPCs. Existing order actions retain their public signature and behavior.

- [ ] **Step 1: Write failing action tests.**

Mock `next/cache` and `./supabase/server` exactly as `admin-order-actions.test.ts` does. Cover malformed input, non-admin, missing Supabase, stale version, successful claim, assignment, priority, and question creation.

```ts
expect(result).toEqual({
  status: "error",
  message: "Diese Anfrage wurde inzwischen geändert. Bitte aktualisieren Sie die Ansicht.",
});
expect(revalidatePath).not.toHaveBeenCalled();
```

For success, assert both routes are revalidated:

```ts
expect(revalidatePath).toHaveBeenCalledWith("/admin/anfragen");
expect(revalidatePath).toHaveBeenCalledWith(`/admin/anfragen?selected=${WORK_ID}`);
```

- [ ] **Step 2: Run the test and verify it fails.**

Run: `pnpm exec vitest run src/lib/admin-work-center-actions.test.ts`

Expected: FAIL because the action module does not exist.

- [ ] **Step 3: Implement validation and mutation calls.**

Use Zod for UUID IDs, the literal priority list, ISO `expectedUpdatedAt`, email, 2–120 character customer name, and 2–160 character subject. Every action first requires `getCurrentProfile()?.profile?.role === "admin"`.

`Übernehmen` must use the authenticated user's ID obtained server-side; it must not trust a browser user ID. Explicit assignment submits an admin ID but relies on the database RPC to validate the staff role. Convert `Work item changed` to the exact German stale message above, retain current German generic error copy for other errors, and add the new stale mapping to `mapAdminOrderError` without changing current messages.

Extend existing `updateRequestStatusAction` and `setPickupItemPickedAction` with `revalidatePath("/admin/anfragen")` so embedded controls refresh the workspace. Do not change their database RPC calls.

- [ ] **Step 4: Verify and commit.**

Run: `pnpm exec vitest run src/lib/admin-work-center-actions.test.ts src/lib/admin-order-actions.test.ts`

Expected: PASS.

```bash
git add src/lib/admin-work-center-actions.ts src/lib/admin-work-center-actions.test.ts src/lib/admin-order-action-state.ts src/lib/admin-order-actions.ts
git commit -m "feat: manage admin work items"
```

### Task 5: Build the server route, detail pane, and interactive queue

**Files:**

- Create: `src/components/admin-work-center.tsx`
- Create: `src/components/admin-work-item-list.tsx`
- Create: `src/components/admin-work-item-detail.tsx`
- Create: `src/components/admin-work-item-controls.tsx`
- Create: `src/lib/admin-work-center-render.test.tsx`
- Modify: `src/app/admin/anfragen/page.tsx`
- Modify: `src/app/admin/anfragen/[id]/page.tsx`
- Modify: `src/components/admin-navigation.tsx`

**Interfaces:**

- Consumes Task 1 domain types, Task 3 data, Task 4 actions, and existing `AdminOrderStatusControl`/`AdminPickingControl` props.
- Produces a server-loaded work center; only filters, navigation, dialogs, and mutations are client islands.

- [ ] **Step 1: Write a failing render contract test.**

Use `renderToStaticMarkup` to test presentational components without adding a test-library dependency:

```tsx
expect(html).toContain('aria-current="true"');
expect(html).toContain("Anna Beispiel");
expect(html).toContain("noch 42 Min.");
expect(html).toContain("Nicht zugewiesen");
expect(html).toContain("Kundenfrage");
expect(emptyDetail).toContain("Details auswählen");
```

The fixture must include one pickup and one question with the exact `AdminWorkItem` interface from Task 1.

- [ ] **Step 2: Run the render test and verify it fails.**

Run: `pnpm exec vitest run src/lib/admin-work-center-render.test.tsx`

Expected: FAIL because the work-center components do not exist.

- [ ] **Step 3: Implement the server page boundary.**

Replace current `AdminRequestsPage` behavior with this sequence:

1. parse `searchParams` using `normalizeAdminWorkFilters`;
2. call `getCurrentProfile()` and retain existing preview/demo authorization behavior;
3. in a live admin session, call `getAdminWorkPage` and selected `getAdminWorkItemDetailById`;
4. in demo/no-Supabase mode, derive one pickup item from `DEMO_ORDER` and retain `AdminDemoOrderProvider` around its controls;
5. render `<AdminWorkCenter mode="live" | "demo" />`.

Remove usage of `AdminOrderMetrics` and `AdminOrderListFilters` from the route. They are superseded by the work-center header and URL filters. Keep existing warning copy for demo mode.

Change `[id]/page.tsx` to `redirect(`/admin/anfragen?selected=${encodeURIComponent(id)}`)` after accepting either a UUID or the demo ID. This preserves bookmarked detail URLs without two competing detail UIs.

Rename the sidebar navigation label to `Anfragen & Abholungen`, retaining the existing href and icon.

- [ ] **Step 4: Implement component behavior.**

`AdminWorkCenter` renders the title `Anfragen & Abholungen`, counters for `Neu`, `Überfällig`, `Wartet auf uns`, `Heute abzuholen`, bounded search/filters, removable filter chips, density control stored in `density=comfortable|compact`, a `Neue Anfrage` control, and `<aside aria-label="Arbeitsansichten">` for all seven system views.

`AdminWorkItemList` uses normal links, never click-only list rows. Links set `selected` while retaining other query parameters; the selected link has `aria-current="true"`. It includes textual type/status/priority/due labels as well as icons and tone classes. `Nächste Seite` appears only with `nextCursor`; it preserves filters and clears selected.

`AdminWorkItemDetail` reuses the existing order-line, picking, order-status, and customer-link UI for pickups. For questions it shows subject, customer, assignment, priority, deadline, optional linked order, and audit history; it renders no reply composer or message timeline. Empty selection states `Details auswählen`.

`AdminWorkItemControls` uses one `useActionState` per action. The manual dialog has labelled native controls for `Name`, `E-Mail-Adresse`, `Betreff`, `Zugeordnete Bestellung`, and `Priorität`; it preserves invalid input and disables only the submitted form.

- [ ] **Step 5: Verify and commit.**

Run: `pnpm exec vitest run src/lib/admin-work-center-render.test.tsx src/lib/admin-work-center.test.ts`

Expected: PASS.

```bash
git add src/app/admin/anfragen/page.tsx src/app/admin/anfragen/[id]/page.tsx src/components/admin-work-center.tsx src/components/admin-work-item-list.tsx src/components/admin-work-item-detail.tsx src/components/admin-work-item-controls.tsx src/components/admin-navigation.tsx src/lib/admin-work-center-render.test.tsx
git commit -m "feat: add admin work center interface"
```

### Task 6: Style the desktop workspace and mobile detail flow

**Files:**

- Modify: `src/app/styles/admin.css`
- Modify: `src/lib/admin-work-center-render.test.tsx`

**Interfaces:**

- Consumes hooks `admin-work-center`, `admin-work-header`, `admin-work-views`, `admin-work-list`, `admin-work-item`, `admin-work-detail`, `admin-work-chip`, `admin-work-due`, and `admin-work-mobile-actions` from Task 5.
- Produces a focused desktop/tablet/mobile layout without modifying unrelated admin selectors.

- [ ] **Step 1: Extend the render contract with class-hook assertions.**

```tsx
expect(html).toContain("admin-work-center");
expect(html).toContain("admin-work-views");
expect(html).toContain("admin-work-list");
expect(html).toContain("admin-work-detail");
expect(html).toContain("admin-work-due");
```

- [ ] **Step 2: Run the test and verify it fails.**

Run: `pnpm exec vitest run src/lib/admin-work-center-render.test.tsx`

Expected: FAIL until every required semantic hook is emitted by Task 5.

- [ ] **Step 3: Add scoped CSS and remove obsolete request-list rules.**

Add new styles beside the current `.request-admin-*` block. Delete only `.request-admin-*` and `.request-admin-filters` selectors after no JSX uses them. Do not modify product, category, dashboard, account, or customer-detail CSS.

```css
.admin-work-center { display: grid; grid-template-columns: minmax(180px, 220px) minmax(420px, 520px) minmax(0, 1fr); min-height: calc(100dvh - 48px); }
.admin-work-list, .admin-work-detail { min-width: 0; overflow-y: auto; }
.admin-work-item { min-height: 72px; }
.admin-work-item :is(button, a, select) { min-height: 44px; }
@media (max-width: 1024px) { .admin-work-center { grid-template-columns: minmax(0, 1fr) minmax(320px, 0.9fr); } .admin-work-views { grid-column: 1 / -1; } }
@media (max-width: 760px) { .admin-work-center { display: block; } .admin-work-detail { position: fixed; inset: 0; z-index: 20; } .admin-work-item { min-height: 88px; } }
@media (max-width: 480px) { .admin-work-header-actions, .admin-work-mobile-actions { display: grid; grid-template-columns: 1fr; } }
```

Use semantic modifiers for selection, priority, due, success, and error. Every tone requires text and icon in markup. Provide a visible 3 px focus ring, use `overflow-wrap:anywhere` for long email/subject values, and include `prefers-reduced-motion` with no item/panel transitions.

- [ ] **Step 4: Format, test, and manually inspect responsive behavior.**

Run:

```bash
pnpm exec prettier --write src/app/styles/admin.css src/components/admin-work-center.tsx src/components/admin-work-item-list.tsx src/components/admin-work-item-detail.tsx src/components/admin-work-item-controls.tsx
pnpm exec vitest run src/lib/admin-work-center-render.test.tsx
pnpm dev
```

Expected: render test PASS and local development server starts.

At 1440 px, 768 px, and 390 px verify demo/admin modes: preserve selection/filter URLs; preserve picking/status guards; save claim/assignment/priority without leaving selected item; create question and see it after refresh; no horizontal scroll; keyboard focus remains visible; Escape closes mobile detail without discarding dialog input.

- [ ] **Step 5: Commit responsive styling.**

```bash
git add src/app/styles/admin.css src/lib/admin-work-center-render.test.tsx
git commit -m "style: make admin work center responsive"
```

### Task 7: Run full verification and enforce the Release A boundary

**Files:**

- Verify: every file from Tasks 1–6.
- Verify: existing pickup-order modules and account order routes.

**Interfaces:**

- Consumes the completed Release A implementation.
- Produces regression evidence and a clean scope boundary before handoff.

- [ ] **Step 1: Run focused regressions.**

```bash
pnpm exec vitest run src/lib/admin-work-center.test.ts src/lib/admin-work-center-repository.test.ts src/lib/admin-work-center-actions.test.ts src/lib/admin-work-center-render.test.tsx src/lib/admin-order-workflow.test.ts src/lib/admin-order-actions.test.ts src/lib/account.test.ts src/lib/account-actions.test.ts src/lib/request.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run all repository checks.**

```bash
pnpm format:check
pnpm check:size
pnpm lint
pnpm test
pnpm build
```

Expected: every command exits 0.

- [ ] **Step 3: Inspect the intended scope.**

```bash
git diff HEAD~6 -- supabase/migrations/20260815190000_admin_work_center_release_a.sql src/lib/supabase/database.types.ts src/lib/admin-work-center.ts src/lib/admin-work-center-repository.ts src/lib/admin-work-center-actions.ts src/app/admin/anfragen src/components/admin-work-center.tsx src/components/admin-work-item-list.tsx src/components/admin-work-item-detail.tsx src/components/admin-work-item-controls.tsx src/components/admin-navigation.tsx src/app/styles/admin.css
git status --short
```

Confirm no public customer reply UI, message table, guest token, email outbox, external provider, bulk action, saved view, or unrelated worktree change appears in the diff.

- [ ] **Step 4: Commit only a necessary verification correction.**

If verification needs a narrow correction, stage its exact files and commit:

```bash
git commit -m "fix: complete admin work center release a"
```

If all checks pass without a correction, do not create an empty commit.

## Plan Self-Review

- **Spec coverage:** Task 1 covers bounded filter/cursor/deadline behavior. Task 2 covers operational metadata, internal-question schema, indexes, RLS, audit events, and RPCs. Task 3 prevents client-side unbounded loading. Task 4 provides role and stale-version protection. Tasks 5–6 cover layout, details, assignment, priority, manual questions, accessibility, responsive behavior, and legacy URLs. Task 7 verifies pickup/account regressions and excludes Release B/C.
- **Scope:** Release A is independently deployable. Customer-visible threads, internal notes, email delivery, guest access, bulk operations, saved views, business hours, metrics, automation, and external channels remain Release B/C work.
- **Placeholder scan:** This plan contains no `TODO`, `TBD`, unnamed function, unnamed file, or unbounded edge-case instruction. Every new interface, test command, mutation, and commit target has an explicit name.
- **Type consistency:** `AdminWorkItem` consistently uses `kind`, `priority`, `version`, `orderStatus`, and `threadStatus`; every mutation uses `p_expected_updated_at`; UI filters use Task 1 literal values.
