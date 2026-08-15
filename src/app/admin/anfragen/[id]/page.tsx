import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setPickupItemPickedAction, updateRequestStatusAction } from "@/lib/actions";
import { euro } from "@/lib/catalog";
import { getAdminCatalogData } from "@/lib/catalog-repository";
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

const demoOrder = {
  id: "demo-1",
  request_number: "ABH-2026-000123",
  status: "new",
  subtotal: 248.4,
  customer_name: "Anna Beispiel",
  customer_email: "anna@example.de",
  customer_phone: "+49 30 000000",
  comment: "Bitte am Abholschalter melden.",
  created_at: new Date().toISOString(),
  pickup_code: "ABH-123",
  pickup_slot_start: null,
  request_items: [
    {
      id: "demo-line-1",
      sku_snapshot: "NW-125-260",
      name_snapshot: "Gipskartonplatte Pro 12,5 mm",
      sale_unit_snapshot: "Stück",
      quantity: 2,
      picked_qty: 0,
      unit_price: 8.95,
      line_total: 17.9,
    },
  ],
};

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getCurrentProfile();
  const enabled = auth?.profile?.role === "admin";
  const { id } = await params;
  const supabase = enabled ? await createClient() : null;
  const { products } = await getAdminCatalogData();
  const { data } = supabase
    ? await supabase
        .from("requests")
        .select(
          "id, request_number, status, subtotal, customer_name, customer_email, customer_phone, comment, created_at, pickup_code, pickup_slot_start, request_items(id, sku_snapshot, name_snapshot, sale_unit_snapshot, quantity, picked_qty, unit_price, line_total)",
        )
        .eq("id", id)
        .maybeSingle()
    : { data: demoOrder };
  const order = data ?? (enabled ? null : demoOrder);
  if (!order) notFound();
  const productBySku = new Map(products.map((product) => [product.sku, product]));
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
      {!enabled && (
        <div className="admin-warning">
          Vorschaumodus: Status und Kommissionierung werden nur mit einem Admin-Konto gespeichert.
        </div>
      )}
      <div className="admin-heading">
        <div>
          <p className="kicker">ABHOLBESTELLUNG</p>
          <h1>{order.request_number}</h1>
          <p>{new Date(order.created_at).toLocaleString("de-DE")}</p>
        </div>
        <form action={updateRequestStatusAction} className="admin-order-status">
          <input type="hidden" name="id" value={order.id} />
          <select name="status" defaultValue={order.status} disabled={!enabled}>
            {allowedStatuses.map((status) => (
              <option value={status} key={status}>
                {statusLabels[status] ?? status}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!enabled}>
            Status speichern
          </button>
        </form>
      </div>
      <section className="admin-order-card">
        <h2>Für die Abholung zusammenstellen</h2>
        <div className="admin-order-lines">
          {(order.request_items ?? []).map((item) => (
            <article
              key={item.id}
              className={Number(item.picked_qty) >= Number(item.quantity) ? "is-picked" : undefined}
            >
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
                    disabled={!enabled || !["new", "processing"].includes(order.status)}
                  >
                    {Number(item.picked_qty) >= Number(item.quantity) ? "✓" : ""}
                  </button>
                </form>
                <div className="pick-line-image">
                  <Image
                    src={productBySku.get(item.sku_snapshot)?.image ?? "/og.png"}
                    alt=""
                    fill
                    sizes="64px"
                  />
                </div>
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
            Gewünschter Termin:{" "}
            {order.pickup_slot_start
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
