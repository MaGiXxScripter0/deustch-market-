import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isPickupOrderStatus, ORDER_STATUS_LABELS } from "@/lib/account";
import { OrderSelfService } from "@/components/order-self-service";
import { OrderStatusTimeline } from "@/components/order-status-timeline";
import { AccountDashboardShell } from "@/components/account-dashboard-shell";
import { ReorderButton } from "@/components/reorder-button";
import { euro } from "@/lib/catalog";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function AccountRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getCurrentProfile();
  if (!auth) redirect("/konto/anmelden");
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: request } = await supabase
    .from("requests")
    .select(
      "id, request_number, status, subtotal, fulfillment, comment, created_at, pickup_code, pickup_slot_start, request_items(id, product_id, sku_snapshot, name_snapshot, sale_unit_snapshot, quantity, unit_price, line_total)",
    )
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .eq("fulfillment", "pickup")
    .maybeSingle();
  if (!request) notFound();
  const status = isPickupOrderStatus(request.status) ? request.status : null;

  return (
    <AccountDashboardShell isAdmin={auth.profile?.role === "admin"}>
      <div className="request-detail">
        <div className="page-hero compact">
          <p className="breadcrumbs">
            <Link href="/konto">Mein Konto</Link> / <Link href="/konto/anfragen">Bestellungen</Link>{" "}
            / {request.request_number}
          </p>
          <p className="kicker">BESTELLDETAIL</p>
          <h1>{request.request_number}</h1>
          <p>
            {new Date(request.created_at).toLocaleDateString("de-DE")} · Abholung{" "}
            {siteConfig.storeName}
          </p>
        </div>
        <div className="request-detail-status">
          <span>Status</span>
          <strong>{status ? ORDER_STATUS_LABELS[status] : "Unbekannter Status"}</strong>
        </div>
        {status && <OrderStatusTimeline status={status} />}
        {status && (
          <OrderSelfService
            orderId={request.id}
            orderNumber={request.request_number}
            status={status}
            pickupSlotStart={request.pickup_slot_start}
          />
        )}
        <div className="request-detail-status">
          <span>Abholung</span>
          <strong>
            {request.pickup_slot_start
              ? new Date(request.pickup_slot_start).toLocaleString("de-DE")
              : "Termin wird abgestimmt"}
          </strong>
          <span>Abholcode</span>
          <strong>{request.pickup_code}</strong>
        </div>
        <div className="request-detail-lines">
          {(request.request_items ?? []).map((item) => (
            <article key={item.id}>
              <div>
                <small>{item.sku_snapshot}</small>
                <h2>{item.name_snapshot}</h2>
              </div>
              <span>
                {Number(item.quantity).toLocaleString("de-DE")} {item.sale_unit_snapshot}
              </span>
              <span>{euro.format(Number(item.unit_price))}</span>
              <strong>{euro.format(Number(item.line_total))}</strong>
            </article>
          ))}
        </div>
        {request.comment && (
          <section className="request-detail-comment">
            <h2>Kommentar</h2>
            <p>{request.comment}</p>
          </section>
        )}
        <div className="request-detail-total">
          <span>Zwischensumme</span>
          <strong>{euro.format(Number(request.subtotal))}</strong>
        </div>
        <div className="request-detail-reorder">
          <ReorderButton
            lines={(request.request_items ?? [])
              .filter((item): item is typeof item & { product_id: string } =>
                Boolean(item.product_id),
              )
              .map((item) => ({ productId: item.product_id, quantity: Number(item.quantity) }))}
          />
        </div>
      </div>
    </AccountDashboardShell>
  );
}
