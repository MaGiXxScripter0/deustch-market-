import Link from "next/link";
import { CatalogImportForm } from "@/components/catalog-import-form";
import { siteConfig } from "@/lib/site-config";

export default function CatalogImportPage() {
  return (
    <main>
      <p className="breadcrumbs">
        <Link href="/admin/produkte">Produkte</Link> / CSV-Import
      </p>
      <div className="admin-heading">
        <div>
          <p className="kicker">KATALOG</p>
          <h1>Produkte importieren</h1>
          <p>Aktualisiert Produktdaten und Abholbestand in {siteConfig.storeName}.</p>
        </div>
      </div>
      <section className="catalog-import-card">
        <h2>Vor dem Import prüfen</h2>
        <ol>
          <li>SKU, Marke, Preis und Bestand stammen aus Ihrer Warenwirtschaft.</li>
          <li>Die Kategorie ist bereits im Shop angelegt.</li>
          <li>Bild- und Herstellerlinks dürfen verwendet werden.</li>
        </ol>
        <CatalogImportForm />
      </section>
    </main>
  );
}
