import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Calculator, Clock3, PackageCheck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getCatalogData } from "@/lib/catalog-repository";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const { categories, products } = await getCatalogData();
  return (
    <main className="home-page">
      <section className="hero shell">
        <div className="hero-copy">
          <p className="kicker">BAUSTOFFE. KLAR AUSGEWÄHLT.</p>
          <h1>Material, das Ihr Projekt voranbringt.</h1>
          <p className="hero-lead">
            Klare Preise, verlässliche Bestände und alles für die Abholung im Markt — vom ersten
            Sack bis zur ganzen Palette.
          </p>
          <div className="hero-ctas">
            <Link className="button primary" href="/sortiment">
              Sortiment entdecken
            </Link>
            <Link className="button secondary" href="/sortiment?availability=pickup">
              Heute verfügbar
            </Link>
          </div>
          <div className="hero-trust">
            <span>
              <b>{products.length}</b> ausgewählte Produkte
            </span>
            <span>
              <b>2 Std.</b> abholbereit
            </span>
            <span>
              <b>19 %</b> MwSt. inklusive
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="https://images.unsplash.com/photo-1625337902947-dc6f0eef6a4f?auto=format&fit=crop&w=1500&q=85"
            alt="Gestapelte Mauerziegel auf einer Palette"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(max-width:900px) 100vw, 48vw"
          />
          <div className="hero-note">
            <span>Abholung im Markt</span>
            <b>Wir stellen für Sie zusammen</b>
          </div>
        </div>
      </section>
      <section className="service-strip">
        <div className="shell">
          <div>
            <PackageCheck />
            <span>
              <b>Bestand geprüft</b>
              <small>Für die Abholung im Markt</small>
            </span>
          </div>
          <div>
            <Clock3 />
            <span>
              <b>Schnelle Abholung</b>
              <small>Bereitstellung in ca. 2 Stunden</small>
            </span>
          </div>
          <div>
            <PackageCheck />
            <span>
              <b>Einfach bestellen</b>
              <small>Wir informieren Sie, sobald alles bereitliegt</small>
            </span>
          </div>
        </div>
      </section>
      <section className="shell section-block">
        <div className="section-heading">
          <div>
            <p className="kicker">SORTIMENT</p>
            <h2>Was steht heute an?</h2>
          </div>
          <Link href="/sortiment">
            Alle Kategorien <ArrowRight size={15} />
          </Link>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <Link
              href={`/kategorie/${category.slug}`}
              className="category-card"
              key={category.slug}
            >
              <span className="category-number">{category.number}</span>
              <h3>{category.name}</h3>
              <p>{category.description}</p>
              <span className="category-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="product-section">
        <div className="shell section-block">
          <div className="section-heading">
            <div>
              <p className="kicker">SOFORT VERFÜGBAR</p>
              <h2>Für Ihr nächstes Vorhaben</h2>
            </div>
            <Link href="/sortiment">
              Alle Produkte <ArrowRight size={15} />
            </Link>
          </div>
          <div className="product-grid">
            {products
              .filter((item) => item.featured)
              .slice(0, 8)
              .map((product, index) => (
                <ProductCard key={product.id} product={product} eager={index < 8} />
              ))}
          </div>
        </div>
      </section>
      <section className="shell project-banner">
        <div>
          <Calculator size={36} />
          <p className="kicker">MENGENRECHNER</p>
          <h2>Lieber einmal richtig rechnen.</h2>
          <p>
            Unsere Produktrechner ermitteln Verpackungsmenge, Reserve und voraussichtliche
            Materialkosten.
          </p>
          <Link className="button primary" href="/produkt/osb3-verlegeplatte-18">
            Rechner ausprobieren
          </Link>
        </div>
        <div className="project-metric">
          <span>Projektfläche</span>
          <strong>24,0 m²</strong>
          <i />
          <span>+ 10 % Reserve</span>
          <b>9 Platten</b>
        </div>
      </section>
    </main>
  );
}
