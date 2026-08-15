import { updateRequestStatusAction } from "@/lib/actions";
import { euro } from "@/lib/catalog";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import Link from "next/link";
export const dynamic = "force-dynamic";
const demoRows = [
  {
    id: "demo-1",
    request_number: "ABH-2026-000123",
    customer_name: "Anna Beispiel",
    customer_email: "anna@example.de",
    status: "new",
    subtotal: 248.4,
    fulfillment: "pickup",
    created_at: new Date().toISOString(),
    request_items: [{ id: "demo-line-1" }, { id: "demo-line-2" }],
  },
];
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
export default async function AdminRequestsPage() {
  const auth = await getCurrentProfile();
  const enabled = auth?.profile?.role === "admin";
  const supabase = enabled ? await createClient() : null;
  const { data } = supabase
    ? await supabase
        .from("requests")
        .select(
          "id, request_number, customer_name, customer_email, status, subtotal, fulfillment, created_at, request_items(id)",
        )
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: null };
  const rows = data ?? demoRows;
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
      <div className="request-admin-list">
        {rows.map((row) => (
          <article key={row.id}>
            <div>
              <small>{new Date(row.created_at).toLocaleDateString("de-DE")}</small>
              <h2>
                <Link href={`/admin/anfragen/${row.id}`}>{row.request_number}</Link>
              </h2>
              <span>{row.request_items?.length ?? 0} Positionen zur Abholung</span>
            </div>
            <p>
              <b>{row.customer_name}</b>
              <span>{row.customer_email}</span>
            </p>
            <strong>{euro.format(Number(row.subtotal))}</strong>
            <form action={updateRequestStatusAction}>
              <input type="hidden" name="id" value={row.id} />
              <select name="status" defaultValue={row.status} disabled={!enabled}>
                {(nextStatuses[row.status] ?? [row.status]).map((status) => (
                  <option value={status} key={status}>
                    {statusLabels[status] ?? status}
                  </option>
                ))}
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
