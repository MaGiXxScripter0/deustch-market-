import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
export const metadata: Metadata = { title: `Impressum | ${siteConfig.name}` };
export default function ImpressumPage() {
  return (
    <main className="shell legal-page">
      <p className="kicker">RECHTLICHES</p>
      <h1>Impressum</h1>
      <div className="legal-warning">
        <b>Demo-Entwurf</b> — Vor einer kommerziellen Veröffentlichung müssen sämtliche
        Unternehmensangaben anwaltlich geprüft und durch echte Daten ersetzt werden.
      </div>
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          {siteConfig.name} GmbH (Musterunternehmen)
          <br />
          {siteConfig.address}
          <br />
          Deutschland
        </p>
      </section>
      <section>
        <h2>Vertreten durch</h2>
        <p>Geschäftsführung: Max Mustermann</p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: {siteConfig.phone}
          <br />
          E-Mail: {siteConfig.email}
        </p>
      </section>
      <section>
        <h2>Registereintrag und Umsatzsteuer</h2>
        <p>
          Handelsregister: Noch nicht angegeben (Demo-Entwurf)<br />
          USt-IdNr.: DE000000000
        </p>
      </section>
      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>
    </main>
  );
}
