import Image from "next/image";
import Link from "next/link";
import { euro } from "@/lib/catalog";
import { siteConfig } from "@/lib/site-config";
import type { Product } from "@/lib/types";
import { AddToCart } from "./add-to-cart";

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const { inventory } = product;
  const available = inventory.pickup && inventory.berlin > 0;
  const lowStock = available && inventory.berlin <= 10;

  return (
    <article className="product-card">
      <Link className="product-image" href={`/produkt/${product.slug}`}>
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          sizes="(max-width:700px) 50vw, (max-width:1100px) 33vw, 25vw"
        />
        <span className={`availability ${!available ? "order" : ""}`}>
          {available ? "Abholung heute" : "Auf Anfrage"}
        </span>
      </Link>
      <div className="product-content">
        <p>
          {product.brand} · {product.sku}
        </p>
        <h3>
          <Link href={`/produkt/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className={`stock-line${lowStock ? " low-stock" : ""}`}>
          <i className={available ? "in-stock" : "online"} />
          {available
            ? lowStock
              ? `Nur noch ${inventory.berlin} ${product.saleUnit} in ${siteConfig.storeName}`
              : `${inventory.berlin} ${product.saleUnit} in ${siteConfig.storeName}`
            : inventory.pickupLeadTime}
        </div>
        <div className="product-buy-row">
          <div className="product-price">
            <strong>{euro.format(product.price)}</strong>
            <span>
              /{product.saleUnit}
              <br />
              {euro.format(product.basePrice)}/{product.baseUnit}
            </span>
          </div>
          <AddToCart productId={product.id} compact disabled={!available} />
        </div>
      </div>
    </article>
  );
}
