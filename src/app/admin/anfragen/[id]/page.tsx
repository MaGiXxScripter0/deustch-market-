import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDemoOrderProvider } from "@/components/admin-demo-order-provider";
import { AdminPickingControl } from "@/components/admin-picking-control";
import { AdminOrderStatusControl } from "@/components/admin-order-status-control";
import { euro } from "@/lib/catalog";
import { getAdminCatalogData } from "@/lib/catalog-repository";
import { DEMO_ORDER } from "@/lib/admin-demo-data";
import { ADMIN_ORDER_STATUSES, type AdminOrderStatus } from "@/lib/admin-order-workflow";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getCurrentProfile();
  const enabled = auth?.profile?.role === "admin";
  const { id } = await params;
  const isDemo = id === DEMO_ORDER.id;
  const supabase = enabled && !isDemo ? await createClient() : null;
  const { products } = await getAdminCatalogData();
  const { data } = supabase
    ? await supabase
        .from("requests")
        .select(
          "id, request_number, status, subtotal, customer_name, customer_email, customer_phone, comment, created_at, pickup_code, pickup_slot_start, request_items(id, sku_snapshot, name_snapshot, sale_unit_snapshot, quantity, picked_qty, unit_price, line_total)",
        )
        .eq("id", id)
        .maybeSingle()
    : { data: DEMO_ORDER };
  const order = data ?? (isDemo ? DEMO_ORDER : null);
  if (!order) notFound();
  const orderStatus = ADMIN_ORDER_STATUSES.includes(order.status as AdminOrderStatus)
    ? (order.status as AdminOrderStatus)
    : "new";
  const productBySku = new Map(products.map((product) => [product.sku, product]));
  const allPicked = (order.request_items ?? []).every(
    (item) => Number(item.picked_qty) >= Number(item.quantity),
  );
  const workflowMode = isDemo ? "demo" : "live";
  const itemIds = (order.request_items ?? []).map((item) => item.id);
  const workflow = (
    <>
      <div className="admin-heading">
        <div>
          <p className="kicker">ABHOLBESTELLUNG</p>
          <h1>{order.request_number}</h1>
          <p>{new Date(order.created_at).toLocaleString("de-DE")}</p>
        </div>
        <AdminOrderStatusControl
          mode={workflowMode}
          orderId={order.id}
          status={orderStatus}
          allPicked={allPicked}
        />
      </div>
      <section className="admin-order-card">
        <h2>Für die Abholung zusammenstellen</h2>
        <div className="admin-order-lines">
          {(order.request_items ?? []).map((item) => {
            const picked = Number(item.picked_qty) >= Number(item.quantity);
            return (
              <article key={item.id} className={picked ? "is-picked" : undefined}>
                <div className="pick-line-info">
                  <AdminPickingControl
                    mode={workflowMode}
                    requestId={order.id}
                    itemId={item.id}
                    itemName={item.name_snapshot}
                    picked={picked}
                    status={orderStatus}
                  />
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
            );
          })}
        </div>
        <div className="admin-order-total">
          <span>Gesamtsumme</span>
          <strong>{euro.format(Number(order.subtotal))}</strong>
        </div>
      </section>
    </>
  );

  return (
    <main className="admin-order-detail">
      <p className="breadcrumbs">
        <Link href="/admin/anfragen">Bestellungen</Link> / {order.request_number}
      </p>
      {isDemo && (
        <div className="admin-warning">
          Interaktive Demo: Status und Kommissionierung gelten nur für diese Browsersitzung.
        </div>
      )}
      {isDemo ? (
        <AdminDemoOrderProvider
          orderId={order.id}
          initialState={{
            status: orderStatus,
            pickedItemIds: (order.request_items ?? [])
              .filter((item) => Number(item.picked_qty) >= Number(item.quantity))
              .map((item) => item.id),
          }}
          allItemIds={itemIds}
        >
          {workflow}
        </AdminDemoOrderProvider>
      ) : (
        workflow
      )}
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
