import Link from "next/link";
import { AdminDemoOrderProvider } from "@/components/admin-demo-order-provider";
import { AdminOrderListFilters } from "@/components/admin-order-list-filters";
import { AdminOrderMetrics } from "@/components/admin-order-metrics";
import { AdminOrderStatusControl } from "@/components/admin-order-status-control";
import { DEMO_ORDER } from "@/lib/admin-demo-data";
import { euro } from "@/lib/catalog";
import {
  ADMIN_ORDER_STATUSES,
  getAdminOrderProgress,
  getNextAdminOrderAction,
  normalizeAdminOrderFilters,
  STATUS_LABELS,
  type AdminOrderStatus,
} from "@/lib/admin-order-workflow";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string; sort?: string }>;
const metricStatuses = ["new", "processing", "ready_for_pickup", "completed"] as const;

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = normalizeAdminOrderFilters(await searchParams);
  const auth = await getCurrentProfile();
  const enabled = auth?.profile?.role === "admin";
  const supabase = enabled ? await createClient() : null;
  let rows: Array<{
    id: string;
    user_id: string | null;
    request_number: string;
    customer_name: string;
    customer_email: string;
    status: string;
    subtotal: number;
    fulfillment: string;
    created_at: string;
    request_items: ReadonlyArray<{ id: string; quantity: number; picked_qty: number }>;
  }>;
  let counts: Record<(typeof metricStatuses)[number], number> = {
    new: 0,
    processing: 0,
    ready_for_pickup: 0,
    completed: 0,
  };

  if (supabase) {
    let query = supabase
      .from("requests")
      .select(
        "id, user_id, request_number, customer_name, customer_email, status, subtotal, fulfillment, created_at, request_items(id, quantity, picked_qty)",
      );
    if (filters.q) {
      query = query.or(
        `request_number.ilike.%${filters.q}%,customer_name.ilike.%${filters.q}%,customer_email.ilike.%${filters.q}%`,
      );
    }
    if (filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.sort === "highest") query = query.order("subtotal", { ascending: false });
    else query = query.order("created_at", { ascending: filters.sort === "oldest" });
    const [{ data }] = await Promise.all([query.limit(100)]);
    rows = (data ?? []) as typeof rows;
    const metricResults = await Promise.all(
      metricStatuses.map((status) =>
        supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("status", status),
      ),
    );
    counts = Object.fromEntries(
      metricStatuses.map((status, index) => [status, metricResults[index].count ?? 0]),
    ) as typeof counts;
  } else {
    const demo = DEMO_ORDER;
    const haystack = `${demo.request_number} ${demo.customer_name} ${demo.customer_email}`.toLowerCase();
    const matchingQuery = !filters.q || haystack.includes(filters.q.toLowerCase());
    const matchingStatus = filters.status === "all" || filters.status === demo.status;
    rows = matchingQuery && matchingStatus ? [demo] : [];
    counts[demo.status] = 1;
  }

  const initialState = {
    status: (rows[0]?.status ?? DEMO_ORDER.status) as AdminOrderStatus,
    pickedItemIds: rows[0]?.request_items
      .filter((item) => Number(item.picked_qty) >= Number(item.quantity))
      .map((item) => item.id) ?? [],
  };
  const itemIds = rows[0]?.request_items.map((item) => item.id) ?? [];
  const listContent = (
    <>
      <AdminOrderMetrics mode={enabled ? "live" : "demo"} counts={counts} />
      <div className="request-admin-list">
        {rows.length === 0 ? (
          <p className="admin-empty-state">Keine Bestellungen gefunden.</p>
        ) : rows.map((row) => {
          const status = ADMIN_ORDER_STATUSES.includes(row.status as AdminOrderStatus)
            ? (row.status as AdminOrderStatus)
            : "new";
          const progress = getAdminOrderProgress(row.request_items);
          const nextAction = getNextAdminOrderAction(status, progress.allPicked);
          return (
            <article key={row.id}>
              <Link
                className="request-admin-card-link"
                href={`/admin/anfragen/${row.id}`}
                aria-label={`Bestellung ${row.request_number} öffnen`}
              />
              <div>
                <small>{new Date(row.created_at).toLocaleDateString("de-DE")}</small>
                <h2>{row.request_number}</h2>
                <span className="request-admin-progress">
                  {progress.pickedQuantity}/{progress.requiredQuantity} Artikel kommissioniert
                </span>
              </div>
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
              <strong>{euro.format(Number(row.subtotal))}</strong>
              <div className="request-admin-status-stack">
                <div className={`request-admin-status-badge is-${status}`}>
                  <span>{STATUS_LABELS[status]}</span>
                  {nextAction ? (
                    <small>Nächster Schritt: {nextAction.label}</small>
                  ) : (
                    <small>Kein weiterer Schritt verfügbar</small>
                  )}
                </div>
                <AdminOrderStatusControl
                  mode={enabled ? "live" : "demo"}
                  orderId={row.id}
                  status={status}
                  allPicked={progress.allPicked}
                  compact
                />
              </div>
            </article>
          );
        })}
      </div>
    </>
  );

  return (
    <main>
      <div className="admin-heading">
        <div>
          <p className="kicker">BESTELLUNGEN</p>
          <h1>Abholungen</h1>
        </div>
      </div>
      {!enabled && (
        <div className="admin-warning">
          Demodaten: Melden Sie sich mit einem Admin-Konto an, um echte Bestellungen zu bearbeiten.
        </div>
      )}
      <AdminOrderListFilters {...filters} />
      {!enabled ? (
        <AdminDemoOrderProvider
          orderId={DEMO_ORDER.id}
          initialState={initialState}
          allItemIds={itemIds}
        >
          {listContent}
        </AdminDemoOrderProvider>
      ) : listContent}
    </main>
  );
}
