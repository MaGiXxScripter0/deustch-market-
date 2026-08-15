import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signInAction } from "@/lib/actions";
import { siteConfig } from "@/lib/site-config";
import { getCurrentProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: `Anmelden | ${siteConfig.name}` };
export default async function LoginPage() {
  const auth = await getCurrentProfile();

  return (
    <main className="auth-page">
      <div className="auth-panel">
        {auth ? (
          <div className="auth-already-signed-in">
            <p className="kicker">MEIN KONTO</p>
            <h1>Sie sind bereits angemeldet.</h1>
            <p>Ihr Konto, Ihre Bestellungen und Ihre Kontaktdaten stehen für Sie bereit.</p>
            <Link className="button primary" href="/konto">
              Zum Konto
            </Link>
          </div>
        ) : (
          <>
            <p className="kicker">MEIN KONTO</p>
            <h1>Willkommen zurück.</h1>
            <p>Anmelden, um Ihre Bestellungen und Kontaktdaten einzusehen.</p>
            <AuthForm action={signInAction} mode="login" />
          </>
        )}
      </div>
      <div className="auth-aside">
        <span>01</span>
        <h2>
          Ein Projekt.
          <br />
          Alle Bestellungen.
        </h2>
        <p>Behalten Sie Produktlisten, Angebote und Bearbeitungsstände an einem Ort im Blick.</p>
        <Link href="/sortiment">Sortiment entdecken →</Link>
      </div>
    </main>
  );
}
