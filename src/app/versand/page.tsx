import type { Metadata } from "next";
import { Clock3, MapPin, PackageCheck, WalletCards } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: `Bestellung & Abholung | ${siteConfig.name}` };
export default function ShippingPage() {
  return (
    <main className="shell legal-page service-page">
      <p className="kicker">SERVICE</p>
      <h1>Bestellung & Abholung.</h1>
      <p className="legal-lead">
        Bestellen Sie online, wir stellen die Ware für Sie zusammen und Sie holen sie im Markt ab.
      </p>
      <div className="service-cards">
        <article>
          <MapPin />
          <h2>Abholung im {siteConfig.pickupLocationName}</h2>
          <p>
            Verfügbare Ware stellen wir üblicherweise innerhalb von zwei Stunden bereit. Sie
            erhalten eine Nachricht, sobald Ihre Bestellung abholbereit ist.
          </p>
          <a href={siteConfig.mapUrl} target="_blank" rel="noreferrer">
            {siteConfig.address} auf Google Maps öffnen
          </a>
        </article>
        <article>
          <WalletCards />
          <h2>Zahlung bei Abholung</h2>
          <p>
            Bezahlen Sie die Bestellung erst bei der Ausgabe im Markt. Online-Zahlung und Lieferung
            bieten wir derzeit nicht an.
          </p>
        </article>
        <article>
          <PackageCheck />
          <h2>Bestand im Markt</h2>
          <p>
            Wir zeigen Ihnen im Shop, welche Menge aktuell im Markt für die Abholung verfügbar ist.
          </p>
        </article>
        <article>
          <Clock3 />
          <h2>Bestellstatus</h2>
          <p>
            Nach der Bestellung sehen wir sofort, was zusammengestellt werden muss. Sie erhalten
            eine Nachricht, sobald Sie vorbeikommen können.
          </p>
        </article>
      </div>
    </main>
  );
}
