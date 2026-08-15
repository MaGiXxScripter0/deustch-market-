# Admin Pickup Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make pickup-order navigation, status changes, picking controls, demo interactions, operational filtering, and customer drill-down reliable and understandable in the admin area.

**Architecture:** Keep pages as Server Components for authorization and Supabase reads, move shared order-state rules into a pure tested module, and render mutations through focused Client Components using `useActionState`. Real admins mutate the existing Supabase RPCs; preview users mutate only a session-scoped demo store. Registered customers are linked through `requests.user_id`, while guest orders remain explicitly unlinked.

**Tech Stack:** Next.js 16.3 App Router, React 19.2.8 Server Actions, TypeScript 5, Zod 4.4, Supabase SSR/Postgres/RLS, Vitest 4.1, existing CSS/Tailwind 4 utilities.

## Global Constraints

- Read the relevant guides in `node_modules/next/dist/docs/` before changing App Router pages, forms, Server Actions, redirects, or cache invalidation.
- Preserve all existing uncommitted user changes; stage only files named by the current task.
- Do not expose a Supabase service-role key or access `auth.users` from browser code.
- Keep authorization checks inside every Server Action and inside both `SECURITY DEFINER` RPCs.
- Use `private.is_admin()` because `public.is_admin()` was removed by `202608150001_security_and_policy_hardening.sql`.
- Demo mutations must never call Supabase and must persist only in `sessionStorage` for the current browser session.
- Keep all user-facing admin copy in German.
- A guest order with `requests.user_id = null` must never be matched to a profile by email alone.
- Do not add a UI testing dependency; test pure state logic with Vitest and verify interactive behavior in the local browser.
- Run Node-based commands with `C:\Users\tarbu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin` prepended to `PATH` when `node` is unavailable in the shell.

---

## File Structure

### Create

- `src/lib/admin-order-workflow.ts` — canonical status types, labels, transitions, picking rules, and demo reducer.
- `src/lib/admin-order-workflow.test.ts` — unit tests for transitions and demo behavior.
- `src/lib/admin-demo-data.ts` — one shared demo customer and order used by list, detail, and customer pages.
- `src/lib/admin-order-action-state.ts` — serializable mutation result contract and safe database-error mapping.
- `src/lib/admin-order-actions.ts` — authenticated Server Actions for status and picking mutations.
- `src/components/admin-demo-order-provider.tsx` — one session-scoped demo state shared by status and picking controls.
- `src/components/admin-order-status-control.tsx` — live/demo status form with pending, success, and error feedback.
- `src/components/admin-picking-control.tsx` — live/demo picking control with visible state and feedback.
- `src/components/admin-order-metrics.tsx` — live count cards and demo cards derived from the shared provider.
- `src/components/admin-order-list-filters.tsx` — GET search, status, and sort controls.
- `src/app/admin/kunden/[id]/page.tsx` — customer summary and order history.
- CLI-generated `supabase/migrations/*_fix_admin_pickup_workflow.sql` — corrected admin checks and RPC privileges; the exact timestamped path comes from `supabase migration new fix_admin_pickup_workflow`.

### Modify

- `src/app/admin/anfragen/page.tsx` — operational metrics, URL filters, reliable card navigation, customer links, and shared controls.
- `src/app/admin/anfragen/[id]/page.tsx` — shared workflow controls, customer link, demo state, and mutation feedback.
- `src/app/admin/kunden/page.tsx` — link every profile row to its detail page.
- `src/app/styles/admin.css` — pointer-event layering, status/picking feedback, customer links, metrics, and responsive states.
- `src/lib/actions.ts` — remove the two order mutation exports after callers move to `admin-order-actions.ts`.
- `eslint.config.mjs` — ignore `.worktrees/**` so detached worktrees do not poison feature verification.
- `package.json` — scope the test command to repository source tests rather than nested worktrees.

---

### Task 1: Canonical Order Workflow and Shared Demo Data

**Files:**
- Create: `src/lib/admin-order-workflow.ts`
- Create: `src/lib/admin-order-workflow.test.ts`
- Create: `src/lib/admin-demo-data.ts`

**Interfaces:**
- Consumes: no application module; this is the root domain unit.
- Produces: `AdminOrderStatus`, `STATUS_LABELS`, `getAllowedStatuses`, `canTogglePicking`, `DemoOrderState`, `demoOrderReducer`, `DEMO_CUSTOMER`, and `DEMO_ORDER`.

- [ ] **Step 1: Write failing workflow tests**

