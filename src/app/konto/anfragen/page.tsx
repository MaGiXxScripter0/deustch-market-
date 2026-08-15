import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { euro } from "@/lib/catalog";
import { isPickupOrderStatus, ORDER_STATUS_LABELS } from "@/lib/account";
import { AccountDashboardShell } from "@/components/account-dashboard-shell";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Meine Bestellungen | ${siteConfig.name}` };
export default async function AccountRequestsPage() {
  const auth = await getCurrentProfile();
  if (!auth) redirect("/konto/anmelden");
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("requests")
        .select("id, request_number, status, subtotal, fulfillment, created_at, pickup_slot_start")
        .eq("user_id", auth.user.id)
        .eq("fulfillment", "pickup")
        .order("created_at", { ascending: false })
    : { data: null };
  const rows = data ?? [];
  return (
    <AccountDashboardShell isAdmin={auth.profile?.role === "admin"}>
      <div className="page-hero compact">
        <p className="breadcrumbs">
          <Link href="/konto">Mein Konto</Link> / Bestellungen
        </p>
        <p className="kicker">BESTELLHISTORIE</p>
        <h1>Meine Bestellungen.</h1>
      </div>
      {rows.length ? (
        <div className="request-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <span>{new Date(row.created_at).toLocaleDateString("de-DE")}</span>
                <h2>
                  <Link href={`/konto/anfragen/${row.id}`}>{row.request_number}</Link>
                </h2>
              </div>
              <p>
                {row.pickup_slot_start
                  ? new Date(row.pickup_slot_start).toLocaleString("de-DE")
                  : `Abholung ${siteConfig.storeName}`}
              </p>
              <strong>{euro.format(Number(row.subtotal))}</strong>
              <b data-status={row.status}>
                {isPickupOrderStatus(row.status)
                  ? ORDER_STATUS_LABELS[row.status]
                  : "Unbekannter Status"}
              </b>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-cart">
          <h2>Noch keine gespeicherten Bestellungen.</h2>
          <p>Sobald Sie angemeldet eine Bestellung aufgeben, erscheint sie hier.</p>
          <Link className="button primary" href="/sortiment">
            Zum Sortiment
          </Link>
        </div>
      )}
    </AccountDashboardShell>
  );
}
