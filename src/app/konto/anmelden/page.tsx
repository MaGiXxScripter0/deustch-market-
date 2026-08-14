import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signInAction } from "@/lib/actions";
export const metadata: Metadata = { title: "Anmelden | Demo Baustoffmarkt" };
export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <p className="kicker">MEIN KONTO</p>
        <h1>Willkommen zurück.</h1>
        <p>Anmelden, um Ihre Anfragen und Kontaktdaten einzusehen.</p>
        <AuthForm action={signInAction} mode="login" />
      </div>
      <div className="auth-aside">
        <span>01</span>
        <h2>
          Ein Projekt.
          <br />
          Alle Anfragen.
        </h2>
        <p>Behalten Sie Produktlisten, Angebote und Bearbeitungsstände an einem Ort im Blick.</p>
        <Link href="/sortiment">Sortiment entdecken →</Link>
      </div>
    </main>
  );
}
