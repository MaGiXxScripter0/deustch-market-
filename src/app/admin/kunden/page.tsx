import { getCurrentProfile, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const demoProfiles = [
  {
    id: "demo",
    full_name: "Anna Beispiel",
    phone: "+49 30 000000",
    role: "customer",
    created_at: new Date().toISOString(),
  },
];

export default async function AdminCustomersPage() {
  const auth = await getCurrentProfile();
  const enabled = auth?.profile?.role === "admin";
  const supabase = enabled ? await createClient() : null;
  const { data } = supabase
    ? await supabase
        .from("profiles")
        .select("id, full_name, phone, role, created_at")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: null };
  const profiles = data ?? demoProfiles;

  return (
    <main>
      <div className="admin-heading">
        <div>
          <p className="kicker">KONTEN</p>
          <h1>Kunden</h1>
        </div>
      </div>
      {!enabled && (
        <div className="admin-warning">Demodaten: Für echte Konten als Admin anmelden.</div>
      )}
      <div className="admin-table customer-table">
        <div className="admin-table-head">
          <span>Name</span>
          <span>Telefon</span>
          <span>Rolle</span>
          <span>Erstellt</span>
        </div>
        {profiles.map((profile) => (
          <article key={profile.id}>
            <strong>{profile.full_name || "Ohne Namen"}</strong>
            <span>{profile.phone || "—"}</span>
            <span>{profile.role === "admin" ? "Admin" : "Kunde"}</span>
            <span>{new Date(profile.created_at).toLocaleDateString("de-DE")}</span>
          </article>
        ))}
      </div>
    </main>
  );
}
