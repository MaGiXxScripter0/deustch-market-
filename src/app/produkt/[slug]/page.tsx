import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Clock3, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { ProductAvailability } from "@/components/product-availability";
import { QuantityCalculator } from "@/components/quantity-calculator";
import { euro } from "@/lib/catalog";
import { getCatalogData } from "@/lib/catalog-repository";
import { siteConfig } from "@/lib/site-config";

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
    title: `${product.name} | ${siteConfig.name}`,
    description: product.shortDescription,
    alternates: { canonical: `/produkt/${product.slug}` },
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
  const related = product.categorySlug
    ? products
        .filter((item) => item.categorySlug === product.categorySlug && item.id !== product.id)
        .slice(0, 4)
    : [];
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
      availability: product.inventory.pickup
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
  return (
    <main>
      <JsonLd data={structured} />
      <div className="shell product-page">
        <p className="breadcrumbs">
          <Link href="/">Startseite</Link> / <Link href="/sortiment">Sortiment</Link> /{" "}
          {category ? (
            <>
              <Link href={`/kategorie/${category.slug}`}>{category.name}</Link> / {product.name}
            </>
          ) : (
            product.name
          )}
        </p>
        <div className="product-detail">
          <div className="product-gallery">
            <div className="product-main-image">
              <Image
                src={product.image}
                alt={product.imageAlt}
                fill
                loading="eager"
                fetchPriority="high"
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
            <p className="product-status">Neu im Sortiment</p>
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
            <div className="purchase-panel">
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
              <ProductAvailability saleUnit={product.saleUnit} inventory={product.inventory} />
              <AddToCart
                productId={product.id}
                disabled={!product.inventory.pickup || product.inventory.berlin === 0}
              />
              <p className="shipping-note">
                <ShieldCheck size={16} /> Bestellung zur Abholung im Markt. Zahlung bei Ausgabe.
              </p>
            </div>
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
            <h2>Beschreibung</h2>
            <p>{product.description}</p>
            <ul>
              <li>
                <Check /> Preis pro {product.saleUnit}: {euro.format(product.price)}
              </li>
              <li>
                <Check /> Gewicht: {product.weightKg.toLocaleString("de-DE")} kg
              </li>
              <li>
                <Clock3 /> {product.inventory.pickupLeadTime}
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
