import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReorderButton } from "@/components/reorder-button";
import { euro } from "@/lib/catalog";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  new: "Bestellung eingegangen",
  processing: "Wird zusammengestellt",
  ready_for_pickup: "Abholbereit",
  completed: "Abgeholt",
  cancelled: "Storniert",
};

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
    .maybeSingle();
  if (!request) notFound();

  return (
    <main className="shell page-main request-detail">
      <div className="page-hero compact">
        <p className="breadcrumbs">
          <Link href="/konto">Mein Konto</Link> / <Link href="/konto/anfragen">Bestellungen</Link> /{" "}
          {request.request_number}
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
        <strong>{statusLabels[request.status] ?? request.status}</strong>
      </div>
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
    </main>
  );
}