Create `src/lib/admin-order-workflow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  demoOrderReducer,
  getAllowedStatuses,
  getPickingBlockedReason,
  type DemoOrderState,
} from "./admin-order-workflow";

const initialState: DemoOrderState = {
  status: "new",
  pickedItemIds: [],
};

describe("admin order workflow", () => {
  it("allows only the next legal status from a new order", () => {
    expect(getAllowedStatuses("new", false)).toEqual(["new", "processing", "cancelled"]);
  });

  it("hides ready for pickup until all lines are picked", () => {
    expect(getAllowedStatuses("processing", false)).toEqual(["processing", "cancelled"]);
    expect(getAllowedStatuses("processing", true)).toEqual([
      "processing",
      "ready_for_pickup",
      "cancelled",
    ]);
  });

  it("toggles a demo line without touching live data", () => {
    const picked = demoOrderReducer(initialState, { type: "toggle-item", itemId: "demo-line-1" });
    expect(picked.pickedItemIds).toEqual(["demo-line-1"]);
    expect(demoOrderReducer(picked, { type: "toggle-item", itemId: "demo-line-1" })).toEqual(
      initialState,
    );
  });

  it("rejects an illegal demo status transition", () => {
    expect(
      demoOrderReducer(initialState, { type: "set-status", status: "ready_for_pickup" }),
    ).toEqual(initialState);
  });

  it("explains why picking is locked", () => {
    expect(getPickingBlockedReason("completed")).toBe(
      "Abgeschlossene Bestellungen können nicht mehr geändert werden.",
    );
  });
});
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run:

```powershell
$env:Path = 'C:\Users\tarbu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
pnpm exec vitest run src/lib/admin-order-workflow.test.ts
```

Expected: FAIL because `./admin-order-workflow` does not exist.

- [ ] **Step 3: Implement the canonical workflow**

Create `src/lib/admin-order-workflow.ts`:

```ts
export const ADMIN_ORDER_STATUSES = [
  "new",
  "processing",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  new: "Bestellung eingegangen",
  processing: "Wird zusammengestellt",
  ready_for_pickup: "Abholbereit",
  completed: "Abgeholt",
  cancelled: "Storniert",
};

