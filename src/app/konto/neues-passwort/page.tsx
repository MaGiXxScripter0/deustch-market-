import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: `Neues Passwort | ${siteConfig.name}` };

export default function NewPasswordPage() {
  return (
    <main className="auth-page single">
      <div className="auth-panel">
        <p className="kicker">KONTO SICHERN</p>
        <h1>Neues Passwort vergeben.</h1>
        <p>Wählen Sie ein neues Passwort mit mindestens acht Zeichen.</p>
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
