import type { Metadata } from "next";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { AccountOverview } from "@/components/account-overview";
import { AccountDashboardShell } from "@/components/account-dashboard-shell";
import { getAccountDashboard } from "@/lib/account-dashboard";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Mein Konto | ${siteConfig.name}` };

export default async function AccountPage() {
  const data = await getAccountDashboard();
  if (!data)
    return (
      <main className="shell page-main">
        <div className="account-guest">
          <UserRound size={42} />
          <p className="kicker">MEIN KONTO</p>
          <h1>Alles für Ihr Projekt an einem Ort.</h1>
          <p>
            Melden Sie sich an, um Bestellungen, Kontaktdaten und Bearbeitungsstände einzusehen.
          </p>
          <div>
            <Link className="button primary" href="/konto/anmelden">
              Anmelden
            </Link>
            <Link className="button secondary" href="/konto/registrieren">
              Konto erstellen
            </Link>
          </div>
        </div>
      </main>
    );
  return (
    <AccountDashboardShell isAdmin={data.profile.role === "admin"}>
      <AccountOverview data={data} />
    </AccountDashboardShell>
  );
}
