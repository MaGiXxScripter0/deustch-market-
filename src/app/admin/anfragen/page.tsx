import { updateRequestStatusAction } from "@/lib/actions";
import { euro } from "@/lib/catalog";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
const demoRows = [
  {
    id: "demo-1",
    request_number: "ANF-2026-000123",
    customer_name: "Anna Beispiel",
    customer_email: "anna@example.de",
    status: "new",
    subtotal: 248.4,
    fulfillment: "delivery",
    created_at: new Date().toISOString(),
  },
];
export default async function AdminRequestsPage() {
  const auth = await getCurrentProfile();
  const enabled = auth?.profile?.role === "admin";
  const supabase = enabled ? await createClient() : null;
  const { data } = supabase
    ? await supabase
        .from("requests")
        .select(
          "id, request_number, customer_name, customer_email, status, subtotal, fulfillment, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: null };
  const rows = data ?? demoRows;
  return (
    <main>
      <div className="admin-heading">
        <div>
          <p className="kicker">VERTRIEB</p>
          <h1>Anfragen</h1>
        </div>
      </div>
      {!enabled && (
        <div className="admin-warning">
          Demodaten: Melden Sie sich mit einem Admin-Konto an, um echte Anfragen zu bearbeiten.
        </div>
      )}
      <div className="request-admin-list">
        {rows.map((row) => (
          <article key={row.id}>
            <div>
              <small>{new Date(row.created_at).toLocaleDateString("de-DE")}</small>
              <h2>{row.request_number}</h2>
            </div>
            <p>
              <b>{row.customer_name}</b>
              <span>{row.customer_email}</span>
            </p>
            <strong>{euro.format(Number(row.subtotal))}</strong>
            <form action={updateRequestStatusAction}>
              <input type="hidden" name="id" value={row.id} />
              <select name="status" defaultValue={row.status} disabled={!enabled}>
                <option value="new">Neu</option>
                <option value="processing">In Bearbeitung</option>
                <option value="quoted">Angebot gesendet</option>
                <option value="completed">Abgeschlossen</option>
                <option value="cancelled">Storniert</option>
              </select>
              <button disabled={!enabled} type="submit">
                Speichern
              </button>
            </form>
          </article>
        ))}
      </div>
    </main>
  );
}
