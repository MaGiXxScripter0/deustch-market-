import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: `AGB – Entwurf | ${siteConfig.name}` };
export default function TermsPage() {
  return (
    <main className="shell legal-page">
      <p className="kicker">RECHTLICHES</p>
      <h1>Allgemeine Geschäftsbedingungen</h1>
      <div className="legal-warning">
        <b>Demo-Entwurf</b> — Vor dem Produktivbetrieb müssen AGB, Hinweise zum Vertragsschluss,
        Zahlungsmethoden, Abholung und die gesetzlichen Pflichtinformationen juristisch erstellt
        werden.
      </div>
      <section>
        <h2>1. Geltungsbereich</h2>
        <p>
          Diese vorläufigen Hinweise beschreiben ausschließlich den Demo-Ablauf einer Bestellung zur
          Abholung und stellen keine finalen Geschäftsbedingungen dar.
        </p>
      </section>
      <section>
        <h2>2. Bestellung zur Abholung</h2>
        <p>
          Der finale Zeitpunkt des Vertragsschlusses und die genauen Bedingungen müssen vor dem
          Produktivstart rechtlich festgelegt werden. Die Ware wird ausschließlich im Markt
          abgeholt.
        </p>
      </section>
      <section>
        <h2>3. Preise und Verfügbarkeit</h2>
        <p>
          Alle angezeigten Preise verstehen sich inklusive gesetzlicher Umsatzsteuer. Es entstehen
          keine Versandkosten, da keine Lieferung angeboten wird. Die Mengenverfügbarkeit wird bei
          der Bestellung reserviert.
        </p>
      </section>
    </main>
  );
}
