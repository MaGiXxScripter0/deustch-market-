import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { euro } from "@/lib/catalog";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meine Anfragen | Demo Baustoffmarkt" };
const labels: Record<string, string> = {
  new: "Neu",
  processing: "In Bearbeitung",
  quoted: "Angebot gesendet",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
};
export default async function AccountRequestsPage() {
  const auth = await getCurrentProfile();
  if (!auth) redirect("/konto/anmelden");
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("requests")
        .select("id, request_number, status, subtotal, fulfillment, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
    : { data: null };
  const rows = data ?? [];
  return (
    <main className="shell page-main">
      <div className="page-hero compact">
        <p className="breadcrumbs">
          <Link href="/konto">Mein Konto</Link> / Anfragen
        </p>
        <p className="kicker">ANFRAGEHISTORIE</p>
        <h1>Meine Anfragen.</h1>
      </div>
      {rows.length ? (
        <div className="request-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <span>{new Date(row.created_at).toLocaleDateString("de-DE")}</span>
                <h2>{row.request_number}</h2>
              </div>
              <p>
                {row.fulfillment === "pickup" ? "Abholung Berlin-Mitte" : "Baustellenlieferung"}
              </p>
              <strong>{euro.format(Number(row.subtotal))}</strong>
              <b data-status={row.status}>{labels[row.status] ?? row.status}</b>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-cart">
          <h2>Noch keine gespeicherten Anfragen.</h2>
          <p>Sobald Sie angemeldet eine Anfrage senden, erscheint sie hier.</p>
          <Link className="button primary" href="/sortiment">
            Zum Sortiment
          </Link>
        </div>
      )}
    </main>
  );
}
