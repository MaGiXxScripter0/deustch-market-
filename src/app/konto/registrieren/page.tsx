import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signUpAction } from "@/lib/actions";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: `Konto erstellen | ${siteConfig.name}` };
export default function SignupPage() {
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <p className="kicker">KOSTENLOS REGISTRIEREN</p>
        <h1>Ihr Projektkonto.</h1>
        <p>Speichern Sie Ihre Kontaktdaten und verfolgen Sie den Stand Ihrer Bestellungen.</p>
        <AuthForm action={signUpAction} mode="signup" />
        <p className="auth-footnote">
          Bereits registriert? <Link href="/konto/anmelden">Jetzt anmelden</Link>
        </p>
      </div>
      <div className="auth-aside">
        <span>02</span>
        <h2>
          Weniger suchen.
          <br />
          Mehr bauen.
        </h2>
        <p>Ihre Bestellhistorie bleibt nachvollziehbar und jederzeit für Sie abrufbar.</p>
      </div>
    </main>
  );
}
