import type { Metadata } from "next";
import { RequestForm } from "@/components/request-form";
import { getCatalogData } from "@/lib/catalog-repository";
import { getRequestContactDefaults } from "@/lib/request";
import { siteConfig } from "@/lib/site-config";
import { getCurrentProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: `Bestellung zur Abholung | ${siteConfig.name}` };
export default async function RequestPage() {
  const [{ products }, auth] = await Promise.all([getCatalogData(), getCurrentProfile()]);
  const initialContact = getRequestContactDefaults({
    email: auth?.user.email,
    fullName: auth?.profile?.full_name,
    phone: auth?.profile?.phone,
  });
  return (
    <main className="shell page-main">
      <div className="page-hero compact">
        <p className="kicker">NUR ABHOLUNG IM MARKT</p>
        <h1>Bestellung abschließen.</h1>
        <p>
          Wir prüfen Ihren Bestand, stellen die Ware zusammen und informieren Sie, sobald Ihre
          Bestellung bereitliegt.
        </p>
      </div>
      <RequestForm products={products} initialContact={initialContact} />
    </main>
  );
}
