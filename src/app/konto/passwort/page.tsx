import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { resetPasswordAction } from "@/lib/actions";
export const metadata: Metadata = { title: "Passwort zurücksetzen | Demo Baustoffmarkt" };
export default function ResetPage() {
  return (
    <main className="auth-page single">
      <div className="auth-panel">
        <p className="kicker">PASSWORT VERGESSEN</p>
        <h1>Zugang wiederherstellen.</h1>
        <p>Wir senden Ihnen einen sicheren Link an Ihre E-Mail-Adresse.</p>
        <AuthForm action={resetPasswordAction} mode="reset" />
        <p className="auth-footnote">
          <Link href="/konto/anmelden">Zurück zur Anmeldung</Link>
        </p>
      </div>
    </main>
  );
}
