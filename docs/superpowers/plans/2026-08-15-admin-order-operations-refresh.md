# Admin Order Operations Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/admin/anfragen` and `/admin/anfragen/[id]` reliable operational pickup-order screens: status changes must work with the existing deterministic seed IDs, users or guest contacts must navigate to meaningful contact screens, and staff must see the next valid action and accurate picking progress.

**Architecture:** Keep status transition enforcement in the existing database RPCs and Server Actions. Add small, pure workflow helpers for quantity-based progress and contextual next-action copy; consume them in the list and detail pages. Use one distinct guest-contact route based on the existing request ID instead of pretending an unregistered buyer has a `profiles` row.

**Tech Stack:** Next.js 16 App Router, React `useActionState`, TypeScript, Zod 4, Supabase/Postgres RPCs, Vitest, ESLint, CSS.

## Global Constraints

- Preserve all existing unrelated dirty working-tree changes; stage only the files named in each task.
- Do not change the canonical statuses: `new`, `processing`, `ready_for_pickup`, `completed`, `cancelled`.
- Use `z.guid()` for persisted PostgreSQL UUID/GUID values because existing deterministic seed IDs are UUID-shaped but not RFC-version UUIDs; do not loosen validation to arbitrary strings.
- Do not construct a registered-customer URL from an email address. Use `/admin/kunden/{user_id}` only when `requests.user_id` is non-null; guests use `/admin/kunden/gast/{request_id}`.
- Keep demo state session-only and never submit the demo IDs (`demo-1`, `demo-line-*`) to live Server Actions.
- Status feedback must be German, actionable, visible inline, and announced with `aria-live`; destructive cancellation keeps its confirmation dialog.
- No new database schema, notification service, payment model, or audit-history table is part of this refresh.
- UX references informing this scope: [Shopify local pickup workflow](https://help.shopify.com/en/manual/fulfillment/setup/delivery-methods/pickup-in-store), [Shopify order-status separation](https://help.shopify.com/en/manual/fulfillment/managing-orders/order-status), and [GOV.UK accessible error summaries](https://design-system.service.gov.uk/components/error-summary/).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/admin-order-actions.ts` | Validate live action payloads, authorize an admin, call pickup RPCs, return serializable German results. |
| `src/lib/admin-order-actions.test.ts` | Regression coverage for the actual deterministic seed UUID/GUID payload shape and action results. |
| `src/lib/admin-order-workflow.ts` | Pure canonical status, quantity-progress, and next-action helpers used by server pages and controls. |
| `src/lib/admin-order-workflow.test.ts` | Pure helper tests for quantity progress and valid contextual actions. |
| `src/components/admin-order-status-control.tsx` | Live/demo status selector, next-action button copy, accessible success/error feedback. |
| `src/components/admin-picking-control.tsx` | Per-line picking action with visible ordered/picked state and clear feedback. |
| `src/app/admin/anfragen/page.tsx` | Responsive operations queue, filters, progress, customer/guest contact navigation. |
| `src/app/admin/anfragen/[id]/page.tsx` | Order header, action-ready summary, quantity progress, line controls, contact navigation. |
| `src/app/admin/kunden/gast/[requestId]/page.tsx` | Admin-only guest-contact view derived from a single request snapshot. |
| `src/app/styles/admin.css` | Scoped list/detail/guest-contact layouts, badges, focus, responsive behavior. |

---

### Task 1: Accept Existing Deterministic GUIDs in Live Order Actions

**Files:**
- Modify: `src/lib/admin-order-actions.ts:15-25`
- Modify: `src/lib/admin-order-actions.test.ts`

**Interfaces:**
- Consumes: `updateRequestStatusAction(_: AdminOrderActionState, formData: FormData)` and `setPickupItemPickedAction(_: AdminOrderActionState, formData: FormData)`.
- Produces: Actions that accept PostgreSQL-compatible UUID/GUID strings such as `40000000-0000-0000-0000-000000000001`, while still rejecting malformed IDs.

- [ ] **Step 1: Add the actual seed-style IDs to the action test file**

Near the existing valid IDs, add constants that exactly match `supabase/seed.sql`:

```ts
const LEGACY_REQUEST_ID = "40000000-0000-0000-0000-000000000001";
const LEGACY_ITEM_ID = "50000000-0000-0000-0000-000000000001";
```

Add a helper that can create status form data for an explicit request ID:

```ts
function statusFormDataFor(id: string, status: string) {
  const formData = new FormData();
  formData.set("id", id);
  formData.set("status", status);
  return formData;
}
```

- [ ] **Step 2: Write a failing status-action regression test**

Add this test in `describe("admin order actions")`:

```ts
it("accepts the deterministic seed request ID and reaches the status RPC", async () => {
  const supabase = createSupabaseStub();
  createClient.mockResolvedValue(supabase);

  const result = await updateRequestStatusAction(
    INITIAL_ADMIN_ORDER_ACTION_STATE,
    statusFormDataFor(LEGACY_REQUEST_ID, "processing"),
  );

  expect(result).toEqual({ status: "success", message: "Der Bestellstatus wurde gespeichert." });
  expect(supabase.rpc).toHaveBeenCalledWith("set_pickup_order_status", {
    p_request_id: LEGACY_REQUEST_ID,
    p_status: "processing",
  });
});
```

Add an equivalent picking regression using `LEGACY_REQUEST_ID` and `LEGACY_ITEM_ID`; assert that `set_pickup_item_picked` receives the item ID and `p_picked: true`.

- [ ] **Step 3: Run the focused action test and verify the expected red failure**

Run:

```powershell
$env:Path = 'C:\Users\tarbu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
pnpm exec vitest run src/lib/admin-order-actions.test.ts
```

Expected: the two new tests fail with `{ status: "error", message: "Die übermittelten Bestelldaten sind ungültig." }` and neither RPC is called. This proves the strict `z.uuid()` parser rejects the existing seed identifier before the database boundary.

- [ ] **Step 4: Replace strict RFC UUID validation with GUID validation**

In `src/lib/admin-order-actions.ts`, update only the ID fields:

```ts
const statusMutationSchema = z.object({
  id: z.guid(),
  status: z.enum(ADMIN_ORDER_STATUSES),
});

const pickingMutationSchema = z.object({
  itemId: z.guid(),
  requestId: z.guid(),
  picked: z.enum(["true", "false"]),
});
```

Do not change authorization, transition checks, RPC names, or revalidation paths.

- [ ] **Step 5: Verify the focused action test is green**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-actions.test.ts
```

Expected: all action tests pass, malformed strings such as `"not-an-id"` remain rejected, and the two seed-style GUID tests invoke the correct RPCs.

- [ ] **Step 6: Commit the isolated reliability fix**

```powershell
git add src/lib/admin-order-actions.ts src/lib/admin-order-actions.test.ts
git commit -m "fix: accept deterministic pickup order IDs"
```

---

### Task 2: Add Quantity Progress and Contextual Next-Action Helpers

**Files:**
- Modify: `src/lib/admin-order-workflow.ts`
- Modify: `src/lib/admin-order-workflow.test.ts`

**Interfaces:**
- Consumes: `AdminOrderStatus`, `getAllowedStatuses(status, allPicked)`.
- Produces:

```ts
export type AdminOrderLineProgress = {
  quantity: number;
  picked_qty: number;
};

export type AdminOrderProgress = {
  pickedQuantity: number;
  requiredQuantity: number;
  allPicked: boolean;
};

export function getAdminOrderProgress(
  items: readonly AdminOrderLineProgress[] | null | undefined,
): AdminOrderProgress;

export function getNextAdminOrderAction(
  status: AdminOrderStatus,
  allPicked: boolean,
): { status: AdminOrderStatus; label: string } | null;
```

- [ ] **Step 1: Write failing pure-helper tests**

Append these tests:

```ts
it("sums quantities rather than only counting picked lines", () => {
  expect(
    getAdminOrderProgress([
      { quantity: 2, picked_qty: 1 },
      { quantity: 3, picked_qty: 8 },
    ]),
  ).toEqual({ pickedQuantity: 4, requiredQuantity: 5, allPicked: false });
});

it("uses zero progress for an empty order and does not mark it ready", () => {
  expect(getAdminOrderProgress([])).toEqual({
    pickedQuantity: 0,
    requiredQuantity: 0,
    allPicked: false,
  });
});

it("provides only the operational next action", () => {
  expect(getNextAdminOrderAction("new", false)).toEqual({
    status: "processing",
    label: "Kommissionierung starten",
  });
  expect(getNextAdminOrderAction("processing", false)).toBeNull();
  expect(getNextAdminOrderAction("processing", true)).toEqual({
    status: "ready_for_pickup",
    label: "Als abholbereit markieren",
  });
  expect(getNextAdminOrderAction("ready_for_pickup", true)).toEqual({
    status: "completed",
    label: "Als abgeholt markieren",
  });
});
```

Import the two new helpers at the top of the test file.

- [ ] **Step 2: Run the workflow test for the red failure**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-workflow.test.ts
```

Expected: TypeScript/Vitest reports missing exports `getAdminOrderProgress` and `getNextAdminOrderAction`.

- [ ] **Step 3: Implement the smallest correct helpers**

Add to `src/lib/admin-order-workflow.ts`:

```ts
export function getAdminOrderProgress(
  items: readonly AdminOrderLineProgress[] | null | undefined,
): AdminOrderProgress {
  const normalized = items ?? [];
  const requiredQuantity = normalized.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity) || 0),
    0,
  );
  const pickedQuantity = normalized.reduce(
    (sum, item) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const picked = Math.max(0, Number(item.picked_qty) || 0);
      return sum + Math.min(quantity, picked);
    },
    0,
  );
  return {
    pickedQuantity,
    requiredQuantity,
    allPicked: requiredQuantity > 0 && pickedQuantity === requiredQuantity,
  };
}

export function getNextAdminOrderAction(status: AdminOrderStatus, allPicked: boolean) {
  if (status === "new") return { status: "processing" as const, label: "Kommissionierung starten" };
  if (status === "processing" && allPicked) {
    return { status: "ready_for_pickup" as const, label: "Als abholbereit markieren" };
  }
  if (status === "ready_for_pickup") {
    return { status: "completed" as const, label: "Als abgeholt markieren" };
  }
  return null;
}
```

- [ ] **Step 4: Verify helper behavior and existing state machine**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-workflow.test.ts
```

Expected: all workflow tests pass, including the existing guard that blocks `ready_for_pickup` before every demo line is picked.

- [ ] **Step 5: Commit the reusable operations vocabulary**

```powershell
git add src/lib/admin-order-workflow.ts src/lib/admin-order-workflow.test.ts
git commit -m "feat: add pickup progress and next-action helpers"
```

---

### Task 3: Rebuild the Order List as an Operations Queue

**Files:**
- Modify: `src/app/admin/anfragen/page.tsx`
- Modify: `src/components/admin-order-status-control.tsx`
- Modify: `src/app/styles/admin.css`

**Interfaces:**
- Consumes: `getAdminOrderProgress`, `getNextAdminOrderAction`, `AdminOrderStatusControl`, `AdminOrderMetrics`, `AdminOrderListFilters`.
- Produces: A responsive order queue where non-interactive card space opens the order, registered customers open profile history, guests open a real guest-contact screen, and the main action is obvious.

- [ ] **Step 1: Add exact progress and primary-action values to each list row**

Extend the existing `@/lib/admin-order-workflow` import in `src/app/admin/anfragen/page.tsx` with `STATUS_LABELS`, `getAdminOrderProgress`, and `getNextAdminOrderAction`. In the `rows.map` callback, replace line-count progress with:

```ts
const progress = getAdminOrderProgress(row.request_items);
const nextAction = getNextAdminOrderAction(status, progress.allPicked);
```

Render the progress as:

```tsx
<span className="request-admin-progress">
  {progress.pickedQuantity}/{progress.requiredQuantity} Artikel kommissioniert
</span>
```

Do not treat an empty `request_items` array as picked; the helper already returns `allPicked: false` for it.

- [ ] **Step 2: Make customer navigation semantically correct for both account types**

Replace the existing customer conditional with:

```tsx
{row.user_id ? (
  <Link className="request-admin-customer-link" href={`/admin/kunden/${row.user_id}`}>
    <b>{row.customer_name}</b>
    <span>{row.customer_email}</span>
    <small>Kundenprofil öffnen</small>
  </Link>
) : (
  <Link className="request-admin-customer-link" href={`/admin/kunden/gast/${row.id}`}>
    <b>{row.customer_name}</b>
    <span>{row.customer_email}</span>
    <small>Gastkontakt öffnen</small>
  </Link>
)}
```

The route contains only the request ID; no email or phone appears in a URL.

- [ ] **Step 3: Put the contextual action in the card without nesting controls in the card link**

Before `AdminOrderStatusControl`, render a text badge and contextual hint:

```tsx
<div className={`request-admin-status-badge is-${status}`}>
  <span>{STATUS_LABELS[status]}</span>
  {nextAction ? <small>Nächster Schritt: {nextAction.label}</small> : <small>Kein weiterer Schritt verfügbar</small>}
</div>
```

Keep `AdminOrderStatusControl` for legal manual changes. Pass the quantity-derived value:

```tsx
<AdminOrderStatusControl
  mode={enabled ? "live" : "demo"}
  orderId={row.id}
  status={status}
  allPicked={progress.allPicked}
  compact
/>
```

- [ ] **Step 4: Improve feedback semantics in the shared status control**

Change `StatusFeedback` to announce errors immediately and successful saves politely:

```tsx
function StatusFeedback({ result }: { result: AdminOrderActionState }) {
  if (result.status === "idle") return null;
  return (
    <p
      className={`admin-order-action-feedback is-${result.status}`}
      role={result.status === "error" ? "alert" : "status"}
      aria-live={result.status === "error" ? "assertive" : "polite"}
    >
      {result.message}
    </p>
  );
}
```

Do not clear `selected` after errors. The existing local state preserves the selection, which lets staff correct the action.

- [ ] **Step 5: Replace dense list styling with a resilient operations-card layout**

In `admin.css`, retain the absolute order link and z-index rules, then add scoped styles:

```css
.request-admin-list article {
  grid-template-columns: minmax(180px, 1.25fr) minmax(190px, 1fr) minmax(130px, 0.8fr) auto;
  gap: 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  margin-bottom: 10px;
}

.request-admin-status-badge,
.admin-order-action-feedback {
  position: relative;
  z-index: 3;
}

.request-admin-status-badge small,
.request-admin-progress {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 11px;
}

.admin-order-action-feedback.is-error {
  color: #a23d36;
}

.admin-order-action-feedback.is-success {
  color: #226f43;
}

@media (max-width: 760px) {
  .request-admin-list article {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .request-admin-list .admin-order-status {
    width: 100%;
  }
}
```

Ensure `.request-admin-customer-link`, `.request-admin-status`, and `.request-admin-status-badge` all remain above the order-card overlay and have `pointer-events: auto`.

- [ ] **Step 6: Run type, focused, and style checks**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-workflow.test.ts src/lib/admin-order-actions.test.ts
pnpm exec eslint src/components/admin-order-status-control.tsx src/app/admin/anfragen/page.tsx src/app/styles/admin.css
pnpm exec tsc --noEmit
```

Expected: all commands exit 0. CSS may be reported as ignored by ESLint depending on the project configuration; the TypeScript and Vitest commands must be clean.

- [ ] **Step 7: Commit the queue refresh**

```powershell
git add src/app/admin/anfragen/page.tsx src/components/admin-order-status-control.tsx src/app/styles/admin.css
git commit -m "feat: improve admin pickup operations queue"
```

---

### Task 4: Add an Honest Guest-Contact Screen

**Files:**
- Create: `src/app/admin/kunden/gast/[requestId]/page.tsx`
- Modify: `src/app/styles/admin.css`

**Interfaces:**
- Consumes: a request ID from `/admin/kunden/gast/{requestId}`, `getCurrentProfile`, `createClient`, and `DEMO_ORDER` for `requestId === "demo-1"`.
- Produces: An admin-only contact snapshot for a guest order, with no fabricated customer account and a return link to that order.

- [ ] **Step 1: Implement the server-side guest-contact lookup**

Create the route with this shape:

```ts
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_ORDER } from "@/lib/admin-demo-data";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminGuestContactPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const isDemo = requestId === DEMO_ORDER.id;
  const auth = await getCurrentProfile();
  const supabase = !isDemo && auth?.profile?.role === "admin" ? await createClient() : null;
  const { data: request } = isDemo
    ? { data: DEMO_ORDER }
    : supabase
      ? await supabase
          .from("requests")
          .select("id, request_number, customer_name, customer_email, customer_phone, created_at")
          .eq("id", requestId)
          .is("user_id", null)
          .maybeSingle()
      : { data: null };

  if (!request) notFound();
  // Render the contact details and a link to /admin/anfragen/{request.id}.
}
```

The `.is("user_id", null)` condition prevents exposing a registered person through the guest route.

- [ ] **Step 2: Render a contact snapshot with explicit account status**

Render:

```tsx
<main className="admin-guest-contact">
  <p className="breadcrumbs"><Link href="/admin/anfragen">Bestellungen</Link> / Gastkontakt</p>
  <p className="kicker">GASTBESTELLUNG</p>
  <h1>{request.customer_name}</h1>
  <p>Für diese Bestellung gibt es kein registriertes Kundenkonto.</p>
  <section>
    <h2>Kontaktdaten aus Bestellung {request.request_number}</h2>
    <a href={`mailto:${request.customer_email}`}>{request.customer_email}</a>
    <a href={`tel:${request.customer_phone}`}>{request.customer_phone}</a>
    <Link href={`/admin/anfragen/${request.id}`}>Bestellung öffnen</Link>
  </section>
</main>
```

Do not display a navigation link to `/admin/kunden/{email}` or claim that the contact is an account holder.

- [ ] **Step 3: Add focused styles without changing global customer-page styles**

Append scoped rules:

```css
.admin-guest-contact {
  max-width: 760px;
}

.admin-guest-contact section {
  display: grid;
  gap: 12px;
  margin-top: 20px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--white);
}

.admin-guest-contact a {
  width: fit-content;
  color: var(--accent);
  font-weight: 700;
}
```

- [ ] **Step 4: Verify guest-route behavior**

Run:

```powershell
pnpm exec tsc --noEmit
pnpm exec eslint 'src/app/admin/kunden/gast/[requestId]/page.tsx' src/app/styles/admin.css
```

Then open `http://localhost:3000/admin/kunden/gast/40000000-0000-0000-0000-000000000001` as an admin. Expected: Anna’s contact snapshot and the order link are visible. Open `http://localhost:3000/admin/kunden/gast/demo-1`; expected: the demo contact snapshot renders. Open a registered order ID through this route; expected: Next.js renders not-found.

- [ ] **Step 5: Commit guest contact navigation**

```powershell
git add 'src/app/admin/kunden/gast/[requestId]/page.tsx' src/app/styles/admin.css
git commit -m "feat: add admin guest contact screen"
```

---

### Task 5: Refresh the Order Detail for Fast Pickup Decisions

**Files:**
- Modify: `src/app/admin/anfragen/[id]/page.tsx`
- Modify: `src/components/admin-picking-control.tsx`
- Modify: `src/app/styles/admin.css`

**Interfaces:**
- Consumes: `getAdminOrderProgress`, `getNextAdminOrderAction`, `AdminOrderStatusControl`, `AdminPickingControl`, and the guest-contact route from Task 4.
- Produces: A detail header that shows the current status, quantity progress, next action, pickup reference, and a customer/guest link before the individual picking lines.

- [ ] **Step 1: Replace line-count calculations with quantity progress**

Import the helpers:

```ts
import {
  ADMIN_ORDER_STATUSES,
  getAdminOrderProgress,
  getNextAdminOrderAction,
  STATUS_LABELS,
  type AdminOrderStatus,
} from "@/lib/admin-order-workflow";
```

Replace the local `allPicked` calculation with:

```ts
const progress = getAdminOrderProgress(order.request_items);
const nextAction = getNextAdminOrderAction(orderStatus, progress.allPicked);
```

Pass `progress.allPicked` to `AdminOrderStatusControl`.

- [ ] **Step 2: Add an operational summary directly under the detail header**

Before the picking-card section, render:

```tsx
<section className="admin-order-operation-summary" aria-label="Abholstatus">
  <div>
    <span>Status</span>
    <strong>{STATUS_LABELS[orderStatus]}</strong>
  </div>
  <div>
    <span>Kommissionierung</span>
    <strong>{progress.pickedQuantity}/{progress.requiredQuantity} Artikel</strong>
  </div>
  <div>
    <span>Nächster Schritt</span>
    <strong>{nextAction?.label ?? "Kein weiterer Schritt verfügbar"}</strong>
  </div>
  <div>
    <span>Abholcode</span>
    <strong>{order.pickup_code}</strong>
  </div>
</section>
```

- [ ] **Step 3: Make every picking line communicate ordered and picked quantities**

Pass quantities into `AdminPickingControl`:

```tsx
<AdminPickingControl
  mode={workflowMode}
  requestId={order.id}
  itemId={item.id}
  itemName={item.name_snapshot}
  picked={Number(item.picked_qty) >= Number(item.quantity)}
  status={orderStatus}
  pickedQuantity={Number(item.picked_qty)}
  requiredQuantity={Number(item.quantity)}
/>
```

Extend `AdminPickingControlProps` with:

```ts
pickedQuantity: number;
requiredQuantity: number;
```

Render adjacent visible copy in both branches:

```tsx
<span className="admin-picking-quantity">
  {Math.min(pickedQuantity, requiredQuantity)}/{requiredQuantity} kommissioniert
</span>
```

In demo mode, derive the displayed count as `requiredQuantity` when `state.pickedItemIds.includes(itemId)` and `0` otherwise; do not read `pickedQuantity` in the demo branch.

- [ ] **Step 4: Link a guest to its contact screen from detail**

Replace the existing guest-only `<b>` branch in `Kundendaten` with:

```tsx
{order.user_id ? (
  <Link href={`/admin/kunden/${order.user_id}`}><b>{order.customer_name}</b></Link>
) : (
  <Link href={`/admin/kunden/gast/${order.id}`}><b>{order.customer_name}</b></Link>
)}
```

Under the name, show `Kundenprofil` for registered customers and `Gastkontakt` for guests. Keep direct `mailto:` and `tel:` links in both cases.

- [ ] **Step 5: Add responsive detail styling**

Append scoped rules:

```css
.admin-order-operation-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.admin-order-operation-summary > div {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--white);
}

.admin-order-operation-summary span,
.admin-picking-quantity {
  color: var(--muted);
  font-size: 11px;
}

@media (max-width: 760px) {
  .admin-order-operation-summary {
    grid-template-columns: 1fr 1fr;
  }

  .pick-line-info {
    align-items: flex-start;
  }
}
```

- [ ] **Step 6: Verify detail behavior in demo and live modes**

Run:

```powershell
pnpm exec vitest run src/lib/admin-order-workflow.test.ts src/lib/admin-order-actions.test.ts
pnpm exec eslint 'src/app/admin/anfragen/[id]/page.tsx' src/components/admin-picking-control.tsx src/app/styles/admin.css
pnpm exec tsc --noEmit
```

Then verify in the browser:

1. Open `/admin/anfragen/demo-1`, set `new → processing`, pick both lines, and set `processing → ready_for_pickup`.
2. Confirm the summary changes from `0/3 Artikel` to `3/3 Artikel`, then exposes `Als abholbereit markieren`.
3. Open `/admin/anfragen/40000000-0000-0000-0000-000000000001` as admin, set `new → processing`, and confirm `Der Bestellstatus wurde gespeichert.` appears instead of the invalid-data error.
4. Use the customer link for the live seed order; expected destination is `/admin/kunden/gast/40000000-0000-0000-0000-000000000001`.

- [ ] **Step 7: Commit the detail refresh**

```powershell
git add 'src/app/admin/anfragen/[id]/page.tsx' src/components/admin-picking-control.tsx src/app/styles/admin.css
git commit -m "feat: improve pickup order detail workflow"
```

---

### Task 6: Full Verification and Acceptance Review

**Files:**
- Modify only if necessary to correct a verified failure from Tasks 1–5.

**Interfaces:**
- Consumes: all completed refresh tasks.
- Produces: fresh test, lint, type, build, browser, and diff evidence.

- [ ] **Step 1: Run the complete automated suite**

```powershell
$env:Path = 'C:\Users\tarbu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Expected: every command exits 0. Do not treat a prior run as evidence.

- [ ] **Step 2: Verify list interaction at desktop and mobile widths**

At 1440px and 390px widths on `/admin/anfragen`, verify:

```text
- Clicking order number, amount, date, or card whitespace opens the order detail.
- Clicking a registered customer opens /admin/kunden/{user_id}.
- Clicking the seed guest opens /admin/kunden/gast/40000000-0000-0000-0000-000000000001.
- The status select/button remains clickable and never navigates the card.
- `new → processing` on the live seed order shows success and survives a hard reload.
- Search, status filter, sort, and reset retain/clear URL query parameters correctly.
- No focusable control is obscured by the absolute card link.
```

- [ ] **Step 3: Verify accessible status and error feedback**

Using browser DOM inspection, assert:

```text
- A failed action renders `.admin-order-action-feedback.is-error` with role="alert".
- A saved action renders `.admin-order-action-feedback.is-success` with role="status".
- Status text and progress use readable text, not color alone.
- Buttons have descriptive accessible names and meet a 36px minimum target.
```

- [ ] **Step 4: Review staged commits and protect unrelated work**

Run:

```powershell
git status --short
git diff --check
git log --oneline --max-count=8
git diff HEAD~6..HEAD -- src/lib/admin-order-actions.ts src/lib/admin-order-actions.test.ts src/lib/admin-order-workflow.ts src/lib/admin-order-workflow.test.ts src/components/admin-order-status-control.tsx src/components/admin-picking-control.tsx src/app/admin/anfragen src/app/admin/kunden src/app/styles/admin.css
```

Expected: no whitespace errors, no service-role keys or tokens, no staged user account/catalog/search changes, and only the files listed by Tasks 1–5 appear in the refresh commits.

- [ ] **Step 5: Commit only a verification correction if one was required**

If a verified failure required a code correction, commit that exact file set with a message describing the corrected behavior. If the commands and acceptance checks are already green, create no empty commit.

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| Live status change no longer fails on deterministic seed ID | 1, 6 |
| Picking action accepts the deterministic seed item ID | 1, 6 |
| Quantity progress is accurate for multi-quantity lines | 2, 3, 5 |
| Only valid next actions are explained visibly | 2, 3, 5 |
| Clicking a real customer opens their profile | 3, 6 |
| Clicking a guest contact opens useful information without inventing an account | 3, 4, 5, 6 |
| List and detail remain usable with overlay/card layouts and on mobile | 3, 5, 6 |
| Status results are actionable and accessible | 3, 6 |

## Self-Review

- Scope is one coherent pickup-order operations refresh; no unrelated payment, notification, bulk-operation, or database-history subsystem is introduced.
- Each new helper and action regression has a red/green test command, exact expected behavior, and an owning task.
- Later tasks consume only interfaces declared in earlier tasks.
- The plan deliberately uses a guest-contact route instead of a fake registered-customer URL, resolving the observed non-navigation while preserving account semantics.
