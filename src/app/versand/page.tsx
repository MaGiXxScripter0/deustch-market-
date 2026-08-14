import type { Metadata } from "next";
import { Clock3, MapPin, PackageCheck, Truck } from "lucide-react";
export const metadata: Metadata = { title: "Lieferung & Abholung | Demo Baustoffmarkt" };
export default function ShippingPage() {
  return (
    <main className="shell legal-page service-page">
      <p className="kicker">SERVICE</p>
      <h1>Lieferung & Abholung.</h1>
      <p className="legal-lead">
        Vom einzelnen Paket bis zur Palette: Wir stimmen die passende Übergabe persönlich mit Ihnen
        ab.
      </p>
      <div className="service-cards">
        <article>
          <MapPin />
          <h2>Abholung Berlin-Mitte</h2>
          <p>
            Verfügbare Ware stellen wir üblicherweise innerhalb von zwei Stunden bereit. Die
            Reservierung gilt erst nach unserer Bestätigung.
          </p>
        </article>
        <article>
          <Truck />
          <h2>Baustellenlieferung</h2>
          <p>
            Liefertermin, Fahrzeugtyp und Kosten hängen von Gewicht, Volumen, Postleitzahl und
            Zufahrt ab und werden im Angebot ausgewiesen.
          </p>
        </article>
        <article>
          <PackageCheck />
          <h2>Zentrallager</h2>
          <p>
            Nicht lokal verfügbare Ware erreicht Berlin-Mitte oder Ihre Baustelle in der Regel
            innerhalb von zwei bis vier Werktagen.
          </p>
        </article>
        <article>
          <Clock3 />
          <h2>Persönliche Abstimmung</h2>
          <p>
            Nach Ihrer unverbindlichen Anfrage prüfen wir Bestand und Logistik und melden uns mit
            einem transparenten Angebot.
          </p>
        </article>
      </div>
    </main>
  );
}
