import type { Metadata } from "next";
export const metadata: Metadata = { title: "AGB – Entwurf | Demo Baustoffmarkt" };
export default function TermsPage() {
  return (
    <main className="shell legal-page">
      <p className="kicker">RECHTLICHES</p>
      <h1>Allgemeine Geschäftsbedingungen</h1>
      <div className="legal-warning">
        <b>Demo-Entwurf</b> — Der Shop nimmt derzeit ausschließlich unverbindliche Angebotsanfragen
        entgegen. Vor Einführung verbindlicher Bestellungen müssen vollständige AGB,
        Widerrufsbelehrung, Lieferbedingungen und Pflichtinformationen juristisch erstellt werden.
      </div>
      <section>
        <h2>1. Geltungsbereich</h2>
        <p>
          Diese vorläufigen Hinweise beschreiben ausschließlich den Demo-Ablauf der Angebotsanfrage
          und stellen keine finalen Geschäftsbedingungen dar.
        </p>
      </section>
      <section>
        <h2>2. Kein Vertragsschluss durch Anfrage</h2>
        <p>
          Mit dem Absenden einer Anfrage geben Nutzer noch keine zahlungspflichtige Bestellung ab.
          Ein Vertrag kommt erst nach einem gesonderten individuellen Angebot und dessen Annahme
          zustande.
        </p>
      </section>
      <section>
        <h2>3. Preise und Verfügbarkeit</h2>
        <p>
          Alle angezeigten Preise verstehen sich inklusive gesetzlicher Umsatzsteuer. Lieferkosten,
          Mengenverfügbarkeit und mögliche Preisänderungen werden vor Vertragsschluss bestätigt.
        </p>
      </section>
    </main>
  );
}
