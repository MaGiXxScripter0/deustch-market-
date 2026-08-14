import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Clock3, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ProductCard } from "@/components/product-card";
import { QuantityCalculator } from "@/components/quantity-calculator";
import { euro } from "@/lib/catalog";
import { getCatalogData } from "@/lib/catalog-repository";

export const revalidate = 900;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { products } = await getCatalogData();
  const product = products.find((item) => item.slug === slug);
  if (!product) return {};
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    title: `${product.name} | Demo Baustoffmarkt`,
    description: product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: [{ url: product.image }],
      url: `${base}/produkt/${product.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.shortDescription,
      images: [product.image],
    },
  };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { categories, products } = await getCatalogData();
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const category = categories.find((item) => item.slug === product.categorySlug);
  const variants = product.variantGroup
    ? products.filter((item) => item.variantGroup === product.variantGroup)
    : [];
  const related = products
    .filter((item) => item.categorySlug === product.categorySlug && item.id !== product.id)
    .slice(0, 4);
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    description: product.shortDescription,
    image: [product.image],
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: product.price,
      availability: product.inventory.delivery
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />
      <div className="shell product-page">
        <p className="breadcrumbs">
          <Link href="/">Startseite</Link> / <Link href="/sortiment">Sortiment</Link> /{" "}
          <Link href={`/kategorie/${category?.slug}`}>{category?.name}</Link> / {product.name}
        </p>
        <div className="product-detail">
          <div className="product-gallery">
            <div className="product-main-image">
              <Image
                src={product.image}
                alt={product.imageAlt}
                fill
                priority
                sizes="(max-width:900px) 100vw, 55vw"
              />
            </div>
            <div className="image-caption">
              <span>Produktabbildung kann in Farbe und Struktur abweichen.</span>
              <b>{product.brand}</b>
            </div>
          </div>
          <div className="product-buy">
            <p className="product-brand">
              {product.brand} · Art.-Nr. {product.sku}
            </p>
            <h1>{product.name}</h1>
            <p className="product-intro">{product.shortDescription}</p>
            <div className="rating-placeholder">
              <span>★★★★★</span> Neu im Sortiment
            </div>
            {variants.length > 1 && (
              <div className="variants">
                <b>Ausführung</b>
                <div>
                  {variants.map((variant) => (
                    <Link
                      className={variant.id === product.id ? "active" : ""}
                      key={variant.id}
                      href={`/produkt/${variant.slug}`}
                    >
                      {variant.variantLabel}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="detail-price">
              <strong>{euro.format(product.price)}</strong>
              <span>
                /{product.saleUnit}
                <br />
                inkl. 19 % MwSt.
                <br />
                <b>
                  {euro.format(product.basePrice)}/{product.baseUnit}
                </b>
              </span>
            </div>
            <div className="fulfillment-card">
              <div>
                <PackageCheck />
                <span>
                  <b>
                    {product.inventory.berlin} {product.saleUnit} in Berlin-Mitte
                  </b>
                  <small>
                    <i /> Abholbereit in ca. 2 Stunden
                  </small>
                </span>
              </div>
              <div>
                <Truck />
                <span>
                  <b>
                    {product.inventory.warehouse} {product.saleUnit} im Zentrallager
                  </b>
                  <small>Lieferung in 2–4 Werktagen</small>
                </span>
              </div>
            </div>
            <AddToCart productId={product.id} />
            <p className="shipping-note">
              <ShieldCheck size={16} /> Unverbindliche Anfrage — noch kein Kaufvertrag.
            </p>
          </div>
        </div>
        {product.coveragePerUnit && (
          <QuantityCalculator
            coverage={product.coveragePerUnit}
            price={product.price}
            unit={product.saleUnit}
          />
        )}
        <section className="product-information">
          <div>
            <p className="kicker">PRODUKTDETAILS</p>
            <h2>Für verlässliche Ergebnisse.</h2>
            <p>{product.description}</p>
            <ul>
              <li>
                <Check /> Preis pro {product.saleUnit}: {euro.format(product.price)}
              </li>
              <li>
                <Check /> Gewicht: {product.weightKg.toLocaleString("de-DE")} kg
              </li>
              <li>
                <Clock3 /> {product.inventory.leadTime}
              </li>
            </ul>
          </div>
          <div className="spec-table">
            <h2>Technische Daten</h2>
            {Object.entries(product.specs).map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <b>{String(value)}</b>
              </div>
            ))}
            <div>
              <span>Verkaufseinheit</span>
              <b>{product.saleUnit}</b>
            </div>
            <div>
              <span>Artikelnummer</span>
              <b>{product.sku}</b>
            </div>
          </div>
        </section>
        <section className="product-section related-section">
          <div className="section-heading">
            <div>
              <p className="kicker">PASSEND DAZU</p>
              <h2>Weitere Produkte</h2>
            </div>
          </div>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
