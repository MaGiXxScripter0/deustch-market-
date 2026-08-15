import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setPickupItemPickedAction, updateRequestStatusAction } from "@/lib/actions";
import { euro } from "@/lib/catalog";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  new: "Bestellung eingegangen",
  processing: "Wird zusammengestellt",
  ready_for_pickup: "Abholbereit",
  completed: "Abgeholt",
  cancelled: "Storniert",
};

const nextStatuses: Record<string, string[]> = {
  new: ["new", "processing", "cancelled"],
  processing: ["processing", "ready_for_pickup", "cancelled"],
  ready_for_pickup: ["ready_for_pickup", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") redirect("/admin/anfragen");
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: order } = await supabase
    .from("requests")
    .select(
      "id, request_number, status, subtotal, customer_name, customer_email, customer_phone, comment, created_at, pickup_code, pickup_slot_start, request_items(id, sku_snapshot, name_snapshot, sale_unit_snapshot, quantity, picked_qty, unit_price, line_total)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();
  const allPicked = (order.request_items ?? []).every(
    (item) => Number(item.picked_qty) >= Number(item.quantity),
  );
  const allowedStatuses = (nextStatuses[order.status] ?? [order.status]).filter(
    (status) => status !== "ready_for_pickup" || allPicked,
  );

  return (
    <main className="admin-order-detail">
      <p className="breadcrumbs">
        <Link href="/admin/anfragen">Bestellungen</Link> / {order.request_number}
      </p>
      <div className="admin-heading">
        <div>
          <p className="kicker">ABHOLBESTELLUNG</p>
          <h1>{order.request_number}</h1>
          <p>{new Date(order.created_at).toLocaleString("de-DE")}</p>
        </div>
        <form action={updateRequestStatusAction} className="admin-order-status">
          <input type="hidden" name="id" value={order.id} />
          <select name="status" defaultValue={order.status}>
            {allowedStatuses.map((status) => (
              <option value={status} key={status}>
                {statusLabels[status] ?? status}
              </option>
            ))}
          </select>
          <button type="submit">Status speichern</button>
        </form>
      </div>
      <section className="admin-order-card">
        <h2>Für die Abholung zusammenstellen</h2>
        <div className="admin-order-lines">
          {(order.request_items ?? []).map((item) => (
            <article key={item.id}>
              <div className="pick-line-info">
                <form action={setPickupItemPickedAction} className="pick-line-form">
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="requestId" value={order.id} />
                  <input
                    type="hidden"
                    name="picked"
                    value={String(Number(item.picked_qty) < Number(item.quantity))}
                  />
                  <button
                    type="submit"
                    className={Number(item.picked_qty) >= Number(item.quantity) ? "picked" : ""}
                    aria-label={`${item.name_snapshot} ${Number(item.picked_qty) >= Number(item.quantity) ? "zurücksetzen" : "kommissioniert"}`}
                    disabled={!['new', 'processing'].includes(order.status)}
                  >
                    {Number(item.picked_qty) >= Number(item.quantity) ? "✓" : ""}
                  </button>
                </form>
                <span>
                  <small>{item.sku_snapshot}</small>
                  <b>{item.name_snapshot}</b>
                </span>
              </div>
              <strong>
                {Number(item.quantity).toLocaleString("de-DE")} {item.sale_unit_snapshot}
              </strong>
              <span>{euro.format(Number(item.line_total))}</span>
            </article>
          ))}
        </div>
        <div className="admin-order-total">
          <span>Gesamtsumme</span>
          <strong>{euro.format(Number(order.subtotal))}</strong>
        </div>
      </section>
      <div className="admin-order-meta">
        <section>
          <h2>Kundendaten</h2>
          <p>
            <b>{order.customer_name}</b>
            <br />
            <a href={`mailto:${order.customer_email}`}>{order.customer_email}</a>
            <br />
            <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
          </p>
        </section>
        <section>
          <h2>Hinweis zur Abholung</h2>
          <p>{order.comment || "Kein zusätzlicher Hinweis."}</p>
          <p>
            Gewünschter Termin: {order.pickup_slot_start
              ? new Date(order.pickup_slot_start).toLocaleString("de-DE")
              : "Nicht angegeben"}
            <br />
            Abholcode: <b>{order.pickup_code}</b>
            <br />
            Zahlung bei Abholung im Markt.
          </p>
        </section>
      </div>
    </main>
  );
}
