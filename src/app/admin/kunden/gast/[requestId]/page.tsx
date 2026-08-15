import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_ORDER } from "@/lib/admin-demo-data";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type GuestRequest = {
  id: string;
  request_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  created_at: string;
};

export default async function AdminGuestContactPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const isDemo = requestId === DEMO_ORDER.id;
  let request: GuestRequest | null = isDemo
    ? {
        id: DEMO_ORDER.id,
        request_number: DEMO_ORDER.request_number,
        customer_name: DEMO_ORDER.customer_name,
        customer_email: DEMO_ORDER.customer_email,
        customer_phone: DEMO_ORDER.customer_phone,
        created_at: DEMO_ORDER.created_at,
      }
    : null;

  if (!isDemo) {
    const auth = await getCurrentProfile();
    if (auth?.profile?.role !== "admin") notFound();
    const supabase = await createClient();
    if (!supabase) notFound();
    const { data } = await supabase
      .from("requests")
      .select("id, request_number, customer_name, customer_email, customer_phone, created_at")
      .eq("id", requestId)
      .is("user_id", null)
      .maybeSingle();
    request = data;
  }

  if (!request) notFound();

  return (
    <main className="admin-guest-contact">
      <p className="breadcrumbs">
        <Link href="/admin/anfragen">Bestellungen</Link> /{" "}
        <Link href={`/admin/anfragen/${request.id}`}>{request.request_number}</Link> / Gastkontakt
      </p>
      {isDemo && (
        <div className="admin-warning">
          Vorschau mit Demodaten. Dieser Gastkontakt ist nur für die Browsersitzung sichtbar.
        </div>
      )}
      <header className="admin-heading">
        <div>
          <p className="kicker">GASTBESTELLUNG</p>
          <h1>{request.customer_name || "Unbekannter Gast"}</h1>
          <p>Kontakt zu {request.request_number} · {new Date(request.created_at).toLocaleDateString("de-DE")}</p>
        </div>
      </header>
      <section className="admin-guest-contact-card" aria-labelledby="guest-contact-title">
        <div>
          <p className="kicker">KEIN KUNDENKONTO</p>
          <h2 id="guest-contact-title">Kontaktinformationen</h2>
          <p>
            Diese Bestellung wurde ohne registriertes Kundenkonto aufgegeben. Die folgenden Angaben stammen aus
            der Bestellung und sind kein dauerhaftes Kundenprofil.
          </p>
        </div>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{request.customer_name || "Nicht angegeben"}</dd>
          </div>
          <div>
            <dt>E-Mail</dt>
            <dd>
              {request.customer_email ? (
                <a href={`mailto:${request.customer_email}`}>{request.customer_email}</a>
              ) : (
                "Nicht angegeben"
              )}
            </dd>
          </div>
          <div>
            <dt>Telefon</dt>
            <dd>
              {request.customer_phone ? (
                <a href={`tel:${request.customer_phone}`}>{request.customer_phone}</a>
              ) : (
                "Nicht angegeben"
              )}
            </dd>
          </div>
        </dl>
        <Link className="admin-guest-order-link" href={`/admin/anfragen/${request.id}`}>
          Bestellung öffnen
        </Link>
      </section>
    </main>
  );
}
