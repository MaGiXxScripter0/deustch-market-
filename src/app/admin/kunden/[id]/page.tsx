import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_CUSTOMER, DEMO_ORDER } from "@/lib/admin-demo-data";
import { euro } from "@/lib/catalog";
import {
  STATUS_LABELS,
  summarizeCustomerOrders,
  type AdminOrderStatus,
  type CustomerOrderSummary,
} from "@/lib/admin-order-workflow";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isDemo = id === DEMO_CUSTOMER.id;
  const auth = await getCurrentProfile();
  const supabase = !isDemo && auth?.profile?.role === "admin" ? await createClient() : null;

  let customer: { id: string; full_name: string | null; phone: string | null; role: string; created_at: string } | null;
  let orders: Array<CustomerOrderSummary & {
    request_number: string;
    customer_email: string | null;
    request_items: Array<{ id: string; quantity: number; picked_qty: number }>;
  }>;

  if (isDemo) {
    customer = { ...DEMO_CUSTOMER, created_at: DEMO_ORDER.created_at };
    orders = [DEMO_ORDER].map((order) => ({
      id: order.id,
      request_number: order.request_number,
      customer_email: order.customer_email,
      subtotal: order.subtotal,
      created_at: order.created_at,
      status: order.status,
      request_items: order.request_items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        picked_qty: item.picked_qty,
      })),
    }));
  } else {
    if (!supabase) notFound();
    const [{ data: profile }, { data: requestRows }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, role, created_at").eq("id", id).maybeSingle(),
      supabase
        .from("requests")
        .select("id, request_number, customer_email, status, subtotal, created_at, request_items(id, quantity, picked_qty)")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
    ]);
    customer = profile;
    orders = (requestRows ?? []) as typeof orders;
  }

  if (!customer) notFound();
  const summary = summarizeCustomerOrders(orders);
  const email = orders.find((order) => order.customer_email)?.customer_email ?? null;

  return (
    <main className="admin-customer-detail">
      <p className="breadcrumbs"><Link href="/admin/kunden">Kunden</Link> / {customer.full_name || "Kunde"}</p>
      <header className="admin-heading">
        <div>
          <p className="kicker">KUNDENPROFIL</p>
          <h1>{customer.full_name || "Ohne Namen"}</h1>
          <p>Registriert am {new Date(customer.created_at).toLocaleDateString("de-DE")}</p>
        </div>
      </header>
      {isDemo && <div className="admin-warning">Vorschau mit Demodaten. Änderungen sind nicht dauerhaft.</div>}
      <section className="admin-customer-contact">
        <h2>Kontaktdaten</h2>
        <p>
          {customer.phone ? <a href={`tel:${customer.phone}`}>{customer.phone}</a> : "Keine Telefonnummer vorhanden"}
          <br />
          {email ? <a href={`mailto:${email}`}>{email}</a> : "Keine Bestell-E-Mail vorhanden"}
        </p>
        {email && <small>E-Mail aus der letzten Bestellung</small>}
      </section>
      <section className="admin-stats" aria-label="Kundenkennzahlen">
        <div className="admin-stat"><span>Bestellungen</span><strong>{summary.orderCount}</strong></div>
        <div className="admin-stat"><span>Gesamtumsatz</span><strong>{euro.format(summary.totalSpent)}</strong></div>
        <div className="admin-stat"><span>Aktive Abholungen</span><strong>{summary.activePickupCount}</strong></div>
        <div className="admin-stat"><span>Letzte Bestellung</span><strong>{summary.lastOrderAt ? new Date(summary.lastOrderAt).toLocaleDateString("de-DE") : "—"}</strong></div>
      </section>
      <section className="admin-customer-orders">
        <h2>Bestellverlauf</h2>
        {orders.length === 0 ? <p className="admin-empty-state">Keine Bestellungen gefunden.</p> : orders.map((order) => {
          const status = order.status as AdminOrderStatus;
          const picked = order.request_items.filter((item) => Number(item.picked_qty) >= Number(item.quantity)).length;
          return (
            <article key={order.id}>
              <div>
                <Link href={`/admin/anfragen/${order.id}`}><b>{order.request_number}</b></Link>
                <span>{new Date(order.created_at).toLocaleDateString("de-DE")}</span>
              </div>
              <span>{STATUS_LABELS[status] ?? status}</span>
              <span>{picked}/{order.request_items.length} Positionen kommissioniert</span>
              <strong>{euro.format(Number(order.subtotal))}</strong>
            </article>
          );
        })}
      </section>
    </main>
  );
}