const NEXT_STATUSES: Record<AdminOrderStatus, readonly AdminOrderStatus[]> = {
  new: ["new", "processing", "cancelled"],
  processing: ["processing", "ready_for_pickup", "cancelled"],
  ready_for_pickup: ["ready_for_pickup", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

export function getAllowedStatuses(
  status: AdminOrderStatus,
  allPicked: boolean,
): AdminOrderStatus[] {
  return NEXT_STATUSES[status].filter(
    (candidate) => candidate !== "ready_for_pickup" || allPicked,
  );
}

export function canTogglePicking(status: AdminOrderStatus) {
  return status === "new" || status === "processing";
}

export function getPickingBlockedReason(status: AdminOrderStatus) {
  if (status === "completed") return "Abgeschlossene Bestellungen können nicht mehr geändert werden.";
  if (status === "cancelled") return "Stornierte Bestellungen können nicht kommissioniert werden.";
  if (status === "ready_for_pickup") return "Die Bestellung ist bereits abholbereit.";
  return null;
}

export type DemoOrderState = {
  status: AdminOrderStatus;
  pickedItemIds: string[];
};

export type DemoOrderAction =
  | { type: "toggle-item"; itemId: string }
  | { type: "set-status"; status: AdminOrderStatus }
  | { type: "hydrate"; state: DemoOrderState };

export function demoOrderReducer(state: DemoOrderState, action: DemoOrderAction): DemoOrderState {
  if (action.type === "hydrate") return action.state;
  if (action.type === "toggle-item") {
    if (!canTogglePicking(state.status)) return state;
    const pickedItemIds = state.pickedItemIds.includes(action.itemId)
      ? state.pickedItemIds.filter((id) => id !== action.itemId)
      : [...state.pickedItemIds, action.itemId];
    return { ...state, pickedItemIds };
  }
  const allPicked = state.pickedItemIds.length > 0;
  if (!getAllowedStatuses(state.status, allPicked).includes(action.status)) return state;
  return { ...state, status: action.status };
}
```

- [ ] **Step 4: Centralize demo entities**

Create `src/lib/admin-demo-data.ts` with `DEMO_CUSTOMER.id = "demo"`, `DEMO_ORDER.id = "demo-1"`, `DEMO_ORDER.user_id = "demo"`, two request items, and the same visible contact/order values currently duplicated in the two request pages. Export immutable objects with `as const`; use the fixed ISO date `2026-08-15T13:56:08.000Z` so tests and screenshots do not change with the clock.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-workflow.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 6: Commit the domain unit**

```powershell
git add src/lib/admin-order-workflow.ts src/lib/admin-order-workflow.test.ts src/lib/admin-demo-data.ts
git commit -m "feat: centralize admin order workflow"
```

---

### Task 2: Repair Supabase Pickup RPC Authorization

**Files:**
- Create through Supabase CLI: `supabase/migrations/*_fix_admin_pickup_workflow.sql`
- Modify: `src/lib/admin-order-workflow.test.ts`

**Interfaces:**
- Consumes: existing `private.is_admin()`, `public.request_status`, `public.requests`, `public.request_items`, and `public.inventory`.
- Produces: callable authenticated RPCs `set_pickup_order_status(uuid, request_status)` and `set_pickup_item_picked(uuid, boolean)` with internal admin authorization.

- [ ] **Step 1: Add a regression test that scans active migrations**

Add the Node imports beside the existing Vitest import at the top of `src/lib/admin-order-workflow.test.ts`, then append the test:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

it("uses the surviving private admin helper in the repair migration", () => {
  const migrationDirectory = resolve("supabase/migrations");
  const migrationName = readdirSync(migrationDirectory).find((name) =>
    name.endsWith("_fix_admin_pickup_workflow.sql"),
  );
  expect(migrationName).toBeDefined();
  const sql = readFileSync(join(migrationDirectory, migrationName as string), "utf8");
  expect(sql).toContain("private.is_admin()");
  expect(sql).not.toContain("public.is_admin()");
  expect(sql).toContain("revoke execute on function public.set_pickup_order_status");
  expect(sql).toContain("revoke execute on function public.set_pickup_item_picked");
});
```

- [ ] **Step 2: Run the focused test and verify the missing migration failure**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-workflow.test.ts
```

Expected: FAIL because no migration filename ends with `_fix_admin_pickup_workflow.sql`.

- [ ] **Step 3: Discover the installed Supabase CLI before creating the migration**

Run:

```powershell
supabase --help
supabase migration new --help
```

Expected: help output describes the installed CLI. If the CLI is unavailable, stop this task and install or expose the approved Supabase CLI before changing schema history.

- [ ] **Step 4: Create the migration and replace both functions**

Run `supabase migration new fix_admin_pickup_workflow`, record the exact path printed by the CLI, and edit only that generated file. Reuse the complete bodies from `20260815153000_update_pickup_location_to_nassau.sql`, making these exact changes:

```sql
if not private.is_admin() then
  raise exception 'Admin access required';
end if;
```

Retain all of the following behavior in `set_pickup_order_status`:

```sql
select status into v_previous_status
from public.requests
where id = p_request_id
for update;

if not found then raise exception 'Order not found'; end if;
if v_previous_status = p_status then return; end if;
if not (
  (v_previous_status = 'new' and p_status in ('processing', 'cancelled'))
  or (v_previous_status = 'processing' and p_status in ('ready_for_pickup', 'cancelled'))
  or (v_previous_status = 'ready_for_pickup' and p_status in ('completed', 'cancelled'))
) then raise exception 'Invalid order status transition'; end if;
if p_status = 'ready_for_pickup' and exists (
  select 1 from public.request_items
  where request_id = p_request_id and picked_qty < quantity
) then raise exception 'All order items must be picked first'; end if;
```

Retain the Nassau inventory restoration and the `request.status in ('new', 'processing')` guard in `set_pickup_item_picked`. End the file with:

```sql
revoke execute on function public.set_pickup_order_status(uuid, public.request_status)
  from public, anon;
grant execute on function public.set_pickup_order_status(uuid, public.request_status)
  to authenticated;

revoke execute on function public.set_pickup_item_picked(uuid, boolean)
  from public, anon;
grant execute on function public.set_pickup_item_picked(uuid, boolean)
  to authenticated;
```

- [ ] **Step 5: Run regression tests**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-workflow.test.ts
```

Expected: all tests PASS and the migration contains no call to `public.is_admin()`.

- [ ] **Step 6: Apply and smoke-test against the configured development project**

After reviewing the active Supabase target, apply the migration with the repository's established Supabase workflow. Using one existing admin account and one existing non-admin account, verify:

```text
admin: new -> processing succeeds
admin: picking one line succeeds
admin: processing -> ready_for_pickup fails while another line is unpicked
admin: processing -> ready_for_pickup succeeds after all lines are picked
non-admin: both RPC calls fail with Admin access required
```

Read the affected rows after each RPC; an HTTP 200 response without changed data is not sufficient.

- [ ] **Step 7: Commit the database repair**

```powershell
git add supabase/migrations/*_fix_admin_pickup_workflow.sql src/lib/admin-order-workflow.test.ts
git commit -m "fix: repair pickup workflow authorization"
```

---

### Task 3: Return Explicit Results from Admin Order Actions

**Files:**
- Create: `src/lib/admin-order-action-state.ts`
- Create: `src/lib/admin-order-actions.ts`
- Create: `src/lib/admin-order-actions.test.ts`
- Modify: `src/lib/actions.ts:159-218`

**Interfaces:**
- Consumes: `AdminOrderStatus`, `ADMIN_ORDER_STATUSES`, `getAllowedStatuses`, `createClient`, and `getCurrentProfile`.
- Produces: `AdminOrderActionState`, `INITIAL_ADMIN_ORDER_ACTION_STATE`, `mapAdminOrderError`, `updateRequestStatusAction`, and `setPickupItemPickedAction`.

- [ ] **Step 1: Write failing error-mapping tests**

Create `src/lib/admin-order-actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapAdminOrderError } from "./admin-order-action-state";

describe("admin order action errors", () => {
  it("maps incomplete picking to actionable German copy", () => {
    expect(mapAdminOrderError("All order items must be picked first")).toBe(
      "Kommissionieren Sie zuerst alle Positionen.",
    );
  });

  it("maps authorization failure without exposing database details", () => {
    expect(mapAdminOrderError("Admin access required")).toBe(
      "Ihre Sitzung hat keine Administratorberechtigung.",
    );
  });

  it("maps an unknown database message to a safe fallback", () => {
    expect(mapAdminOrderError("internal relation name")).toBe(
      "Die Änderung konnte nicht gespeichert werden.",
    );
  });
});
```

- [ ] **Step 2: Verify the tests fail before implementation**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-actions.test.ts
```

Expected: FAIL because `admin-order-action-state.ts` does not exist.

- [ ] **Step 3: Implement the action contract and safe error mapping**

Create `src/lib/admin-order-action-state.ts`:

```ts
export type AdminOrderActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_ADMIN_ORDER_ACTION_STATE: AdminOrderActionState = {
  status: "idle",
  message: "",
};

export function mapAdminOrderError(message: string) {
  if (message.includes("All order items must be picked first"))
    return "Kommissionieren Sie zuerst alle Positionen.";
  if (message.includes("Invalid order status transition"))
    return "Dieser Statuswechsel ist nicht erlaubt.";
  if (message.includes("Order item cannot be changed"))
    return "Diese Position kann im aktuellen Status nicht geändert werden.";
  if (message.includes("Admin access required"))
    return "Ihre Sitzung hat keine Administratorberechtigung.";
  return "Die Änderung konnte nicht gespeichert werden.";
}
```

Then start `src/lib/admin-order-actions.ts` with only async runtime exports:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapAdminOrderError, type AdminOrderActionState } from "./admin-order-action-state";
import { ADMIN_ORDER_STATUSES, getAllowedStatuses } from "./admin-order-workflow";
import { createClient, getCurrentProfile } from "./supabase/server";
```

Do not export constants or synchronous functions from the module marked with `"use server"`.

- [ ] **Step 4: Implement status mutation with validation and error checks**

Use the exact signature:

```ts
export async function updateRequestStatusAction(
  _: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState>
```

Validate `id` with `z.uuid()` and `status` with `z.enum(ADMIN_ORDER_STATUSES)`. Check `auth?.profile?.role === "admin"`, read the current request plus item quantities, validate the transition with `getAllowedStatuses`, call `set_pickup_order_status`, and return `{ status: "error", message: mapAdminOrderError(error.message) }` whenever the RPC returns an error. Revalidate list, detail, and account-order paths only after success, then return:

```ts
return { status: "success", message: "Der Bestellstatus wurde gespeichert." };
```

- [ ] **Step 5: Implement picking mutation with validation and error checks**

Use the exact signature:

```ts
export async function setPickupItemPickedAction(
  _: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState>
```

Validate `itemId` and `requestId` with `z.uuid()` and `picked` with `z.enum(["true", "false"])`. Check admin authorization, call `set_pickup_item_picked`, return mapped errors, revalidate both request pages after success, and return:

```ts
return {
  status: "success",
  message: parsed.data.picked === "true" ? "Position kommissioniert." : "Markierung entfernt.",
};
```

- [ ] **Step 6: Remove old silent actions**

Delete only `updateRequestStatusAction` and `setPickupItemPickedAction` from `src/lib/actions.ts`. Do not edit unrelated authentication, product, category, or import actions.

- [ ] **Step 7: Run focused and existing action tests**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-actions.test.ts src/lib/actions.test.ts
```

Expected: all tests PASS.

- [ ] **Step 8: Commit explicit mutation results**

```powershell
git add src/lib/admin-order-action-state.ts src/lib/admin-order-actions.ts src/lib/admin-order-actions.test.ts src/lib/actions.ts
git commit -m "fix: report admin order mutation results"
```

---

### Task 4: Build Live and Demo Workflow Controls

**Files:**
- Create: `src/components/admin-demo-order-provider.tsx`
- Create: `src/components/admin-order-status-control.tsx`
- Create: `src/components/admin-picking-control.tsx`
- Modify: `src/app/admin/anfragen/[id]/page.tsx`

**Interfaces:**
- Consumes: action exports from Task 3 and workflow exports from Task 1.
- Produces: `AdminDemoOrderProvider`, `useAdminDemoOrder`, `AdminOrderStatusControl`, and `AdminPickingControl` with `mode: "live" | "demo"`.

- [ ] **Step 1: Add reducer tests for full demo progression**

Append to `src/lib/admin-order-workflow.test.ts`:

```ts
it("progresses a picked demo order to ready for pickup", () => {
  const processing = demoOrderReducer(initialState, {
    type: "set-status",
    status: "processing",
    allItemIds: ["demo-line-1", "demo-line-2"],
  });
  const first = demoOrderReducer(processing, { type: "toggle-item", itemId: "demo-line-1" });
  const second = demoOrderReducer(first, { type: "toggle-item", itemId: "demo-line-2" });
  expect(
    demoOrderReducer(second, {
      type: "set-status",
      status: "ready_for_pickup",
      allItemIds: ["demo-line-1", "demo-line-2"],
    }).status,
  ).toBe("ready_for_pickup");
});
```

Update the action union to `{ type: "set-status"; status: AdminOrderStatus; allItemIds: string[] }` and calculate `allPicked` with `action.allItemIds.every((id) => state.pickedItemIds.includes(id))`. Update all existing reducer calls to provide the relevant order item IDs. This prevents one picked line from unlocking an order containing multiple lines.

- [ ] **Step 2: Run the test and verify the premature-ready failure**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-workflow.test.ts
```

Expected: FAIL until the reducer checks all item IDs.

- [ ] **Step 3: Implement the shared demo provider**

Create `admin-demo-order-provider.tsx` with `"use client"`, a React context, and these exported interfaces:

```ts
type AdminDemoOrderContextValue = {
  state: DemoOrderState;
  allItemIds: string[];
  setStatus: (status: AdminOrderStatus) => void;
  toggleItem: (itemId: string) => void;
};

type AdminDemoOrderProviderProps = {
  orderId: string;
  initialState: DemoOrderState;
  allItemIds: string[];
  children: React.ReactNode;
};
```

After mount, hydrate with the following key expression:

```ts
sessionStorage.getItem(`admin-demo-order:${orderId}`)
```

Validate parsed status against `ADMIN_ORDER_STATUSES`, validate `pickedItemIds` as strings contained in `allItemIds`, and persist each reducer update to the same key. Export `useAdminDemoOrder()` that throws `useAdminDemoOrder must be used inside AdminDemoOrderProvider` when called outside the provider.

- [ ] **Step 4: Implement the status Client Component**

`AdminOrderStatusControl` props:

```ts
type AdminOrderStatusControlProps = {
  mode: "live" | "demo";
  orderId: string;
  status: AdminOrderStatus;
  allPicked: boolean;
  compact?: boolean;
};
```

For `live`, use `useActionState(updateRequestStatusAction, INITIAL_ADMIN_ORDER_ACTION_STATE)` imported from `admin-order-action-state.ts`. For `demo`, read `state.status`, derive `allPicked` from the provider's item state, call `setStatus`, ignore the live `status` and `allPicked` props, and never render a form action. In both modes:

- assign `effectiveStatus` and `effectiveAllPicked` from live props or demo context, then derive options with `getAllowedStatuses(effectiveStatus, effectiveAllPicked)`;
- disable save until the selection differs from `status`;
- show `Speichert…` while pending;
- announce the result in `<p aria-live="polite">`;
- call `window.confirm("Bestellung wirklich stornieren?")` before submitting `cancelled`;
- render `Interaktive Demo: Änderungen gelten nur für diese Browsersitzung.` in demo mode.

- [ ] **Step 5: Implement the picking Client Component**

`AdminPickingControl` props:

```ts
type AdminPickingControlProps = {
  mode: "live" | "demo";
  requestId: string;
  itemId: string;
  itemName: string;
  picked: boolean;
  status: AdminOrderStatus;
};
```

Render a minimum `36px` button, a visible `Kommissioniert` label, a check mark when picked, and the reason from `getPickingBlockedReason` when locked. The live form uses `useActionState(setPickupItemPickedAction, INITIAL_ADMIN_ORDER_ACTION_STATE)` and hidden `itemId`, `requestId`, and `picked` values. The demo branch reads `state.pickedItemIds`, `state.status`, and `toggleItem` from `useAdminDemoOrder()`, ignoring the live `picked` and `status` props.

- [ ] **Step 6: Integrate session-scoped demo state on the detail page**

Wrap the demo status header and order-line controls in `AdminDemoOrderProvider`, initialized from `DEMO_ORDER`. The provider owns hydration and persistence. The live path receives current database values, does not render the provider, and never reads demo storage.

- [ ] **Step 7: Verify the detail workflow in the browser**

At `/admin/anfragen/demo-1` verify:

```text
status new -> processing changes visibly
both picking buttons toggle and remain visible after navigation away and back
ready_for_pickup appears only after both positions are picked
reload within the same tab keeps demo state
the preview banner explicitly says the changes are session-only
```

With an admin session, verify the same flow persists after a hard reload and that an RPC rejection appears as German feedback.

- [ ] **Step 8: Commit workflow controls**

```powershell
git add src/components/admin-demo-order-provider.tsx src/components/admin-order-status-control.tsx src/components/admin-picking-control.tsx src/app/admin/anfragen/[id]/page.tsx src/lib/admin-order-workflow.ts src/lib/admin-order-workflow.test.ts
git commit -m "feat: add interactive admin order workflow"
```

---

### Task 5: Make the Order List Operational and Reliably Clickable

**Files:**
- Create: `src/components/admin-order-list-filters.tsx`
- Create: `src/components/admin-order-metrics.tsx`
- Modify: `src/app/admin/anfragen/page.tsx`
- Modify: `src/app/styles/admin.css:994-1106`

**Interfaces:**
- Consumes: `DEMO_ORDER`, `STATUS_LABELS`, `AdminOrderStatusControl`, and URL search params `q`, `status`, `sort`.
- Produces: reliable order links, exact status metrics, filtered rows, and registered-customer links.

- [ ] **Step 1: Add pure filter normalization tests**

Add these exports to `src/lib/admin-order-workflow.ts`:

```ts
export type AdminOrderSort = "newest" | "oldest" | "highest";

export function normalizeAdminOrderFilters(params: {
  q?: string;
  status?: string;
  sort?: string;
}) {
  return {
    q: (params.q ?? "").trim().slice(0, 80).replace(/[%_(),]/g, ""),
    status: ADMIN_ORDER_STATUSES.includes(params.status as AdminOrderStatus)
      ? (params.status as AdminOrderStatus)
      : "all",
    sort:
      params.sort === "oldest" || params.sort === "highest" ? params.sort : "newest",
  } as const;
}
```

Add tests for trimming, maximum length, PostgREST control-character removal, invalid status fallback, and invalid sort fallback. Run the test first and confirm it fails before adding the function.

- [ ] **Step 2: Build GET filters**

Create `admin-order-list-filters.tsx` as a server-renderable form with:

```html
<input name="q" type="search" placeholder="Bestellnummer, Name oder E-Mail" />
<select name="status">Alle Status / each canonical status</select>
<select name="sort">Neueste / Älteste / Höchster Betrag</select>
<button type="submit">Filtern</button>
<a href="/admin/anfragen">Zurücksetzen</a>
```

Keep filtering in URL state so refresh, history, and copied links retain the view.

- [ ] **Step 3: Extend the list query**

Read `searchParams` as a promise, normalize it, and select:

```text
id, user_id, request_number, customer_name, customer_email, status,
subtotal, fulfillment, created_at,
request_items(id, quantity, picked_qty)
```

Apply `.or()` only when sanitized `q` is non-empty, `.eq("status", status)` only when status is not `all`, and one of:

```text
newest  -> created_at descending
oldest  -> created_at ascending
highest -> subtotal descending
```

- [ ] **Step 4: Add exact operational metrics**

For live mode, request exact counts with four `head: true` queries for `new`, `processing`, `ready_for_pickup`, and `completed`. Create `AdminOrderMetrics` with props `{ mode: "live" | "demo"; counts: Record<"new" | "processing" | "ready_for_pickup" | "completed", number> }`. In live mode it renders the passed counts. In demo mode it reads `state.status` from `useAdminDemoOrder()` and derives one active counter, so cards update immediately after a demo status change. Render cards labeled `Eingegangen`, `In Bearbeitung`, `Abholbereit`, and `Abgeschlossen`.

- [ ] **Step 5: Fix card hit testing without nesting interactive elements**

Keep the existing absolute order-detail link, but change layering rules so only the form and customer link intercept pointer events:

```css
.request-admin-card-link {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
}

.request-admin-list article > div,
.request-admin-list article > strong {
  position: relative;
  z-index: 2;
  pointer-events: none;
}

.request-admin-customer-link,
.request-admin-status {
  position: relative;
  z-index: 3;
}
```

Add a visible `:focus-visible` ring to `.request-admin-card-link`. Clicking date, order number, item count, amount, or card whitespace must open the order. The form must submit status, and the customer link must open the customer.

- [ ] **Step 6: Link registered customers and label guests**

When `row.user_id` is non-null, render:

```tsx
<Link className="request-admin-customer-link" href={`/admin/kunden/${row.user_id}`}>
  <b>{row.customer_name}</b>
  <span>{row.customer_email}</span>
</Link>
```

When it is null, render the contact as non-navigation content plus `Gastbestellung`; do not construct a profile URL from email. Set `DEMO_ORDER.user_id` to `demo` so Anna Beispiel is clickable in preview.

- [ ] **Step 7: Show picking progress and shared status controls**

Compute picked count from request items and render `1/2 Positionen kommissioniert`. Replace the inline status form with `AdminOrderStatusControl compact`. In demo mode, wrap both `AdminOrderMetrics` and the complete demo list in one `AdminDemoOrderProvider` with the same order ID, initial state, and item IDs as the detail page. This makes metrics and controls reactive and uses the identical session-storage key.

- [ ] **Step 8: Verify list behavior in the browser**

At 933×792 and a mobile viewport verify:

```text
clicking order number opens /admin/anfragen/demo-1
clicking Anna Beispiel opens /admin/kunden/demo
status control does not navigate the card
search and filters update the URL
reset returns to /admin/anfragen
zero results show Keine Bestellungen gefunden
```

- [ ] **Step 9: Commit the operational list**

```powershell
git add src/components/admin-order-list-filters.tsx src/components/admin-order-metrics.tsx src/app/admin/anfragen/page.tsx src/app/styles/admin.css src/lib/admin-order-workflow.ts src/lib/admin-order-workflow.test.ts
git commit -m "feat: improve admin pickup order list"
```

---

### Task 6: Add Customer Detail and Order History

**Files:**
- Create: `src/app/admin/kunden/[id]/page.tsx`
- Modify: `src/app/admin/kunden/page.tsx`
- Modify: `src/app/admin/anfragen/[id]/page.tsx`
- Modify: `src/app/styles/admin.css`

**Interfaces:**
- Consumes: profile ID, `DEMO_CUSTOMER`, `DEMO_ORDER`, existing profile RLS, and `requests.user_id`.
- Produces: `/admin/kunden/[id]` with contact summary, metrics, and linked order history.

- [ ] **Step 1: Add customer aggregation tests**

Add to `admin-order-workflow.ts`:

```ts
export type CustomerOrderSummary = {
  id: string;
  subtotal: number;
  created_at: string;
  status: AdminOrderStatus;
};

export function summarizeCustomerOrders(orders: CustomerOrderSummary[]) {
  const newest = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return {
    orderCount: orders.length,
    totalSpent: orders.reduce((sum, order) => sum + Number(order.subtotal), 0),
    activePickupCount: orders.filter((order) =>
      ["new", "processing", "ready_for_pickup"].includes(order.status),
    ).length,
    lastOrderAt: newest?.created_at ?? null,
  };
}
```

Test empty orders and a three-order set containing active, completed, and cancelled statuses. Run the test before implementation and verify the missing-export failure.

- [ ] **Step 2: Implement the customer detail server page**

For `id === "demo"`, use `DEMO_CUSTOMER` and `[DEMO_ORDER]`. Otherwise require admin role, query:

```text
profiles: id, full_name, phone, role, created_at
requests: id, request_number, customer_email, status, subtotal, created_at,
          request_items(id, quantity, picked_qty)
filter: requests.user_id = route id
order: requests.created_at descending
```

Call `notFound()` when the profile does not exist. Derive email from the newest order and label it `E-Mail aus der letzten Bestellung`; render `Keine Bestell-E-Mail vorhanden` when there is no order.

- [ ] **Step 3: Render customer metrics and history**

Use `summarizeCustomerOrders` for:

```text
Bestellungen
Gesamtumsatz
Aktive Abholungen
Letzte Bestellung
```

Render phone and email as `tel:` and `mailto:` links. Render each historical order with number, date, status label, subtotal, picking progress, and a link to `/admin/anfragen/{order.id}`.

- [ ] **Step 4: Link the existing customer table**

In `admin/kunden/page.tsx`, give each row an absolute detail link with an accessible label `Kunde {name} öffnen`, while keeping any future row actions above it. Ensure the demo row links to `/admin/kunden/demo`.

- [ ] **Step 5: Link customer data from the order detail page**

Select `user_id` on the order detail query. Wrap customer name/email in a link only when `user_id` exists; otherwise show `Gastbestellung` and retain direct `mailto:` and `tel:` actions.

- [ ] **Step 6: Verify customer navigation in the browser**

Verify:

```text
/admin/kunden/demo renders Anna Beispiel and ABH-2026-000123
the list customer link reaches that page
the customer order link returns to /admin/anfragen/demo-1
guest orders expose no invented customer URL
keyboard focus reaches both customer and order links
```

- [ ] **Step 7: Commit customer drill-down**

```powershell
git add src/app/admin/kunden/[id]/page.tsx src/app/admin/kunden/page.tsx src/app/admin/anfragen/[id]/page.tsx src/app/styles/admin.css src/lib/admin-order-workflow.ts src/lib/admin-order-workflow.test.ts
git commit -m "feat: add admin customer order history"
```

---

### Task 7: Isolate Worktree Noise and Run Full Verification

**Files:**
- Modify: `eslint.config.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: all implementation tasks.
- Produces: repeatable lint/test/build commands that do not scan `.worktrees/**`.

- [ ] **Step 1: Reproduce the baseline tooling failures**

Run:

```powershell
$env:Path = 'C:\Users\tarbu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
pnpm test
pnpm lint
```

Expected before the fix: Vitest discovers `.worktrees/admin-category-management`, and ESLint reports a file under that worktree.

- [ ] **Step 2: Exclude detached worktrees from lint**

Add `.worktrees/**` to the existing `globalIgnores` call in `eslint.config.mjs`. Preserve all existing ignores.

- [ ] **Step 3: Scope the test script to source tests**

Change the package script to:

```json
"test": "vitest run src"
```

This retains all repository unit tests under `src` and prevents nested worktree test discovery.

- [ ] **Step 4: Run focused unit verification**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-workflow.test.ts src/lib/admin-order-actions.test.ts
```

Expected: all new tests PASS.

- [ ] **Step 5: Run repository verification**

Run:

```powershell
pnpm test
pnpm lint
pnpm build
```

Expected: all commands exit 0. `pnpm check:size` currently reports pre-existing oversized files (`admin.css`, `actions.ts`, and generated database types); record that baseline separately and confirm this feature did not increase `actions.ts` because order actions moved out.

- [ ] **Step 6: Run the end-to-end acceptance path**

In demo mode:

```text
open the order from number, amount, and whitespace
change new -> processing
pick both items
change processing -> ready_for_pickup
navigate to Anna Beispiel
open her order history entry
return to the list and filter by ready_for_pickup
```

In live admin mode:

```text
repeat the workflow against a disposable order
hard reload after each mutation
confirm database state survives reload
confirm an invalid transition produces visible German feedback
```

At mobile width, verify no status control, customer link, or picking button is covered by the card overlay.

- [ ] **Step 7: Review the final diff for scope and secrets**

Run:

```powershell
git status --short
git diff --check
git diff -- src/lib/admin-order-workflow.ts src/lib/admin-order-action-state.ts src/lib/admin-order-actions.ts src/components/admin-demo-order-provider.tsx src/components/admin-order-status-control.tsx src/components/admin-picking-control.tsx src/app/admin/anfragen src/app/admin/kunden supabase/migrations eslint.config.mjs package.json
```

Confirm no service-role key, user token, unrelated dirty file, or demo mutation endpoint appears in the diff.

- [ ] **Step 8: Commit verification configuration**

```powershell
git add eslint.config.mjs package.json
git commit -m "test: isolate repository verification from worktrees"
```

---

## Requirement Coverage

| Browser comment | Implemented by |
| --- | --- |
| Order page transition is unreliable | Task 5, Steps 5 and 8 |
| List status reverts | Tasks 2–5 |
| Detail status reverts | Tasks 2–4 |
| Picking control cannot be clicked | Tasks 2 and 4 |
| Add useful order-list functionality | Task 5 |
| Customer should open a useful customer page | Tasks 5 and 6 |

## Definition of Done

- Every non-interactive part of an order card opens its detail route.
- Status and picking mutations either persist or show a specific German error.
- Demo status and picking work without Supabase and persist only for the browser session.
- `ready_for_pickup` cannot be selected until every item is picked.
- Registered customer names link through `requests.user_id`; guests are explicitly unlinked.
- Customer detail shows contacts, metrics, and linked order history.
- Search, status filter, sorting, metrics, empty states, focus states, and mobile layout are verified.
- Focused tests, full source tests, lint, and production build pass.
- Existing unrelated user changes remain unstaged and unmodified.
