import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link className="wordmark footer-logo" href="/">
            <span className="wordmark-block">{siteConfig.shortName}</span>
            <span>
              BAUMARKT
              <br />
              NASSAUER LAND
            </span>
          </Link>
          <p>
            Baustoffe. Klar ausgewählt.
            <br />
            Online bestellen, im Markt abholen.
          </p>
        </div>
        <div>
          <h2>Sortiment</h2>
          <Link href="/sortiment">Alle Produkte</Link>
          <Link href="/sortiment?availability=pickup">Heute abholen</Link>
          <Link href="/suche">Produktsuche</Link>
        </div>
        <div>
          <h2>Service</h2>
          <Link href="/versand">Bestellung & Abholung</Link>
          <Link href="/bestellung">Bestellung verfolgen</Link>
          <Link href="/konto">Mein Konto</Link>
          <Link href="/anfrage">Bestellung aufgeben</Link>
        </div>
        <div>
          <h2>Rechtliches</h2>
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutz</Link>
          <Link href="/agb">AGB (Entwurf)</Link>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 {siteConfig.name}</span>
      </div>
    </footer>
  );
}
