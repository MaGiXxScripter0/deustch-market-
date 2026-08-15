import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
export const metadata: Metadata = { title: `Datenschutz | ${siteConfig.name}` };
export default function PrivacyPage() {
  return (
    <main className="shell legal-page">
      <p className="kicker">RECHTLICHES</p>
      <h1>Datenschutzerklärung</h1>
      <div className="legal-warning">
        <b>Demo-Entwurf</b> — Diese Vorlage ersetzt keine individuelle Datenschutzberatung.
      </div>
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          {siteConfig.name} GmbH, {siteConfig.address}, {siteConfig.email}
        </p>
      </section>
      <section>
        <h2>2. Hosting und Datenbank</h2>
        <p>
          Die Website wird über Vercel bereitgestellt. Konto-, Katalog- und Bestelldaten werden in
          Supabase gespeichert. Dabei können technische Verbindungsdaten verarbeitet werden. Vor dem
          Produktivbetrieb sind Auftragsverarbeitungsverträge, Speicherregionen und
          Drittlandtransfers abschließend zu dokumentieren.
        </p>
      </section>
      <section>
        <h2>3. Kundenkonto</h2>
        <p>
          Bei der Registrierung verarbeiten wir E-Mail-Adresse, verschlüsseltes Passwort sowie
          freiwillig Name und Telefonnummer zur Bereitstellung des Kontos und der Bestellhistorie.
        </p>
      </section>
      <section>
        <h2>4. Bestellungen zur Abholung</h2>
        <p>
          Zur Bearbeitung einer Bestellung verarbeiten wir Name, E-Mail-Adresse, Telefonnummer,
          ausgewählte Produkte und Ihre optionale Nachricht. Rechtsgrundlage und Speicherfristen
          müssen vor dem Produktivbetrieb rechtlich geprüft und konkretisiert werden.
        </p>
      </section>
      <section>
        <h2>5. Lokaler Warenkorb</h2>
        <p>
          Der Warenkorb wird ausschließlich im Browser des verwendeten Geräts gespeichert. Es werden
          dafür keine Marketing-Cookies gesetzt.
        </p>
      </section>
      <section>
        <h2>6. Ihre Rechte</h2>
        <p>
          Sie haben insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung,
          Datenübertragbarkeit und Widerspruch sowie ein Beschwerderecht bei einer
          Datenschutzaufsichtsbehörde.
        </p>
      </section>
    </main>
  );
}
